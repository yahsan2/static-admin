import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { createApiApp } from './api';

const app = createApiApp();

// Enable CORS for standalone server
app.use('*', cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

const port = 3001;
console.log(`API Server running at http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
