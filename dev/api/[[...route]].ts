import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono().basePath('/api');

// Health check
app.get('/health', (c) => c.json({
  status: 'ok',
  runtime: 'nodejs',
  cwd: process.cwd(),
  turso: !!process.env.TURSO_DATABASE_URL,
}));

// Lazy initialize admin
let adminApp: Hono | null = null;
let publicApp: Hono | null = null;
let initError: string | null = null;

async function initAdmin() {
  if (initError) throw new Error(initError);
  if (adminApp && publicApp) return { adminApp, publicApp };

  try {
    const { createStaticAdmin } = await import('@static-admin/hono');
    const { config: baseConfig } = await import('../server/api');

    const config = {
      ...baseConfig,
      auth: process.env.TURSO_DATABASE_URL
        ? {
            remote: {
              url: process.env.TURSO_DATABASE_URL,
              authToken: process.env.TURSO_AUTH_TOKEN || '',
            },
            sessionExpiry: baseConfig.auth?.sessionExpiry,
          }
        : baseConfig.auth,
    };

    const admin = createStaticAdmin({ config });
    adminApp = admin.api();
    publicApp = admin.public();
    return { adminApp, publicApp };
  } catch (e) {
    initError = e instanceof Error ? e.message : String(e);
    throw e;
  }
}

// Admin routes
app.all('/admin/*', async (c) => {
  try {
    const { adminApp } = await initAdmin();
    const url = new URL(c.req.url);
    url.pathname = url.pathname.replace(/^\/api\/admin/, '');
    const req = new Request(url.toString(), c.req.raw);
    return adminApp.fetch(req, c.env);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

// Public routes
app.all('/public/*', async (c) => {
  try {
    const { publicApp } = await initAdmin();
    const url = new URL(c.req.url);
    url.pathname = url.pathname.replace(/^\/api\/public/, '');
    const req = new Request(url.toString(), c.req.raw);
    return publicApp.fetch(req, c.env);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

export const runtime = 'nodejs';
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
