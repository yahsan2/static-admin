import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthManager } from "./manager";
import type { DatabaseAdapter, RunResult } from "./adapters/types";

// Mock the adapters module
vi.mock("./adapters", () => ({
  createDatabaseAdapter: vi.fn(),
}));

// Mock password functions for deterministic testing
vi.mock("./password", () => ({
  hashPassword: vi.fn((password: string) => `hashed:${password}`),
  verifyPassword: vi.fn(
    (password: string, hash: string) => hash === `hashed:${password}`
  ),
  generateSessionId: vi.fn(() => "test-session-id-12345"),
  generateToken: vi.fn(() => "test-token-67890"),
}));

import { createDatabaseAdapter } from "./adapters";

// Helper to create mock database adapter
function createMockDatabaseAdapter(): DatabaseAdapter & {
  _reset: () => void;
  _users: Map<number, any>;
  _sessions: Map<string, any>;
  _tokens: Map<string, any>;
} {
  const users = new Map<number, any>();
  const sessions = new Map<string, any>();
  const tokens = new Map<string, any>();
  let nextId = 1;

  return {
    _users: users,
    _sessions: sessions,
    _tokens: tokens,
    _reset: () => {
      users.clear();
      sessions.clear();
      tokens.clear();
      nextId = 1;
    },

    async execute(sql: string): Promise<void> {
      // No-op for schema creation
    },

    async queryOne<T>(sql: string, params?: unknown[]): Promise<T | undefined> {
      if (sql.includes("COUNT(*)")) {
        if (sql.includes("WHERE role = ?")) {
          const role = params?.[0];
          let count = 0;
          users.forEach((u) => {
            if (u.role === role) count++;
          });
          return { count } as T;
        }
        return { count: users.size } as T;
      }

      if (sql.includes("PRAGMA table_info")) {
        return undefined;
      }

      if (sql.includes("FROM users WHERE email = ?")) {
        const email = params?.[0];
        for (const user of users.values()) {
          if (user.email === email) {
            return user as T;
          }
        }
        return undefined;
      }

      if (sql.includes("FROM users WHERE id = ?")) {
        const id = params?.[0] as number;
        const user = users.get(id);
        if (!user) return undefined;
        // If only selecting password_hash, return just that
        if (sql.includes("SELECT password_hash FROM users")) {
          return { password_hash: user.password_hash } as T;
        }
        return user as T;
      }

      if (sql.includes("FROM sessions") && sql.includes("JOIN users")) {
        const sessionId = params?.[0];
        const session = sessions.get(sessionId as string);
        if (!session) return undefined;
        if (new Date(session.expires_at) < new Date()) return undefined;
        const user = users.get(session.user_id);
        if (!user) return undefined;
        return {
          session_id: session.id,
          user_id: session.user_id,
          expires_at: session.expires_at,
          email: user.email,
          name: user.name,
          role: user.role,
          created_at: user.created_at,
        } as T;
      }

      if (sql.includes("FROM sessions WHERE id = ?")) {
        const sessionId = params?.[0];
        const session = sessions.get(sessionId as string);
        if (!session) return undefined;
        return {
          id: session.id,
          user_id: session.user_id,
          expires_at: session.expires_at,
        } as T;
      }

      if (sql.includes("FROM password_reset_tokens WHERE token = ?")) {
        const token = params?.[0];
        const resetToken = tokens.get(token as string);
        if (!resetToken) return undefined;
        if (new Date(resetToken.expires_at) < new Date()) return undefined;
        return resetToken as T;
      }

      return undefined;
    },

    async queryAll<T>(sql: string, params?: unknown[]): Promise<T[]> {
      if (sql.includes("PRAGMA table_info")) {
        return [{ name: "role" }] as T[];
      }

      if (sql.includes("FROM users ORDER BY")) {
        const limit = params?.[0] as number;
        const offset = params?.[1] as number;
        const allUsers = Array.from(users.values());
        return allUsers.slice(offset, offset + limit) as T[];
      }

      return [];
    },

    async run(sql: string, params?: unknown[]): Promise<RunResult> {
      if (sql.includes("INSERT INTO users")) {
        const id = nextId++;
        const user = {
          id,
          email: params?.[0],
          password_hash: params?.[1],
          name: params?.[2],
          role: params?.[3],
          created_at: new Date().toISOString(),
        };
        users.set(id, user);
        return { lastInsertRowid: BigInt(id), changes: 1 };
      }

      if (sql.includes("INSERT INTO sessions")) {
        const session = {
          id: params?.[0],
          user_id: params?.[1],
          expires_at: params?.[2],
        };
        sessions.set(session.id as string, session);
        return { lastInsertRowid: BigInt(0), changes: 1 };
      }

      if (sql.includes("DELETE FROM sessions WHERE id = ?")) {
        sessions.delete(params?.[0] as string);
        return { lastInsertRowid: BigInt(0), changes: 1 };
      }

      if (sql.includes("DELETE FROM sessions WHERE user_id = ?")) {
        const userId = params?.[0];
        for (const [key, session] of sessions) {
          if (session.user_id === userId) {
            sessions.delete(key);
          }
        }
        return { lastInsertRowid: BigInt(0), changes: 1 };
      }

      if (sql.includes("DELETE FROM users WHERE id = ?")) {
        users.delete(params?.[0] as number);
        return { lastInsertRowid: BigInt(0), changes: 1 };
      }

      if (sql.includes("UPDATE sessions SET expires_at")) {
        const sessionId = params?.[1];
        const session = sessions.get(sessionId as string);
        if (session) {
          session.expires_at = params?.[0];
        }
        return { lastInsertRowid: BigInt(0), changes: session ? 1 : 0 };
      }

      if (sql.includes("UPDATE users SET password_hash")) {
        const userId = params?.[1] as number;
        const user = users.get(userId);
        if (user) {
          user.password_hash = params?.[0];
        }
        return { lastInsertRowid: BigInt(0), changes: 1 };
      }

      if (sql.includes("UPDATE users SET")) {
        const userId = params?.[params.length - 1] as number;
        const user = users.get(userId);
        if (user) {
          // Parse updates from SQL
          if (sql.includes("name = ?")) {
            user.name = params?.[0];
          }
          if (sql.includes("email = ?")) {
            const emailIdx = sql.includes("name = ?") ? 1 : 0;
            user.email = params?.[emailIdx];
          }
          if (sql.includes("role = ?")) {
            const roleIdx = params!.length - 2;
            user.role = params?.[roleIdx];
          }
        }
        return { lastInsertRowid: BigInt(0), changes: 1 };
      }

      if (sql.includes("INSERT INTO password_reset_tokens")) {
        const token = {
          token: params?.[0],
          user_id: params?.[1],
          email: params?.[2],
          expires_at: params?.[3],
        };
        tokens.set(token.token as string, token);
        return { lastInsertRowid: BigInt(0), changes: 1 };
      }

      if (sql.includes("DELETE FROM password_reset_tokens WHERE token = ?")) {
        tokens.delete(params?.[0] as string);
        return { lastInsertRowid: BigInt(0), changes: 1 };
      }

      if (sql.includes("DELETE FROM password_reset_tokens WHERE user_id = ?")) {
        const userId = params?.[0];
        for (const [key, token] of tokens) {
          if (token.user_id === userId) {
            tokens.delete(key);
          }
        }
        return { lastInsertRowid: BigInt(0), changes: 1 };
      }

      return { lastInsertRowid: BigInt(0), changes: 0 };
    },

    async close(): Promise<void> {},
  };
}

