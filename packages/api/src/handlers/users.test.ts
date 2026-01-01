import { describe, it, expect, vi, type Mock } from "vitest";
import { listUsers, getUser, createUser, updateUser, deleteUser } from "./users";
import type { ApiContext, ApiRequest } from "./types";
import type { AuthManager, User } from "../auth/types";

// Mock user data
const mockAdminUser: User = {
  id: 1,
  email: "admin@example.com",
  name: "Admin User",
  role: "admin",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockEditorUser: User = {
  id: 2,
  email: "editor@example.com",
  name: "Editor User",
  role: "editor",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// Create mock auth manager
function createMockAuthManager(): AuthManager {
  return {
    init: vi.fn(),
    hasAnyUsers: vi.fn(),
    createUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    getUserById: vi.fn(),
    getUserByEmail: vi.fn(),
    updatePassword: vi.fn(),
    deleteUser: vi.fn(),
    listUsers: vi.fn(),
    updateUser: vi.fn(),
    countUsersByRole: vi.fn(),
    createPasswordResetToken: vi.fn(),
    resetPasswordWithToken: vi.fn(),
  };
}

// Create mock context
function createMockContext(overrides?: Partial<ApiContext>): ApiContext {
  return {
    config: {} as any,
    auth: createMockAuthManager(),
    rootDir: "/test",
    storage: {} as any,
    user: mockAdminUser,
    ...overrides,
  };
}

// Create mock request
function createMockRequest(overrides?: Partial<ApiRequest>): ApiRequest {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}

describe("users handlers", () => {
  describe("listUsers", () => {
    it("should return forbidden for non-admin users", async () => {
      const ctx = createMockContext({ user: mockEditorUser });
      const req = createMockRequest();

      const result = await listUsers(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Forbidden: Admin access required");
    });

    it("should return forbidden when user is undefined", async () => {
      const ctx = createMockContext({ user: undefined });
      const req = createMockRequest();

      const result = await listUsers(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Forbidden: Admin access required");
    });

    it("should list users with default pagination", async () => {
      const ctx = createMockContext();
      const mockResult = {
        users: [mockAdminUser, mockEditorUser],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      };
      (ctx.auth.listUsers as Mock).mockResolvedValue(mockResult);

      const req = createMockRequest();

      const result = await listUsers(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(ctx.auth.listUsers).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it("should list users with custom pagination", async () => {
      const ctx = createMockContext();
      (ctx.auth.listUsers as Mock).mockResolvedValue({ users: [], pagination: {} });

      const req = createMockRequest({ query: { page: "2", limit: "10" } });

      const result = await listUsers(ctx, req);

      expect(result.success).toBe(true);
      expect(ctx.auth.listUsers).toHaveBeenCalledWith({ page: 2, limit: 10 });
    });

    it("should return error on failure", async () => {
      const ctx = createMockContext();
      (ctx.auth.listUsers as Mock).mockRejectedValue(new Error("Database error"));

      const req = createMockRequest();

      const result = await listUsers(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("getUser", () => {
    it("should return forbidden for non-admin users", async () => {
      const ctx = createMockContext({ user: mockEditorUser });
      const req = createMockRequest({ params: { id: "1" } });

      const result = await getUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Forbidden: Admin access required");
    });

    it("should return error for invalid user ID", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ params: { id: "invalid" } });

      const result = await getUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid user ID");
    });

    it("should return user not found when user does not exist", async () => {
      const ctx = createMockContext();
      (ctx.auth.getUserById as Mock).mockResolvedValue(null);

      const req = createMockRequest({ params: { id: "999" } });

      const result = await getUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
    });

    it("should return user successfully", async () => {
      const ctx = createMockContext();
      (ctx.auth.getUserById as Mock).mockResolvedValue(mockEditorUser);

      const req = createMockRequest({ params: { id: "2" } });

      const result = await getUser(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEditorUser);
    });

    it("should return error on failure", async () => {
      const ctx = createMockContext();
      (ctx.auth.getUserById as Mock).mockRejectedValue(new Error("Database error"));

      const req = createMockRequest({ params: { id: "1" } });

      const result = await getUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("createUser", () => {
    it("should return forbidden for non-admin users", async () => {
      const ctx = createMockContext({ user: mockEditorUser });
      const req = createMockRequest({
        body: { email: "new@example.com", password: "password123" },
      });

      const result = await createUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Forbidden: Admin access required");
    });

    it("should return error when email is missing", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ body: { password: "password123" } });

      const result = await createUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email and password are required");
    });

    it("should return error when password is missing", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ body: { email: "new@example.com" } });

      const result = await createUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email and password are required");
    });

    it("should return error for invalid role", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({
        body: { email: "new@example.com", password: "password123", role: "superadmin" },
      });

      const result = await createUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid role. Must be admin or editor");
    });

    it("should create user with default editor role", async () => {
      const ctx = createMockContext();
      const newUser = { ...mockEditorUser, id: 3, email: "new@example.com" };
      (ctx.auth.createUser as Mock).mockResolvedValue(newUser);

      const req = createMockRequest({
        body: { email: "new@example.com", password: "password123", name: "New User" },
      });

      const result = await createUser(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(newUser);
      expect(ctx.auth.createUser).toHaveBeenCalledWith(
        "new@example.com",
        "password123",
        "New User",
        "editor"
      );
    });

    it("should create user with specified role", async () => {
      const ctx = createMockContext();
      const newUser = { ...mockAdminUser, id: 3, email: "new@example.com" };
      (ctx.auth.createUser as Mock).mockResolvedValue(newUser);

      const req = createMockRequest({
        body: { email: "new@example.com", password: "password123", role: "admin" },
      });

      const result = await createUser(ctx, req);

      expect(result.success).toBe(true);
      expect(ctx.auth.createUser).toHaveBeenCalledWith(
        "new@example.com",
        "password123",
        undefined,
        "admin"
      );
    });

    it("should return error on failure", async () => {
      const ctx = createMockContext();
      (ctx.auth.createUser as Mock).mockRejectedValue(new Error("Email already exists"));

      const req = createMockRequest({
        body: { email: "new@example.com", password: "password123" },
      });

      const result = await createUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email already exists");
    });
  });

  describe("updateUser", () => {
    it("should return forbidden for non-admin users", async () => {
      const ctx = createMockContext({ user: mockEditorUser });
      const req = createMockRequest({
        params: { id: "2" },
        body: { name: "Updated Name" },
      });

      const result = await updateUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Forbidden: Admin access required");
    });

    it("should return error for invalid user ID", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({
        params: { id: "invalid" },
        body: { name: "Updated Name" },
      });

      const result = await updateUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid user ID");
    });

    it("should return error for invalid role", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({
        params: { id: "2" },
        body: { role: "superadmin" },
      });

      const result = await updateUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid role. Must be admin or editor");
    });

    it("should update user successfully", async () => {
      const ctx = createMockContext();
      const updatedUser = { ...mockEditorUser, name: "Updated Name" };
      (ctx.auth.updateUser as Mock).mockResolvedValue(updatedUser);

      const req = createMockRequest({
        params: { id: "2" },
        body: { name: "Updated Name", email: "updated@example.com", role: "admin" },
      });

      const result = await updateUser(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
      expect(ctx.auth.updateUser).toHaveBeenCalledWith(2, {
        name: "Updated Name",
        email: "updated@example.com",
        role: "admin",
      });
    });

    it("should return error on failure", async () => {
      const ctx = createMockContext();
      (ctx.auth.updateUser as Mock).mockRejectedValue(new Error("User not found"));

      const req = createMockRequest({
        params: { id: "999" },
        body: { name: "Updated" },
      });

      const result = await updateUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
    });
  });

  describe("deleteUser", () => {
    it("should return forbidden for non-admin users", async () => {
      const ctx = createMockContext({ user: mockEditorUser });
      const req = createMockRequest({ params: { id: "1" } });

      const result = await deleteUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Forbidden: Admin access required");
    });

    it("should return error for invalid user ID", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ params: { id: "invalid" } });

      const result = await deleteUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid user ID");
    });

    it("should prevent self-deletion", async () => {
      const ctx = createMockContext({ user: mockAdminUser });
      const req = createMockRequest({ params: { id: "1" } }); // Same as mockAdminUser.id

      const result = await deleteUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot delete your own account");
    });

    it("should return error when user not found", async () => {
      const ctx = createMockContext();
      (ctx.auth.getUserById as Mock).mockResolvedValue(null);

      const req = createMockRequest({ params: { id: "999" } });

      const result = await deleteUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
    });

    it("should prevent deletion of last admin", async () => {
      const ctx = createMockContext();
      const anotherAdmin = { ...mockAdminUser, id: 3 };
      (ctx.auth.getUserById as Mock).mockResolvedValue(anotherAdmin);
      (ctx.auth.countUsersByRole as Mock).mockResolvedValue(1);

      const req = createMockRequest({ params: { id: "3" } });

      const result = await deleteUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot delete the last admin user");
    });

    it("should allow deletion of admin when multiple admins exist", async () => {
      const ctx = createMockContext();
      const anotherAdmin = { ...mockAdminUser, id: 3 };
      (ctx.auth.getUserById as Mock).mockResolvedValue(anotherAdmin);
      (ctx.auth.countUsersByRole as Mock).mockResolvedValue(2);
      (ctx.auth.deleteUser as Mock).mockResolvedValue(undefined);

      const req = createMockRequest({ params: { id: "3" } });

      const result = await deleteUser(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ deleted: true });
      expect(ctx.auth.deleteUser).toHaveBeenCalledWith(3);
    });

    it("should delete editor user successfully", async () => {
      const ctx = createMockContext();
      (ctx.auth.getUserById as Mock).mockResolvedValue(mockEditorUser);
      (ctx.auth.deleteUser as Mock).mockResolvedValue(undefined);

      const req = createMockRequest({ params: { id: "2" } });

      const result = await deleteUser(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ deleted: true });
      expect(ctx.auth.deleteUser).toHaveBeenCalledWith(2);
      // Should not check admin count for non-admin users
      expect(ctx.auth.countUsersByRole).not.toHaveBeenCalled();
    });

    it("should return error on failure", async () => {
      const ctx = createMockContext();
      (ctx.auth.getUserById as Mock).mockResolvedValue(mockEditorUser);
      (ctx.auth.deleteUser as Mock).mockRejectedValue(new Error("Database error"));

      const req = createMockRequest({ params: { id: "2" } });

      const result = await deleteUser(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });
});
