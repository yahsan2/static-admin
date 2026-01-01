import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { createStaticAdmin } from '@static-admin/hono';
import { defineConfig, collection, fields } from '@static-admin/core';

// Inline config for Vercel deployment
const baseConfig = defineConfig({
  storage: {
    contentPath: 'content',
  },
  git: {
    autoCommit: false, // Disable git on Vercel
  },
  auth: process.env.TURSO_DATABASE_URL
    ? {
        remote: {
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN || '',
        },
        sessionExpiry: 7 * 24 * 60 * 60,
      }
    : {
        database: './admin.db',
        sessionExpiry: 7 * 24 * 60 * 60,
      },
  collections: {
    posts: collection({
      label: 'Posts',
      path: 'posts/*',
      slugField: 'title',
      description: 'Blog posts and articles',
      schema: {
        title: fields.text({ label: 'Title', required: true }),
        slug: fields.slug({ label: 'Slug', from: 'title' }),
        date: fields.datetime({ label: 'Publish Datetime', defaultValue: 'now' }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: true }),
        category: fields.select({
          label: 'Category',
          options: [
            { value: 'tech', label: 'Technology' },
            { value: 'life', label: 'Lifestyle' },
            { value: 'business', label: 'Business' },
          ],
        }),
        tags: fields.array({ label: 'Tags', itemField: fields.text({ label: 'Tag' }) }),
        featuredImage: fields.image({ label: 'Featured Image', directory: 'images' }),
        excerpt: fields.textarea({ label: 'Excerpt' }),
        content: fields.markdoc({ label: 'Content' }),
      },
    }),
    authors: collection({
      label: 'Authors',
      path: 'authors/*',
      slugField: 'name',
      description: 'Content authors',
      schema: {
        name: fields.text({ label: 'Name', required: true }),
        slug: fields.slug({ label: 'Slug', from: 'name' }),
        email: fields.text({ label: 'Email' }),
        bio: fields.textarea({ label: 'Bio' }),
        avatar: fields.image({ label: 'Avatar', directory: 'images' }),
      },
    }),
  },
});

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
    const admin = createStaticAdmin({ config: baseConfig });
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
