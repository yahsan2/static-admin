import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { createStaticAdmin } from '@static-admin/hono';
import config from '../static-admin.config';

const admin = createStaticAdmin({ config });
const app = new Hono();

// Serve static files from content directory
app.use('/content/*', serveStatic({ root: './' }));

// Mount APIs
app.route('/admin', admin.api());     // Admin API
app.route('/api', admin.public());    // Public API

// Home page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Static Admin Example</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
          }
          a {
            color: #0066cc;
          }
        </style>
      </head>
      <body>
        <h1>Static Admin Example</h1>
        <p>Welcome to the Static Admin example with Hono.</p>
        <p><a href="/admin">Open Admin Panel</a></p>
        <h2>Setup</h2>
        <p>Run <code>pnpm setup</code> to create an admin user.</p>
      </body>
    </html>
  `);
});

const port = 3000;
console.log(`Server running at http://localhost:${port}`);
console.log(`Admin panel: http://localhost:${port}/admin`);

serve({
  fetch: app.fetch,
  port,
});
