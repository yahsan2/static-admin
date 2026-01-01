import { createClient } from '@libsql/client';
import type { DatabaseAdapter, RunResult, TursoAdapterConfig } from './types';

/**
 * Create a Turso database adapter using @libsql/client
 * Works on Edge runtime (Vercel Edge, Cloudflare Workers, etc.)
 */
export function createTursoAdapter(config: TursoAdapterConfig): DatabaseAdapter {
  const client = createClient({
    url: config.url,
    authToken: config.authToken,
  });

  return {
    async execute(sql: string): Promise<void> {
      // Split SQL into individual statements for Turso compatibility
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await client.execute(statement);
      }
    },

    async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      const result = await client.execute({
        sql,
        args: params as any[],
      });
      return result.rows[0] as T | undefined;
    },

    async queryAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      const result = await client.execute({
        sql,
        args: params as any[],
      });
      return result.rows as T[];
    },

    async run(sql: string, params: unknown[] = []): Promise<RunResult> {
      const result = await client.execute({
        sql,
        args: params as any[],
      });
      return {
        lastInsertRowid: result.lastInsertRowid ?? 0,
        changes: result.rowsAffected,
      };
    },

    async close(): Promise<void> {
      client.close();
    },
  };
}
