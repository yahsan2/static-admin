import type { StaticAdminConfig } from '@static-admin/core';

/** Options for static-admin Hono middleware */
export interface StaticAdminHonoOptions {
  /** Static-admin configuration */
  config: StaticAdminConfig;
  /** Root directory for content (defaults to process.cwd()) */
  rootDir?: string;
  /** Base path for API routes (defaults to '/api/admin') */
  apiBasePath?: string;
  /** Cookie name for session (defaults to 'static-admin-session') */
  sessionCookie?: string;
}
