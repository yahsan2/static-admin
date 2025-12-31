/**
 * Static Admin type registration
 *
 * This file registers your config with the @static-admin/client package,
 * enabling automatic type inference without passing config type everywhere.
 *
 * After this setup, you can use:
 * - createClient() without type parameter
 * - CollectionEntry<'posts'> instead of CollectionEntry<typeof config, 'posts'>
 */
import type { config } from './server/api';

declare module '@static-admin/client' {
  interface StaticAdminRegistry {
    config: typeof config;
  }
}
