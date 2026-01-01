/**
 * Storage Adapter Types
 *
 * Defines the interface for storage backends (local filesystem, GitHub, etc.)
 */

/**
 * File metadata returned from storage operations
 */
export interface FileMetadata {
  /** File path relative to content root */
  path: string;
  /** File size in bytes (if available) */
  size?: number;
  /** Last modified timestamp */
  updatedAt: Date;
  /** Created timestamp (may equal updatedAt for GitHub) */
  createdAt: Date;
  /** SHA hash (GitHub specific, useful for updates) */
  sha?: string;
}

/**
 * Directory entry information
 */
export interface DirectoryEntry {
  /** Entry name (file or directory name) */
  name: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** Full path relative to content root */
  path: string;
}

/**
 * File content with metadata
 */
export interface FileContent {
  /** Raw file content as string */
  content: string;
  /** File metadata */
  metadata: FileMetadata;
}

/**
 * Binary file content (for images)
 */
export interface BinaryFileContent {
  /** Raw binary data */
  data: Buffer;
  /** File metadata */
  metadata: FileMetadata;
}

/**
 * Write operation result
 */
export interface WriteResult {
  /** Path to written file */
  path: string;
  /** SHA hash of new content (GitHub) */
  sha?: string;
  /** Commit SHA if auto-committed (GitHub) */
  commitSha?: string;
}

/**
 * Batch write operation for atomic commits
 */
export interface BatchWriteOperation {
  /** Operation type */
  type: 'create' | 'update' | 'delete';
  /** File path relative to content root */
  path: string;
  /** Content for create/update (base64 for binary) */
  content?: string;
  /** Whether content is base64 encoded */
  isBase64?: boolean;
}

/**
 * Storage adapter interface
 * Abstracts filesystem operations for different backends
 */
export interface StorageAdapter {
  /**
   * Check if a file or directory exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Read directory contents
   * @param path - Directory path relative to content root
   * @returns Array of directory entries
   */
  readDirectory(path: string): Promise<DirectoryEntry[]>;

  /**
   * Read file content as string
   * @param path - File path relative to content root
   * @returns File content with metadata, or null if not found
   */
  readFile(path: string): Promise<FileContent | null>;

  /**
   * Read file as binary (for images)
   * @param path - File path relative to content root
   * @returns Binary content with metadata, or null if not found
   */
  readBinaryFile(path: string): Promise<BinaryFileContent | null>;

  /**
   * Write file content
   * @param path - File path relative to content root
   * @param content - File content as string
   * @param message - Optional commit message (for GitHub)
   * @returns Write result
   */
  writeFile(
    path: string,
    content: string,
    message?: string
  ): Promise<WriteResult>;

  /**
   * Write binary file (for images)
   * @param path - File path relative to content root
   * @param data - Binary data
   * @param message - Optional commit message (for GitHub)
   * @returns Write result
   */
  writeBinaryFile(
    path: string,
    data: Buffer,
    message?: string
  ): Promise<WriteResult>;

  /**
   * Delete a file
   * @param path - File path relative to content root
   * @param message - Optional commit message (for GitHub)
   */
  deleteFile(path: string, message?: string): Promise<void>;

  /**
   * Delete a directory recursively
   * @param path - Directory path relative to content root
   * @param message - Optional commit message (for GitHub)
   */
  deleteDirectory(path: string, message?: string): Promise<void>;

  /**
   * Create a directory (no-op for GitHub as directories are implicit)
   * @param path - Directory path relative to content root
   */
  createDirectory(path: string): Promise<void>;

  /**
   * Batch write multiple files atomically (single commit for GitHub)
   * @param operations - Array of write operations
   * @param message - Commit message
   * @returns Array of write results
   */
  batchWrite(
    operations: BatchWriteOperation[],
    message: string
  ): Promise<WriteResult[]>;
}

/**
 * Configuration for local filesystem adapter
 */
export interface LocalStorageAdapterConfig {
  kind: 'local';
  /** Root directory for content (absolute path) */
  rootDir: string;
  /** Content path within root directory */
  contentPath: string;
}

/**
 * Configuration for GitHub API adapter
 */
export interface GitHubStorageAdapterConfig {
  kind: 'github';
  /** GitHub repository owner */
  owner: string;
  /** GitHub repository name */
  repo: string;
  /** Branch name (default: 'main') */
  branch?: string;
  /** Content path within repository */
  contentPath: string;
  /** Personal Access Token */
  token: string;
}

/**
 * Union of all storage adapter configurations
 */
export type StorageAdapterConfig =
  | LocalStorageAdapterConfig
  | GitHubStorageAdapterConfig;
