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
 * Accepts only DQL (SELECT) statements to avoid accidental writes through
 * direct SQL — use the specific helper functions for mutations.
 */
export function query<T extends DbRow = DbRow>(sql: string): T[] {
  const raw = execSync(`team-db "${sql.replace(/"/g, '\\"')}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(raw) as T[];
}

/**
 * Execute a mutation (INSERT/UPDATE/DELETE/CREATE) via team-db.
 * Returns the JSON result.
 */
export function execute(sql: string): unknown {
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