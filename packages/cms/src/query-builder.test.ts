import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryBuilder } from "./query-builder";
import type { ContentManager, Schema, Entry } from "@static-admin/core";

// Mock ContentManager
function createMockContentManager(
  entries: Entry<Schema>[] = []
): ContentManager {
  return {
    listEntries: vi.fn().mockResolvedValue({
      entries,
      pagination: {
        page: 1,
        limit: 100,
        total: entries.length,
        totalPages: 1,
      },
    }),
  } as unknown as ContentManager;
}

// Sample schema
type TestSchema = Schema & {
  title: { type: "text"; label: "Title" };
  status: { type: "select"; label: "Status"; options: [{ value: "draft"; label: "Draft" }, { value: "published"; label: "Published" }] };
  tags: { type: "array"; label: "Tags"; itemField: { type: "text"; label: "Tag" } };
  draft: { type: "checkbox"; label: "Draft" };
};

// Sample entries
function createTestEntry(
  slug: string,
  fields: Record<string, unknown>
): Entry<TestSchema> {
  return {
    slug,
    collection: "posts",
    data: {
      fields: fields as Entry<TestSchema>["data"]["fields"],
    },
    filePath: `posts/${slug}.md`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("QueryBuilder", () => {
  describe("immutability", () => {
    it("should return new instance on filter()", () => {
      const manager = createMockContentManager();
      const builder = new QueryBuilder<TestSchema>(manager, "posts");
      const filtered = builder.filter({ status: "published" });

      expect(filtered).not.toBe(builder);
      expect(filtered).toBeInstanceOf(QueryBuilder);
    });

    it("should return new instance on sort()", () => {
      const manager = createMockContentManager();
      const builder = new QueryBuilder<TestSchema>(manager, "posts");
      const sorted = builder.sort("title", "asc");

      expect(sorted).not.toBe(builder);
    });

    it("should return new instance on limit()", () => {
      const manager = createMockContentManager();
      const builder = new QueryBuilder<TestSchema>(manager, "posts");
      const limited = builder.limit(10);

      expect(limited).not.toBe(builder);
    });

    it("should return new instance on page()", () => {
      const manager = createMockContentManager();
      const builder = new QueryBuilder<TestSchema>(manager, "posts");
      const paged = builder.page(2);

      expect(paged).not.toBe(builder);
    });

    it("should return new instance on search()", () => {
      const manager = createMockContentManager();
      const builder = new QueryBuilder<TestSchema>(manager, "posts");
      const searched = builder.search("hello");

      expect(searched).not.toBe(builder);
    });

    it("should return new instance on includeDrafts()", () => {
      const manager = createMockContentManager();
      const builder = new QueryBuilder<TestSchema>(manager, "posts");
      const withDrafts = builder.includeDrafts();

      expect(withDrafts).not.toBe(builder);
    });

    it("should allow chaining methods", () => {
      const manager = createMockContentManager();
      const builder = new QueryBuilder<TestSchema>(manager, "posts");
      const result = builder
        .filter({ status: "published" })
        .sort("title", "desc")
        .limit(10)
        .page(2)
        .search("hello");

      expect(result).toBeInstanceOf(QueryBuilder);
    });
  });

  describe("all()", () => {
    it("should return all entries", async () => {
      const entries = [
        createTestEntry("post-1", { title: "Post 1", status: "published", draft: false }),
        createTestEntry("post-2", { title: "Post 2", status: "published", draft: false }),
      ];
      const manager = createMockContentManager(entries);
      const builder = new QueryBuilder<TestSchema>(manager, "posts");

      const result = await builder.all();

      expect(result).toHaveLength(2);
      expect(result[0]!.slug).toBe("post-1");
    });

    it("should call contentManager.listEntries with correct options", async () => {
      const manager = createMockContentManager();
      const builder = new QueryBuilder<TestSchema>(manager, "posts");

      await builder.sort("title", "asc").limit(10).page(2).search("hello").all();

      expect(manager.listEntries).toHaveBeenCalledWith("posts", {
        page: 2,
        limit: 10,
        sortBy: "title",
        sortOrder: "asc",
        search: "hello",
      });
    });
  });

  describe("first()", () => {
    it("should return first entry", async () => {
      const entries = [
        createTestEntry("post-1", { title: "Post 1", status: "published", draft: false }),
        createTestEntry("post-2", { title: "Post 2", status: "published", draft: false }),
      ];
      const manager = createMockContentManager(entries);
      const builder = new QueryBuilder<TestSchema>(manager, "posts");

      const result = await builder.first();

      expect(result?.slug).toBe("post-1");
    });

    it("should return null when no entries", async () => {
      const manager = createMockContentManager([]);
      const builder = new QueryBuilder<TestSchema>(manager, "posts");

      const result = await builder.first();

      expect(result).toBeNull();
    });
  });

  describe("count()", () => {
    it("should return total count", async () => {
      const entries = [
        createTestEntry("post-1", { title: "Post 1", status: "published", draft: false }),
        createTestEntry("post-2", { title: "Post 2", status: "published", draft: false }),
      ];
      const manager = createMockContentManager(entries);
      const builder = new QueryBuilder<TestSchema>(manager, "posts");

      const result = await builder.count();

      expect(result).toBe(2);
    });
  });

  describe("paginate()", () => {
    it("should return paginated result", async () => {
      const entries = Array.from({ length: 25 }, (_, i) =>
        createTestEntry(`post-${i + 1}`, {
          title: `Post ${i + 1}`,
          status: "published",
          draft: false,
        })
      );
      const manager = createMockContentManager(entries);
      const builder = new QueryBuilder<TestSchema>(manager, "posts");

      const result = await builder.page(1).paginate(10);

      expect(result.entries).toHaveLength(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(false);
    });

    it("should handle last page correctly", async () => {
      const entries = Array.from({ length: 25 }, (_, i) =>
        createTestEntry(`post-${i + 1}`, {
          title: `Post ${i + 1}`,
          status: "published",
          draft: false,
        })
      );
      const manager = createMockContentManager(entries);
      const builder = new QueryBuilder<TestSchema>(manager, "posts");

      const result = await builder.page(3).paginate(10);

      expect(result.entries).toHaveLength(5);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPrevPage).toBe(true);
    });
  });

  describe("draft filtering", () => {
    it("should filter out drafts by default", async () => {
      const entries = [
        createTestEntry("post-1", { title: "Post 1", draft: false }),
        createTestEntry("post-2", { title: "Post 2", draft: true }),
        createTestEntry("post-3", { title: "Post 3", draft: false }),
      ];
      const manager = createMockContentManager(entries);
      const builder = new QueryBuilder<TestSchema>(manager, "posts");

      const result = await builder.all();

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.slug)).toEqual(["post-1", "post-3"]);
    });

    it("should include drafts when authenticated and includeDrafts is called", async () => {
      const entries = [
        createTestEntry("post-1", { title: "Post 1", draft: false }),
        createTestEntry("post-2", { title: "Post 2", draft: true }),
      ];
      const manager = createMockContentManager(entries);
      const builder = new QueryBuilder<TestSchema>(
        manager,
        "posts",
        undefined,
        true // isAuthenticated
      );

      const result = await builder.includeDrafts().all();

      expect(result).toHaveLength(2);
    });

    it("should still filter drafts when not authenticated even with includeDrafts", async () => {
      const entries = [
        createTestEntry("post-1", { title: "Post 1", draft: false }),
        createTestEntry("post-2", { title: "Post 2", draft: true }),
      ];
      const manager = createMockContentManager(entries);
      const builder = new QueryBuilder<TestSchema>(
        manager,
        "posts",
        undefined,
        false // not authenticated
      );

      const result = await builder.includeDrafts().all();

      expect(result).toHaveLength(1);
    });
  });

  describe("field filtering", () => {
    it("should filter by single field value", async () => {
      const entries = [
        createTestEntry("post-1", { title: "Post 1", status: "published", draft: false }),
        createTestEntry("post-2", { title: "Post 2", status: "draft", draft: false }),
        createTestEntry("post-3", { title: "Post 3", status: "published", draft: false }),
      ];
      const manager = createMockContentManager(entries);
      const builder = new QueryBuilder<TestSchema>(manager, "posts");

      const result = await builder.filter({ status: "published" }).all();

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.slug)).toEqual(["post-1", "post-3"]);
    });

    it("should filter by array field containing value", async () => {
      const entries = [
        createTestEntry("post-1", { title: "Post 1", tags: ["tech", "news"], draft: false }),
        createTestEntry("post-2", { title: "Post 2", tags: ["sports"], draft: false }),
        createTestEntry("post-3", { title: "Post 3", tags: ["tech", "opinion"], draft: false }),
      ];
      const manager = createMockContentManager(entries);
      const builder = new QueryBuilder<TestSchema>(manager, "posts");

      const result = await builder.filter({ tags: "tech" } as any).all();

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.slug)).toEqual(["post-1", "post-3"]);
    });

    it("should filter by multiple conditions", async () => {
      const entries = [
        createTestEntry("post-1", { title: "Post 1", status: "published", tags: ["tech"], draft: false }),
        createTestEntry("post-2", { title: "Post 2", status: "published", tags: ["news"], draft: false }),
        createTestEntry("post-3", { title: "Post 3", status: "draft", tags: ["tech"], draft: false }),
      ];
      const manager = createMockContentManager(entries);
      const builder = new QueryBuilder<TestSchema>(manager, "posts");

      const result = await builder
        .filter({ status: "published" })
        .filter({ tags: "tech" } as any)
        .all();

      expect(result).toHaveLength(1);
      expect(result[0]!.slug).toBe("post-1");
    });
  });
});
