import type { StaticAdminConfig } from '@static-admin/core';
import type { Client, ClientOptions, CollectionSchema, RegisteredConfig } from './types';
import { ClientQueryBuilder } from './query-builder';

/**
 * Create a typed client for the Static Admin public API
 *
 * If you've registered your config via module augmentation, no type parameter needed:
 * @example
 * ```ts
 * // After setting up static-admin.d.ts
 * const client = createClient({ baseUrl: '/public' });
 * const posts = await client.posts.all(); // Fully typed!
 * ```
 *
 * Otherwise, pass the config type explicitly:
 * @example
 * ```ts
 * import { createClient } from '@static-admin/client';
 * import type { config } from './static-admin.config';
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
 * ```
 */
export function createClient<T extends StaticAdminConfig<any, any> = RegisteredConfig>(
  options: ClientOptions
): Client<T> {
  const { baseUrl, fetch: customFetch, headers = {} } = options;
  // Wrap fetch to preserve context (avoid "Illegal invocation" error)
  const fetchFn: typeof fetch = customFetch ?? ((input, init) => fetch(input, init));

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
