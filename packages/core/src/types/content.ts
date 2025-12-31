import type { Schema, InferSchemaType } from './fields';

/** Frontmatter data (parsed from markdown) */
export type FrontmatterData = Record<string, unknown>;

/** Entry data with typed fields */
export interface EntryData<S extends Schema = Schema> {
  /** Frontmatter fields */
  fields: InferSchemaType<S>;
  /** Main content (markdoc body) */
  content?: string;
}

/** A single content entry */
export interface Entry<S extends Schema = Schema> {
  /** Unique slug identifier */
  slug: string;
  /** Collection name */
  collection: string;
  /** Entry data */
  data: EntryData<S>;
  /** File path relative to content directory */
  filePath: string;
  /** Last modified timestamp */
  updatedAt: Date;
  /** Created timestamp */
  createdAt: Date;
}

/** Raw content file */
export interface ContentFile {
  /** File path */
  path: string;
  /** Raw frontmatter object */
  frontmatter: FrontmatterData;
  /** Raw markdown content */
  content: string;
}

/** Entry list response */
export interface EntryList<S extends Schema = Schema> {
  entries: Entry<S>[];
  total: number;
}

/** Entry list query options */
export interface EntryListOptions {
  /** Page number (1-based) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Search query */
  search?: string;
  /** Filter by field values */
  filters?: Record<string, unknown>;
}
