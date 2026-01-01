import { describe, it, expect } from "vitest";
import { defineConfig } from "./config";
import { collection } from "./collection";
import { fields } from "./fields";

describe("defineConfig", () => {
  describe("storage defaults", () => {
    it("should set default contentPath to 'content'", () => {
      const config = defineConfig({
        storage: {},
        collections: {},
      });

      expect(config.storage.contentPath).toBe("content");
    });

    it("should preserve custom contentPath", () => {
      const config = defineConfig({
        storage: { contentPath: "data" },
        collections: {},
      });

      expect(config.storage.contentPath).toBe("data");
    });

    it("should preserve GitHub storage config", () => {
      const config = defineConfig({
        storage: {
          kind: "github",
          owner: "test-owner",
          repo: "test-repo",
          branch: "main",
          contentPath: "content",
        },
        collections: {},
      });

      expect(config.storage.kind).toBe("github");
      expect((config.storage as any).owner).toBe("test-owner");
      expect((config.storage as any).repo).toBe("test-repo");
      expect((config.storage as any).branch).toBe("main");
    });
  });

  describe("git defaults", () => {
    it("should return undefined git when not provided", () => {
      const config = defineConfig({
        storage: {},
        collections: {},
      });

      expect(config.git).toBeUndefined();
    });

    it("should set default autoCommit to false", () => {
      const config = defineConfig({
        storage: {},
        git: {},
        collections: {},
      });

      expect(config.git?.autoCommit).toBe(false);
    });

    it("should preserve custom autoCommit", () => {
      const config = defineConfig({
        storage: {},
        git: { autoCommit: true },
        collections: {},
      });

      expect(config.git?.autoCommit).toBe(true);
    });

    it("should set default commitMessage function", () => {
      const config = defineConfig({
        storage: {},
        git: {},
        collections: {},
      });

      const message = config.git?.commitMessage?.("create", "posts", "my-post");
      expect(message).toBe("create: posts/my-post");
    });

    it("should preserve custom commitMessage function", () => {
      const customMessage = (action: string, collection: string, slug: string) =>
        `[${action.toUpperCase()}] ${collection}: ${slug}`;

      const config = defineConfig({
        storage: {},
        git: { commitMessage: customMessage },
        collections: {},
      });

      const message = config.git?.commitMessage?.("update", "posts", "my-post");
      expect(message).toBe("[UPDATE] posts: my-post");
    });
  });

  describe("auth defaults", () => {
    it("should return undefined auth when not provided", () => {
      const config = defineConfig({
        storage: {},
        collections: {},
      });

      expect(config.auth).toBeUndefined();
    });

    it("should set default sessionExpiry to 7 days", () => {
      const config = defineConfig({
        storage: {},
        auth: { database: "./admin.db" },
        collections: {},
      });

      expect(config.auth?.sessionExpiry).toBe(7 * 24 * 60 * 60); // 604800 seconds
    });

    it("should preserve custom sessionExpiry", () => {
      const config = defineConfig({
        storage: {},
        auth: { database: "./admin.db", sessionExpiry: 3600 },
        collections: {},
      });

      expect(config.auth?.sessionExpiry).toBe(3600);
    });

    it("should preserve database path", () => {
      const config = defineConfig({
        storage: {},
        auth: { database: "/path/to/db.sqlite" },
        collections: {},
      });

      expect(config.auth?.database).toBe("/path/to/db.sqlite");
    });

    it("should preserve remote config", () => {
      const config = defineConfig({
        storage: {},
        auth: {
          database: "./admin.db",
          remote: { url: "libsql://example.turso.io", authToken: "token123" },
        },
        collections: {},
      });

      expect(config.auth?.remote?.url).toBe("libsql://example.turso.io");
      expect(config.auth?.remote?.authToken).toBe("token123");
    });
  });

  describe("collections and singletons", () => {
    it("should preserve collections", () => {
      const postsCollection = collection({
        label: "Posts",
        path: "posts/*",
        slugField: "title",
        schema: {
          title: fields.text({ label: "Title", required: true }),
        },
      });

      const config = defineConfig({
        storage: {},
        collections: { posts: postsCollection },
      });

      expect(config.collections?.posts).toBeDefined();
      expect(config.collections?.posts.kind).toBe("collection");
      expect(config.collections?.posts.config.label).toBe("Posts");
    });

    it("should preserve singletons", () => {
      const config = defineConfig({
        storage: {},
        collections: {},
        singletons: {
          settings: {
            kind: "singleton",
            config: {
              label: "Settings",
              path: "settings",
              schema: {
                siteName: fields.text({ label: "Site Name" }),
              },
            },
          },
        },
      });

      expect(config.singletons?.settings).toBeDefined();
      expect(config.singletons?.settings.kind).toBe("singleton");
    });
  });

  describe("type preservation", () => {
    it("should return config with same type as input", () => {
      const input = {
        storage: { contentPath: "content" },
        git: { autoCommit: true },
        auth: { database: "./admin.db" },
        collections: {},
      };

      const config = defineConfig(input);

      // TypeScript should infer the same type
      expect(typeof config).toBe("object");
      expect(config.storage).toBeDefined();
      expect(config.git).toBeDefined();
      expect(config.auth).toBeDefined();
    });
  });
});
