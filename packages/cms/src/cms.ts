import { ContentManager, type StaticAdminConfig, type Schema, type Entry } from '@static-admin/core';
import { QueryBuilder } from './query-builder';
import type {
  CMSOptions,
  CMS,
  CollectionNames,
  SingletonNames,
  CollectionSchema,
  SingletonSchema,
} from './types';

/**
 * Create a type-safe CMS instance for querying content
 *
 * @example
 * ```typescript
 * import { createCMS } from '@static-admin/cms';
 * import config from './static-admin.config';
 *
 * // Create CMS instance
 * const cms = createCMS({ config });
 *
 * // Query posts with full type safety
 * const posts = await cms.posts
 *   .filter({ category: 'tech' })
 *   .sort('date', 'desc')
 *   .limit(10)
 *   .all();
 *
 * // Get a single entry
 * const post = await cms.entry('posts', 'hello-world');
 * ```
 *
 * @example With authentication for draft access
 * ```typescript
 * const cms = createCMS({
 *   config,
 *   isAuthenticated: true, // Enable draft access
 * });
 *
 * // Now includeDrafts() will work
 * const allPosts = await cms.posts
 *   .includeDrafts()
 *   .all();
 * ```
 */
export function createCMS<T extends StaticAdminConfig<any, any>>(
  options: CMSOptions<T>
): CMS<T> {
  const { config, rootDir = process.cwd(), isAuthenticated = false } = options;

  // Create ContentManager instance
  const contentManager = new ContentManager({
    config,
    rootDir,
  });

  // Create collection accessor factory
  const createCollectionAccessor = <S extends Schema>(
    collectionName: string
  ): QueryBuilder<S> => {
    return new QueryBuilder<S>(contentManager, collectionName, undefined, isAuthenticated);
  };

  // Entry accessor function
  const entry = async <K extends CollectionNames<T>>(
    collection: K,
    slug: string
  ): Promise<Entry<CollectionSchema<T, K>> | null> => {
    const collectionName = collection as string;

    // Validate collection exists
    if (!config.collections?.[collectionName]) {
      throw new Error(`Collection "${collectionName}" not found in configuration`);
    }

    const result = await contentManager.getEntry<CollectionSchema<T, K>>(
      collectionName,
      slug
    );

    if (!result) {
      return null;
    }

    // Filter draft if not authenticated
    if (!isAuthenticated) {
      const fields = result.data.fields as Record<string, unknown>;
      if (fields['draft'] === true) {
        return null;
      }
    }

    return result;
  };

  // Singleton accessor function
  const singleton = async <K extends SingletonNames<T>>(
    name: K
  ): Promise<Entry<SingletonSchema<T, K>> | null> => {
    const singletonName = name as string;

    // Validate singleton exists
    if (!config.singletons?.[singletonName]) {
      throw new Error(`Singleton "${singletonName}" not found in configuration`);
    }

    // Singletons use their name as the slug
    const result = await contentManager.getEntry<SingletonSchema<T, K>>(
      singletonName,
      singletonName
    );

    return result;
  };

  // Create proxy for dynamic collection access
  const handler: ProxyHandler<object> = {
    get(target, prop: string) {
      // Handle built-in methods
      if (prop === 'entry') {
        return entry;
      }
      if (prop === 'singleton') {
        return singleton;
      }

      // Handle collection access
      if (config.collections?.[prop]) {
        return createCollectionAccessor(prop);
      }

      // Unknown property
      if (typeof prop === 'string') {
        throw new Error(`Collection "${prop}" not found in configuration`);
      }

      return undefined;
    },

    // Support 'in' operator for checking collection existence
    has(target, prop: string) {
      return (
        prop === 'entry' ||
        prop === 'singleton' ||
        !!config.collections?.[prop]
      );
    },

    // Support Object.keys() for listing collections
    ownKeys() {
      return [
        'entry',
        'singleton',
        ...Object.keys(config.collections ?? {}),
      ];
    },

    getOwnPropertyDescriptor(target, prop) {
      if (
        prop === 'entry' ||
        prop === 'singleton' ||
        config.collections?.[prop as string]
      ) {
        return {
          configurable: true,
          enumerable: true,
          value: this.get?.(target, prop, target),
        };
      }
      return undefined;
    },
  };

  return new Proxy({}, handler) as CMS<T>;
}
