/// <reference types="node" />

import { DatabaseSync } from "node:sqlite";

import { setDatabase } from "./client";
import { migrate, MIGRATIONS } from "./migrations";
import type { Database, SqlExecutor, SqlValue } from "./types";

/**
 * An in-memory database for tests (Vitest on Node), migrated and set as the shared database.
 * Only test files import this module; Metro never bundles it.
 */
export async function openTestDatabase(
  migrations: readonly (readonly string[])[] = MIGRATIONS
): Promise<Database> {
  const sqlite = new DatabaseSync(":memory:");
  const executor: SqlExecutor = {
    run: async (sql, params: readonly SqlValue[] = []) => {
      const result = sqlite.prepare(sql).run(...params);
      return { changes: Number(result.changes) };
    },
    all: async <T>(sql: string, params: readonly SqlValue[] = []) =>
      sqlite.prepare(sql).all(...params) as T[],
    first: async <T>(sql: string, params: readonly SqlValue[] = []) =>
      (sqlite.prepare(sql).get(...params) as T | undefined) ?? null,
  };
  // Transactions run one at a time, like expo-sqlite's exclusive transactions.
  let queue: Promise<unknown> = Promise.resolve();
  const database: Database = {
    ...executor,
    transaction: (task) => {
      const run = queue.then(async () => {
        sqlite.exec("BEGIN");
        try {
          const result = await task(executor);
          sqlite.exec("COMMIT");
          return result;
        } catch (error) {
          sqlite.exec("ROLLBACK");
          throw error;
        }
      });
      queue = run.catch(() => undefined);
      return run;
    },
  };
  await migrate(database, migrations);
  setDatabase(database);
  return database;
}
