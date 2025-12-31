import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Vite plugin to integrate Hono API server
function honoDevServer(): Plugin {
  return {
    name: 'hono-dev-server',
    configureServer(server) {
      // Dynamically import to avoid issues with ESM/CJS
      server.middlewares.use(async (req, res, next) => {
        // Only handle /api and /content routes
        if (!req.url?.startsWith('/api') && !req.url?.startsWith('/content')) {
          return next();
        }

        try {
          // Lazy load the API app
          const { createApiApp } = await import('./server/api');
          const app = createApiApp();

          // Convert Node request to Fetch API Request
          const url = new URL(req.url || '/', `http://${req.headers.host}`);
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
          }

          // Read request body for POST/PUT/PATCH
          let body: string | undefined;
          if (req.method && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            body = await new Promise<string>((resolve) => {
              let data = '';
              req.on('data', (chunk) => (data += chunk));
              req.on('end', () => resolve(data));
            });
          }

          const request = new Request(url.toString(), {
            method: req.method,
            headers,
            body: body || undefined,
          });

          // Call Hono app
          const response = await app.fetch(request);

          // Write response
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          const responseBody = await response.text();
          res.end(responseBody);
        } catch (error) {
          console.error('API Error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), honoDevServer()],
  resolve: {
    alias: {
      '@static-admin/ui': path.resolve(__dirname, '../packages/ui/src'),
      '@static-admin/ui/styles.css': path.resolve(__dirname, '../packages/ui/src/styles.css'),
    },
  },
  server: {
    port: 5173,
  },
});
