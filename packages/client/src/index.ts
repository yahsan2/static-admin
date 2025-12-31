// @static-admin/client
// Type-safe client SDK for Static Admin public API

export { createClient } from './client';
export { ClientQueryBuilder } from './query-builder';
export type {
  // Core types
  Client,
  ClientOptions,
  ClientQueryBuilder as IClientQueryBuilder,
  CollectionNames,
  CollectionSchema,
  Entry,
  EntryData,
  ListApiResponse,
  SingleApiResponse,
  PaginationInfo,
  Filters,
  SortOrder,
  // Module augmentation support
  StaticAdminRegistry,
  RegisteredConfig,
  HasRegisteredConfig,
  CollectionEntry,
} from './types';
