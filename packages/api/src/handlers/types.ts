import type { StaticAdminConfig } from '@static-admin/core';
import type { AuthManager, User } from '../auth/types';

/** API request context */
export interface ApiContext {
  config: StaticAdminConfig;
  auth: AuthManager;
  rootDir: string;
  user?: User;
}

/** Standard API response */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Pagination info */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** List response with pagination */
export interface ListResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

/** API request types */
export interface ApiRequest {
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
  body: unknown;
}

/** Handler function type */
export type ApiHandler<T = unknown> = (
  ctx: ApiContext,
  req: ApiRequest
) => Promise<ApiResponse<T>>;

/** API handlers collection */
export interface ApiHandlers {
  // Schema
  getSchema: ApiHandler;

  // Collections
  listCollections: ApiHandler;
  getCollection: ApiHandler;

  // Entries
  listEntries: ApiHandler;
  getEntry: ApiHandler;
  createEntry: ApiHandler;
  updateEntry: ApiHandler;
  deleteEntry: ApiHandler;

  // Upload
  uploadImage: ApiHandler;

  // Auth
  login: ApiHandler;
  logout: ApiHandler;
  getMe: ApiHandler;
}
