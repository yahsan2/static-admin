import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ApiContext, ApiRequest } from "./types";
import type { StaticAdminConfig } from "@static-admin/core";

// Mock functions - declared before vi.mock for hoisting
const mockFns = {
  listEntries: vi.fn(),
  getEntry: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  validateEntry: vi.fn(),
  getDefaultValues: vi.fn(),
};

// Mock @static-admin/core modules
vi.mock("@static-admin/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@static-admin/core")>();

  return {
    ...actual,
    ContentManager: class MockContentManager {
      listEntries(...args: unknown[]) { return mockFns.listEntries(...args); }
      getEntry(...args: unknown[]) { return mockFns.getEntry(...args); }
      createEntry(...args: unknown[]) { return mockFns.createEntry(...args); }
      updateEntry(...args: unknown[]) { return mockFns.updateEntry(...args); }
      deleteEntry(...args: unknown[]) { return mockFns.deleteEntry(...args); }
    },
    GitManager: class MockGitManager {
      add = vi.fn();
      commit = vi.fn();
    },
    validateEntry: (...args: unknown[]) => mockFns.validateEntry(...args),
    getDefaultValues: (...args: unknown[]) => mockFns.getDefaultValues(...args),
  };
});

// Import handlers after mocking
import {
  getSchema,
  listCollections,
  getCollection,
  listEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
} from "./content";

// Sample config
function createMockConfig(): StaticAdminConfig {
  return {
    storage: { kind: "local" as const, contentPath: "content" },
    collections: {
      posts: {
        kind: "collection" as const,
        config: {
          label: "Posts",
          description: "Blog posts",
          path: "posts/*",
          slugField: "title",
          schema: {
            title: { type: "text", label: "Title", required: true },
            content: { type: "markdoc", label: "Content" },
          },
        },
      },
      articles: {
        kind: "collection" as const,
        config: {
          label: "Articles",
          path: "articles/*",
          slugField: "slug",
          schema: {},
        },
      },
    },
    singletons: {
      settings: {
        kind: "singleton" as const,
        config: {
          label: "Settings",
          description: "Site settings",
          path: "settings",
          schema: {
            siteName: { type: "text", label: "Site Name" },
          },
        },
      },
    },
    auth: { database: "./admin.db" },
  };
}

