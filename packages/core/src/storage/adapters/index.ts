/**
 * Storage Adapters
 *
 * Factory and exports for storage adapters
 */

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
} from './types';

export { createLocalStorageAdapter } from './local';
export { createGitHubStorageAdapter } from './github';

import type { StorageAdapter, StorageAdapterConfig } from './types';
import { createLocalStorageAdapter } from './local';
import { createGitHubStorageAdapter } from './github';

/**
 * Create a storage adapter based on configuration
 */
export function createStorageAdapter(config: StorageAdapterConfig): StorageAdapter {
  switch (config.kind) {
    case 'local':
      return createLocalStorageAdapter(config);
    case 'github':
      return createGitHubStorageAdapter(config);
    default:
      throw new Error(
        `Unknown storage adapter kind: ${(config as { kind: string }).kind}`
      );
  }
}
