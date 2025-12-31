// @static-admin/client
// Type-safe client SDK for Static Admin public API

export { createClient } from './client';
export { ClientQueryBuilder } from './query-builder';
export type {
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
} from './types';
