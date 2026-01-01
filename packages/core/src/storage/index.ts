/**
 * Storage Module
 *
 * Provides storage abstraction for different backends
 */

export {
  createStorageAdapter,
  createLocalStorageAdapter,
  createGitHubStorageAdapter,
} from './adapters';

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
} from './adapters';
