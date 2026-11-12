/**
 * The small slice of SQL the app needs. The app implements it with expo-sqlite (`expo.ts`);
 * tests implement it with Node's built-in `node:sqlite` (`test-db.ts`), so repositories run
 * against real SQL in tests.
 */
export type SqlValue = string | number | null;

export interface SqlExecutor {
  run(sql: string, params?: readonly SqlValue[]): Promise<{ changes: number }>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
}

export interface Database extends SqlExecutor {
  /** Runs `task` in one exclusive transaction: everything commits, or nothing does. */
  transaction<T>(task: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

/** A table name, as created in `migrations.ts`. Used for change notifications. */
export type TableName = string;
