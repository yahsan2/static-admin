import type {
  AuthManager,
  User,
  Session,
  UserRole,
  PasswordResetToken,
  AuthConfig,
  GitHubUserInfo,
  OAuthToken,
  AuthProvider,
} from './types';
import type { DatabaseAdapter } from './adapters/types';
import { createDatabaseAdapter } from './adapters';
import { hashPassword, verifyPassword, generateSessionId, generateToken } from './password';

const DEFAULT_SESSION_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

// SQL table definitions
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT,
    role TEXT DEFAULT 'editor' NOT NULL,
    auth_provider TEXT DEFAULT 'password' NOT NULL,
    github_id INTEGER UNIQUE,
    github_username TEXT,
    github_avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

  CREATE TABLE IF NOT EXISTS oauth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL DEFAULT 'github',
    access_token TEXT NOT NULL,
    scope TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, provider)
  );

  CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);

  CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    redirect_uri TEXT,
    expires_at DATETIME NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
`;

// Types for database rows
interface UserRow {
  id: number;
  email: string;
  password_hash: string | null;
  name: string | null;
  role: string;
  auth_provider: string;
  github_id: number | null;
  github_username: string | null;
  github_avatar_url: string | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  user_id: number;
  expires_at: string;
}

interface SessionWithUserRow {
  session_id: string;
  user_id: number;
  expires_at: string;
  email: string;
  name: string | null;
  role: string;
  auth_provider: string;
  github_id: number | null;
  github_username: string | null;
  github_avatar_url: string | null;
  created_at: string;
}

interface OAuthTokenRow {
  id: number;
  user_id: number;
  provider: string;
  access_token: string;
  scope: string | null;
  created_at: string;
}

interface OAuthStateRow {
  state: string;
  redirect_uri: string | null;
  expires_at: string;
}

interface PasswordResetTokenRow {
  token: string;
  user_id: number;
  email: string;
  expires_at: string;
}

interface CountRow {
  count: number;
}

/**
 * Create an auth manager with database adapter
 */
export function createAuthManager(config: AuthConfig): AuthManager {
  // Determine which adapter to use
  let db: DatabaseAdapter;

  if (config.remote) {
    db = createDatabaseAdapter({
      type: 'turso',
      url: config.remote.url,
      authToken: config.remote.authToken,
    });
  } else if (config.database) {
    db = createDatabaseAdapter({
      type: 'sqlite',
      path: config.database,
    });
  } else {
    throw new Error('Auth config must specify either "database" (SQLite path) or "remote" configuration');
  }

  const sessionExpiry = config.sessionExpiry ?? DEFAULT_SESSION_EXPIRY;

  return {
    async initialize(): Promise<void> {
      await db.execute(SCHEMA_SQL);

      // Migration: Add role column if it doesn't exist
      const tableInfo = await db.queryAll<{ name: string }>('PRAGMA table_info(users)');
      const hasRoleColumn = tableInfo.some((col) => col.name === 'role');
      const hasAuthProviderColumn = tableInfo.some((col) => col.name === 'auth_provider');
      const hasGitHubIdColumn = tableInfo.some((col) => col.name === 'github_id');

      if (!hasRoleColumn) {
        await db.execute(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'editor' NOT NULL`);
        // Set first user as admin (for existing installations)
        await db.execute(`UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)`);
      }

      // Migration: Add OAuth columns
      if (!hasAuthProviderColumn) {
        await db.execute(`ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'password' NOT NULL`);
      }
      if (!hasGitHubIdColumn) {
        await db.execute(`ALTER TABLE users ADD COLUMN github_id INTEGER UNIQUE`);
        await db.execute(`ALTER TABLE users ADD COLUMN github_username TEXT`);
        await db.execute(`ALTER TABLE users ADD COLUMN github_avatar_url TEXT`);
      }
    },

    async hasAnyUsers(): Promise<boolean> {
      const row = await db.queryOne<CountRow>(`SELECT COUNT(*) as count FROM users`);
      return (row?.count ?? 0) > 0;
    },

    async createUser(email: string, password: string, name?: string, role: UserRole = 'editor'): Promise<User> {
      const passwordHash = hashPassword(password);

      const result = await db.run(
        `INSERT INTO users (email, password_hash, name, role, auth_provider) VALUES (?, ?, ?, ?, 'password')`,
        [email, passwordHash, name ?? null, role]
      );

      return {
        id: Number(result.lastInsertRowid),
        email,
        name: name ?? null,
        role,
        createdAt: new Date(),
        authProvider: 'password',
      };
    },

    async login(email: string, password: string): Promise<{ user: User; session: Session }> {
      // Get user
      const row = await db.queryOne<UserRow>(
        `SELECT id, email, password_hash, name, role, auth_provider, github_id, github_username, github_avatar_url, created_at FROM users WHERE email = ?`,
        [email]
      );

      if (!row) {
        throw new Error('Invalid email or password');
      }

      // Verify password (only for password-based users)
      if (!row.password_hash || !verifyPassword(password, row.password_hash)) {
        throw new Error('Invalid email or password');
      }

      // Create session
      const sessionId = generateSessionId();
      const expiresAt = new Date(Date.now() + sessionExpiry * 1000);

      await db.run(
        `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
        [sessionId, row.id, expiresAt.toISOString()]
      );

      return {
        user: {
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role as UserRole,
          createdAt: new Date(row.created_at),
          authProvider: row.auth_provider as AuthProvider,
          githubId: row.github_id ?? undefined,
          githubUsername: row.github_username ?? undefined,
          githubAvatarUrl: row.github_avatar_url ?? undefined,
        },
        session: {
          id: sessionId,
          userId: row.id,
          expiresAt,
        },
      };
    },

    async logout(sessionId: string): Promise<void> {
      await db.run(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
    },

    async getSession(sessionId: string): Promise<{ user: User; session: Session } | null> {
      // Clean up expired sessions first
      await db.run(`DELETE FROM sessions WHERE expires_at < datetime('now')`);

      // Get session with user
      const row = await db.queryOne<SessionWithUserRow>(
        `SELECT
          s.id as session_id,
          s.user_id,
          s.expires_at,
          u.email,
          u.name,
          u.role,
          u.auth_provider,
          u.github_id,
          u.github_username,
          u.github_avatar_url,
          u.created_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.expires_at > datetime('now')`,
        [sessionId]
      );

      if (!row) {
        return null;
      }

      return {
        user: {
          id: row.user_id,
          email: row.email,
          name: row.name,
          role: row.role as UserRole,
          createdAt: new Date(row.created_at),
          authProvider: row.auth_provider as AuthProvider,
          githubId: row.github_id ?? undefined,
          githubUsername: row.github_username ?? undefined,
          githubAvatarUrl: row.github_avatar_url ?? undefined,
        },
        session: {
          id: row.session_id,
          userId: row.user_id,
          expiresAt: new Date(row.expires_at),
        },
      };
    },

    async refreshSession(sessionId: string): Promise<Session | null> {
      const expiresAt = new Date(Date.now() + sessionExpiry * 1000);

      // Update and fetch the session
      await db.run(
        `UPDATE sessions SET expires_at = ? WHERE id = ? AND expires_at > datetime('now')`,
        [expiresAt.toISOString(), sessionId]
      );

      const row = await db.queryOne<SessionRow>(
        `SELECT id, user_id, expires_at FROM sessions WHERE id = ?`,
        [sessionId]
      );

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        userId: row.user_id,
        expiresAt: new Date(row.expires_at),
      };
    },

    async getUserById(id: number): Promise<User | null> {
      const row = await db.queryOne<UserRow>(
        `SELECT id, email, name, role, auth_provider, github_id, github_username, github_avatar_url, created_at FROM users WHERE id = ?`,
        [id]
      );

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role as UserRole,
        createdAt: new Date(row.created_at),
        authProvider: row.auth_provider as AuthProvider,
        githubId: row.github_id ?? undefined,
        githubUsername: row.github_username ?? undefined,
        githubAvatarUrl: row.github_avatar_url ?? undefined,
      };
    },

    async getUserByEmail(email: string): Promise<User | null> {
      const row = await db.queryOne<UserRow>(
        `SELECT id, email, name, role, auth_provider, github_id, github_username, github_avatar_url, created_at FROM users WHERE email = ?`,
        [email]
      );

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role as UserRole,
        createdAt: new Date(row.created_at),
        authProvider: row.auth_provider as AuthProvider,
        githubId: row.github_id ?? undefined,
        githubUsername: row.github_username ?? undefined,
        githubAvatarUrl: row.github_avatar_url ?? undefined,
      };
    },

    async updatePassword(userId: number, newPassword: string): Promise<void> {
      const passwordHash = hashPassword(newPassword);
      await db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, userId]);
    },

    async verifyPassword(userId: number, password: string): Promise<boolean> {
      const row = await db.queryOne<UserRow>(
        `SELECT password_hash FROM users WHERE id = ?`,
        [userId]
      );

      if (!row || !row.password_hash) {
        return false;
      }

      return verifyPassword(password, row.password_hash);
    },

    async deleteUser(userId: number): Promise<void> {
      // Sessions will be deleted via ON DELETE CASCADE
      await db.run(`DELETE FROM users WHERE id = ?`, [userId]);
    },

    async listUsers(options: { page?: number; limit?: number } = {}): Promise<{
      items: User[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
      const page = options.page ?? 1;
      const limit = options.limit ?? 20;
      const offset = (page - 1) * limit;

      // Count total
      const countResult = await db.queryOne<CountRow>(`SELECT COUNT(*) as count FROM users`);
      const total = countResult?.count ?? 0;

      // Fetch paginated users
      const rows = await db.queryAll<UserRow>(
        `SELECT id, email, name, role, auth_provider, github_id, github_username, github_avatar_url, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return {
        items: rows.map((row) => ({
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role as UserRole,
          createdAt: new Date(row.created_at),
          authProvider: row.auth_provider as AuthProvider,
          githubId: row.github_id ?? undefined,
          githubUsername: row.github_username ?? undefined,
          githubAvatarUrl: row.github_avatar_url ?? undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },

    async updateUser(userId: number, data: { name?: string; email?: string; role?: UserRole }): Promise<User> {
      // If changing role FROM admin, check we won't have 0 admins
      if (data.role !== undefined) {
        const currentUser = await this.getUserById(userId);
        if (currentUser?.role === 'admin' && data.role !== 'admin') {
          const adminCount = await this.countUsersByRole('admin');
          if (adminCount <= 1) {
            throw new Error('Cannot demote the last admin user');
          }
        }
      }

      const updates: string[] = [];
      const values: (string | number)[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.email !== undefined) {
        updates.push('email = ?');
        values.push(data.email);
      }
      if (data.role !== undefined) {
        updates.push('role = ?');
        values.push(data.role);
      }

      if (updates.length === 0) {
        const user = await this.getUserById(userId);
        if (!user) {
          throw new Error('User not found');
        }
        return user;
      }

      values.push(userId);
      await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

      const row = await db.queryOne<UserRow>(
        `SELECT id, email, name, role, auth_provider, github_id, github_username, github_avatar_url, created_at FROM users WHERE id = ?`,
        [userId]
      );

      if (!row) {
        throw new Error('User not found');
      }

      return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role as UserRole,
        createdAt: new Date(row.created_at),
        authProvider: row.auth_provider as AuthProvider,
        githubId: row.github_id ?? undefined,
        githubUsername: row.github_username ?? undefined,
        githubAvatarUrl: row.github_avatar_url ?? undefined,
      };
    },

    async countUsersByRole(role: UserRole): Promise<number> {
      const row = await db.queryOne<CountRow>(
        `SELECT COUNT(*) as count FROM users WHERE role = ?`,
        [role]
      );
      return row?.count ?? 0;
    },

    async createPasswordResetToken(email: string): Promise<PasswordResetToken | null> {
      // Clean up expired tokens first
      await db.run(`DELETE FROM password_reset_tokens WHERE expires_at < datetime('now')`);

      // Find user by email
      const user = await this.getUserByEmail(email);
      if (!user) {
        return null;
      }

      // Delete any existing tokens for this user
      await db.run(`DELETE FROM password_reset_tokens WHERE user_id = ?`, [user.id]);

      // Create new token (1 hour expiry)
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.run(
        `INSERT INTO password_reset_tokens (token, user_id, email, expires_at) VALUES (?, ?, ?, ?)`,
        [token, user.id, email, expiresAt.toISOString()]
      );

      return {
        token,
        userId: user.id,
        email,
        expiresAt,
      };
    },

    async validatePasswordResetToken(token: string): Promise<PasswordResetToken | null> {
      const row = await db.queryOne<PasswordResetTokenRow>(
        `SELECT token, user_id, email, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > datetime('now')`,
        [token]
      );

      if (!row) {
        return null;
      }

      return {
        token: row.token,
        userId: row.user_id,
        email: row.email,
        expiresAt: new Date(row.expires_at),
      };
    },

    async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
      const resetToken = await this.validatePasswordResetToken(token);
      if (!resetToken) {
        return false;
      }

      // Update password
      await this.updatePassword(resetToken.userId, newPassword);

      // Delete the used token
      await db.run(`DELETE FROM password_reset_tokens WHERE token = ?`, [token]);

      // Invalidate all existing sessions for this user
      await db.run(`DELETE FROM sessions WHERE user_id = ?`, [resetToken.userId]);

      return true;
    },

    // OAuth methods

    async getUserByGitHubId(githubId: number): Promise<User | null> {
      const row = await db.queryOne<UserRow>(
        `SELECT id, email, name, role, auth_provider, github_id, github_username, github_avatar_url, created_at FROM users WHERE github_id = ?`,
        [githubId]
      );

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role as UserRole,
        createdAt: new Date(row.created_at),
        authProvider: row.auth_provider as AuthProvider,
        githubId: row.github_id ?? undefined,
        githubUsername: row.github_username ?? undefined,
        githubAvatarUrl: row.github_avatar_url ?? undefined,
      };
    },

    async findOrCreateGitHubUser(githubUser: GitHubUserInfo, role: UserRole = 'editor'): Promise<User> {
      // Check if user already exists by GitHub ID
      const existingUser = await this.getUserByGitHubId(githubUser.id);
      if (existingUser) {
        // Update GitHub info if changed
        await db.run(
          `UPDATE users SET github_username = ?, github_avatar_url = ?, name = COALESCE(?, name) WHERE github_id = ?`,
          [githubUser.login, githubUser.avatar_url, githubUser.name, githubUser.id]
        );
        return {
          ...existingUser,
          githubUsername: githubUser.login,
          githubAvatarUrl: githubUser.avatar_url,
          name: githubUser.name ?? existingUser.name,
        };
      }

      // Create new user
      const email = githubUser.email ?? `${githubUser.login}@github.local`;
      const result = await db.run(
        `INSERT INTO users (email, name, role, auth_provider, github_id, github_username, github_avatar_url) VALUES (?, ?, ?, 'github', ?, ?, ?)`,
        [email, githubUser.name, role, githubUser.id, githubUser.login, githubUser.avatar_url]
      );

      return {
        id: Number(result.lastInsertRowid),
        email,
        name: githubUser.name,
        role,
        createdAt: new Date(),
        authProvider: 'github',
        githubId: githubUser.id,
        githubUsername: githubUser.login,
        githubAvatarUrl: githubUser.avatar_url,
      };
    },

    async storeOAuthToken(userId: number, provider: string, accessToken: string, scope?: string): Promise<void> {
      // Upsert token (replace if exists)
      await db.run(
        `INSERT INTO oauth_tokens (user_id, provider, access_token, scope) VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, provider) DO UPDATE SET access_token = ?, scope = ?, created_at = datetime('now')`,
        [userId, provider, accessToken, scope ?? null, accessToken, scope ?? null]
      );
    },

    async getOAuthToken(userId: number, provider: string): Promise<OAuthToken | null> {
      const row = await db.queryOne<OAuthTokenRow>(
        `SELECT id, user_id, provider, access_token, scope, created_at FROM oauth_tokens WHERE user_id = ? AND provider = ?`,
        [userId, provider]
      );

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        userId: row.user_id,
        provider: row.provider,
        accessToken: row.access_token,
        scope: row.scope,
        createdAt: new Date(row.created_at),
      };
    },

    async deleteOAuthToken(userId: number, provider: string): Promise<void> {
      await db.run(`DELETE FROM oauth_tokens WHERE user_id = ? AND provider = ?`, [userId, provider]);
    },

    async createOAuthState(redirectUri?: string): Promise<string> {
      // Clean up expired states
      await db.run(`DELETE FROM oauth_states WHERE expires_at < datetime('now')`);

      const state = generateToken();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.run(
        `INSERT INTO oauth_states (state, redirect_uri, expires_at) VALUES (?, ?, ?)`,
        [state, redirectUri ?? null, expiresAt.toISOString()]
      );

      return state;
    },

    async validateOAuthState(state: string): Promise<{ redirectUri: string | null } | null> {
      const row = await db.queryOne<OAuthStateRow>(
        `SELECT state, redirect_uri, expires_at FROM oauth_states WHERE state = ? AND expires_at > datetime('now')`,
        [state]
      );

      if (!row) {
        return null;
      }

      // Delete the used state
      await db.run(`DELETE FROM oauth_states WHERE state = ?`, [state]);

      return {
        redirectUri: row.redirect_uri,
      };
    },

    async createSessionForUser(userId: number): Promise<Session> {
      const sessionId = generateSessionId();
      const expiresAt = new Date(Date.now() + sessionExpiry * 1000);

      await db.run(
        `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
        [sessionId, userId, expiresAt.toISOString()]
      );

      return {
        id: sessionId,
        userId,
        expiresAt,
      };
    },
  };
}
