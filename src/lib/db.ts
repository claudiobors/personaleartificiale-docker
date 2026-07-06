/**
 * Database utility — wraps the team-db CLI for executing SQL and reading results.
 * All queries go through Turso sync (pull → execute → push).
 */
import { execSync } from "node:child_process";

export interface DbRow {
  [key: string]: unknown;
}

/**
 * Execute a single SQL statement via team-db and return parsed JSON rows.
 */
export function querySync<T extends DbRow = DbRow>(sql: string): T[] {
  const raw = execSync(`team-db "${sql.replace(/"/g, '\\"')}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(raw) as T[];
}

/**
 * Async version of query for use with await in route handlers.
 */
export async function query<T extends DbRow = DbRow>(sql: string): Promise<T[]> {
  return querySync<T>(sql);
}

/**
 * Execute a mutation (INSERT/UPDATE/DELETE/CREATE) via team-db (sync version).
 */
export function executeSync(sql: string): unknown {
  const raw = execSync(`team-db "${sql.replace(/"/g, '\\"')}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  try {
    return JSON.parse(raw);
  } catch {
    return { status: "ok" };
  }
}

/**
 * Async version of execute for use with await in route handlers.
 */
export async function execute(sql: string): Promise<unknown> {
  return executeSync(sql);
}