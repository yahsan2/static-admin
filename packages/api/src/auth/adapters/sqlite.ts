import Database from 'better-sqlite3';
import type { DatabaseAdapter, RunResult, SqliteAdapterConfig } from './types';

/**
 * Create a SQLite database adapter using better-sqlite3
 * Wraps synchronous API in async for interface compatibility
 */
export function createSqliteAdapter(config: SqliteAdapterConfig): DatabaseAdapter {
  const db = new Database(config.path);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  return {
    async execute(sql: string): Promise<void> {
      db.exec(sql);
    },

    async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      const stmt = db.prepare(sql);
      return stmt.get(...params) as T | undefined;
    },

    async queryAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      const stmt = db.prepare(sql);
      return stmt.all(...params) as T[];
    },

    async run(sql: string, params: unknown[] = []): Promise<RunResult> {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return {
        lastInsertRowid: result.lastInsertRowid,
        changes: result.changes,
      };
    },

    async close(): Promise<void> {
      db.close();
    },
  };
}
