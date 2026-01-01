import { describe, it, expect } from "vitest";
import { collection, singleton } from "./collection";
import { fields } from "./fields";

describe("collection", () => {
  it("should create collection with kind 'collection'", () => {
    const posts = collection({
      label: "Posts",
      path: "posts/*",
      slugField: "title",
      schema: {
        title: fields.text({ label: "Title", required: true }),
      },
    });

    expect(posts.kind).toBe("collection");
  });

  it("should preserve all config options", () => {
    const posts = collection({
      label: "Blog Posts",
      path: "content/posts/*",
      slugField: "slug",
      schema: {
        title: fields.text({ label: "Title", required: true }),
        slug: fields.slug({ label: "Slug", from: "title" }),
        date: fields.date({ label: "Date" }),
        content: fields.markdoc({ label: "Content" }),
      },
    });

    expect(posts.config.label).toBe("Blog Posts");
    expect(posts.config.path).toBe("content/posts/*");
    expect(posts.config.slugField).toBe("slug");
    expect(posts.config.schema.title.type).toBe("text");
    expect(posts.config.schema.slug.type).toBe("slug");
    expect(posts.config.schema.date.type).toBe("date");
    expect(posts.config.schema.content.type).toBe("markdoc");
  });

  it("should preserve schema with all field types", () => {
    const articles = collection({
      label: "Articles",
      path: "articles/*",
      slugField: "title",
      schema: {
        title: fields.text({ label: "Title", required: true }),
        slug: fields.slug({ label: "Slug", from: "title" }),
        excerpt: fields.textarea({ label: "Excerpt" }),
        publishedAt: fields.date({ label: "Published At" }),
        createdAt: fields.datetime({ label: "Created At" }),
        featured: fields.checkbox({ label: "Featured" }),
        status: fields.select({
          label: "Status",
          options: [
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
          ],
        }),
        author: fields.relation({ label: "Author", collection: "authors" }),
        cover: fields.image({ label: "Cover Image" }),
        tags: fields.array({
          label: "Tags",
          itemField: fields.text({ label: "Tag" }),
        }),
        body: fields.markdoc({ label: "Body" }),
      },
    });

    expect(Object.keys(articles.config.schema)).toHaveLength(11);
    expect(articles.config.schema.status.type).toBe("select");
    expect(articles.config.schema.author.type).toBe("relation");
    expect(articles.config.schema.cover.type).toBe("image");
    expect(articles.config.schema.tags.type).toBe("array");
  });
});

describe("singleton", () => {
  it("should create singleton with kind 'singleton'", () => {
    const settings = singleton({
      label: "Settings",
      path: "settings",
      schema: {
        siteName: fields.text({ label: "Site Name", required: true }),
      },
    });

    expect(settings.kind).toBe("singleton");
  });

  it("should preserve all config options", () => {
    const settings = singleton({
      label: "Site Settings",
      path: "config/settings",
      schema: {
        siteName: fields.text({ label: "Site Name", required: true }),
        description: fields.textarea({ label: "Description" }),
        logo: fields.image({ label: "Logo" }),
        socialLinks: fields.array({
          label: "Social Links",
          itemField: fields.text({ label: "URL" }),
        }),
      },
    });

    expect(settings.config.label).toBe("Site Settings");
    expect(settings.config.path).toBe("config/settings");
    expect(Object.keys(settings.config.schema)).toHaveLength(4);
    expect(settings.config.schema.siteName.type).toBe("text");
    expect(settings.config.schema.description.type).toBe("textarea");
    expect(settings.config.schema.logo.type).toBe("image");
    expect(settings.config.schema.socialLinks.type).toBe("array");
  });

  it("should not have slugField (unlike collection)", () => {
    const homepage = singleton({
      label: "Homepage",
      path: "homepage",
      schema: {
        title: fields.text({ label: "Title" }),
      },
    });

    // Singleton doesn't require slugField
    expect(homepage.config).not.toHaveProperty("slugField");
  });
});
