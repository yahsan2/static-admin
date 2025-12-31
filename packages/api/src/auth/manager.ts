import Database from 'better-sqlite3';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { AuthManager, User, Session, UserWithPassword, AuthConfig } from './types';

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
      `);
    },

    async hasAnyUsers(): Promise<boolean> {
      const stmt = db.prepare<[], { count: number }>(`SELECT COUNT(*) as count FROM users`);
      const row = stmt.get();
      return (row?.count ?? 0) > 0;
    },

    async createUser(email: string, password: string, name?: string): Promise<User> {
      const passwordHash = hashPassword(password);

      const stmt = db.prepare(`
        INSERT INTO users (email, password_hash, name)
        VALUES (?, ?, ?)
      `);

      const result = stmt.run(email, passwordHash, name ?? null);

      return {
        id: result.lastInsertRowid as number,
        email,
        name: name ?? null,
        createdAt: new Date(),
      };
    },

    async login(email: string, password: string): Promise<{ user: User; session: Session }> {
      // Get user
      const stmt = db.prepare<[string], UserRow>(`
        SELECT id, email, password_hash, name, created_at
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
        SELECT id, email, name, created_at
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
        createdAt: new Date(row.created_at),
      };
    },

    async getUserByEmail(email: string): Promise<User | null> {
      const stmt = db.prepare<[string], UserRow>(`
        SELECT id, email, name, created_at
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
  };
}

// Types for SQLite rows
interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
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
  created_at: string;
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
