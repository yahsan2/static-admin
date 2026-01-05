import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  login,
  logout,
  getMe,
  checkInstall,
  setupAdmin,
  requestPasswordReset,
  resetPassword,
  changePassword,
} from "./auth";
import type { ApiContext, ApiRequest } from "./types";
import type { AuthManager, User, Session } from "../auth/types";

// Mock user data
const mockUser: User = {
  id: 1,
  email: "test@example.com",
  name: "Test User",
  role: "admin",
  createdAt: new Date("2024-01-01"),
  authProvider: "password",
};

const mockSession: Session = {
  id: "session-1",
  userId: 1,
  expiresAt: new Date("2024-12-31"),
};

// Create mock auth manager
function createMockAuthManager(): AuthManager {
  return {
    initialize: vi.fn(),
    hasAnyUsers: vi.fn(),
    createUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    getUserById: vi.fn(),
    getUserByEmail: vi.fn(),
    updatePassword: vi.fn(),
    verifyPassword: vi.fn(),
    deleteUser: vi.fn(),
    listUsers: vi.fn(),
    updateUser: vi.fn(),
    countUsersByRole: vi.fn(),
    createPasswordResetToken: vi.fn(),
    validatePasswordResetToken: vi.fn(),
    resetPasswordWithToken: vi.fn(),
    getUserByGitHubId: vi.fn(),
    findOrCreateGitHubUser: vi.fn(),
    storeOAuthToken: vi.fn(),
    getOAuthToken: vi.fn(),
    deleteOAuthToken: vi.fn(),
    createOAuthState: vi.fn(),
    validateOAuthState: vi.fn(),
    createSessionForUser: vi.fn(),
  };
}

// Create mock mail service
function createMockMailService() {
  return {
    sendPasswordResetEmail: vi.fn(),
  };
}

