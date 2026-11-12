import type { Database } from "./types";

/**
 * The app's schema, as ordered changes. Append a new entry for every change; never edit one that
 * has shipped. The applied version is kept in SQLite's `user_version`.
 *
 * Column names are snake_case; each feature's `schema.ts` maps them to its fields. Every record
 * table has `id` and the `RECORD_COLUMNS` (see `records.ts`).
 *
 * The `item` table belongs to the demo (`src/features/demo`). Delete it with the demo, or keep
 * it and add your own tables in a new entry.
 */
export const RECORD_COLUMNS = `
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT`;

export const MIGRATIONS: readonly (readonly string[])[] = [
  [
    `CREATE TABLE item (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      favorite INTEGER NOT NULL DEFAULT 0,${RECORD_COLUMNS}
    )`,
  ],
];

/** Applies the migrations the database has not seen yet, each in its own transaction. */
export async function migrate(
  database: Database,
  migrations: readonly (readonly string[])[]
): Promise<number> {
  const row = await database.first<{ user_version: number }>("PRAGMA user_version");
  let version = row?.user_version ?? 0;
  while (version < migrations.length) {
    const statements = migrations[version];
    const next = version + 1;
    await database.transaction(async (tx) => {
      for (const statement of statements) await tx.run(statement);
      // PRAGMA does not take bound parameters; `next` is a number we control.
      await tx.run(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
  return version;
}
