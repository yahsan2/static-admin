import type { Schema } from './fields';

/** Storage configuration */
export interface StorageConfig {
  /** Path to content directory relative to project root */
  contentPath: string;
}

/** Git configuration */
export interface GitConfig {
  /** Enable auto-commit on save */
  autoCommit?: boolean;
  /** Custom commit message template */
  commitMessage?: (action: 'create' | 'update' | 'delete', collection: string, slug: string) => string;
}

/** Auth configuration */
export interface AuthConfig {
  /** Path to SQLite database file */
  database: string;
  /** Session expiry in seconds (default: 7 days) */
  sessionExpiry?: number;
}

/** Collection configuration */
export interface CollectionConfig<S extends Schema = Schema> {
  /** Display label for the collection */
  label: string;
  /** Path pattern for content files (e.g., 'posts/*') */
  path: string;
  /** Field to use for generating slug */
  slugField: keyof S & string;
  /** Schema definition */
  schema: S;
  /** Description of the collection */
  description?: string;
}

/** Singleton configuration (single content file) */
export interface SingletonConfig<S extends Schema = Schema> {
  /** Display label */
  label: string;
  /** Path to content file (e.g., 'settings') */
  path: string;
  /** Schema definition */
  schema: S;
  /** Description */
  description?: string;
}

/** Collection instance */
export interface Collection<S extends Schema = Schema> {
  kind: 'collection';
  config: CollectionConfig<S>;
}

/** Singleton instance */
export interface Singleton<S extends Schema = Schema> {
  kind: 'singleton';
  config: SingletonConfig<S>;
}

/** Main configuration (base interface for runtime) */
export interface StaticAdminConfig<
  TCollections extends Record<string, Collection<any>> = Record<string, Collection<any>>,
  TSingletons extends Record<string, Singleton<any>> = Record<string, Singleton<any>>,
> {
  /** Storage settings */
  storage: StorageConfig;
  /** Git integration settings */
  git?: GitConfig;
  /** Authentication settings */
  auth?: AuthConfig;
  /** Collections (multiple entries) */
  collections?: TCollections;
  /** Singletons (single entry) */
  singletons?: TSingletons;
}

/** Helper type to infer config with preserved collection types */
export type InferConfig<T> = T extends StaticAdminConfig<infer C, infer S>
  ? StaticAdminConfig<C, S>
  : never;
