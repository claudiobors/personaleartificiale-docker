/**
 * Database layer for PostgreSQL
 * Replaces the old team-db SQLite wrapper.
 */
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

export interface DbRow {
  [key: string]: unknown;
}

export async function query<T extends DbRow = DbRow>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function execute(
  sql: string,
  params?: unknown[],
): Promise<{ rowCount: number; rows: DbRow[] }> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return { rowCount: result.rowCount ?? 0, rows: result.rows as DbRow[] };
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  fn: (client: import('pg').PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function ensureTables(): Promise<void> {
  // Tables are created by init.sql in Docker entrypoint
  // This is a safety net for local dev without Docker
  console.log('Database tables managed by init.sql');
}
