import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono().basePath('/api');

// Health check - minimal test
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'nodejs' }));

// Lazy load admin to catch initialization errors
let adminPromise: Promise<any> | null = null;

async function getAdmin() {
  if (!adminPromise) {
    adminPromise = (async () => {
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

      return createStaticAdmin({ config });
    })();
  }
  return adminPromise;
}

// Mount admin and public routes
app.all('/admin/*', async (c, next) => {
  try {
    const admin = await getAdmin();
    const adminApp = new Hono();
    adminApp.route('/', admin.api());
    // Rewrite path: /api/admin/xxx -> /xxx
    const url = new URL(c.req.url);
    url.pathname = url.pathname.replace('/api/admin', '');
    const newReq = new Request(url.toString(), c.req.raw);
    return adminApp.fetch(newReq, c.env);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message, stack: error instanceof Error ? error.stack : undefined }, 500);
  }
});

app.all('/public/*', async (c, next) => {
  try {
    const admin = await getAdmin();
    const publicApp = new Hono();
    publicApp.route('/', admin.public());
    // Rewrite path: /api/public/xxx -> /xxx
    const url = new URL(c.req.url);
    url.pathname = url.pathname.replace('/api/public', '');
    const newReq = new Request(url.toString(), c.req.raw);
    return publicApp.fetch(newReq, c.env);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message, stack: error instanceof Error ? error.stack : undefined }, 500);
  }
});

export const runtime = 'nodejs';
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