// Create mock context
function createMockContext(overrides?: Partial<ApiContext>): ApiContext {
  return {
    config: {} as any,
    auth: createMockAuthManager(),
    rootDir: "/test",
    storage: {} as any,
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

describe("auth handlers", () => {
  describe("login", () => {
    it("should return error when email is missing", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ body: { password: "password123" } });

      const result = await login(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email and password are required");
    });

    it("should return error when password is missing", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ body: { email: "test@example.com" } });

      const result = await login(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email and password are required");
    });

    it("should login successfully with valid credentials", async () => {
      const ctx = createMockContext();
      (ctx.auth.login as Mock).mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      const req = createMockRequest({
        body: { email: "test@example.com", password: "password123" },
      });

      const result = await login(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        user: mockUser,
        sessionId: "session-1",
        expiresAt: mockSession.expiresAt.toISOString(),
      });
    });

    it("should return error on login failure", async () => {
      const ctx = createMockContext();
      (ctx.auth.login as Mock).mockRejectedValue(new Error("Invalid credentials"));

      const req = createMockRequest({
        body: { email: "test@example.com", password: "wrongpassword" },
      });

      const result = await login(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid credentials");
    });

    it("should handle non-Error exceptions", async () => {
      const ctx = createMockContext();
      (ctx.auth.login as Mock).mockRejectedValue("string error");

      const req = createMockRequest({
        body: { email: "test@example.com", password: "password123" },
      });

      const result = await login(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Login failed");
    });
  });

  describe("logout", () => {
    it("should return error when sessionId is missing", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ body: {} });

      const result = await logout(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Session ID is required");
    });

    it("should logout successfully", async () => {
      const ctx = createMockContext();
      (ctx.auth.logout as Mock).mockResolvedValue(undefined);

      const req = createMockRequest({ body: { sessionId: "session-1" } });

      const result = await logout(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ loggedOut: true });
      expect(ctx.auth.logout).toHaveBeenCalledWith("session-1");
    });

    it("should return error on logout failure", async () => {
      const ctx = createMockContext();
      (ctx.auth.logout as Mock).mockRejectedValue(new Error("Session not found"));

      const req = createMockRequest({ body: { sessionId: "invalid-session" } });

      const result = await logout(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Session not found");
    });
  });

  describe("getMe", () => {
    it("should return error when not authenticated", async () => {
      const ctx = createMockContext({ user: undefined });
      const req = createMockRequest();

      const result = await getMe(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return current user when authenticated", async () => {
      const ctx = createMockContext({ user: mockUser });
      const req = createMockRequest();

      const result = await getMe(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });
  });

  describe("checkInstall", () => {
    it("should return needsSetup=true when no users exist", async () => {
      const ctx = createMockContext();
      (ctx.auth.hasAnyUsers as Mock).mockResolvedValue(false);

      const req = createMockRequest();

      const result = await checkInstall(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ installed: false, needsSetup: true });
    });

    it("should return installed=true when users exist", async () => {
      const ctx = createMockContext();
      (ctx.auth.hasAnyUsers as Mock).mockResolvedValue(true);

      const req = createMockRequest();

      const result = await checkInstall(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ installed: true, needsSetup: false });
    });

    it("should return error on check failure", async () => {
      const ctx = createMockContext();
      (ctx.auth.hasAnyUsers as Mock).mockRejectedValue(new Error("Database error"));

      const req = createMockRequest();

      const result = await checkInstall(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("setupAdmin", () => {
    it("should return error when email is missing", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ body: { password: "password123" } });

      const result = await setupAdmin(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email and password are required");
    });

    it("should return error when password is missing", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ body: { email: "admin@example.com" } });

      const result = await setupAdmin(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email and password are required");
    });

    it("should return error when admin already exists", async () => {
      const ctx = createMockContext();
      (ctx.auth.hasAnyUsers as Mock).mockResolvedValue(true);

      const req = createMockRequest({
        body: { email: "admin@example.com", password: "password123" },
      });

      const result = await setupAdmin(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Admin user already exists");
    });

    it("should create admin and auto-login successfully", async () => {
      const ctx = createMockContext();
      (ctx.auth.hasAnyUsers as Mock).mockResolvedValue(false);
      (ctx.auth.createUser as Mock).mockResolvedValue(mockUser);
      (ctx.auth.login as Mock).mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      const req = createMockRequest({
        body: { email: "admin@example.com", password: "password123", name: "Admin" },
      });

      const result = await setupAdmin(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        user: mockUser,
        sessionId: "session-1",
        expiresAt: mockSession.expiresAt.toISOString(),
      });
      expect(ctx.auth.createUser).toHaveBeenCalledWith(
        "admin@example.com",
        "password123",
        "Admin",
        "admin"
      );
    });

    it("should return error on creation failure", async () => {
      const ctx = createMockContext();
      (ctx.auth.hasAnyUsers as Mock).mockResolvedValue(false);
      (ctx.auth.createUser as Mock).mockRejectedValue(new Error("Creation failed"));

      const req = createMockRequest({
        body: { email: "admin@example.com", password: "password123" },
      });

      const result = await setupAdmin(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Creation failed");
    });
  });

  describe("requestPasswordReset", () => {
    it("should return error when email is missing", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ body: {} });

      const result = await requestPasswordReset(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email is required");
    });

    it("should return success even when user not found (security)", async () => {
      const ctx = createMockContext();
      (ctx.auth.createPasswordResetToken as Mock).mockResolvedValue(null);

      const req = createMockRequest({ body: { email: "nonexistent@example.com" } });

      const result = await requestPasswordReset(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        message: "If the email exists, a reset link has been sent",
      });
    });

    it("should send email and return success when mail service available", async () => {
      const mockMail = createMockMailService();
      (mockMail.sendPasswordResetEmail as Mock).mockResolvedValue({ previewUrl: null });

      const ctx = createMockContext({ mail: mockMail as any, baseUrl: "http://localhost:3000" });
      (ctx.auth.createPasswordResetToken as Mock).mockResolvedValue({
        token: "reset-token-123",
        expiresAt: new Date("2024-12-31"),
      });

      const req = createMockRequest({ body: { email: "test@example.com" } });

      const result = await requestPasswordReset(ctx, req);

      expect(result.success).toBe(true);
      expect(mockMail.sendPasswordResetEmail).toHaveBeenCalledWith(
        "test@example.com",
        "http://localhost:3000/reset-password?token=reset-token-123"
      );
    });

    it("should include preview URL when available (Ethereal)", async () => {
      const mockMail = createMockMailService();
      (mockMail.sendPasswordResetEmail as Mock).mockResolvedValue({
        previewUrl: "https://ethereal.email/preview/123",
      });

      const ctx = createMockContext({ mail: mockMail as any, baseUrl: "http://localhost:3000" });
      (ctx.auth.createPasswordResetToken as Mock).mockResolvedValue({
        token: "reset-token-123",
        expiresAt: new Date("2024-12-31"),
      });

      const req = createMockRequest({ body: { email: "test@example.com" } });

      const result = await requestPasswordReset(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any).previewUrl).toBe("https://ethereal.email/preview/123");
    });

    it("should return token directly when no mail service (dev mode)", async () => {
      const ctx = createMockContext({ mail: undefined });
      (ctx.auth.createPasswordResetToken as Mock).mockResolvedValue({
        token: "reset-token-123",
        expiresAt: new Date("2024-12-31"),
      });

      const req = createMockRequest({ body: { email: "test@example.com" } });

      const result = await requestPasswordReset(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any).token).toBe("reset-token-123");
    });

    it("should return error on failure", async () => {
      const ctx = createMockContext();
      (ctx.auth.createPasswordResetToken as Mock).mockRejectedValue(
        new Error("Database error")
      );

      const req = createMockRequest({ body: { email: "test@example.com" } });

      const result = await requestPasswordReset(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("resetPassword", () => {
    it("should return error when token is missing", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ body: { password: "newpassword123" } });

      const result = await resetPassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Token and password are required");
    });

    it("should return error when password is missing", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ body: { token: "reset-token-123" } });

      const result = await resetPassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Token and password are required");
    });

    it("should return error when password is too short", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({
        body: { token: "reset-token-123", password: "short" },
      });

      const result = await resetPassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Password must be at least 8 characters");
    });

    it("should reset password successfully", async () => {
      const ctx = createMockContext();
      (ctx.auth.resetPasswordWithToken as Mock).mockResolvedValue(true);

      const req = createMockRequest({
        body: { token: "reset-token-123", password: "newpassword123" },
      });

      const result = await resetPassword(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: "Password has been reset successfully" });
      expect(ctx.auth.resetPasswordWithToken).toHaveBeenCalledWith(
        "reset-token-123",
        "newpassword123"
      );
    });

    it("should return error for invalid token", async () => {
      const ctx = createMockContext();
      (ctx.auth.resetPasswordWithToken as Mock).mockResolvedValue(false);

      const req = createMockRequest({
        body: { token: "invalid-token", password: "newpassword123" },
      });

      const result = await resetPassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid or expired reset token");
    });

    it("should return error on failure", async () => {
      const ctx = createMockContext();
      (ctx.auth.resetPasswordWithToken as Mock).mockRejectedValue(
        new Error("Database error")
      );

      const req = createMockRequest({
        body: { token: "reset-token-123", password: "newpassword123" },
      });

      const result = await resetPassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("changePassword", () => {
    it("should return error when not authenticated", async () => {
      const ctx = createMockContext({ user: undefined });
      const req = createMockRequest({
        body: { currentPassword: "oldpass123", newPassword: "newpass123" },
      });

      const result = await changePassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return error when currentPassword is missing", async () => {
      const ctx = createMockContext({ user: mockUser });
      const req = createMockRequest({
        body: { newPassword: "newpass123" },
      });

      const result = await changePassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Current password and new password are required");
    });

    it("should return error when newPassword is missing", async () => {
      const ctx = createMockContext({ user: mockUser });
      const req = createMockRequest({
        body: { currentPassword: "oldpass123" },
      });

      const result = await changePassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Current password and new password are required");
    });

    it("should return error when newPassword is too short", async () => {
      const ctx = createMockContext({ user: mockUser });
      const req = createMockRequest({
        body: { currentPassword: "oldpass123", newPassword: "short" },
      });

      const result = await changePassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("New password must be at least 8 characters");
    });

    it("should return error when new password is same as current", async () => {
      const ctx = createMockContext({ user: mockUser });
      const req = createMockRequest({
        body: { currentPassword: "samepassword", newPassword: "samepassword" },
      });

      const result = await changePassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("New password must be different from current password");
    });

    it("should return error for GitHub OAuth users", async () => {
      const githubUser: User = {
        ...mockUser,
        authProvider: "github",
      };
      const ctx = createMockContext({ user: githubUser });
      const req = createMockRequest({
        body: { currentPassword: "oldpass123", newPassword: "newpass123" },
      });

      const result = await changePassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Password change is not available for GitHub OAuth users");
    });

    it("should return error when current password is incorrect", async () => {
      const ctx = createMockContext({ user: mockUser });
      (ctx.auth.verifyPassword as Mock).mockResolvedValue(false);

      const req = createMockRequest({
        body: { currentPassword: "wrongpassword", newPassword: "newpass123" },
      });

      const result = await changePassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Current password is incorrect");
      expect(ctx.auth.verifyPassword).toHaveBeenCalledWith(mockUser.id, "wrongpassword");
    });

    it("should change password successfully", async () => {
      const ctx = createMockContext({ user: mockUser });
      (ctx.auth.verifyPassword as Mock).mockResolvedValue(true);
      (ctx.auth.updatePassword as Mock).mockResolvedValue(undefined);

      const req = createMockRequest({
        body: { currentPassword: "oldpass123", newPassword: "newpass123" },
      });

      const result = await changePassword(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: "Password has been changed successfully" });
      expect(ctx.auth.verifyPassword).toHaveBeenCalledWith(mockUser.id, "oldpass123");
      expect(ctx.auth.updatePassword).toHaveBeenCalledWith(mockUser.id, "newpass123");
    });

    it("should return error on failure", async () => {
      const ctx = createMockContext({ user: mockUser });
      (ctx.auth.verifyPassword as Mock).mockResolvedValue(true);
      (ctx.auth.updatePassword as Mock).mockRejectedValue(new Error("Database error"));

      const req = createMockRequest({
        body: { currentPassword: "oldpass123", newPassword: "newpass123" },
      });

      const result = await changePassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("should handle non-Error exceptions", async () => {
      const ctx = createMockContext({ user: mockUser });
      (ctx.auth.verifyPassword as Mock).mockRejectedValue("string error");

      const req = createMockRequest({
        body: { currentPassword: "oldpass123", newPassword: "newpass123" },
      });

      const result = await changePassword(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to change password");
    });
  });
});
