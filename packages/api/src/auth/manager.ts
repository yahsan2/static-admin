import Database from 'better-sqlite3';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { AuthManager, User, Session, UserWithPassword, AuthConfig, UserRole, PasswordResetToken } from './types';

const DEFAULT_SESSION_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Create an auth manager with SQLite backend
 */
export function createAuthManager(config: AuthConfig): AuthManager {
  const db = new Database(config.database);
  const sessionExpiry = config.sessionExpiry ?? DEFAULT_SESSION_EXPIRY;

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  return {
    async initialize(): Promise<void> {
      db.exec(`
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
      `);

      // Migration: Add role column if it doesn't exist
      const tableInfo = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
      const hasRoleColumn = tableInfo.some((col) => col.name === 'role');

      if (!hasRoleColumn) {
        db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'editor' NOT NULL`);
        // Set first user as admin (for existing installations)
        db.exec(`UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)`);
      }
    },

    async hasAnyUsers(): Promise<boolean> {
      const stmt = db.prepare<[], { count: number }>(`SELECT COUNT(*) as count FROM users`);
      const row = stmt.get();
      return (row?.count ?? 0) > 0;
    },

    async createUser(email: string, password: string, name?: string, role: UserRole = 'editor'): Promise<User> {
      const passwordHash = hashPassword(password);

      const stmt = db.prepare(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(email, passwordHash, name ?? null, role);

      return {
        id: result.lastInsertRowid as number,
        email,
        name: name ?? null,
        role,
        createdAt: new Date(),
      };
    },

    async login(email: string, password: string): Promise<{ user: User; session: Session }> {
      // Get user
      const stmt = db.prepare<[string], UserRow>(`
        SELECT id, email, password_hash, name, role, created_at
        FROM users
        WHERE email = ?
      `);
      const row = stmt.get(email);

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

      const sessionStmt = db.prepare(`
        INSERT INTO sessions (id, user_id, expires_at)
        VALUES (?, ?, ?)
      `);
      sessionStmt.run(sessionId, row.id, expiresAt.toISOString());

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
      const stmt = db.prepare(`DELETE FROM sessions WHERE id = ?`);
      stmt.run(sessionId);
    },

    async getSession(sessionId: string): Promise<{ user: User; session: Session } | null> {
      // Clean up expired sessions first
      const cleanupStmt = db.prepare(`
        DELETE FROM sessions WHERE expires_at < datetime('now')
      `);
      cleanupStmt.run();

      // Get session with user
      const stmt = db.prepare<[string], SessionWithUserRow>(`
        SELECT
          s.id as session_id,
          s.user_id,
          s.expires_at,
          u.email,
          u.name,
          u.role,
          u.created_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.expires_at > datetime('now')
      `);
      const row = stmt.get(sessionId);

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

      const stmt = db.prepare(`
        UPDATE sessions
        SET expires_at = ?
        WHERE id = ? AND expires_at > datetime('now')
        RETURNING id, user_id, expires_at
      `);
      const row = stmt.get(expiresAt.toISOString(), sessionId) as SessionRow | undefined;

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
      const stmt = db.prepare<[number], UserRow>(`
        SELECT id, email, name, role, created_at
        FROM users
        WHERE id = ?
      `);
      const row = stmt.get(id);

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
      const stmt = db.prepare<[string], UserRow>(`
        SELECT id, email, name, role, created_at
        FROM users
        WHERE email = ?
      `);
      const row = stmt.get(email);

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

      const stmt = db.prepare(`
        UPDATE users
        SET password_hash = ?
        WHERE id = ?
      `);
      stmt.run(passwordHash, userId);
    },

    async deleteUser(userId: number): Promise<void> {
      // Sessions will be deleted via ON DELETE CASCADE
      const stmt = db.prepare(`DELETE FROM users WHERE id = ?`);
      stmt.run(userId);
    },

    async listUsers(options: { page?: number; limit?: number } = {}): Promise<{
      items: User[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
      const page = options.page ?? 1;
      const limit = options.limit ?? 20;
      const offset = (page - 1) * limit;

      // Count total
      const countStmt = db.prepare<[], { count: number }>(`SELECT COUNT(*) as count FROM users`);
      const countResult = countStmt.get();
      const total = countResult?.count ?? 0;

      // Fetch paginated users
      const stmt = db.prepare<[number, number], UserRow>(`
        SELECT id, email, name, role, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `);
      const rows = stmt.all(limit, offset);

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
      const stmt = db.prepare<(string | number)[], UserRow>(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
        RETURNING id, email, name, role, created_at
      `);
      const row = stmt.get(...values);

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
      const stmt = db.prepare<[string], { count: number }>(`
        SELECT COUNT(*) as count FROM users WHERE role = ?
      `);
      const row = stmt.get(role);
      return row?.count ?? 0;
    },

    async createPasswordResetToken(email: string): Promise<PasswordResetToken | null> {
      // Clean up expired tokens first
      db.prepare(`DELETE FROM password_reset_tokens WHERE expires_at < datetime('now')`).run();

      // Find user by email
      const user = await this.getUserByEmail(email);
      if (!user) {
        return null;
      }

      // Delete any existing tokens for this user
      db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?`).run(user.id);

      // Create new token (1 hour expiry)
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const stmt = db.prepare(`
        INSERT INTO password_reset_tokens (token, user_id, email, expires_at)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(token, user.id, email, expiresAt.toISOString());

      return {
        token,
        userId: user.id,
        email,
        expiresAt,
      };
    },

    async validatePasswordResetToken(token: string): Promise<PasswordResetToken | null> {
      const stmt = db.prepare<[string], PasswordResetTokenRow>(`
        SELECT token, user_id, email, expires_at
        FROM password_reset_tokens
        WHERE token = ? AND expires_at > datetime('now')
      `);
      const row = stmt.get(token);

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
      db.prepare(`DELETE FROM password_reset_tokens WHERE token = ?`).run(token);

      // Invalidate all existing sessions for this user
      db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(resetToken.userId);

      return true;
    },
  };
}

// Types for SQLite rows
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

// Password hashing utilities
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) {
    return false;
  }
  const inputHash = scryptSync(password, salt, 64);
  const storedHashBuffer = Buffer.from(hash, 'hex');
  return timingSafeEqual(inputHash, storedHashBuffer);
}

function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}
