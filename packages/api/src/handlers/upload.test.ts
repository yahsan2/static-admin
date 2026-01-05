import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadImage } from "./upload";
import type { ApiContext, ApiRequest } from "./types";
import type { StaticAdminConfig } from "@static-admin/core";

// Mock saveImage function
const mockSaveImage = vi.fn();

// Mock @static-admin/core
vi.mock("@static-admin/core", () => ({
  ContentManager: class MockContentManager {
    saveImage = mockSaveImage;
  },
}));

// Sample base64 image data (1x1 transparent PNG)
const SAMPLE_BASE64_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const RAW_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Create mock config
function createMockConfig(): StaticAdminConfig {
  return {
    storage: { kind: "local" as const, contentPath: "content" },
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
    },
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

describe("upload handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadImage", () => {
    it("should return error when filename is missing", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
        body: { data: SAMPLE_BASE64_PNG },
      });

      const result = await uploadImage(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing filename or data");
    });

    it("should return error when data is missing", async () => {
      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
        body: { filename: "image.png" },
      });

      const result = await uploadImage(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing filename or data");
    });

    it("should upload image successfully with data URL prefix", async () => {
      mockSaveImage.mockResolvedValue("images/image-123.png");

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "hello-world" },
        body: { filename: "image.png", data: SAMPLE_BASE64_PNG },
      });

      const result = await uploadImage(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any).path).toBe("images/image-123.png");
      expect((result.data as any).url).toBe("/content/posts/hello-world/images/image-123.png");

      // Verify saveImage was called with correct arguments
      expect(mockSaveImage).toHaveBeenCalledWith(
        "posts",
        "hello-world",
        "image.png",
        expect.any(Buffer),
        "Upload image to posts/hello-world"
      );
    });

    it("should upload image successfully with raw base64", async () => {
      mockSaveImage.mockResolvedValue("images/photo-456.jpg");

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test-post" },
        body: { filename: "photo.jpg", data: RAW_BASE64 },
      });

      const result = await uploadImage(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any).path).toBe("images/photo-456.jpg");
    });

    it("should decode base64 data correctly", async () => {
      mockSaveImage.mockResolvedValue("images/test.png");

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
        body: { filename: "test.png", data: SAMPLE_BASE64_PNG },
      });

      await uploadImage(ctx, req);

      // Verify the buffer was created from the base64 data
      const callArgs = mockSaveImage.mock.calls[0]!;
      const buffer = callArgs[3] as Buffer;
      expect(Buffer.isBuffer(buffer)).toBe(true);
      // The decoded buffer should match the raw base64 decoded
      expect(buffer.toString("base64")).toBe(RAW_BASE64);
    });

    it("should return error on save failure", async () => {
      mockSaveImage.mockRejectedValue(new Error("Storage full"));

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
        body: { filename: "image.png", data: SAMPLE_BASE64_PNG },
      });

      const result = await uploadImage(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage full");
    });

    it("should handle non-Error exceptions", async () => {
      mockSaveImage.mockRejectedValue("string error");

      const ctx = createMockContext();
      const req = createMockRequest({
        params: { collection: "posts", slug: "test" },
        body: { filename: "image.png", data: SAMPLE_BASE64_PNG },
      });

      const result = await uploadImage(ctx, req);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to upload image");
    });

    it("should construct correct URL path with content path", async () => {
      const config = createMockConfig();
      config.storage.contentPath = "data/content";

      mockSaveImage.mockResolvedValue("images/file.png");

      const ctx = createMockContext({ config });
      const req = createMockRequest({
        params: { collection: "posts", slug: "my-post" },
        body: { filename: "file.png", data: SAMPLE_BASE64_PNG },
      });

      const result = await uploadImage(ctx, req);

      expect(result.success).toBe(true);
      expect((result.data as any).url).toBe("/data/content/posts/my-post/images/file.png");
    });
  });
});