// Create mock context
function createMockContext(overrides?: Partial<ApiContext>): ApiContext {
  return {
    config: createMockConfig(),
    auth: {} as any,
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

describe("content handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSchema", () => {
    it("should return schema with collections and singletons", async () => {
      const ctx = createMockContext();
      const req = createMockRequest();

      const result = await getSchema(ctx, req);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("collections");
      expect(result.data).toHaveProperty("singletons");
      expect(result.data).toHaveProperty("storage");
      expect((result.data as any).collections.posts.kind).toBe("collection");
      expect((result.data as any).singletons.settings.kind).toBe("singleton");
    });

    it("should return auth boolean indicating if auth is enabled", async () => {
      const ctx = createMockContext();
      const req = createMockRequest();

      const result = await getSchema(ctx, req);

      expect((result.data as any).auth).toBe(true);
    });

    it("should return auth false when no auth config", async () => {
      const config = createMockConfig();
      delete config.auth;
      const ctx = createMockContext({ config });
      const req = createMockRequest();

      const result = await getSchema(ctx, req);

      expect((result.data as any).auth).toBe(false);
    });
  });

  describe("listCollections", () => {
    it("should return all collections", async () => {
      const ctx = createMockContext();
      const req = createMockRequest();

      const result = await listCollections(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any)).toHaveLength(2);
      expect((result.data as any)[0]).toHaveProperty("name");
      expect((result.data as any)[0]).toHaveProperty("label");
    });

    it("should return empty array when no collections", async () => {
      const config = createMockConfig();
      config.collections = {};
      const ctx = createMockContext({ config });
      const req = createMockRequest();

      const result = await listCollections(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any)).toHaveLength(0);
    });
  });

  describe("getCollection", () => {
    it("should return collection when found", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ params: { collection: "posts" } });

      const result = await getCollection(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any).name).toBe("posts");
      expect((result.data as any).label).toBe("Posts");
      expect((result.data as any).slugField).toBe("title");
    });

    it("should return error when collection not found", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({ params: { collection: "non-existent" } });

      const result = await getCollection(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Collection "non-existent" not found');
    });
  });

  describe("listEntries", () => {
    it("should list entries with pagination", async () => {
      const mockEntries = [
        { slug: "post-1", data: { fields: { title: "Post 1" } } },
        { slug: "post-2", data: { fields: { title: "Post 2" } } },
      ];
      mockFns.listEntries.mockResolvedValue({ entries: mockEntries, total: 2 });

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts" },
        query: { page: "1", limit: "10" },
      });

      const result = await listEntries(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any).items).toHaveLength(2);
      expect((result.data as any).pagination.page).toBe(1);
      expect((result.data as any).pagination.limit).toBe(10);
      expect((result.data as any).pagination.total).toBe(2);
    });

    it("should use default pagination when not specified", async () => {
      mockFns.listEntries.mockResolvedValue({ entries: [], total: 0 });

      const ctx = createMockContext();
      const req = createMockRequest({ params: { collection: "posts" } });

      const result = await listEntries(ctx, req);

      expect((result.data as any).pagination.page).toBe(1);
      expect((result.data as any).pagination.limit).toBe(20);
    });

    it("should return error on failure", async () => {
      mockFns.listEntries.mockRejectedValue(new Error("Database error"));

      const ctx = createMockContext();
      const req = createMockRequest({ params: { collection: "posts" } });

      const result = await listEntries(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("getEntry", () => {
    it("should return entry when found", async () => {
      const mockEntry = {
        slug: "hello-world",
        data: { fields: { title: "Hello World" }, content: "Content" },
      };
      mockFns.getEntry.mockResolvedValue(mockEntry);

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "hello-world" },
      });

      const result = await getEntry(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any).slug).toBe("hello-world");
    });

    it("should return error when entry not found", async () => {
      mockFns.getEntry.mockResolvedValue(null);

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "non-existent" },
      });

      const result = await getEntry(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entry "non-existent" not found');
    });

    it("should return error on failure", async () => {
      mockFns.getEntry.mockRejectedValue(new Error("Read error"));

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
      });

      const result = await getEntry(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Read error");
    });
  });

  describe("createEntry", () => {
    it("should return error when collection not found", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "non-existent" },
        body: { fields: { title: "Test" } },
      });

      const result = await createEntry(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Collection "non-existent" not found');
    });

    it("should return validation error when validation fails", async () => {
      mockFns.getDefaultValues.mockReturnValue({});
      mockFns.validateEntry.mockReturnValue({
        success: false,
        errors: { issues: [{ message: "Title is required" }] },
      });

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts" },
        body: { fields: {} },
      });

      const result = await createEntry(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation failed");
      expect(result.error).toContain("Title is required");
    });

    it("should create entry successfully", async () => {
      mockFns.getDefaultValues.mockReturnValue({});
      mockFns.validateEntry.mockReturnValue({ success: true });
      mockFns.createEntry.mockResolvedValue({
        slug: "new-post",
        data: { fields: { title: "New Post" } },
      });

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts" },
        body: { fields: { title: "New Post" }, content: "Content here" },
      });

      const result = await createEntry(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any).slug).toBe("new-post");
    });

    it("should merge with default values", async () => {
      mockFns.getDefaultValues.mockReturnValue({ status: "draft" });
      mockFns.validateEntry.mockReturnValue({ success: true });
      mockFns.createEntry.mockResolvedValue({ slug: "test" });

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts" },
        body: { fields: { title: "Test" } },
      });

      await createEntry(ctx, req);

      expect(mockFns.validateEntry).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fields: expect.objectContaining({ status: "draft", title: "Test" }),
        })
      );
    });

    it("should return error on creation failure", async () => {
      mockFns.getDefaultValues.mockReturnValue({});
      mockFns.validateEntry.mockReturnValue({ success: true });
      mockFns.createEntry.mockRejectedValue(new Error("Entry already exists"));

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts" },
        body: { fields: { title: "Test" } },
      });

      const result = await createEntry(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Entry already exists");
    });
  });

  describe("updateEntry", () => {
    it("should return error when collection not found", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "non-existent", slug: "test" },
        body: { fields: { title: "Updated" } },
      });

      const result = await updateEntry(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Collection "non-existent" not found');
    });

    it("should return error when entry not found", async () => {
      mockFns.getEntry.mockResolvedValue(null);

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "non-existent" },
        body: { fields: { title: "Updated" } },
      });

      const result = await updateEntry(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entry "non-existent" not found');
    });

    it("should return validation error when validation fails", async () => {
      mockFns.getEntry.mockResolvedValue({
        data: { fields: { title: "Original" }, content: "Original content" },
      });
      mockFns.validateEntry.mockReturnValue({
        success: false,
        errors: { issues: [{ message: "Invalid field" }] },
      });

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
        body: { fields: { title: "" } },
      });

      const result = await updateEntry(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation failed");
    });

    it("should update entry successfully", async () => {
      mockFns.getEntry.mockResolvedValue({
        data: { fields: { title: "Original" }, content: "Original content" },
      });
      mockFns.validateEntry.mockReturnValue({ success: true });
      mockFns.updateEntry.mockResolvedValue({
        slug: "test",
        data: { fields: { title: "Updated" } },
      });

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
        body: { fields: { title: "Updated" } },
      });

      const result = await updateEntry(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any).data.fields.title).toBe("Updated");
    });

    it("should merge with existing entry data", async () => {
      mockFns.getEntry.mockResolvedValue({
        data: { fields: { title: "Original", status: "draft" }, content: "Content" },
      });
      mockFns.validateEntry.mockReturnValue({ success: true });
      mockFns.updateEntry.mockResolvedValue({ slug: "test" });

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
        body: { fields: { title: "Updated" } }, // Only updating title
      });

      await updateEntry(ctx, req);

      expect(mockFns.validateEntry).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fields: expect.objectContaining({ title: "Updated", status: "draft" }),
          content: "Content",
        })
      );
    });

    it("should return error on update failure", async () => {
      mockFns.getEntry.mockResolvedValue({
        data: { fields: {}, content: "" },
      });
      mockFns.validateEntry.mockReturnValue({ success: true });
      mockFns.updateEntry.mockRejectedValue(new Error("Write error"));

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
        body: { fields: { title: "Updated" } },
      });

      const result = await updateEntry(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Write error");
    });
  });

  describe("deleteEntry", () => {
    it("should delete entry successfully", async () => {
      mockFns.deleteEntry.mockResolvedValue(undefined);

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
      });

      const result = await deleteEntry(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any).deleted).toBe(true);
    });

    it("should return error when entry not found", async () => {
      mockFns.deleteEntry.mockRejectedValue(new Error('Entry "test" not found'));

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
      });

      const result = await deleteEntry(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entry "test" not found');
    });

    it("should return error on delete failure", async () => {
      mockFns.deleteEntry.mockRejectedValue(new Error("Delete error"));

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
      });

      const result = await deleteEntry(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete error");
    });
  });
});
