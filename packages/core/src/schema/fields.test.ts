import { describe, it, expect } from "vitest";
import { fields } from "./fields";

describe("fields", () => {
  describe("text", () => {
    it("should create text field with type", () => {
      const field = fields.text({ label: "Title" });

      expect(field.type).toBe("text");
      expect(field.label).toBe("Title");
    });

    it("should preserve all config options", () => {
      const field = fields.text({
        label: "Title",
        description: "Enter a title",
        required: true,
        defaultValue: "Untitled",
        validation: { minLength: 5, maxLength: 100, pattern: "^[A-Z]" },
      });

      expect(field.type).toBe("text");
      expect(field.label).toBe("Title");
      expect(field.description).toBe("Enter a title");
      expect(field.required).toBe(true);
      expect(field.defaultValue).toBe("Untitled");
      expect(field.validation?.minLength).toBe(5);
      expect(field.validation?.maxLength).toBe(100);
      expect(field.validation?.pattern).toBe("^[A-Z]");
    });
  });

  describe("slug", () => {
    it("should create slug field with type and from", () => {
      const field = fields.slug({ label: "Slug", from: "title" });

      expect(field.type).toBe("slug");
      expect(field.label).toBe("Slug");
      expect(field.from).toBe("title");
    });
  });

  describe("textarea", () => {
    it("should create textarea field with type", () => {
      const field = fields.textarea({ label: "Content" });

      expect(field.type).toBe("textarea");
      expect(field.label).toBe("Content");
    });

    it("should preserve validation options", () => {
      const field = fields.textarea({
        label: "Content",
        validation: { minLength: 10, maxLength: 5000 },
      });

      expect(field.validation?.minLength).toBe(10);
      expect(field.validation?.maxLength).toBe(5000);
    });
  });

  describe("date", () => {
    it("should create date field with type", () => {
      const field = fields.date({ label: "Published Date" });

      expect(field.type).toBe("date");
      expect(field.label).toBe("Published Date");
    });

    it("should support 'now' as default value", () => {
      const field = fields.date({ label: "Date", defaultValue: "now" });

      expect(field.defaultValue).toBe("now");
    });

    it("should support specific date as default value", () => {
      const field = fields.date({ label: "Date", defaultValue: "2024-01-01" });

      expect(field.defaultValue).toBe("2024-01-01");
    });
  });

  describe("datetime", () => {
    it("should create datetime field with type", () => {
      const field = fields.datetime({ label: "Created At" });

      expect(field.type).toBe("datetime");
      expect(field.label).toBe("Created At");
    });

    it("should support 'now' as default value", () => {
      const field = fields.datetime({ label: "Datetime", defaultValue: "now" });

      expect(field.defaultValue).toBe("now");
    });
  });

  describe("checkbox", () => {
    it("should create checkbox field with type", () => {
      const field = fields.checkbox({ label: "Published" });

      expect(field.type).toBe("checkbox");
      expect(field.label).toBe("Published");
    });

    it("should preserve default value", () => {
      const field = fields.checkbox({ label: "Draft", defaultValue: true });

      expect(field.defaultValue).toBe(true);
    });
  });

  describe("select", () => {
    it("should create select field with type and options", () => {
      const field = fields.select({
        label: "Status",
        options: [
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
        ],
      });

      expect(field.type).toBe("select");
      expect(field.label).toBe("Status");
      expect(field.options).toHaveLength(2);
      expect(field.options[0].value).toBe("draft");
    });

    it("should support multiple selection", () => {
      const field = fields.select({
        label: "Tags",
        options: [
          { value: "tech", label: "Tech" },
          { value: "news", label: "News" },
        ],
        multiple: true,
      });

      expect(field.multiple).toBe(true);
    });

    it("should preserve default value", () => {
      const field = fields.select({
        label: "Status",
        options: [{ value: "draft", label: "Draft" }],
        defaultValue: "draft",
      });

      expect(field.defaultValue).toBe("draft");
    });
  });

  describe("relation", () => {
    it("should create relation field with type and collection", () => {
      const field = fields.relation({
        label: "Author",
        collection: "authors",
      });

      expect(field.type).toBe("relation");
      expect(field.label).toBe("Author");
      expect(field.collection).toBe("authors");
    });

    it("should support multiple relations", () => {
      const field = fields.relation({
        label: "Categories",
        collection: "categories",
        multiple: true,
      });

      expect(field.multiple).toBe(true);
    });

    it("should preserve displayField option", () => {
      const field = fields.relation({
        label: "Author",
        collection: "authors",
        displayField: "name",
      });

      expect(field.displayField).toBe("name");
    });
  });

  describe("image", () => {
    it("should create image field with type", () => {
      const field = fields.image({ label: "Cover Image" });

      expect(field.type).toBe("image");
      expect(field.label).toBe("Cover Image");
    });

    it("should preserve image options", () => {
      const field = fields.image({
        label: "Photo",
        directory: "uploads/photos",
        accept: ["image/png", "image/jpeg"],
        maxSize: 5 * 1024 * 1024, // 5MB
      });

      expect(field.directory).toBe("uploads/photos");
      expect(field.accept).toEqual(["image/png", "image/jpeg"]);
      expect(field.maxSize).toBe(5 * 1024 * 1024);
    });
  });

  describe("array", () => {
    it("should create array field with type and itemField", () => {
      const field = fields.array({
        label: "Tags",
        itemField: fields.text({ label: "Tag", required: true }),
      });

      expect(field.type).toBe("array");
      expect(field.label).toBe("Tags");
      expect(field.itemField.type).toBe("text");
    });

    it("should preserve minItems and maxItems", () => {
      const field = fields.array({
        label: "Items",
        itemField: fields.text({ label: "Item" }),
        minItems: 1,
        maxItems: 10,
      });

      expect(field.minItems).toBe(1);
      expect(field.maxItems).toBe(10);
    });

    it("should support nested complex fields", () => {
      const field = fields.array({
        label: "Authors",
        itemField: fields.relation({
          label: "Author",
          collection: "authors",
        }),
      });

      expect(field.itemField.type).toBe("relation");
    });
  });

  describe("markdoc", () => {
    it("should create markdoc field with type", () => {
      const field = fields.markdoc({ label: "Content" });

      expect(field.type).toBe("markdoc");
      expect(field.label).toBe("Content");
    });

    it("should preserve default value", () => {
      const field = fields.markdoc({
        label: "Body",
        defaultValue: "# Hello World",
      });

      expect(field.defaultValue).toBe("# Hello World");
    });
  });
});
