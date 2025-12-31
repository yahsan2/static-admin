// @static-admin/cms
// Type-safe content querying for Astro, Next.js, and other frameworks

// Main factory
export { createCMS } from './cms';

// QueryBuilder (for advanced usage)
export { QueryBuilder } from './query-builder';

// Types
export type {
  // CMS types
  CMS,
  CMSOptions,
  IQueryBuilder,
  // Query types
  QueryOptions,
  FilterConditions,
  SortOrder,
  SortField,
  // Result types
  PaginatedResult,
  PaginationMeta,
  // Config inference helpers
  CollectionNames,
  SingletonNames,
  CollectionSchema,
  SingletonSchema,
} from './types';

// Re-export useful types from @static-admin/core
export type {
  Entry,
  EntryData,
  Schema,
  InferSchemaType,
  InferFieldType,
  StaticAdminConfig,
  Collection,
  Singleton,
} from '@static-admin/core';
