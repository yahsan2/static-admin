import type { StaticAdminConfig } from '../types/config';

/**
 * Define the static-admin configuration
 *
 * @example
 * ```ts
 * import { defineConfig, collection, fields } from '@static-admin/core';
 *
 * export default defineConfig({
 *   storage: {
 *     contentPath: 'content',
 *   },
 *   git: {
 *     autoCommit: true,
 *   },
 *   auth: {
 *     database: './admin.db',
 *   },
 *   collections: {
 *     posts: collection({
 *       label: 'Posts',
 *       path: 'posts/*',
 *       slugField: 'title',
 *       schema: {
 *         title: fields.text({ label: 'Title', required: true }),
 *         slug: fields.slug({ from: 'title' }),
 *         date: fields.date({ label: 'Date' }),
 *         content: fields.markdoc({ label: 'Content' }),
 *       },
 *     }),
 *   },
 * });
 * ```
 */
export function defineConfig(config: StaticAdminConfig): StaticAdminConfig {
  // Validate and set defaults
  const finalConfig: StaticAdminConfig = {
    storage: {
      contentPath: config.storage.contentPath || 'content',
    },
    git: config.git
      ? {
          autoCommit: config.git.autoCommit ?? false,
          commitMessage:
            config.git.commitMessage ??
            ((action, collection, slug) => `${action}: ${collection}/${slug}`),
        }
      : undefined,
    auth: config.auth
      ? {
          database: config.auth.database,
          sessionExpiry: config.auth.sessionExpiry ?? 7 * 24 * 60 * 60, // 7 days
        }
      : undefined,
    collections: config.collections,
    singletons: config.singletons,
  };

  return finalConfig;
}
