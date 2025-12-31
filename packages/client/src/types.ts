import type {
  StaticAdminConfig,
  Collection,
  Schema,
  InferSchemaType,
} from '@static-admin/core';

/**
 * Registry interface for module augmentation
 * Users can augment this to provide their config type globally
 *
 * @example
 * ```ts
 * // static-admin.d.ts
 * import type { config } from './static-admin.config';
 *
 * declare module '@static-admin/client' {
 *   interface StaticAdminRegistry {
 *     config: typeof config;
 *   }
 * }
 * ```
 */
export interface StaticAdminRegistry {
  // Will be augmented by user
}

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

/**
 * Get the registered config type (from module augmentation)
 */
export type RegisteredConfig = StaticAdminRegistry extends { config: infer C }
  ? C extends StaticAdminConfig<any, any>
    ? C
    : never
  : never;

/**
 * Check if a config has been registered
 */
export type HasRegisteredConfig = RegisteredConfig extends never ? false : true;

/**
 * Helper type to get Entry type for a collection
 *
 * If config is registered via module augmentation, just use collection name:
 * @example
 * ```ts
 * type PostEntry = CollectionEntry<'posts'>;
 * ```
 *
 * Otherwise, pass config type explicitly:
 * @example
 * ```ts
 * type PostEntry = CollectionEntry<typeof config, 'posts'>;
 * ```
 */
export type CollectionEntry<
  TConfigOrName extends StaticAdminConfig<any, any> | string,
  TName extends string = never
> = TConfigOrName extends string
  ? // Single argument: use registered config
    HasRegisteredConfig extends true
    ? Entry<CollectionSchema<RegisteredConfig, TConfigOrName>>
    : never
  : // Two arguments: use provided config
    TConfigOrName extends StaticAdminConfig<any, any>
    ? Entry<CollectionSchema<TConfigOrName, TName>>
    : never;
