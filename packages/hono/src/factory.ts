import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { createApiHandlers, createAuthManager, createMailService, type ApiContext, type MailService } from '@static-admin/api';
import { createCMS } from '@static-admin/cms';
import type { StaticAdminConfig, Entry, Schema } from '@static-admin/core';
import type { PaginatedResult } from '@static-admin/cms';
import { authMiddleware, requireAuth, type AuthVariables } from './middleware';

const DEFAULT_SESSION_COOKIE = 'static-admin-session';

/**
 * Options for createStaticAdmin
 */
export interface CreateStaticAdminOptions<T extends StaticAdminConfig<any, any> = StaticAdminConfig> {
  /** Static Admin configuration */
  config: T;
  /** Root directory for content (defaults to process.cwd()) */
  rootDir?: string;
  /** Session cookie name (defaults to 'static-admin-session') */
  sessionCookie?: string;
}

/**
 * API response for a list of entries
 */
interface ListApiResponse<S extends Schema> {
  data: Entry<S>[];
  pagination: PaginatedResult<S>['pagination'];
}

/**
 * API response for a single entry
 */
interface SingleApiResponse<S extends Schema> {
  data: Entry<S>;
}

/**
 * Parse filter parameters from query string
 */
function parseFilters(query: Record<string, string>): Record<string, unknown> {
  const filters: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(query)) {
    const match = key.match(/^filter\[(.+)\]$/);
    if (match && match[1]) {
      const fieldName = match[1];
      if (value === 'true') {
        filters[fieldName] = true;
      } else if (value === 'false') {
        filters[fieldName] = false;
      } else {
        filters[fieldName] = value;
      }
    }
  }

  return filters;
}

/**
 * Static Admin instance with integrated APIs
 */
export interface StaticAdmin<T extends StaticAdminConfig<any, any>> {
  /**
   * Get the admin API Hono app (CRUD operations, auth, etc.)
   */
  api(): Hono<{ Variables: AuthVariables }>;

  /**
   * Get the public API Hono app (read-only, draft filtering)
   * Authentication is automatically integrated for preview mode.
   */
  public(): Hono;

  /**
   * Check if a request is authenticated
   */
  isAuthenticated(c: Context): Promise<boolean>;
}

/**
 * Create a Static Admin instance with integrated admin and public APIs
 *
 * @example
 * ```ts
 * import { Hono } from 'hono';
 * import { createStaticAdmin } from '@static-admin/hono';
 * import config from './static-admin.config';
 *
 * const admin = createStaticAdmin({ config });
 * const app = new Hono();
 *
 * // Mount APIs at your preferred paths
 * app.route('/api', admin.api());      // Admin API (CRUD, auth)
 * app.route('/public', admin.public()); // Public API (read-only)
 *
 * // Or mount both under a single path
 * app.route('/api/admin', admin.api());
 * app.route('/api/content', admin.public());
 *
 * export default app;
 * ```
 */
