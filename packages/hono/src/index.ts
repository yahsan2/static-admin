// @static-admin/hono
// Hono adapter for static-admin

export { createStaticAdmin } from './factory';
export type { CreateStaticAdminOptions, StaticAdmin } from './factory';
export { authMiddleware, requireAuth } from './middleware';
export type { AuthVariables } from './middleware';
