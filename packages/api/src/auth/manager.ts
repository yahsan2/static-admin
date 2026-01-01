import type { AuthManager, User, Session, UserRole, PasswordResetToken, AuthConfig } from './types';
import type { DatabaseAdapter } from './adapters/types';
import { createDatabaseAdapter } from './adapters';
import { hashPassword, verifyPassword, generateSessionId, generateToken } from './password';

const DEFAULT_SESSION_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

// SQL table definitions
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'editor' NOT NULL,
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
`;

// Types for database rows
interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  role: string;
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
  created_at: string;
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

      if (!hasRoleColumn) {
        await db.execute(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'editor' NOT NULL`);
        // Set first user as admin (for existing installations)
        await db.execute(`UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)`);
      }
    },

    async hasAnyUsers(): Promise<boolean> {
      const row = await db.queryOne<CountRow>(`SELECT COUNT(*) as count FROM users`);
      return (row?.count ?? 0) > 0;
    },

    async createUser(email: string, password: string, name?: string, role: UserRole = 'editor'): Promise<User> {
      const passwordHash = hashPassword(password);

      const result = await db.run(
        `INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
        [email, passwordHash, name ?? null, role]
      );

      return {
        id: Number(result.lastInsertRowid),
        email,
        name: name ?? null,
        role,
        createdAt: new Date(),
      };
    },

    async login(email: string, password: string): Promise<{ user: User; session: Session }> {
      // Get user
      const row = await db.queryOne<UserRow>(
        `SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = ?`,
        [email]
      );

      if (!row) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      if (!verifyPassword(password, row.password_hash)) {
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
        `SELECT id, email, name, role, created_at FROM users WHERE id = ?`,
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
      };
    },

    async getUserByEmail(email: string): Promise<User | null> {
      const row = await db.queryOne<UserRow>(
        `SELECT id, email, name, role, created_at FROM users WHERE email = ?`,
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
      };
    },

    async updatePassword(userId: number, newPassword: string): Promise<void> {
      const passwordHash = hashPassword(newPassword);
      await db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, userId]);
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
        `SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return {
        items: rows.map((row) => ({
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role as UserRole,
          createdAt: new Date(row.created_at),
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
        `SELECT id, email, name, role, created_at FROM users WHERE id = ?`,
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
  };
}