export function createStaticAdmin<T extends StaticAdminConfig<any, any>>(
  options: CreateStaticAdminOptions<T>
): StaticAdmin<T> {
  const {
    config,
    rootDir = process.cwd(),
    sessionCookie = DEFAULT_SESSION_COOKIE,
  } = options;

  // Initialize auth if configured
  let auth: ReturnType<typeof createAuthManager> | null = null;
  let mail: MailService | null = null;

  if (config.auth) {
    auth = createAuthManager({
      database: config.auth.database,
      remote: config.auth.remote,
      sessionExpiry: config.auth.sessionExpiry,
    });
    auth.initialize().catch(console.error);

    // Initialize mail service for password reset
    createMailService().then((m) => {
      mail = m;
    }).catch(console.error);
  }

  /**
   * Check if a request is authenticated
   */
  async function isAuthenticated(c: Context): Promise<boolean> {
    if (!auth) return false;

    const sessionId = getCookie(c, sessionCookie);
    if (!sessionId) return false;

    try {
      const session = await auth.getSession(sessionId);
      return !!session;
    } catch {
      return false;
    }
  }

  /**
   * Create the admin API Hono app
   */
  function createAdminApi(): Hono<{ Variables: AuthVariables }> {
    const app = new Hono<{ Variables: AuthVariables }>();
    const handlers = createApiHandlers();

    // Add auth middleware if configured
    if (auth) {
      app.use('*', authMiddleware({ auth, sessionCookie }));
    }

    // ===== Auth Routes =====
    if (auth) {
      app.post('/auth/login', async (c) => {
        const body = await c.req.json();
        const ctx: ApiContext = { config, auth: auth!, rootDir };

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

      app.post('/auth/logout', async (c) => {
        const sessionId = c.get('sessionId');
        if (sessionId && auth) {
          await auth.logout(sessionId);
        }
        deleteCookie(c, sessionCookie);
        return c.json({ success: true, data: { loggedOut: true } });
      });

      app.get('/auth/me', requireAuth(), async (c) => {
        const user = c.get('user');
        return c.json({ success: true, data: user });
      });

      // Install routes
      app.get('/install/check', async (c) => {
        const ctx: ApiContext = { config, auth: auth!, rootDir };
        const result = await handlers.checkInstall(ctx, { params: {}, query: {}, body: null });
        return c.json(result);
      });

      app.post('/install/setup', async (c) => {
        const ctx: ApiContext = { config, auth: auth!, rootDir };
        const body = await c.req.json();
        const result = await handlers.setupAdmin(ctx, { params: {}, query: {}, body });

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

      // Password reset routes
      app.post('/auth/forgot-password', async (c) => {
        const body = await c.req.json();
        const baseUrl = new URL(c.req.url).origin;
        const ctx: ApiContext = {
          config,
          auth: auth!,
          rootDir,
          mail: mail ?? undefined,
          baseUrl,
        };
        const result = await handlers.requestPasswordReset(ctx, { params: {}, query: {}, body });
        return c.json(result);
      });

      app.post('/auth/reset-password', async (c) => {
        const body = await c.req.json();
        const ctx: ApiContext = { config, auth: auth!, rootDir };
        const result = await handlers.resetPassword(ctx, { params: {}, query: {}, body });
        return c.json(result);
      });

      // User management routes
      app.get('/users', requireAuth(), async (c) => {
        const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
        const result = await handlers.listUsers(ctx, {
          params: {},
          query: c.req.query() as Record<string, string>,
          body: null,
        });
        return c.json(result);
      });

      app.get('/users/:id', requireAuth(), async (c) => {
        const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
        const result = await handlers.getUser(ctx, {
          params: { id: c.req.param('id') },
          query: {},
          body: null,
        });
        return c.json(result);
      });

      app.post('/users', requireAuth(), async (c) => {
        const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
        const body = await c.req.json();
        const result = await handlers.createUser(ctx, { params: {}, query: {}, body });
        return c.json(result, result.success ? 201 : 400);
      });

      app.put('/users/:id', requireAuth(), async (c) => {
        const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
        const body = await c.req.json();
        const result = await handlers.updateUser(ctx, {
          params: { id: c.req.param('id') },
          query: {},
          body,
        });
        return c.json(result);
      });

      app.delete('/users/:id', requireAuth(), async (c) => {
        const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
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
      const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
      const result = await handlers.getSchema(ctx, { params: {}, query: {}, body: null });
      return c.json(result);
    });

    // ===== Collection Routes =====
    app.get('/collections', async (c) => {
      const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
      const result = await handlers.listCollections(ctx, { params: {}, query: {}, body: null });
      return c.json(result);
    });

    app.get('/collections/:collection', async (c) => {
      const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
      const result = await handlers.getCollection(ctx, {
        params: { collection: c.req.param('collection') },
        query: {},
        body: null,
      });
      return c.json(result);
    });

    // ===== Entry Routes =====
    app.get('/entries/:collection', async (c) => {
      const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
      const result = await handlers.listEntries(ctx, {
        params: { collection: c.req.param('collection') },
        query: c.req.query() as Record<string, string>,
        body: null,
      });
      return c.json(result);
    });

    app.get('/entries/:collection/:slug', async (c) => {
      const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
      const result = await handlers.getEntry(ctx, {
        params: { collection: c.req.param('collection'), slug: c.req.param('slug') },
        query: {},
        body: null,
      });
      return c.json(result);
    });

    const protectedRoutes = auth
      ? requireAuth()
      : async (_: unknown, next: () => Promise<void>) => next();

    app.post('/entries/:collection', protectedRoutes, async (c) => {
      const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
      const body = await c.req.json();
      const result = await handlers.createEntry(ctx, {
        params: { collection: c.req.param('collection') },
        query: {},
        body,
      });
      return c.json(result, result.success ? 201 : 400);
    });

    app.put('/entries/:collection/:slug', protectedRoutes, async (c) => {
      const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
      const body = await c.req.json();
      const result = await handlers.updateEntry(ctx, {
        params: { collection: c.req.param('collection'), slug: c.req.param('slug') },
        query: {},
        body,
      });
      return c.json(result);
    });

    app.delete('/entries/:collection/:slug', protectedRoutes, async (c) => {
      const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
      const result = await handlers.deleteEntry(ctx, {
        params: { collection: c.req.param('collection'), slug: c.req.param('slug') },
        query: {},
        body: null,
      });
      return c.json(result);
    });

    // ===== Upload Routes =====
    app.post('/upload/:collection/:slug', protectedRoutes, async (c) => {
      const ctx: ApiContext = { config, auth: auth!, rootDir, user: c.get('user') };
      const body = await c.req.json();
      const result = await handlers.uploadImage(ctx, {
        params: { collection: c.req.param('collection'), slug: c.req.param('slug') },
        query: {},
        body,
      });
      return c.json(result);
    });

    return app;
  }

  /**
   * Create the public API Hono app
   */
  function createPublicApi(): Hono {
    const app = new Hono();

    // GET /:collection - List entries
    app.get('/:collection', async (c) => {
      const collection = c.req.param('collection');
      const query = c.req.query();

      if (!config.collections?.[collection]) {
        return c.json({ error: `Collection "${collection}" not found` }, 404);
      }

      // Auto-check authentication for preview mode
      let authenticated = false;
      if (query.preview === 'true') {
        authenticated = await isAuthenticated(c);
      }

      const cms = createCMS({
        config,
        rootDir,
        isAuthenticated: authenticated,
      });

      try {
        // @ts-expect-error - Dynamic collection access
        let queryBuilder = cms[collection];

        const filters = parseFilters(query);
        if (Object.keys(filters).length > 0) {
          queryBuilder = queryBuilder.filter(filters);
        }

        if (query.sort) {
          const order = (query.order as 'asc' | 'desc') || 'desc';
          queryBuilder = queryBuilder.sort(query.sort, order);
        }

        if (query.search) {
          queryBuilder = queryBuilder.search(query.search);
        }

        const page = parseInt(query.page || '1', 10);
        queryBuilder = queryBuilder.page(page);

        if (query.preview === 'true' && authenticated) {
          queryBuilder = queryBuilder.includeDrafts();
        }

        const limit = parseInt(query.limit || '20', 10);
        const result = await queryBuilder.paginate(limit);

        const response: ListApiResponse<Schema> = {
          data: result.entries,
          pagination: result.pagination,
        };

        return c.json(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return c.json({ error: message }, 500);
      }
    });

    // GET /:collection/:slug - Get single entry
    app.get('/:collection/:slug', async (c) => {
      const collection = c.req.param('collection');
      const slug = c.req.param('slug');
      const query = c.req.query();

      if (!config.collections?.[collection]) {
        return c.json({ error: `Collection "${collection}" not found` }, 404);
      }

      let authenticated = false;
      if (query.preview === 'true') {
        authenticated = await isAuthenticated(c);
      }

      const cms = createCMS({
        config,
        rootDir,
        isAuthenticated: authenticated,
      });

      try {
        const entry = await cms.entry(collection as any, slug);

        if (!entry) {
          return c.json({ error: 'Entry not found' }, 404);
        }

        const response: SingleApiResponse<Schema> = {
          data: entry,
        };

        return c.json(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return c.json({ error: message }, 500);
      }
    });

    return app;
  }

  return {
    api: createAdminApi,
    public: createPublicApi,
    isAuthenticated,
  };
}
