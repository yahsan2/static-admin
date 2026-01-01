import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { createStaticAdmin } from '@static-admin/hono';
import { config } from '../server/api';

const admin = createStaticAdmin({ config });
const app = new Hono().basePath('/api');

// Mount admin API
app.route('/admin', admin.api());

// Mount public API
app.route('/public', admin.public());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'edge' }));

export const runtime = 'edge';
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
