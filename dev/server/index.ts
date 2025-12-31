import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { staticAdmin } from '@static-admin/hono';
import { defineConfig, collection, fields } from '@static-admin/core';

// Server-side config with full schema helpers
const config = defineConfig({
  storage: {
    contentPath: 'content',
  },
  git: {
    autoCommit: true,
    commitMessage: (action, collection, slug) =>
      `content(${collection}): ${action} ${slug}`,
  },
  auth: {
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
        title: fields.text({
          label: 'Title',
          required: true,
          validation: { minLength: 3, maxLength: 100 },
        }),
        slug: fields.slug({
          label: 'Slug',
          from: 'title',
        }),
        date: fields.date({
          label: 'Publish Date',
          defaultValue: 'now',
        }),
        draft: fields.checkbox({
          label: 'Draft',
          description: 'Draft posts are not published',
          defaultValue: true,
        }),
        category: fields.select({
          label: 'Category',
          options: [
            { value: 'tech', label: 'Technology' },
            { value: 'life', label: 'Lifestyle' },
            { value: 'business', label: 'Business' },
          ],
        }),
        tags: fields.array({
          label: 'Tags',
          itemField: fields.text({ label: 'Tag' }),
        }),
        featuredImage: fields.image({
          label: 'Featured Image',
          directory: 'images',
        }),
        excerpt: fields.textarea({
          label: 'Excerpt',
          description: 'Short description for previews',
        }),
        content: fields.markdoc({
          label: 'Content',
        }),
      },
    }),
    authors: collection({
      label: 'Authors',
      path: 'authors/*',
      slugField: 'name',
      description: 'Content authors',
      schema: {
        name: fields.text({
          label: 'Name',
          required: true,
        }),
        slug: fields.slug({
          label: 'Slug',
          from: 'name',
        }),
        email: fields.text({
          label: 'Email',
        }),
        bio: fields.textarea({
          label: 'Bio',
        }),
        avatar: fields.image({
          label: 'Avatar',
          directory: 'images',
        }),
      },
    }),
  },
});

const app = new Hono();

// Enable CORS for Vite dev server
app.use('*', cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// Serve static files from content directory
app.use('/content/*', serveStatic({ root: './' }));

// Mount static-admin API
app.route('/api', staticAdmin({ config }));

const port = 3001;
console.log(`API Server running at http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
