import type {
  StaticAdminConfig,
  Collection,
  Schema,
  InferSchemaType,
} from '@static-admin/core';

/**
 * Extract collection names from config
 */
export type CollectionNames<T> = T extends { collections: infer C }
  ? C extends Record<string, Collection<any>>
    ? keyof C & string
    : never
  : never;

/**
 * Extract schema from a collection in config
 */
export type CollectionSchema<T, K extends string> = T extends {
  collections: { [P in K]: Collection<infer S> };
}
  ? S
  : Schema;

/**
 * Entry data (fields and content)
 */
export interface EntryData<S extends Schema = Schema> {
  fields: InferSchemaType<S>;
  content?: string;
}

/**
 * Entry returned from API
 */
export interface Entry<S extends Schema = Schema> {
  slug: string;
  collection: string;
  data: EntryData<S>;
  filePath: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pagination info returned from API
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * API response for list of entries
 */
export interface ListApiResponse<S extends Schema = Schema> {
  data: Entry<S>[];
  pagination: PaginationInfo;
}

/**
 * API response for single entry
 */
export interface SingleApiResponse<S extends Schema = Schema> {
  data: Entry<S>;
}

/**
 * Error response from API
 */
export interface ApiErrorResponse {
  error: string;
}

/**
 * Client options
 */
export interface ClientOptions {
  /** Base URL for the API (e.g., 'https://example.com/api') */
  baseUrl: string;
  /** Custom fetch function (optional) */
  fetch?: typeof fetch;
  /** Default headers to include with every request */
  headers?: Record<string, string>;
}

/**
 * Filter operators for query builder
 */
export type FilterValue = string | number | boolean | null | undefined;
export type Filters<S extends Schema = Schema> = Partial<{
  [K in keyof S]: FilterValue;
}>;

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Client query builder type
 */
export interface ClientQueryBuilder<S extends Schema = Schema> {
  filter(filters: Filters<S>): ClientQueryBuilder<S>;
  sort(field: keyof S | string, order?: SortOrder): ClientQueryBuilder<S>;
  limit(count: number): ClientQueryBuilder<S>;
  page(num: number): ClientQueryBuilder<S>;
  search(query: string): ClientQueryBuilder<S>;
  preview(): ClientQueryBuilder<S>;

  get(slug: string): Promise<Entry<S> | null>;
  all(): Promise<Entry<S>[]>;
  paginate(limit?: number): Promise<ListApiResponse<S>>;
  first(): Promise<Entry<S> | null>;
}

/**
 * Client type with dynamic collection access
 */
export type Client<T extends StaticAdminConfig<any, any>> = {
  [K in CollectionNames<T>]: ClientQueryBuilder<CollectionSchema<T, K>>;
};
