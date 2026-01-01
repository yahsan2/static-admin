import { defineConfig, collection, fields } from '@static-admin/core';

// Use remote DB in production (Edge), SQLite in development
const authConfig = process.env.TURSO_DATABASE_URL
  ? {
      remote: {
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      },
      sessionExpiry: 7 * 24 * 60 * 60,
    }
  : {
      database: './admin.db',
      sessionExpiry: 7 * 24 * 60 * 60,
    };

export default defineConfig({
  storage: {
    contentPath: 'content',
  },
  git: {
    autoCommit: true,
    commitMessage: (action, collection, slug) =>
      `content(${collection}): ${action} ${slug}`,
  },
  auth: authConfig,
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
