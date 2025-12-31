import { simpleGit, type SimpleGit, type SimpleGitOptions } from 'simple-git';
import type { GitConfig } from '../types/config';

export interface GitManagerOptions {
  rootDir: string;
  config?: GitConfig;
}

export interface CommitResult {
  success: boolean;
  hash?: string;
  error?: string;
}

/**
 * GitManager handles Git operations for content
 */
export class GitManager {
  private git: SimpleGit;
  private config: GitConfig | undefined;
  private rootDir: string;

  constructor(options: GitManagerOptions) {
    this.rootDir = options.rootDir;
    this.config = options.config;

    const gitOptions: Partial<SimpleGitOptions> = {
      baseDir: this.rootDir,
      binary: 'git',
      maxConcurrentProcesses: 1,
    };

    this.git = simpleGit(gitOptions);
  }

  /**
   * Check if the directory is a Git repository
   */
  async isRepo(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize a Git repository if not already initialized
   */
  async init(): Promise<void> {
    const isRepo = await this.isRepo();
    if (!isRepo) {
      await this.git.init();
    }
  }

  /**
   * Stage files for commit
   */
  async add(files: string | string[]): Promise<void> {
    await this.git.add(files);
  }

  /**
   * Commit staged changes
   */
  async commit(message: string): Promise<CommitResult> {
    try {
      const result = await this.git.commit(message);
      return {
        success: true,
        hash: result.commit,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Commit failed',
      };
    }
  }

  /**
   * Auto-commit after content changes
   * Used when autoCommit is enabled in config
   */
  async autoCommit(
    action: 'create' | 'update' | 'delete',
    collection: string,
    slug: string,
    files: string[]
  ): Promise<CommitResult> {
    if (!this.config?.autoCommit) {
      return { success: true };
    }

    try {
      // Stage the files
      await this.add(files);

      // Check if there are changes to commit
      const status = await this.git.status();
      if (status.staged.length === 0) {
        return { success: true };
      }

      // Generate commit message
      const message = this.config.commitMessage
        ? this.config.commitMessage(action, collection, slug)
        : `${action}: ${collection}/${slug}`;

      // Commit
      return await this.commit(message);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Auto-commit failed',
      };
    }
  }

  /**
   * Get the current status
   */
  async status() {
    return await this.git.status();
  }

  /**
   * Get the log of recent commits
   */
  async log(options?: { maxCount?: number }) {
    return await this.git.log({
      maxCount: options?.maxCount ?? 10,
    });
  }

  /**
   * Pull changes from remote
   */
  async pull(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.git.pull();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pull failed',
      };
    }
  }

  /**
   * Push changes to remote
   */
  async push(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.git.push();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Push failed',
      };
    }
  }
}
