import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { setDatabase } from "./client";
import { migrate, MIGRATIONS } from "./migrations";
import type { Database, SqlExecutor, SqlValue } from "./types";

const FILE_NAME = "app.db";

type Connection = Pick<SQLiteDatabase, "runAsync" | "getAllAsync" | "getFirstAsync">;

function executor(connection: Connection): SqlExecutor {
  return {
    run: async (sql, params: readonly SqlValue[] = []) => {
      const result = await connection.runAsync(sql, [...params]);
      return { changes: result.changes };
    },
    all: (sql, params: readonly SqlValue[] = []) => connection.getAllAsync(sql, [...params]),
    first: (sql, params: readonly SqlValue[] = []) => connection.getFirstAsync(sql, [...params]),
  };
}

let opening: Promise<void> | null = null;

/**
 * Opens the app database once and brings its schema up to date. Call before the first screen
 * that reads data renders; later calls return the same promise.
 */
export function openAppDatabase(): Promise<void> {
  opening ??= (async () => {
    const sqlite = await openDatabaseAsync(FILE_NAME);
    await sqlite.execAsync("PRAGMA journal_mode = WAL");
    const database: Database = {
      ...executor(sqlite),
      transaction: async (task) => {
        let result: Awaited<ReturnType<typeof task>> | undefined;
        // Exclusive, so no other query runs inside the transaction while `task` awaits.
        await sqlite.withExclusiveTransactionAsync(async (txn) => {
          result = await task(executor(txn));
        });
        return result as Awaited<ReturnType<typeof task>>;
      },
    };
    await migrate(database, MIGRATIONS);
    setDatabase(database);
  })().catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}
