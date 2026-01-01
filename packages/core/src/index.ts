// @static-admin/core
// Schema definition and content management

// Schema
export { defineConfig } from './schema/config';
export { collection, singleton } from './schema/collection';
export { fields } from './schema/fields';

// Types
export type {
  StaticAdminConfig,
  InferConfig,
  Collection,
  Singleton,
  CollectionConfig,
  SingletonConfig,
  StorageConfig,
  LocalStorageConfig,
  GitHubStorageConfig,
  GitConfig,
  AuthConfig,
  RemoteDatabaseConfig,
} from './types/config';

export type {
  Field,
  TextField,
  SlugField,
  TextareaField,
  DateField,
  DatetimeField,
  CheckboxField,
  SelectField,
  RelationField,
  ImageField,
  ArrayField,
  MarkdocField,
  FieldType,
} from './types/fields';

export type {
  Entry,
  ContentFile,
  EntryData,
  EntryList,
  EntryListOptions,
} from './types/content';

export type { Schema, SelectOption, InferSchemaType, InferFieldType } from './types/fields';

// Content Manager
export { ContentManager } from './content/manager';
export type { ContentManagerOptions } from './content/manager';

// Validation
export { createValidator, validateEntry, getDefaultValues } from './validation/validator';

// Git
export { GitManager } from './git/manager';
export type { GitManagerOptions, CommitResult } from './git/manager';

// Storage
export {
  createStorageAdapter,
  createLocalStorageAdapter,
  createGitHubStorageAdapter,
} from './storage';

export type {
  StorageAdapter,
  StorageAdapterConfig,
  LocalStorageAdapterConfig,
  GitHubStorageAdapterConfig,
  FileMetadata,
  DirectoryEntry,
  FileContent,
  BinaryFileContent,
  WriteResult,
  BatchWriteOperation,
} from './storage';
