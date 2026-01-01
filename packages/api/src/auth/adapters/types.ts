/**
 * Result of a database run operation (INSERT, UPDATE, DELETE)
 */
export interface RunResult {
  lastInsertRowid: number | bigint;
  changes: number;
}

/**
 * Database adapter interface
 * Abstracts the differences between better-sqlite3 and @libsql/client
 */
export interface DatabaseAdapter {
  /**
   * Execute a SQL statement (no return value)
   * Used for CREATE TABLE, DROP TABLE, etc.
   */
  execute(sql: string): Promise<void>;

  /**
   * Query for a single row
   * Returns undefined if no row found
   */
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | undefined>;

  /**
   * Query for multiple rows
   */
  queryAll<T>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Execute a statement that modifies data (INSERT, UPDATE, DELETE)
   * Returns the last insert row ID and number of changes
   */
  run(sql: string, params?: unknown[]): Promise<RunResult>;

  /**
   * Close the database connection
   */
  close(): Promise<void>;
}

/**
 * Configuration for SQLite adapter
 */
export interface SqliteAdapterConfig {
  type: 'sqlite';
  /** Path to SQLite database file */
  path: string;
}

/**
 * Configuration for Turso adapter
 */
export interface TursoAdapterConfig {
  type: 'turso';
  /** Turso database URL */
  url: string;
  /** Turso auth token */
  authToken: string;
}

/**
 * Union of all adapter configurations
 */
export type AdapterConfig = SqliteAdapterConfig | TursoAdapterConfig;
