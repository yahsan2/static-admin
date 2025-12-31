// @static-admin/hono
// Hono adapter for static-admin

export { staticAdmin } from './adapter';
export { authMiddleware, requireAuth } from './middleware';
export type { StaticAdminHonoOptions } from './types';
export type { AuthVariables } from './middleware';
