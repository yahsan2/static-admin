import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateSessionId,
  generateToken,
} from "./password";

describe("password", () => {
  describe("hashPassword", () => {
    it("should produce a hash in salt:hash format", () => {
      const hash = hashPassword("testpassword");
      expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
    });

    it("should produce different hashes for same password (random salt)", () => {
      const hash1 = hashPassword("testpassword");
      const hash2 = hashPassword("testpassword");
      expect(hash1).not.toBe(hash2);
    });

    it("should produce consistent length hashes", () => {
      const hash = hashPassword("testpassword");
      const [salt, hashPart] = hash.split(":");
      expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(hashPart).toHaveLength(128); // 64 bytes = 128 hex chars
    });

    it("should handle empty password", () => {
      const hash = hashPassword("");
      expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
    });

    it("should handle unicode password", () => {
      const hash = hashPassword("パスワード123");
      expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
    });
  });

  describe("verifyPassword", () => {
    it("should return true for correct password", () => {
      const hash = hashPassword("testpassword");
      expect(verifyPassword("testpassword", hash)).toBe(true);
    });

    it("should return false for incorrect password", () => {
      const hash = hashPassword("testpassword");
      expect(verifyPassword("wrongpassword", hash)).toBe(false);
    });

    it("should return false for similar but wrong password", () => {
      const hash = hashPassword("testpassword");
      expect(verifyPassword("testpasswor", hash)).toBe(false);
      expect(verifyPassword("testpassword1", hash)).toBe(false);
      expect(verifyPassword("Testpassword", hash)).toBe(false);
    });

    it("should return false for empty password when original was not empty", () => {
      const hash = hashPassword("testpassword");
      expect(verifyPassword("", hash)).toBe(false);
    });

    it("should return true for empty password when original was empty", () => {
      const hash = hashPassword("");
      expect(verifyPassword("", hash)).toBe(true);
    });

    it("should return false for malformed hash (no colon)", () => {
      expect(verifyPassword("password", "nocolon")).toBe(false);
    });

    it("should return false for empty hash", () => {
      expect(verifyPassword("password", "")).toBe(false);
    });

    it("should return false for hash with only colon", () => {
      expect(verifyPassword("password", ":")).toBe(false);
    });

    it("should handle unicode password verification", () => {
      const hash = hashPassword("パスワード123");
      expect(verifyPassword("パスワード123", hash)).toBe(true);
      expect(verifyPassword("パスワード124", hash)).toBe(false);
    });
  });

  describe("generateSessionId", () => {
    it("should generate 64 character hex string", () => {
      const sessionId = generateSessionId();
      expect(sessionId).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should generate unique session IDs", () => {
      const ids = new Set(
        Array.from({ length: 100 }, () => generateSessionId())
      );
      expect(ids.size).toBe(100);
    });
  });

  describe("generateToken", () => {
    it("should generate 64 character hex string", () => {
      const token = generateToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should generate unique tokens", () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
      expect(tokens.size).toBe(100);
    });
  });
});
