export type {
  DatabaseAdapter,
  RunResult,
  AdapterConfig,
  SqliteAdapterConfig,
  TursoAdapterConfig,
} from './types';

export { createSqliteAdapter } from './sqlite';
export { createTursoAdapter } from './turso';

import type { AdapterConfig, DatabaseAdapter } from './types';
import { createSqliteAdapter } from './sqlite';
import { createTursoAdapter } from './turso';

/**
 * Create a database adapter based on configuration
 */
export function createDatabaseAdapter(config: AdapterConfig): DatabaseAdapter {
  switch (config.type) {
    case 'sqlite':
      return createSqliteAdapter(config);
    case 'turso':
      return createTursoAdapter(config);
    default:
      throw new Error(`Unknown adapter type: ${(config as any).type}`);
  }
}
