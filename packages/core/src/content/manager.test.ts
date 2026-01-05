import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { ContentManager } from "./manager";
import type { StorageAdapter, FileContent, DirectoryEntry, WriteResult } from "../storage/adapters/types";
import type { StaticAdminConfig } from "../types/config";

// Create mock storage adapter
function createMockStorage(): StorageAdapter {
  return {
    exists: vi.fn(),
    readDirectory: vi.fn(),
    readFile: vi.fn(),
    readBinaryFile: vi.fn(),
    writeFile: vi.fn(),
    writeBinaryFile: vi.fn(),
    deleteFile: vi.fn(),
    deleteDirectory: vi.fn(),
    createDirectory: vi.fn(),
    batchWrite: vi.fn(),
  };
}

// Create mock config
function createMockConfig(overrides?: Partial<StaticAdminConfig>): StaticAdminConfig {
  return {
    storage: { contentPath: "content" },
    collections: {
      posts: {
        kind: "collection" as const,
        config: {
          label: "Posts",
          path: "posts/*",
          slugField: "title",
          schema: {},
        },
      },
      articles: {
        kind: "collection" as const,
        config: {
          label: "Articles",
          path: "content/articles/*",
          slugField: "slug",
          schema: {},
        },
      },
    },
    ...overrides,
  };
}

// Create sample markdown content
function createMarkdownContent(fields: Record<string, unknown>, content = ""): string {
  const yaml = Object.entries(fields)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
  return `---\n${yaml}\n---\n${content}`;
}

