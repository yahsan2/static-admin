import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createValidator, validateEntry, getDefaultValues } from "./validator";
import type { Schema } from "../types/fields";

describe("createValidator", () => {
  describe("text field", () => {
    it("should validate text field", () => {
      const schema: Schema = {
        title: { type: "text", label: "Title", required: true },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ title: "Hello" }).success).toBe(true);
      expect(validator.safeParse({ title: "" }).success).toBe(true);
      expect(validator.safeParse({}).success).toBe(false);
    });

    it("should validate text field with minLength", () => {
      const schema: Schema = {
        title: {
          type: "text",
          label: "Title",
          required: true,
          validation: { minLength: 5 },
        },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ title: "Hello" }).success).toBe(true);
      expect(validator.safeParse({ title: "Hi" }).success).toBe(false);
    });

    it("should validate text field with maxLength", () => {
      const schema: Schema = {
        title: {
          type: "text",
          label: "Title",
          required: true,
          validation: { maxLength: 10 },
        },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ title: "Hello" }).success).toBe(true);
      expect(validator.safeParse({ title: "Hello World!" }).success).toBe(
        false
      );
    });

    it("should validate text field with pattern", () => {
      const schema: Schema = {
        email: {
          type: "text",
          label: "Email",
          required: true,
          validation: { pattern: "^[a-z]+@[a-z]+\\.[a-z]+$" },
        },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ email: "test@example.com" }).success).toBe(
        true
      );
      expect(validator.safeParse({ email: "invalid" }).success).toBe(false);
    });

    it("should make text field optional when required is false", () => {
      const schema: Schema = {
        title: { type: "text", label: "Title", required: false },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({}).success).toBe(true);
      expect(validator.safeParse({ title: undefined }).success).toBe(true);
    });
  });

  describe("slug field", () => {
    it("should validate slug format", () => {
      const schema: Schema = {
        slug: { type: "slug", label: "Slug", from: "title", required: true },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ slug: "valid-slug" }).success).toBe(true);
      expect(validator.safeParse({ slug: "also-valid-123" }).success).toBe(
        true
      );
      expect(validator.safeParse({ slug: "simple" }).success).toBe(true);
    });

    it("should reject invalid slug formats", () => {
      const schema: Schema = {
        slug: { type: "slug", label: "Slug", from: "title", required: true },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ slug: "Invalid Slug" }).success).toBe(false);
      expect(validator.safeParse({ slug: "UPPERCASE" }).success).toBe(false);
      expect(validator.safeParse({ slug: "with_underscore" }).success).toBe(
        false
      );
      expect(validator.safeParse({ slug: "-starts-with-hyphen" }).success).toBe(
        false
      );
      expect(validator.safeParse({ slug: "ends-with-hyphen-" }).success).toBe(
        false
      );
    });
  });

  describe("textarea field", () => {
    it("should validate textarea field", () => {
      const schema: Schema = {
        content: { type: "textarea", label: "Content", required: true },
      };
      const validator = createValidator(schema);

      expect(
        validator.safeParse({ content: "Long content here" }).success
      ).toBe(true);
    });

    it("should validate textarea with minLength and maxLength", () => {
      const schema: Schema = {
        content: {
          type: "textarea",
          label: "Content",
          required: true,
          validation: { minLength: 10, maxLength: 100 },
        },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ content: "Short" }).success).toBe(false);
      expect(
        validator.safeParse({ content: "This is valid content" }).success
      ).toBe(true);
      expect(validator.safeParse({ content: "x".repeat(101) }).success).toBe(
        false
      );
    });
  });

  describe("date field", () => {
    it("should validate date format", () => {
      const schema: Schema = {
        publishedAt: { type: "date", label: "Published", required: true },
      };
      const validator = createValidator(schema);

      expect(
        validator.safeParse({ publishedAt: "2024-01-15" }).success
      ).toBe(true);
      expect(
        validator.safeParse({ publishedAt: "2024-12-31" }).success
      ).toBe(true);
    });

    it("should reject invalid date", () => {
      const schema: Schema = {
        publishedAt: { type: "date", label: "Published", required: true },
      };
      const validator = createValidator(schema);

      expect(
        validator.safeParse({ publishedAt: "invalid-date" }).success
      ).toBe(false);
    });

    it("should allow empty string for optional date", () => {
      const schema: Schema = {
        publishedAt: { type: "date", label: "Published", required: false },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ publishedAt: "" }).success).toBe(true);
    });
  });

  describe("datetime field", () => {
    it("should validate datetime format", () => {
      const schema: Schema = {
        createdAt: { type: "datetime", label: "Created", required: true },
      };
      const validator = createValidator(schema);

      expect(
        validator.safeParse({ createdAt: "2024-01-15T10:30:00" }).success
      ).toBe(true);
      expect(
        validator.safeParse({ createdAt: "2024-01-15T10:30" }).success
      ).toBe(true);
    });

    it("should reject invalid datetime", () => {
      const schema: Schema = {
        createdAt: { type: "datetime", label: "Created", required: true },
      };
      const validator = createValidator(schema);

      expect(
        validator.safeParse({ createdAt: "not-a-datetime" }).success
      ).toBe(false);
    });
  });

  describe("checkbox field", () => {
    it("should validate boolean", () => {
      const schema: Schema = {
        published: { type: "checkbox", label: "Published", required: true },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ published: true }).success).toBe(true);
      expect(validator.safeParse({ published: false }).success).toBe(true);
    });

    it("should reject non-boolean values", () => {
      const schema: Schema = {
        published: { type: "checkbox", label: "Published", required: true },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ published: "yes" }).success).toBe(false);
      expect(validator.safeParse({ published: 1 }).success).toBe(false);
    });
  });

  describe("select field", () => {
    it("should validate select options", () => {
      const schema: Schema = {
        status: {
          type: "select",
          label: "Status",
          options: [
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
          ],
          required: true,
        },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ status: "draft" }).success).toBe(true);
      expect(validator.safeParse({ status: "published" }).success).toBe(true);
      expect(validator.safeParse({ status: "invalid" }).success).toBe(false);
    });

    it("should validate multiple select", () => {
      const schema: Schema = {
        tags: {
          type: "select",
          label: "Tags",
          options: [
            { value: "tech", label: "Tech" },
            { value: "news", label: "News" },
            { value: "opinion", label: "Opinion" },
          ],
          multiple: true,
          required: true,
        },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ tags: ["tech", "news"] }).success).toBe(
        true
      );
      expect(validator.safeParse({ tags: [] }).success).toBe(true);
      expect(validator.safeParse({ tags: ["invalid"] }).success).toBe(false);
    });
  });

  describe("relation field", () => {
    it("should validate single relation as string", () => {
      const schema: Schema = {
        author: {
          type: "relation",
          label: "Author",
          collection: "authors",
          required: true,
        },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ author: "john-doe" }).success).toBe(true);
    });

    it("should validate multiple relation as array", () => {
      const schema: Schema = {
        categories: {
          type: "relation",
          label: "Categories",
          collection: "categories",
          multiple: true,
          required: true,
        },
      };
      const validator = createValidator(schema);

      expect(
        validator.safeParse({ categories: ["tech", "news"] }).success
      ).toBe(true);
      expect(validator.safeParse({ categories: [] }).success).toBe(true);
    });
  });

  describe("image field", () => {
    it("should validate image as nullable string", () => {
      const schema: Schema = {
        cover: { type: "image", label: "Cover", required: true },
      };
      const validator = createValidator(schema);

      expect(
        validator.safeParse({ cover: "/images/cover.jpg" }).success
      ).toBe(true);
      expect(validator.safeParse({ cover: null }).success).toBe(true);
    });
  });

  describe("array field", () => {
    it("should validate array of text items", () => {
      const schema: Schema = {
        tags: {
          type: "array",
          label: "Tags",
          itemField: { type: "text", label: "Tag", required: true },
          required: true,
        },
      };
      const validator = createValidator(schema);

      expect(
        validator.safeParse({ tags: ["tag1", "tag2"] }).success
      ).toBe(true);
      expect(validator.safeParse({ tags: [] }).success).toBe(true);
    });

    it("should validate minItems and maxItems", () => {
      const schema: Schema = {
        tags: {
          type: "array",
          label: "Tags",
          itemField: { type: "text", label: "Tag", required: true },
          minItems: 1,
          maxItems: 5,
          required: true,
        },
      };
      const validator = createValidator(schema);

      expect(validator.safeParse({ tags: [] }).success).toBe(false);
      expect(validator.safeParse({ tags: ["tag1"] }).success).toBe(true);
      expect(
        validator.safeParse({ tags: ["1", "2", "3", "4", "5"] }).success
      ).toBe(true);
      expect(
        validator.safeParse({ tags: ["1", "2", "3", "4", "5", "6"] }).success
      ).toBe(false);
    });
  });

  describe("markdoc field", () => {
    it("should validate markdoc as string", () => {
      const schema: Schema = {
        body: { type: "markdoc", label: "Body", required: true },
      };
      const validator = createValidator(schema);

      expect(
        validator.safeParse({ body: "# Hello\n\nWorld" }).success
      ).toBe(true);
    });
  });
});

