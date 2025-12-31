import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AuthManager, User } from '@static-admin/api';

export interface AuthMiddlewareOptions {
  auth: AuthManager;
  sessionCookie: string;
}

export interface AuthVariables {
  user?: User;
  sessionId?: string;
}

/**
 * Authentication middleware for Hono
 * Extracts user from session cookie and attaches to context
 */
export function authMiddleware(options: AuthMiddlewareOptions) {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const { auth, sessionCookie } = options;

    const sessionId = getCookie(c, sessionCookie);

    if (sessionId) {
      try {
        const result = await auth.getSession(sessionId);
        if (result) {
          c.set('user', result.user);
          c.set('sessionId', sessionId);

          // Refresh session on each request
          await auth.refreshSession(sessionId);
        }
      } catch {
        // Invalid session, continue without user
      }
    }

    await next();
  };
}

/**
 * Require authentication middleware
 * Returns 401 if not authenticated
 */
export function requireAuth() {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    await next();
  };
}
