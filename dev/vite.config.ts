import { defineConfig, type Plugin, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// HMR block state
let hmrBlockUntil = 0;

// Vite plugin to block HMR during API saves
function hmrBlockPlugin(): Plugin {
  return {
    name: 'hmr-block',
    configureServer(server) {
      // Handle HMR block requests
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/admin/hmr-block' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', () => {
            try {
              const { duration = 2000 } = JSON.parse(body);
              hmrBlockUntil = Date.now() + duration;
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid request' }));
            }
          });
          return;
        }
        next();
      });

      // Intercept file changes for content directory
      const originalWatcher = server.watcher;
      const originalEmit = originalWatcher.emit.bind(originalWatcher);

      originalWatcher.emit = function (event: string, ...args: unknown[]) {
        if (event === 'change' || event === 'add' || event === 'unlink') {
          const filePath = args[0] as string;
          if (filePath.includes('/content/') && Date.now() < hmrBlockUntil) {
            console.log('[HMR] Blocked reload for:', filePath);
            return false;
          }
        }
        return originalEmit(event, ...args);
      };
    },
  };
}

// Vite plugin to integrate Hono API server
function honoDevServer(): Plugin {
  // Load env vars for SSR (including non-VITE_ prefixed vars)
  const env = loadEnv('development', process.cwd(), '');
  Object.assign(process.env, env);

  return {
    name: 'hono-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Only handle /api, /public, and /content routes
        if (!req.url?.startsWith('/api') && !req.url?.startsWith('/public') && !req.url?.startsWith('/content')) {
          return next();
        }

        try {
          // Use Vite's ssrLoadModule to properly load TypeScript modules
          const apiModule = await server.ssrLoadModule('./server/api.ts');
          const { createApiApp } = apiModule as { createApiApp: () => { fetch: (req: Request) => Promise<Response> } };
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
  plugins: [react(), tailwindcss(), hmrBlockPlugin(), honoDevServer()],
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