describe("validateEntry", () => {
  it("should return success for valid data", () => {
    const schema: Schema = {
      title: { type: "text", label: "Title", required: true },
      published: { type: "checkbox", label: "Published" },
    };

    const result = validateEntry(schema, {
      fields: { title: "Hello", published: true },
    });

    expect(result.success).toBe(true);
  });

  it("should return errors for invalid data", () => {
    const schema: Schema = {
      title: { type: "text", label: "Title", required: true },
    };

    const result = validateEntry(schema, {
      fields: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
    }
  });
});

describe("getDefaultValues", () => {
  it("should return correct defaults for text field", () => {
    const schema: Schema = {
      title: { type: "text", label: "Title", defaultValue: "Untitled" },
      description: { type: "text", label: "Description" },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults.title).toBe("Untitled");
    expect(defaults.description).toBe("");
  });

  it("should return empty string for slug", () => {
    const schema: Schema = {
      slug: { type: "slug", label: "Slug", from: "title" },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults.slug).toBe("");
  });

  it("should return correct defaults for textarea", () => {
    const schema: Schema = {
      content: { type: "textarea", label: "Content", defaultValue: "Default" },
      bio: { type: "textarea", label: "Bio" },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults.content).toBe("Default");
    expect(defaults.bio).toBe("");
  });

  it("should return current date for date field with 'now'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    const schema: Schema = {
      publishedAt: { type: "date", label: "Published", defaultValue: "now" },
      customDate: { type: "date", label: "Custom", defaultValue: "2024-01-01" },
      emptyDate: { type: "date", label: "Empty" },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults.publishedAt).toBe("2024-06-15");
    expect(defaults.customDate).toBe("2024-01-01");
    expect(defaults.emptyDate).toBe("");

    vi.useRealTimers();
  });

  it("should return current datetime for datetime field with 'now'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T14:30:00Z"));

    const schema: Schema = {
      createdAt: { type: "datetime", label: "Created", defaultValue: "now" },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults.createdAt).toBe("2024-06-15T14:30");

    vi.useRealTimers();
  });

  it("should return correct defaults for checkbox", () => {
    const schema: Schema = {
      published: { type: "checkbox", label: "Published", defaultValue: true },
      featured: { type: "checkbox", label: "Featured" },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults.published).toBe(true);
    expect(defaults.featured).toBe(false);
  });

  it("should return first option for select without defaultValue", () => {
    const schema: Schema = {
      status: {
        type: "select",
        label: "Status",
        options: [
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
        ],
      },
      priority: {
        type: "select",
        label: "Priority",
        options: [
          { value: "low", label: "Low" },
          { value: "high", label: "High" },
        ],
        defaultValue: "high",
      },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults.status).toBe("draft");
    expect(defaults.priority).toBe("high");
  });

  it("should return empty array for multiple select", () => {
    const schema: Schema = {
      tags: {
        type: "select",
        label: "Tags",
        options: [{ value: "tech", label: "Tech" }],
        multiple: true,
      },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults.tags).toEqual([]);
  });

  it("should return correct defaults for relation", () => {
    const schema: Schema = {
      author: { type: "relation", label: "Author", collection: "authors" },
      categories: {
        type: "relation",
        label: "Categories",
        collection: "categories",
        multiple: true,
      },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults.author).toBe("");
    expect(defaults.categories).toEqual([]);
  });

  it("should return null for image", () => {
    const schema: Schema = {
      cover: { type: "image", label: "Cover" },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults.cover).toBeNull();
  });

  it("should return empty array for array field", () => {
    const schema: Schema = {
      items: {
        type: "array",
        label: "Items",
        itemField: { type: "text", label: "Item", required: true },
      },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults.items).toEqual([]);
  });

  it("should return correct defaults for markdoc", () => {
    const schema: Schema = {
      body: { type: "markdoc", label: "Body", defaultValue: "# Title" },
      content: { type: "markdoc", label: "Content" },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults.body).toBe("# Title");
    expect(defaults.content).toBe("");
  });
});
