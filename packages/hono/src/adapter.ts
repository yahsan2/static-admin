import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { createApiHandlers, createAuthManager, type ApiContext } from '@static-admin/api';
import { authMiddleware, requireAuth, type AuthVariables } from './middleware';
import type { StaticAdminHonoOptions } from './types';

const DEFAULT_SESSION_COOKIE = 'static-admin-session';
const DEFAULT_API_BASE_PATH = '/api/admin';

/**
 * Create a Hono app for static-admin
 *
 * @example
 * ```ts
 * import { Hono } from 'hono';
 * import { staticAdmin } from '@static-admin/hono';
 * import config from './static-admin.config';
 *
 * const app = new Hono();
 * app.route('/admin', staticAdmin({ config }));
 *
 * export default app;
 * ```
 */
export function staticAdmin(options: StaticAdminHonoOptions) {
  const {
    config,
    rootDir = process.cwd(),
    sessionCookie = DEFAULT_SESSION_COOKIE,
  } = options;

  const app = new Hono<{ Variables: AuthVariables }>();
  const handlers = createApiHandlers();

  // Initialize auth if configured
  let auth: ReturnType<typeof createAuthManager> | null = null;
  if (config.auth) {
    auth = createAuthManager({
      database: config.auth.database,
      sessionExpiry: config.auth.sessionExpiry,
    });

    // Initialize auth tables on startup
    auth.initialize().catch(console.error);

    // Add auth middleware
    app.use('*', authMiddleware({ auth, sessionCookie }));
  }

  // Helper to create API context
  const createContext = (c: Hono extends Hono<infer E> ? E : never): ApiContext => ({
    config,
    auth: auth!,
    rootDir,
    user: (c as unknown as { var: AuthVariables }).var?.user,
  });

  // ===== Auth Routes =====
  if (auth) {
    // Login
    app.post('/auth/login', async (c) => {
      const body = await c.req.json();
      const ctx: ApiContext = {
        config,
        auth: auth!,
        rootDir,
      };

      const result = await handlers.login(ctx, {
        params: {},
        query: {},
        body,
      });

      if (result.success && result.data) {
        const data = result.data as { sessionId: string; expiresAt: string };
        setCookie(c, sessionCookie, data.sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax',
          path: '/',
          expires: new Date(data.expiresAt),
        });
      }

      return c.json(result);
    });

    // Logout
    app.post('/auth/logout', async (c) => {
      const sessionId = c.get('sessionId');

      if (sessionId && auth) {
        await auth.logout(sessionId);
      }

      deleteCookie(c, sessionCookie);

      return c.json({ success: true, data: { loggedOut: true } });
    });

    // Get current user
    app.get('/auth/me', requireAuth(), async (c) => {
      const user = c.get('user');
      return c.json({ success: true, data: user });
    });

    // ===== Install Routes =====
    // Check install status
    app.get('/install/check', async (c) => {
      const ctx: ApiContext = {
        config,
        auth: auth!,
        rootDir,
      };

      const result = await handlers.checkInstall(ctx, {
        params: {},
        query: {},
        body: null,
      });

      return c.json(result);
    });

    // Setup admin user
    app.post('/install/setup', async (c) => {
      const ctx: ApiContext = {
        config,
        auth: auth!,
        rootDir,
      };

      const body = await c.req.json();

      const result = await handlers.setupAdmin(ctx, {
        params: {},
        query: {},
        body,
      });

      if (result.success && result.data) {
        const data = result.data as { sessionId: string; expiresAt: string };
        setCookie(c, sessionCookie, data.sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax',
          path: '/',
          expires: new Date(data.expiresAt),
        });
      }

      return c.json(result, result.success ? 201 : 400);
    });

    // ===== User Management Routes =====
    // List users
    app.get('/users', requireAuth(), async (c) => {
      const ctx: ApiContext = {
        config,
        auth: auth!,
        rootDir,
        user: c.get('user'),
      };

      const result = await handlers.listUsers(ctx, {
        params: {},
        query: c.req.query() as Record<string, string>,
        body: null,
      });

      return c.json(result);
    });

    // Get single user
    app.get('/users/:id', requireAuth(), async (c) => {
      const ctx: ApiContext = {
        config,
        auth: auth!,
        rootDir,
        user: c.get('user'),
      };

      const result = await handlers.getUser(ctx, {
        params: { id: c.req.param('id') },
        query: {},
        body: null,
      });

      return c.json(result);
    });

    // Create user
    app.post('/users', requireAuth(), async (c) => {
      const ctx: ApiContext = {
        config,
        auth: auth!,
        rootDir,
        user: c.get('user'),
      };

      const body = await c.req.json();

      const result = await handlers.createUser(ctx, {
        params: {},
        query: {},
        body,
      });

      return c.json(result, result.success ? 201 : 400);
    });

    // Update user
    app.put('/users/:id', requireAuth(), async (c) => {
      const ctx: ApiContext = {
        config,
        auth: auth!,
        rootDir,
        user: c.get('user'),
      };

      const body = await c.req.json();

      const result = await handlers.updateUser(ctx, {
        params: { id: c.req.param('id') },
        query: {},
        body,
      });

      return c.json(result);
    });

    // Delete user
    app.delete('/users/:id', requireAuth(), async (c) => {
      const ctx: ApiContext = {
        config,
        auth: auth!,
        rootDir,
        user: c.get('user'),
      };

      const result = await handlers.deleteUser(ctx, {
        params: { id: c.req.param('id') },
        query: {},
        body: null,
      });

      return c.json(result);
    });
  }

  // ===== Schema Routes =====
  app.get('/schema', async (c) => {
    const ctx: ApiContext = {
      config,
      auth: auth!,
      rootDir,
      user: c.get('user'),
    };

    const result = await handlers.getSchema(ctx, {
      params: {},
      query: {},
      body: null,
    });

    return c.json(result);
  });

  // ===== Collection Routes =====
  app.get('/collections', async (c) => {
    const ctx: ApiContext = {
      config,
      auth: auth!,
      rootDir,
      user: c.get('user'),
    };

    const result = await handlers.listCollections(ctx, {
      params: {},
      query: {},
      body: null,
    });

    return c.json(result);
  });

  app.get('/collections/:collection', async (c) => {
    const ctx: ApiContext = {
      config,
      auth: auth!,
      rootDir,
      user: c.get('user'),
    };

    const result = await handlers.getCollection(ctx, {
      params: { collection: c.req.param('collection') },
      query: {},
      body: null,
    });

    return c.json(result);
  });

  // ===== Entry Routes =====
  // List entries
  app.get('/entries/:collection', async (c) => {
    const ctx: ApiContext = {
      config,
      auth: auth!,
      rootDir,
      user: c.get('user'),
    };

    const result = await handlers.listEntries(ctx, {
      params: { collection: c.req.param('collection') },
      query: c.req.query() as Record<string, string>,
      body: null,
    });

    return c.json(result);
  });

  // Get single entry
  app.get('/entries/:collection/:slug', async (c) => {
    const ctx: ApiContext = {
      config,
      auth: auth!,
      rootDir,
      user: c.get('user'),
    };

    const result = await handlers.getEntry(ctx, {
      params: {
        collection: c.req.param('collection'),
        slug: c.req.param('slug'),
      },
      query: {},
      body: null,
    });

    return c.json(result);
  });

  // Create entry (requires auth)
  const protectedRoutes = auth ? requireAuth() : async (_: unknown, next: () => Promise<void>) => next();

  app.post('/entries/:collection', protectedRoutes, async (c) => {
    const ctx: ApiContext = {
      config,
      auth: auth!,
      rootDir,
      user: c.get('user'),
    };

    const body = await c.req.json();

    const result = await handlers.createEntry(ctx, {
      params: { collection: c.req.param('collection') },
      query: {},
      body,
    });

    return c.json(result, result.success ? 201 : 400);
  });

  // Update entry (requires auth)
  app.put('/entries/:collection/:slug', protectedRoutes, async (c) => {
    const ctx: ApiContext = {
      config,
      auth: auth!,
      rootDir,
      user: c.get('user'),
    };

    const body = await c.req.json();

    const result = await handlers.updateEntry(ctx, {
      params: {
        collection: c.req.param('collection'),
        slug: c.req.param('slug'),
      },
      query: {},
      body,
    });

    return c.json(result);
  });

  // Delete entry (requires auth)
  app.delete('/entries/:collection/:slug', protectedRoutes, async (c) => {
    const ctx: ApiContext = {
      config,
      auth: auth!,
      rootDir,
      user: c.get('user'),
    };

    const result = await handlers.deleteEntry(ctx, {
      params: {
        collection: c.req.param('collection'),
        slug: c.req.param('slug'),
      },
      query: {},
      body: null,
    });

    return c.json(result);
  });

  // ===== Upload Routes =====
  app.post('/upload/:collection/:slug', protectedRoutes, async (c) => {
    const ctx: ApiContext = {
      config,
      auth: auth!,
      rootDir,
      user: c.get('user'),
    };

    const body = await c.req.json();

    const result = await handlers.uploadImage(ctx, {
      params: {
        collection: c.req.param('collection'),
        slug: c.req.param('slug'),
      },
      query: {},
      body,
    });

    return c.json(result);
  });

  return app;
}
