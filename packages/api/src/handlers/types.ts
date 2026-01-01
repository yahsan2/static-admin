import type { StaticAdminConfig, StorageAdapter } from '@static-admin/core';
import type { AuthManager, User } from '../auth/types';
import type { MailService } from '../mail';

/** API request context */
export interface ApiContext {
  config: StaticAdminConfig;
  auth: AuthManager;
  rootDir: string;
  storage: StorageAdapter;
  user?: User;
  mail?: MailService;
  baseUrl?: string;
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

  // Install
  checkInstall: ApiHandler;
  setupAdmin: ApiHandler;

  // Users
  listUsers: ApiHandler;
  getUser: ApiHandler;
  createUser: ApiHandler;
  updateUser: ApiHandler;
  deleteUser: ApiHandler;

  // Password Reset
  requestPasswordReset: ApiHandler;
  resetPassword: ApiHandler;
}
