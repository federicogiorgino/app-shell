import type { Database } from "./types";

/**
 * The open database, shared by every repository. The app sets it at startup (`expo.ts`);
 * tests set an in-memory one (`test-db.ts`).
 */
let current: Database | null = null;

export function setDatabase(database: Database | null): void {
  current = database;
}

export function getDatabase(): Database {
  if (!current) throw new Error("The local database is not open yet.");
  return current;
}
