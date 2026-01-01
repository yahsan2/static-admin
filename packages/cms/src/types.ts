import type {
  StaticAdminConfig,
  Collection,
  Singleton,
  Schema,
  Entry,
  InferSchemaType,
  StorageAdapter,
} from '@static-admin/core';

// =============================================================================
// Config Type Inference Helpers
// =============================================================================

/**
 * Extract collection names from a config type
 */
export type CollectionNames<T> = T extends { collections: infer C }
  ? C extends Record<string, Collection<any>>
    ? keyof C & string
    : never
  : never;

/**
 * Extract singleton names from a config type
 */
export type SingletonNames<T> = T extends { singletons: infer S }
  ? S extends Record<string, Singleton<any>>
    ? keyof S & string
    : never
  : never;

/**
 * Extract the schema type for a specific collection
 */
export type CollectionSchema<T, K extends string> = T extends {
  collections: { [P in K]: Collection<infer S> };
}
  ? S
  : Schema;

/**
 * Extract the schema type for a specific singleton
 */
export type SingletonSchema<T, K extends string> = T extends {
  singletons: { [P in K]: Singleton<infer S> };
}
  ? S
  : Schema;

// =============================================================================
// Query Options
// =============================================================================

/**
 * Filter conditions for querying entries
 */
export type FilterConditions<S extends Schema> = Partial<InferSchemaType<S>>;

/**
 * Sort direction
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Sort field options - schema fields plus meta fields
 */
export type SortField<S extends Schema> = keyof S | 'createdAt' | 'updatedAt';

/**
 * Internal query options accumulated by QueryBuilder
 */
export interface QueryOptions<S extends Schema> {
  filters: FilterConditions<S>;
  sortBy?: SortField<S>;
  sortOrder: SortOrder;
  limit?: number;
  page?: number;
  search?: string;
  includeDrafts: boolean;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPrevPage: boolean;
}

/**
 * Paginated result containing entries and pagination metadata
 */
export interface PaginatedResult<S extends Schema> {
  /** List of entries */
  entries: Entry<S>[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

// =============================================================================
// CMS Options
// =============================================================================

/**
 * Options for creating a CMS instance
 */
export interface CMSOptions<T> {
  /** Static Admin configuration */
  config: T;
  /** Root directory for content (defaults to process.cwd()) */
  rootDir?: string;
  /** Storage adapter (if not provided, will create local adapter from rootDir) */
  storage?: StorageAdapter;
  /** Whether the current request is authenticated (enables draft access) */
  isAuthenticated?: boolean;
}

// =============================================================================
// QueryBuilder Interface
// =============================================================================

/**
 * Fluent query builder interface for type-safe content queries
 */
export interface IQueryBuilder<S extends Schema> {
  /**
   * Filter entries by field values
   * @param conditions - Field-value pairs to filter by
   */
  filter(conditions: FilterConditions<S>): IQueryBuilder<S>;

  /**
   * Sort entries by a field
   * @param field - Field to sort by
   * @param order - Sort direction (default: 'desc')
   */
  sort(field: SortField<S>, order?: SortOrder): IQueryBuilder<S>;

  /**
   * Limit the number of results
   * @param n - Maximum number of entries to return
   */
  limit(n: number): IQueryBuilder<S>;

  /**
   * Set the page number for pagination
   * @param n - Page number (1-based)
   */
  page(n: number): IQueryBuilder<S>;

  /**
   * Search across text fields
   * @param query - Search query string
   */
  search(query: string): IQueryBuilder<S>;

  /**
   * Include draft entries in results (requires authentication)
   */
  includeDrafts(): IQueryBuilder<S>;

  /**
   * Execute query and return all matching entries
   */
  all(): Promise<Entry<S>[]>;

  /**
   * Execute query and return the first matching entry
   */
  first(): Promise<Entry<S> | null>;

  /**
   * Execute query and return paginated results
   * @param pageSize - Number of items per page (default: 20)
   */
  paginate(pageSize?: number): Promise<PaginatedResult<S>>;

  /**
   * Get the count of matching entries
   */
  count(): Promise<number>;
}

// =============================================================================
// CMS Instance Type
// =============================================================================

/**
 * Collection accessor providing a QueryBuilder for each collection
 */
export type CollectionAccessors<T> = {
  [K in CollectionNames<T>]: IQueryBuilder<CollectionSchema<T, K>>;
};

/**
 * CMS instance with typed collection accessors and utility methods
 */
export type CMS<T> = CollectionAccessors<T> & {
  /**
   * Get a single entry by collection name and slug
   * @param collection - Collection name
   * @param slug - Entry slug
   */
  entry<K extends CollectionNames<T>>(
    collection: K,
    slug: string
  ): Promise<Entry<CollectionSchema<T, K>> | null>;

  /**
   * Get a singleton entry
   * @param name - Singleton name
   */
  singleton<K extends SingletonNames<T>>(
    name: K
  ): Promise<Entry<SingletonSchema<T, K>> | null>;
};
