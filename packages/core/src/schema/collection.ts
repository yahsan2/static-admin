import type {
  Collection,
  Singleton,
  CollectionConfig,
  SingletonConfig,
} from '../types/config';
import type { Schema } from '../types/fields';

/**
 * Define a collection (multiple entries)
 *
 * @example
 * ```ts
 * const posts = collection({
 *   label: 'Posts',
 *   path: 'posts/*',
 *   slugField: 'title',
 *   schema: {
 *     title: fields.text({ label: 'Title', required: true }),
 *     slug: fields.slug({ from: 'title' }),
 *     content: fields.markdoc({ label: 'Content' }),
 *   },
 * });
 * ```
 */
export function collection<S extends Schema>(
  config: CollectionConfig<S>
): Collection<S> {
  return {
    kind: 'collection',
    config,
  };
}

/**
 * Define a singleton (single entry)
 *
 * @example
 * ```ts
 * const settings = singleton({
 *   label: 'Settings',
 *   path: 'settings',
 *   schema: {
 *     siteName: fields.text({ label: 'Site Name', required: true }),
 *     description: fields.textarea({ label: 'Description' }),
 *   },
 * });
 * ```
 */
export function singleton<S extends Schema>(
  config: SingletonConfig<S>
): Singleton<S> {
  return {
    kind: 'singleton',
    config,
  };
}
