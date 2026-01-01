import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { createStaticAdmin } from '@static-admin/hono';
import { config as baseConfig } from '../server/api';

// Override auth config for Vercel (use Turso instead of SQLite)
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
const app = new Hono().basePath('/api');

// Mount admin API
app.route('/admin', admin.api());

// Mount public API
app.route('/public', admin.public());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'nodejs' }));

export const runtime = 'nodejs';
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
