import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClientQueryBuilder, type QueryBuilderOptions } from "./query-builder";
import type { Schema } from "@static-admin/core";

// Sample schema type
type TestSchema = Schema & {
  title: { type: "text"; label: "Title" };
  status: { type: "select"; label: "Status" };
};

describe("ClientQueryBuilder", () => {
  let options: QueryBuilderOptions;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    options = {
      baseUrl: "https://api.example.com",
      collection: "posts",
      fetchFn: mockFetch,
      headers: { "X-API-Key": "test-key" },
    };
  });

  describe("immutability", () => {
    it("should return new instance on filter()", () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      const filtered = builder.filter({ status: "published" });

      expect(filtered).not.toBe(builder);
      expect(filtered).toBeInstanceOf(ClientQueryBuilder);
    });

    it("should return new instance on sort()", () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      const sorted = builder.sort("title", "asc");

      expect(sorted).not.toBe(builder);
    });

    it("should return new instance on limit()", () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      const limited = builder.limit(10);

      expect(limited).not.toBe(builder);
    });

    it("should return new instance on page()", () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      const paged = builder.page(2);

      expect(paged).not.toBe(builder);
    });

    it("should return new instance on search()", () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      const searched = builder.search("hello");

      expect(searched).not.toBe(builder);
    });

    it("should return new instance on preview()", () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      const preview = builder.preview();

      expect(preview).not.toBe(builder);
    });

    it("should allow chaining methods", () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      const result = builder
        .filter({ status: "published" })
        .sort("title", "desc")
        .limit(10)
        .page(2)
        .search("hello")
        .preview();

      expect(result).toBeInstanceOf(ClientQueryBuilder);
    });
  });

  describe("query string building", () => {
    it("should build filter parameters correctly", async () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      await builder.filter({ status: "published" }).all();

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      const decodedUrl = decodeURIComponent(calledUrl);
      expect(decodedUrl).toContain("filter[status]=published");
    });

    it("should build multiple filter parameters", async () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      await builder.filter({ status: "published", title: "Hello" } as any).all();

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      const decodedUrl = decodeURIComponent(calledUrl);
      expect(decodedUrl).toContain("filter[status]=published");
      expect(decodedUrl).toContain("filter[title]=Hello");
    });

    it("should build sort parameters correctly", async () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      await builder.sort("title", "asc").all();

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("sort=title");
      expect(calledUrl).toContain("order=asc");
    });

    it("should default sort order to desc", async () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      await builder.sort("title").all();

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("order=desc");
    });

    it("should build pagination parameters correctly", async () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      await builder.page(3).limit(25).all();

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("page=3");
      expect(calledUrl).toContain("limit=25");
    });

    it("should build search parameter correctly", async () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      await builder.search("hello world").all();

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("search=hello+world");
    });

    it("should build preview parameter correctly", async () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      await builder.preview().all();

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("preview=true");
    });

    it("should build complex query string", async () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      await builder
        .filter({ status: "published" })
        .sort("title", "asc")
        .limit(10)
        .page(2)
        .search("test")
        .preview()
        .all();

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      const decodedUrl = decodeURIComponent(calledUrl);
      expect(decodedUrl).toContain("filter[status]=published");
      expect(decodedUrl).toContain("sort=title");
      expect(decodedUrl).toContain("order=asc");
      expect(decodedUrl).toContain("limit=10");
      expect(decodedUrl).toContain("page=2");
      expect(decodedUrl).toContain("search=test");
      expect(decodedUrl).toContain("preview=true");
    });
  });

  describe("request headers", () => {
    it("should include custom headers", async () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      await builder.all();

      const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
      expect(calledOptions.headers).toMatchObject({
        "X-API-Key": "test-key",
        Accept: "application/json",
      });
    });

    it("should include credentials", async () => {
      const builder = new ClientQueryBuilder<TestSchema>(options);
      await builder.all();

      const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
      expect(calledOptions.credentials).toBe("include");
    });
  });

  describe("all()", () => {
    it("should return data array from response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ slug: "post-1" }, { slug: "post-2" }],
          }),
      });

      const builder = new ClientQueryBuilder<TestSchema>(options);
      const result = await builder.all();

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe("post-1");
    });
  });

  describe("get()", () => {
    it("should fetch single entry by slug", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { slug: "my-post", data: { fields: { title: "My Post" } } },
          }),
      });

      const builder = new ClientQueryBuilder<TestSchema>(options);
      const result = await builder.get("my-post");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/posts/my-post",
        expect.any(Object)
      );
      expect(result?.slug).toBe("my-post");
    });

    it("should include preview parameter when in preview mode", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { slug: "my-post" } }),
      });

      const builder = new ClientQueryBuilder<TestSchema>(options);
      await builder.preview().get("my-post");

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("?preview=true");
    });

    it("should return null for 404 response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "HTTP 404" }),
      });

      const builder = new ClientQueryBuilder<TestSchema>(options);
      const result = await builder.get("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("first()", () => {
    it("should return first entry with limit 1", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ slug: "first-post" }],
          }),
      });

      const builder = new ClientQueryBuilder<TestSchema>(options);
      const result = await builder.first();

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=1");
      expect(result?.slug).toBe("first-post");
    });

    it("should return null when no entries", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const builder = new ClientQueryBuilder<TestSchema>(options);
      const result = await builder.first();

      expect(result).toBeNull();
    });
  });

  describe("paginate()", () => {
    it("should return full response with pagination", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ slug: "post-1" }],
            pagination: {
              page: 1,
              limit: 10,
              total: 50,
              totalPages: 5,
            },
          }),
      });

      const builder = new ClientQueryBuilder<TestSchema>(options);
      const result = await builder.paginate(10);

      expect(result.data).toHaveLength(1);
      expect(result.pagination?.total).toBe(50);
    });

    it("should apply limit from parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [], pagination: {} }),
      });

      const builder = new ClientQueryBuilder<TestSchema>(options);
      await builder.paginate(25);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=25");
    });
  });

  describe("error handling", () => {
    it("should throw on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });

      const builder = new ClientQueryBuilder<TestSchema>(options);
      await expect(builder.all()).rejects.toThrow("Unauthorized");
    });

    it("should use HTTP status as fallback error message", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      const builder = new ClientQueryBuilder<TestSchema>(options);
      await expect(builder.all()).rejects.toThrow("HTTP 500");
    });
  });
});
