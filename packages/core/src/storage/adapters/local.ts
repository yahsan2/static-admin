/**
 * Local Filesystem Storage Adapter
 *
 * Implements StorageAdapter using Node.js fs module
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  StorageAdapter,
  LocalStorageAdapterConfig,
  FileMetadata,
  DirectoryEntry,
  FileContent,
  BinaryFileContent,
  WriteResult,
  BatchWriteOperation,
} from './types';

/**
 * Create a local filesystem storage adapter
 */
export function createLocalStorageAdapter(
  config: LocalStorageAdapterConfig
): StorageAdapter {
  const basePath = path.join(config.rootDir, config.contentPath);

  /**
   * Resolve and validate path to prevent directory traversal
   */
  const resolvePath = (relativePath: string): string => {
    // Normalize the path to handle .. and .
    const normalized = path.normalize(relativePath);
    const resolved = path.resolve(basePath, normalized);

    // Ensure the resolved path is within basePath
    if (!resolved.startsWith(basePath)) {
      throw new Error(`Path traversal detected: ${relativePath}`);
    }

    return resolved;
  };

  /**
   * Get file metadata from fs.Stats
   */
  const getMetadata = (filePath: string, relativePath: string): FileMetadata => {
    const stats = fs.statSync(filePath);
    return {
      path: relativePath,
      size: stats.size,
      updatedAt: stats.mtime,
      createdAt: stats.birthtime,
    };
  };

  return {
    async exists(relativePath: string): Promise<boolean> {
      try {
        const fullPath = resolvePath(relativePath);
        return fs.existsSync(fullPath);
      } catch {
        return false;
      }
    },

    async readDirectory(relativePath: string): Promise<DirectoryEntry[]> {
      const fullPath = resolvePath(relativePath);

      if (!fs.existsSync(fullPath)) {
        return [];
      }

      const entries = fs.readdirSync(fullPath, { withFileTypes: true });
      return entries.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(relativePath, entry.name).replace(/\\/g, '/'),
      }));
    },

    async readFile(relativePath: string): Promise<FileContent | null> {
      const fullPath = resolvePath(relativePath);

      if (!fs.existsSync(fullPath)) {
        return null;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      return {
        content,
        metadata: getMetadata(fullPath, relativePath),
      };
    },

    async readBinaryFile(relativePath: string): Promise<BinaryFileContent | null> {
      const fullPath = resolvePath(relativePath);

      if (!fs.existsSync(fullPath)) {
        return null;
      }

      const data = fs.readFileSync(fullPath);
      return {
        data,
        metadata: getMetadata(fullPath, relativePath),
      };
    },

    async writeFile(
      relativePath: string,
      content: string,
      _message?: string
    ): Promise<WriteResult> {
      const fullPath = resolvePath(relativePath);
      const dir = path.dirname(fullPath);

      // Ensure directory exists
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');

      return { path: relativePath };
    },

    async writeBinaryFile(
      relativePath: string,
      data: Buffer,
      _message?: string
    ): Promise<WriteResult> {
      const fullPath = resolvePath(relativePath);
      const dir = path.dirname(fullPath);

      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, data);

      return { path: relativePath };
    },

    async deleteFile(relativePath: string, _message?: string): Promise<void> {
      const fullPath = resolvePath(relativePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    },

    async deleteDirectory(relativePath: string, _message?: string): Promise<void> {
      const fullPath = resolvePath(relativePath);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    },

    async createDirectory(relativePath: string): Promise<void> {
      const fullPath = resolvePath(relativePath);
      fs.mkdirSync(fullPath, { recursive: true });
    },

    async batchWrite(
      operations: BatchWriteOperation[],
      _message: string
    ): Promise<WriteResult[]> {
      // Local adapter executes operations sequentially (no atomic guarantee)
      const results: WriteResult[] = [];

      for (const op of operations) {
        switch (op.type) {
          case 'create':
          case 'update':
            if (op.isBase64 && op.content) {
              const buffer = Buffer.from(op.content, 'base64');
              results.push(await this.writeBinaryFile(op.path, buffer));
            } else if (op.content) {
              results.push(await this.writeFile(op.path, op.content));
            }
            break;
          case 'delete':
            await this.deleteFile(op.path);
            results.push({ path: op.path });
            break;
        }
      }

      return results;
    },
  };
}
