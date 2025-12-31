import type { StaticAdminConfig } from '@static-admin/ui';

const config: StaticAdminConfig = {
  storage: {
    contentPath: 'content',
  },
  auth: {
    database: './admin.db',
    sessionExpiry: 7 * 24 * 60 * 60,
  },
  // 環境変数から公開サイトURLを取得（Vite: VITE_*, Next.js: NEXT_PUBLIC_* など利用側で設定）
  publicSiteUrl: import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:3000',
  collections: {
    posts: {
      kind: 'collection',
      config: {
        label: 'Posts',
        path: 'posts/*',
        slugField: 'title',
        description: 'Blog posts and articles',
        schema: {
          title: {
            type: 'text',
            label: 'Title',
            required: true,
            validation: { minLength: 3, maxLength: 100 },
          },
          slug: {
            type: 'slug',
            label: 'Slug',
            from: 'title',
          },
          date: {
            type: 'date',
            label: 'Publish Date',
            defaultValue: 'now',
          },
          draft: {
            type: 'checkbox',
            label: 'Draft',
            description: 'Draft posts are not published',
            defaultValue: true,
          },
          category: {
            type: 'select',
            label: 'Category',
            options: [
              { value: 'tech', label: 'Technology' },
              { value: 'life', label: 'Lifestyle' },
              { value: 'business', label: 'Business' },
            ],
          },
          tags: {
            type: 'array',
            label: 'Tags',
            itemField: { type: 'text', label: 'Tag' },
          },
          featuredImage: {
            type: 'image',
            label: 'Featured Image',
            directory: 'images',
          },
          excerpt: {
            type: 'textarea',
            label: 'Excerpt',
            description: 'Short description for previews',
          },
          content: {
            type: 'markdoc',
            label: 'Content',
          },
        },
      },
    },
    authors: {
      kind: 'collection',
      config: {
        label: 'Authors',
        path: 'authors/*',
        slugField: 'name',
        description: 'Content authors',
        schema: {
          name: {
            type: 'text',
            label: 'Name',
            required: true,
          },
          slug: {
            type: 'slug',
            label: 'Slug',
            from: 'name',
          },
          email: {
            type: 'text',
            label: 'Email',
          },
          bio: {
            type: 'textarea',
            label: 'Bio',
          },
          avatar: {
            type: 'image',
            label: 'Avatar',
            directory: 'images',
          },
        },
      },
    },
  },
};

export default config;