describe("createAuthManager", () => {
  let mockDb: ReturnType<typeof createMockDatabaseAdapter>;

  beforeEach(() => {
    mockDb = createMockDatabaseAdapter();
    vi.mocked(createDatabaseAdapter).mockReturnValue(mockDb);
  });

  describe("initialization", () => {
    it("should create manager with SQLite config", () => {
      const manager = createAuthManager({ database: "./test.db" });
      expect(manager).toBeDefined();
      expect(createDatabaseAdapter).toHaveBeenCalledWith({
        type: "sqlite",
        path: "./test.db",
      });
    });

    it("should create manager with Turso config", () => {
      const manager = createAuthManager({
        remote: { url: "libsql://test.turso.io", authToken: "token" },
      });
      expect(manager).toBeDefined();
      expect(createDatabaseAdapter).toHaveBeenCalledWith({
        type: "turso",
        url: "libsql://test.turso.io",
        authToken: "token",
      });
    });

    it("should throw error without database or remote config", () => {
      expect(() => createAuthManager({} as any)).toThrow(
        'Auth config must specify either "database" (SQLite path) or "remote" configuration'
      );
    });

    it("should initialize database schema", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      // Schema should be executed (no error thrown)
    });
  });

  describe("hasAnyUsers", () => {
    it("should return false when no users exist", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();

      const result = await manager.hasAnyUsers();
      expect(result).toBe(false);
    });

    it("should return true when users exist", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("test@example.com", "password123");

      const result = await manager.hasAnyUsers();
      expect(result).toBe(true);
    });
  });

  describe("createUser", () => {
    it("should create user with default role", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();

      const user = await manager.createUser("test@example.com", "password123");

      expect(user.email).toBe("test@example.com");
      expect(user.role).toBe("editor");
      expect(user.id).toBeDefined();
    });

    it("should create user with admin role", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();

      const user = await manager.createUser(
        "admin@example.com",
        "password123",
        "Admin",
        "admin"
      );

      expect(user.email).toBe("admin@example.com");
      expect(user.name).toBe("Admin");
      expect(user.role).toBe("admin");
    });
  });

  describe("login", () => {
    it("should login with valid credentials", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("test@example.com", "password123");

      const result = await manager.login("test@example.com", "password123");

      expect(result.user.email).toBe("test@example.com");
      expect(result.session.id).toBe("test-session-id-12345");
      expect(result.session.expiresAt).toBeInstanceOf(Date);
    });

    it("should throw error for invalid email", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();

      await expect(
        manager.login("nonexistent@example.com", "password123")
      ).rejects.toThrow("Invalid email or password");
    });

    it("should throw error for invalid password", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("test@example.com", "password123");

      await expect(
        manager.login("test@example.com", "wrongpassword")
      ).rejects.toThrow("Invalid email or password");
    });
  });

  describe("logout", () => {
    it("should remove session on logout", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("test@example.com", "password123");
      const { session } = await manager.login("test@example.com", "password123");

      await manager.logout(session.id);

      const sessionAfter = await manager.getSession(session.id);
      expect(sessionAfter).toBeNull();
    });
  });

  describe("getSession", () => {
    it("should return session with user", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("test@example.com", "password123");
      const { session } = await manager.login("test@example.com", "password123");

      const result = await manager.getSession(session.id);

      expect(result?.user.email).toBe("test@example.com");
      expect(result?.session.id).toBe(session.id);
    });

    it("should return null for invalid session", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();

      const result = await manager.getSession("invalid-session-id");

      expect(result).toBeNull();
    });
  });

  describe("refreshSession", () => {
    it("should extend session expiry", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("test@example.com", "password123");
      const { session } = await manager.login("test@example.com", "password123");

      const refreshed = await manager.refreshSession(session.id);

      expect(refreshed).not.toBeNull();
      expect(refreshed?.id).toBe(session.id);
    });

    it("should return null for invalid session", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();

      const result = await manager.refreshSession("invalid-session-id");

      expect(result).toBeNull();
    });
  });

  describe("getUserById", () => {
    it("should return user by id", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      const created = await manager.createUser("test@example.com", "password123");

      const user = await manager.getUserById(created.id);

      expect(user?.email).toBe("test@example.com");
    });

    it("should return null for non-existent user", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();

      const user = await manager.getUserById(999);

      expect(user).toBeNull();
    });
  });

  describe("getUserByEmail", () => {
    it("should return user by email", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("test@example.com", "password123");

      const user = await manager.getUserByEmail("test@example.com");

      expect(user?.email).toBe("test@example.com");
    });

    it("should return null for non-existent email", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();

      const user = await manager.getUserByEmail("nonexistent@example.com");

      expect(user).toBeNull();
    });
  });

  describe("updatePassword", () => {
    it("should update user password", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      const user = await manager.createUser("test@example.com", "password123");

      await manager.updatePassword(user.id, "newpassword456");

      // Should be able to login with new password
      const result = await manager.login("test@example.com", "newpassword456");
      expect(result.user.email).toBe("test@example.com");
    });
  });

  describe("verifyPassword", () => {
    it("should return true for correct password", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      const user = await manager.createUser("test@example.com", "password123");

      const result = await manager.verifyPassword(user.id, "password123");

      expect(result).toBe(true);
    });

    it("should return false for incorrect password", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      const user = await manager.createUser("test@example.com", "password123");

      const result = await manager.verifyPassword(user.id, "wrongpassword");

      expect(result).toBe(false);
    });

    it("should return false for non-existent user", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();

      const result = await manager.verifyPassword(999, "password123");

      expect(result).toBe(false);
    });
  });

  describe("deleteUser", () => {
    it("should delete user", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      const user = await manager.createUser("test@example.com", "password123");

      await manager.deleteUser(user.id);

      const deleted = await manager.getUserById(user.id);
      expect(deleted).toBeNull();
    });
  });

  describe("listUsers", () => {
    it("should list users with pagination", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("user1@example.com", "password123");
      await manager.createUser("user2@example.com", "password123");
      await manager.createUser("user3@example.com", "password123");

      const result = await manager.listUsers({ page: 1, limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
    });

    it("should use default pagination values", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("user1@example.com", "password123");

      const result = await manager.listUsers();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });

  describe("updateUser", () => {
    it("should update user name", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      const user = await manager.createUser("test@example.com", "password123");

      const updated = await manager.updateUser(user.id, { name: "New Name" });

      expect(updated.name).toBe("New Name");
    });

    it("should update user role", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      // Create two admins first
      await manager.createUser("admin1@example.com", "password123", "Admin1", "admin");
      const user = await manager.createUser("editor@example.com", "password123");

      const updated = await manager.updateUser(user.id, { role: "admin" });

      expect(updated.role).toBe("admin");
    });

    it("should prevent demoting last admin", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      const admin = await manager.createUser(
        "admin@example.com",
        "password123",
        "Admin",
        "admin"
      );

      await expect(
        manager.updateUser(admin.id, { role: "editor" })
      ).rejects.toThrow("Cannot demote the last admin user");
    });
  });

  describe("countUsersByRole", () => {
    it("should count users by role", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("admin@example.com", "password123", "Admin", "admin");
      await manager.createUser("editor1@example.com", "password123");
      await manager.createUser("editor2@example.com", "password123");

      const adminCount = await manager.countUsersByRole("admin");
      const editorCount = await manager.countUsersByRole("editor");

      expect(adminCount).toBe(1);
      expect(editorCount).toBe(2);
    });
  });

  describe("password reset flow", () => {
    it("should create password reset token", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("test@example.com", "password123");

      const token = await manager.createPasswordResetToken("test@example.com");

      expect(token).not.toBeNull();
      expect(token?.email).toBe("test@example.com");
      expect(token?.token).toBe("test-token-67890");
    });

    it("should return null for non-existent email", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();

      const token = await manager.createPasswordResetToken("nonexistent@example.com");

      expect(token).toBeNull();
    });

    it("should validate password reset token", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("test@example.com", "password123");
      const created = await manager.createPasswordResetToken("test@example.com");

      const validated = await manager.validatePasswordResetToken(created!.token);

      expect(validated).not.toBeNull();
      expect(validated?.email).toBe("test@example.com");
    });

    it("should return null for invalid token", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();

      const result = await manager.validatePasswordResetToken("invalid-token");

      expect(result).toBeNull();
    });

    it("should reset password with token", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();
      await manager.createUser("test@example.com", "password123");
      const resetToken = await manager.createPasswordResetToken("test@example.com");

      const result = await manager.resetPasswordWithToken(
        resetToken!.token,
        "newpassword456"
      );

      expect(result).toBe(true);

      // Should be able to login with new password
      const loginResult = await manager.login("test@example.com", "newpassword456");
      expect(loginResult.user.email).toBe("test@example.com");
    });

    it("should return false for invalid reset token", async () => {
      const manager = createAuthManager({ database: "./test.db" });
      await manager.initialize();

      const result = await manager.resetPasswordWithToken(
        "invalid-token",
        "newpassword"
      );

      expect(result).toBe(false);
    });
  });
});