describe("ContentManager", () => {
  let storage: StorageAdapter;
  let config: StaticAdminConfig;
  let manager: ContentManager;

  beforeEach(() => {
    storage = createMockStorage();
    config = createMockConfig();
    manager = new ContentManager({ config, storage });
  });

  describe("getEntry", () => {
    it("should return null when entry does not exist", async () => {
      (storage.readFile as Mock).mockResolvedValue(null);

      const result = await manager.getEntry("posts", "non-existent");

      expect(result).toBeNull();
      expect(storage.readFile).toHaveBeenCalledWith("posts/non-existent/index.md");
    });

    it("should return entry with parsed frontmatter", async () => {
      const mockContent = createMarkdownContent(
        { title: "Hello World", status: "published" },
        "This is the content."
      );
      const mockFile: FileContent = {
        content: mockContent,
        metadata: {
          path: "posts/hello-world/index.md",
          updatedAt: new Date("2024-06-15"),
          createdAt: new Date("2024-06-01"),
        },
      };
      (storage.readFile as Mock).mockResolvedValue(mockFile);

      const result = await manager.getEntry("posts", "hello-world");

      expect(result).not.toBeNull();
      expect(result?.slug).toBe("hello-world");
      expect(result?.collection).toBe("posts");
      expect(result?.data.fields.title).toBe("Hello World");
      expect(result?.data.fields.status).toBe("published");
      expect(result?.data.content).toBe("This is the content.");
      expect(result?.updatedAt).toEqual(new Date("2024-06-15"));
      expect(result?.createdAt).toEqual(new Date("2024-06-01"));
    });

    it("should handle entry with content path prefix", async () => {
      const mockContent = createMarkdownContent({ slug: "test" });
      const mockFile: FileContent = {
        content: mockContent,
        metadata: {
          path: "content/articles/test/index.md",
          updatedAt: new Date(),
          createdAt: new Date(),
        },
      };
      (storage.readFile as Mock).mockResolvedValue(mockFile);

      await manager.getEntry("articles", "test");

      expect(storage.readFile).toHaveBeenCalledWith("content/articles/test/index.md");
    });
  });

  describe("listEntries", () => {
    it("should throw error for non-existent collection", async () => {
      await expect(manager.listEntries("non-existent")).rejects.toThrow(
        'Collection "non-existent" not found'
      );
    });

    it("should return empty list when no entries exist", async () => {
      (storage.readDirectory as Mock).mockResolvedValue([]);

      const result = await manager.listEntries("posts");

      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should list all entries", async () => {
      const mockDirs: DirectoryEntry[] = [
        { name: "hello-world", isDirectory: true, path: "posts/hello-world" },
        { name: "second-post", isDirectory: true, path: "posts/second-post" },
      ];
      (storage.readDirectory as Mock).mockResolvedValue(mockDirs);

      const mockFile1: FileContent = {
        content: createMarkdownContent({ title: "Hello World" }),
        metadata: { path: "posts/hello-world/index.md", updatedAt: new Date("2024-06-15"), createdAt: new Date("2024-06-01") },
      };
      const mockFile2: FileContent = {
        content: createMarkdownContent({ title: "Second Post" }),
        metadata: { path: "posts/second-post/index.md", updatedAt: new Date("2024-06-20"), createdAt: new Date("2024-06-10") },
      };

      (storage.readFile as Mock)
        .mockResolvedValueOnce(mockFile1)
        .mockResolvedValueOnce(mockFile2);

      const result = await manager.listEntries("posts");

      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should skip non-directory entries", async () => {
      const mockEntries: DirectoryEntry[] = [
        { name: "hello-world", isDirectory: true, path: "posts/hello-world" },
        { name: "readme.md", isDirectory: false, path: "posts/readme.md" },
      ];
      (storage.readDirectory as Mock).mockResolvedValue(mockEntries);

      const mockFile: FileContent = {
        content: createMarkdownContent({ title: "Hello World" }),
        metadata: { path: "posts/hello-world/index.md", updatedAt: new Date(), createdAt: new Date() },
      };
      (storage.readFile as Mock).mockResolvedValue(mockFile);

      const result = await manager.listEntries("posts");

      expect(result.entries).toHaveLength(1);
      expect(storage.readFile).toHaveBeenCalledTimes(1);
    });

    it("should apply search filter", async () => {
      const mockDirs: DirectoryEntry[] = [
        { name: "hello-world", isDirectory: true, path: "posts/hello-world" },
        { name: "goodbye-world", isDirectory: true, path: "posts/goodbye-world" },
      ];
      (storage.readDirectory as Mock).mockResolvedValue(mockDirs);

      const mockFile1: FileContent = {
        content: createMarkdownContent({ title: "Hello World" }),
        metadata: { path: "posts/hello-world/index.md", updatedAt: new Date(), createdAt: new Date() },
      };
      const mockFile2: FileContent = {
        content: createMarkdownContent({ title: "Goodbye World" }),
        metadata: { path: "posts/goodbye-world/index.md", updatedAt: new Date(), createdAt: new Date() },
      };

      (storage.readFile as Mock)
        .mockResolvedValueOnce(mockFile1)
        .mockResolvedValueOnce(mockFile2);

      const result = await manager.listEntries("posts", { search: "hello" });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]!.data.fields.title).toBe("Hello World");
      expect(result.total).toBe(1);
    });

    it("should apply pagination", async () => {
      const mockDirs: DirectoryEntry[] = [
        { name: "post-1", isDirectory: true, path: "posts/post-1" },
        { name: "post-2", isDirectory: true, path: "posts/post-2" },
        { name: "post-3", isDirectory: true, path: "posts/post-3" },
      ];
      (storage.readDirectory as Mock).mockResolvedValue(mockDirs);

      (storage.readFile as Mock).mockImplementation((path: string) => {
        const slug = path.split("/")[1];
        return Promise.resolve({
          content: createMarkdownContent({ title: slug }),
          metadata: { path, updatedAt: new Date(), createdAt: new Date() },
        });
      });

      const result = await manager.listEntries("posts", { page: 2, limit: 1 });

      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(3);
    });

    it("should sort entries by updatedAt descending by default", async () => {
      const mockDirs: DirectoryEntry[] = [
        { name: "old-post", isDirectory: true, path: "posts/old-post" },
        { name: "new-post", isDirectory: true, path: "posts/new-post" },
      ];
      (storage.readDirectory as Mock).mockResolvedValue(mockDirs);

      const mockFile1: FileContent = {
        content: createMarkdownContent({ title: "Old Post" }),
        metadata: { path: "posts/old-post/index.md", updatedAt: new Date("2024-01-01"), createdAt: new Date() },
      };
      const mockFile2: FileContent = {
        content: createMarkdownContent({ title: "New Post" }),
        metadata: { path: "posts/new-post/index.md", updatedAt: new Date("2024-06-01"), createdAt: new Date() },
      };

      (storage.readFile as Mock)
        .mockResolvedValueOnce(mockFile1)
        .mockResolvedValueOnce(mockFile2);

      const result = await manager.listEntries("posts");

      expect(result.entries[0]!.data.fields.title).toBe("New Post");
      expect(result.entries[1]!.data.fields.title).toBe("Old Post");
    });

    it("should sort entries ascending when specified", async () => {
      const mockDirs: DirectoryEntry[] = [
        { name: "old-post", isDirectory: true, path: "posts/old-post" },
        { name: "new-post", isDirectory: true, path: "posts/new-post" },
      ];
      (storage.readDirectory as Mock).mockResolvedValue(mockDirs);

      const mockFile1: FileContent = {
        content: createMarkdownContent({ title: "Old Post" }),
        metadata: { path: "posts/old-post/index.md", updatedAt: new Date("2024-01-01"), createdAt: new Date() },
      };
      const mockFile2: FileContent = {
        content: createMarkdownContent({ title: "New Post" }),
        metadata: { path: "posts/new-post/index.md", updatedAt: new Date("2024-06-01"), createdAt: new Date() },
      };

      (storage.readFile as Mock)
        .mockResolvedValueOnce(mockFile1)
        .mockResolvedValueOnce(mockFile2);

      const result = await manager.listEntries("posts", { sortBy: "updatedAt", sortOrder: "asc" });

      expect(result.entries[0]!.data.fields.title).toBe("Old Post");
      expect(result.entries[1]!.data.fields.title).toBe("New Post");
    });

    it("should skip invalid entries silently", async () => {
      const mockDirs: DirectoryEntry[] = [
        { name: "valid-post", isDirectory: true, path: "posts/valid-post" },
        { name: "invalid-post", isDirectory: true, path: "posts/invalid-post" },
      ];
      (storage.readDirectory as Mock).mockResolvedValue(mockDirs);

      const mockFile: FileContent = {
        content: createMarkdownContent({ title: "Valid Post" }),
        metadata: { path: "posts/valid-post/index.md", updatedAt: new Date(), createdAt: new Date() },
      };

      (storage.readFile as Mock)
        .mockResolvedValueOnce(mockFile)
        .mockResolvedValueOnce(null); // Invalid entry returns null

      const result = await manager.listEntries("posts");

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]!.slug).toBe("valid-post");
    });
  });

  describe("createEntry", () => {
    it("should throw error for non-existent collection", async () => {
      await expect(
        manager.createEntry("non-existent", { fields: { title: "Test" } })
      ).rejects.toThrow('Collection "non-existent" not found');
    });

    it("should throw error when slug field is missing", async () => {
      await expect(
        manager.createEntry("posts", { fields: {} })
      ).rejects.toThrow('Slug field "title" is required');
    });

    it("should throw error when entry already exists", async () => {
      (storage.exists as Mock).mockResolvedValue(true);

      await expect(
        manager.createEntry("posts", { fields: { title: "Hello World" } })
      ).rejects.toThrow('Entry "hello-world" already exists in "posts"');
    });

    it("should create entry successfully", async () => {
      (storage.exists as Mock).mockResolvedValue(false);
      const mockWriteResult: WriteResult = { path: "posts/hello-world/index.md" };
      (storage.writeFile as Mock).mockResolvedValue(mockWriteResult);
      (storage.createDirectory as Mock).mockResolvedValue(undefined);

      const result = await manager.createEntry("posts", {
        fields: { title: "Hello World", status: "draft" },
        content: "This is my content.",
      });

      expect(result.slug).toBe("hello-world");
      expect(result.collection).toBe("posts");
      expect(result.data.fields.title).toBe("Hello World");
      expect(result.data.content).toBe("This is my content.");
      expect(storage.writeFile).toHaveBeenCalled();
      expect(storage.createDirectory).toHaveBeenCalledWith("posts/hello-world/images");
    });

    it("should use custom commit message when provided", async () => {
      (storage.exists as Mock).mockResolvedValue(false);
      (storage.writeFile as Mock).mockResolvedValue({ path: "posts/test/index.md" });
      (storage.createDirectory as Mock).mockResolvedValue(undefined);

      await manager.createEntry(
        "posts",
        { fields: { title: "Test" } },
        "Custom commit message"
      );

      expect(storage.writeFile).toHaveBeenCalledWith(
        "posts/test/index.md",
        expect.any(String),
        "Custom commit message"
      );
    });

    it("should generate slug from title with Japanese characters", async () => {
      (storage.exists as Mock).mockResolvedValue(false);
      (storage.writeFile as Mock).mockResolvedValue({ path: "posts/test/index.md" });
      (storage.createDirectory as Mock).mockResolvedValue(undefined);

      const result = await manager.createEntry("posts", {
        fields: { title: "テスト記事 Test" },
      });

      // slugify with strict mode should handle Japanese + English
      expect(result.slug).toBeDefined();
    });
  });

  describe("updateEntry", () => {
    it("should throw error when entry does not exist", async () => {
      (storage.readFile as Mock).mockResolvedValue(null);

      await expect(
        manager.updateEntry("posts", "non-existent", { fields: { title: "Updated" } })
      ).rejects.toThrow('Entry "non-existent" not found in "posts"');
    });

    it("should update entry successfully", async () => {
      const mockFile: FileContent = {
        content: createMarkdownContent({ title: "Original" }),
        metadata: {
          path: "posts/hello-world/index.md",
          updatedAt: new Date("2024-06-15"),
          createdAt: new Date("2024-06-01"),
        },
      };
      (storage.readFile as Mock).mockResolvedValue(mockFile);
      (storage.writeFile as Mock).mockResolvedValue({ path: "posts/hello-world/index.md" });

      const result = await manager.updateEntry("posts", "hello-world", {
        fields: { title: "Updated Title", status: "published" },
        content: "Updated content.",
      });

      expect(result.slug).toBe("hello-world");
      expect(result.data.fields.title).toBe("Updated Title");
      expect(result.createdAt).toEqual(new Date("2024-06-01")); // Preserved
      expect(storage.writeFile).toHaveBeenCalled();
    });

    it("should use custom commit message when provided", async () => {
      const mockFile: FileContent = {
        content: createMarkdownContent({ title: "Original" }),
        metadata: { path: "posts/test/index.md", updatedAt: new Date(), createdAt: new Date() },
      };
      (storage.readFile as Mock).mockResolvedValue(mockFile);
      (storage.writeFile as Mock).mockResolvedValue({ path: "posts/test/index.md" });

      await manager.updateEntry(
        "posts",
        "test",
        { fields: { title: "Updated" } },
        "Custom update message"
      );

      expect(storage.writeFile).toHaveBeenCalledWith(
        "posts/test/index.md",
        expect.any(String),
        "Custom update message"
      );
    });
  });

  describe("deleteEntry", () => {
    it("should throw error when entry does not exist", async () => {
      (storage.exists as Mock).mockResolvedValue(false);

      await expect(manager.deleteEntry("posts", "non-existent")).rejects.toThrow(
        'Entry "non-existent" not found in "posts"'
      );
    });

    it("should delete entry directory successfully", async () => {
      (storage.exists as Mock).mockResolvedValue(true);
      (storage.deleteDirectory as Mock).mockResolvedValue(undefined);

      await manager.deleteEntry("posts", "hello-world");

      expect(storage.deleteDirectory).toHaveBeenCalledWith(
        "posts/hello-world",
        "Delete posts/hello-world"
      );
    });

    it("should use custom commit message when provided", async () => {
      (storage.exists as Mock).mockResolvedValue(true);
      (storage.deleteDirectory as Mock).mockResolvedValue(undefined);

      await manager.deleteEntry("posts", "test", "Remove old post");

      expect(storage.deleteDirectory).toHaveBeenCalledWith(
        "posts/test",
        "Remove old post"
      );
    });
  });

  describe("saveImage", () => {
    it("should save image and return relative path", async () => {
      (storage.writeBinaryFile as Mock).mockResolvedValue({ path: "posts/test/images/photo-123.jpg" });

      const buffer = Buffer.from("fake image data");
      const result = await manager.saveImage("posts", "test", "photo.jpg", buffer);

      expect(result).toMatch(/^images\/photo-\d+\.jpg$/);
      expect(storage.writeBinaryFile).toHaveBeenCalled();
    });

    it("should handle filenames without extension", async () => {
      (storage.writeBinaryFile as Mock).mockResolvedValue({ path: "posts/test/images/image-123" });

      const buffer = Buffer.from("fake image data");
      const result = await manager.saveImage("posts", "test", "image", buffer);

      expect(result).toMatch(/^images\/image-\d+$/);
    });

    it("should slugify filename", async () => {
      (storage.writeBinaryFile as Mock).mockResolvedValue({ path: "posts/test/images/my-photo-123.png" });

      const buffer = Buffer.from("fake image data");
      await manager.saveImage("posts", "test", "My Photo.png", buffer);

      const callArgs = (storage.writeBinaryFile as Mock).mock.calls[0]!;
      const path = callArgs[0] as string;
      expect(path).toMatch(/posts\/test\/images\/my-photo-\d+\.png/);
    });

    it("should use custom commit message when provided", async () => {
      (storage.writeBinaryFile as Mock).mockResolvedValue({ path: "posts/test/images/photo.jpg" });

      const buffer = Buffer.from("fake image data");
      await manager.saveImage("posts", "test", "photo.jpg", buffer, "Upload cover image");

      expect(storage.writeBinaryFile).toHaveBeenCalledWith(
        expect.any(String),
        buffer,
        "Upload cover image"
      );
    });
  });
});
