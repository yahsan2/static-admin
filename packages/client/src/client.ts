import type { StaticAdminConfig } from '@static-admin/core';
import type { Client, ClientOptions, CollectionNames, CollectionSchema } from './types';
import { ClientQueryBuilder } from './query-builder';

/**
 * Create a typed client for the Static Admin public API
 *
 * @example
 * ```ts
 * import { createClient } from '@static-admin/client';
 * import type config from './static-admin.config';
 *
 * const client = createClient<typeof config>({
 *   baseUrl: 'https://example.com/api',
 * });
 *
 * // Query posts with type safety
 * const posts = await client.posts
 *   .filter({ category: 'tech' })
 *   .sort('date', 'desc')
 *   .limit(10)
 *   .all();
 *
 * // Get a single post
 * const post = await client.posts.get('hello-world');
 *
 * // Paginated results
 * const result = await client.posts.page(2).paginate(20);
 * console.log(result.data, result.pagination);
 *
 * // Preview mode (requires authentication)
 * const drafts = await client.posts.preview().all();
 * ```
 */
export function createClient<T extends StaticAdminConfig<any, any>>(
  options: ClientOptions
): Client<T> {
  const { baseUrl, fetch: fetchFn = globalThis.fetch, headers = {} } = options;

  // Normalize baseUrl (remove trailing slash)
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

  // Create a proxy that returns a QueryBuilder for any collection access
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      // Return a new QueryBuilder for this collection
      return new ClientQueryBuilder<CollectionSchema<T, typeof prop>>({
        baseUrl: normalizedBaseUrl,
        collection: prop,
        fetchFn,
        headers,
      });
    },
  };

  return new Proxy({}, handler) as Client<T>;
}
