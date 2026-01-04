/**
 * GitHub API Storage Adapter
 *
 * Implements StorageAdapter using GitHub REST API
 * - Contents API for simple operations
 * - Git Data API (Trees, Blobs, Commits, Refs) for batch operations
 */

import type {
  StorageAdapter,
  GitHubStorageAdapterConfig,
  DirectoryEntry,
  FileContent,
  BinaryFileContent,
  WriteResult,
  BatchWriteOperation,
} from './types';

/**
 * GitHub API response types
 */
interface GitHubContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

interface GitHubTreeItem {
  path: string;
  mode: '100644' | '100755' | '040000' | '160000' | '120000';
  type: 'blob' | 'tree' | 'commit';
  sha?: string | null;
  content?: string;
}

interface GitHubError {
  message: string;
  documentation_url?: string;
}

/**
 * Create a GitHub API storage adapter
 */
export function createGitHubStorageAdapter(
  config: GitHubStorageAdapterConfig
): StorageAdapter {
  const { owner, repo, branch = 'main', contentPath, token, tokenProvider } = config;
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

  // Validate that either token or tokenProvider is provided
  if (!token && !tokenProvider) {
    throw new Error(
      'GitHub storage requires either a token or tokenProvider. ' +
        'Set storage.token, storage.tokenProvider, or GITHUB_TOKEN environment variable.'
    );
  }

  /**
   * Get the authorization header with token
   * Uses tokenProvider if available, otherwise static token
   */
  async function getAuthHeaders(): Promise<Record<string, string>> {
    const authToken = tokenProvider ? await tokenProvider() : token!;
    return {
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  // SHA cache to reduce API calls for updates
  const shaCache = new Map<string, string>();

  /**
   * Normalize path: combine contentPath with relative path
   */
  const normalizePath = (relativePath: string): string => {
    const normalized = relativePath.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!contentPath) return normalized;
    return `${contentPath}/${normalized}`.replace(/\/+/g, '/');
  };

  /**
   * Remove contentPath prefix from GitHub response paths
   */
  const relativizePath = (githubPath: string): string => {
    if (contentPath && githubPath.startsWith(contentPath + '/')) {
      return githubPath.slice(contentPath.length + 1);
    }
    return githubPath;
  };

  /**
   * Make a GitHub API request
   */
  async function fetchGitHub<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

    // Check rate limit
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining && parseInt(remaining, 10) < 10) {
      console.warn(`GitHub API rate limit low: ${remaining} requests remaining`);
    }

    if (!response.ok) {
      const error = (await response.json().catch(() => ({
        message: response.statusText,
      }))) as GitHubError;
      throw new Error(
        `GitHub API error (${response.status}): ${error.message}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get SHA for a file (from cache or API)
   */
  async function getFileSha(githubPath: string): Promise<string | null> {
    const cached = shaCache.get(githubPath);
    if (cached) return cached;

    try {
      const item = await fetchGitHub<GitHubContentItem>(
        `/contents/${githubPath}?ref=${branch}`
      );
      shaCache.set(githubPath, item.sha);
      return item.sha;
    } catch {
      return null;
    }
  }

  return {
    async exists(relativePath: string): Promise<boolean> {
      const githubPath = normalizePath(relativePath);
      try {
        await fetchGitHub(`/contents/${githubPath}?ref=${branch}`);
        return true;
      } catch {
        return false;
      }
    },

    async readDirectory(relativePath: string): Promise<DirectoryEntry[]> {
      const githubPath = normalizePath(relativePath);
      try {
        const items = await fetchGitHub<GitHubContentItem[]>(
          `/contents/${githubPath}?ref=${branch}`
        );

        if (!Array.isArray(items)) {
          return [];
        }

        return items.map((item) => ({
          name: item.name,
          isDirectory: item.type === 'dir',
          path: relativizePath(item.path),
        }));
      } catch {
        return [];
      }
    },

    async readFile(relativePath: string): Promise<FileContent | null> {
      const githubPath = normalizePath(relativePath);
      try {
        const item = await fetchGitHub<GitHubContentItem>(
          `/contents/${githubPath}?ref=${branch}`
        );

        if (item.type !== 'file' || !item.content) {
          return null;
        }

        // Cache SHA for later updates
        shaCache.set(githubPath, item.sha);

        const content = Buffer.from(item.content, 'base64').toString('utf-8');

        return {
          content,
          metadata: {
            path: relativizePath(item.path),
            size: item.size,
            sha: item.sha,
            // GitHub Contents API doesn't provide timestamps
            // Would need to fetch commit history for accurate dates
            updatedAt: new Date(),
            createdAt: new Date(),
          },
        };
      } catch {
        return null;
      }
    },

    async readBinaryFile(relativePath: string): Promise<BinaryFileContent | null> {
      const githubPath = normalizePath(relativePath);
      try {
        const item = await fetchGitHub<GitHubContentItem>(
          `/contents/${githubPath}?ref=${branch}`
        );

        if (item.type !== 'file' || !item.content) {
          return null;
        }

        shaCache.set(githubPath, item.sha);

        const data = Buffer.from(item.content, 'base64');

        return {
          data,
          metadata: {
            path: relativizePath(item.path),
            size: item.size,
            sha: item.sha,
            updatedAt: new Date(),
            createdAt: new Date(),
          },
        };
      } catch {
        return null;
      }
    },

    async writeFile(
      relativePath: string,
      content: string,
      message?: string
    ): Promise<WriteResult> {
      const githubPath = normalizePath(relativePath);
      const sha = await getFileSha(githubPath);

      const body: Record<string, unknown> = {
        message: message || `Update ${relativePath}`,
        content: Buffer.from(content).toString('base64'),
        branch,
      };

      if (sha) {
        body.sha = sha;
      }

      const result = await fetchGitHub<{
        commit: { sha: string };
        content: { sha: string };
      }>(`/contents/${githubPath}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      // Update cache with new SHA
      shaCache.set(githubPath, result.content.sha);

      return {
        path: relativePath,
        sha: result.content.sha,
        commitSha: result.commit.sha,
      };
    },

    async writeBinaryFile(
      relativePath: string,
      data: Buffer,
      message?: string
    ): Promise<WriteResult> {
      const githubPath = normalizePath(relativePath);
      const sha = await getFileSha(githubPath);

      const body: Record<string, unknown> = {
        message: message || `Upload ${relativePath}`,
        content: data.toString('base64'),
        branch,
      };

      if (sha) {
        body.sha = sha;
      }

      const result = await fetchGitHub<{
        commit: { sha: string };
        content: { sha: string };
      }>(`/contents/${githubPath}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      shaCache.set(githubPath, result.content.sha);

      return {
        path: relativePath,
        sha: result.content.sha,
        commitSha: result.commit.sha,
      };
    },

    async deleteFile(relativePath: string, message?: string): Promise<void> {
      const githubPath = normalizePath(relativePath);
      const sha = await getFileSha(githubPath);

      if (!sha) {
        // File doesn't exist
        return;
      }

      await fetchGitHub(`/contents/${githubPath}`, {
        method: 'DELETE',
        body: JSON.stringify({
          message: message || `Delete ${relativePath}`,
          sha,
          branch,
        }),
      });

      shaCache.delete(githubPath);
    },

    async deleteDirectory(relativePath: string, message?: string): Promise<void> {
      // GitHub doesn't have directories - need to delete all files in the path
      const entries = await this.readDirectory(relativePath);

      if (entries.length === 0) {
        return;
      }

      // Collect all files recursively
      const filesToDelete: string[] = [];

      const collectFiles = async (dirPath: string): Promise<void> => {
        const items = await this.readDirectory(dirPath);
        for (const item of items) {
          if (item.isDirectory) {
            await collectFiles(item.path);
          } else {
            filesToDelete.push(item.path);
          }
        }
      };

      await collectFiles(relativePath);

      if (filesToDelete.length > 0) {
        // Use batch delete for atomic operation
        const operations: BatchWriteOperation[] = filesToDelete.map((path) => ({
          type: 'delete' as const,
          path,
        }));

        await this.batchWrite(
          operations,
          message || `Delete ${relativePath}`
        );
      }
    },

    async createDirectory(_relativePath: string): Promise<void> {
      // GitHub doesn't have explicit directories - they're created when files are added
      // This is a no-op for GitHub
    },

    async batchWrite(
      operations: BatchWriteOperation[],
      message: string
    ): Promise<WriteResult[]> {
      if (operations.length === 0) {
        return [];
      }

      // For single operations, use simple API
      if (operations.length === 1) {
        const op = operations[0]!;
        if (op.type === 'delete') {
          await this.deleteFile(op.path, message);
          return [{ path: op.path }];
        } else if (op.content) {
          if (op.isBase64) {
            const buffer = Buffer.from(op.content, 'base64');
            return [await this.writeBinaryFile(op.path, buffer, message)];
          }
          return [await this.writeFile(op.path, op.content, message)];
        }
        return [];
      }

      // Use Git Data API for atomic commits with multiple files

      // 1. Get the current commit SHA
      const refData = await fetchGitHub<{ object: { sha: string } }>(
        `/git/ref/heads/${branch}`
      );
      const currentCommitSha = refData.object.sha;

      // 2. Get the tree SHA from the current commit
      const commitData = await fetchGitHub<{ tree: { sha: string } }>(
        `/git/commits/${currentCommitSha}`
      );
      const baseTreeSha = commitData.tree.sha;

      // 3. Build tree entries for the new commit
      const treeEntries: GitHubTreeItem[] = [];

      for (const op of operations) {
        const githubPath = normalizePath(op.path);

        if (op.type === 'delete') {
          // For deletions, set sha to null
          treeEntries.push({
            path: githubPath,
            mode: '100644',
            type: 'blob',
            sha: null,
          });
        } else if (op.content) {
          // For create/update, include content
          const content = op.isBase64
            ? Buffer.from(op.content, 'base64').toString('utf-8')
            : op.content;

          treeEntries.push({
            path: githubPath,
            mode: '100644',
            type: 'blob',
            content,
          });
        }
      }

      // 4. Create a new tree
      const newTree = await fetchGitHub<{ sha: string }>('/git/trees', {
        method: 'POST',
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeEntries,
        }),
      });

      // 5. Create a new commit
      const newCommit = await fetchGitHub<{ sha: string }>('/git/commits', {
        method: 'POST',
        body: JSON.stringify({
          message,
          tree: newTree.sha,
          parents: [currentCommitSha],
        }),
      });

      // 6. Update the branch reference
      await fetchGitHub(`/git/refs/heads/${branch}`, {
        method: 'PATCH',
        body: JSON.stringify({
          sha: newCommit.sha,
        }),
      });

      // Clear SHA cache for affected paths
      for (const op of operations) {
        shaCache.delete(normalizePath(op.path));
      }

      return operations.map((op) => ({
        path: op.path,
        commitSha: newCommit.sha,
      }));
    },
  };
}
