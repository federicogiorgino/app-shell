# Local database

`src/lib/db`. The shell keeps its data in a local SQLite file (`app.db`, expo-sqlite). There is no sync engine: screens read and write the local database only, and never wait for a network. If you later add a backend, write a sync layer on top of the repositories; the records already carry the fields a sync needs (`updatedAt`, `deletedAt`).

## The pieces

| File                 | Role                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`           | `SqlExecutor` (`run`, `all`, `first`), `Database` (adds `transaction`), `SqlValue`, `TableName`                                                   |
| `client.ts`          | The one shared open database: `setDatabase`, `getDatabase` (throws if not open)                                                                   |
| `expo.ts`            | `openAppDatabase()`: opens `app.db`, turns on WAL, adapts expo-sqlite to `Database`, runs the migrations, calls `setDatabase`                     |
| `migrations.ts`      | `MIGRATIONS`, `RECORD_COLUMNS`, `migrate()`                                                                                                       |
| `records.ts`         | `RecordTable`, `selectRecords`, `selectRecord`, `putRecord`, `tombstoneRecord`, `writeTransaction`, `wipeLocalDatabase`, shared Zod field schemas |
| `notify.ts`          | Per-table change notifications: `subscribeTables`, `notifyTables`                                                                                 |
| `use-live-query.ts`  | `useLiveQuery`: a query that re-runs when its tables change                                                                                       |
| `use-local-store.ts` | `useLocalStore`: opens the database at start-up; `LocalStoreError`                                                                                |
| `test-db.ts`         | `openTestDatabase`: an in-memory `node:sqlite` database for tests                                                                                 |

The abstraction (`SqlExecutor`) is the only SQL surface repositories see. The app implements it with expo-sqlite, tests implement it with Node's built-in `node:sqlite`, so repositories are tested against real SQL without a device.

## Opening and migrating

`useLocalStore()` is called once in `RootLayout`. It calls `openAppDatabase()` (idempotent: later calls return the same promise; a failed open resets so a retry can try again), then an optional `prepare` callback (a dev seed, say), and returns `true` when ready. Until then the root layout renders nothing and the splash stays up. A failure is thrown during render as `LocalStoreError`, which the root `ErrorBoundary` turns into a `DataError` screen with Try Again (that remounts the hook and retries).

`migrate(database, migrations)` reads SQLite's `user_version`, and for every migration the database has not seen runs its statements and `PRAGMA user_version = n` in one transaction. Migrations run in order, each atomically.

### Adding or changing a table

`MIGRATIONS` is an array of arrays of SQL strings; the index is the version. **Append a new entry for every change. Never edit one that has shipped**, because devices already past it will not run it again.

```ts
export const MIGRATIONS = [
  [/* v1 */ `CREATE TABLE item (...)`],
  [
    /* v2 */
    `CREATE TABLE dose (
       id TEXT PRIMARY KEY NOT NULL,
       medicine TEXT NOT NULL,
       taken INTEGER NOT NULL DEFAULT 0,${RECORD_COLUMNS}
     )`,
  ],
];
```

Rules: column names are `snake_case`; every record table has `id TEXT PRIMARY KEY` and `RECORD_COLUMNS` (`created_at`, `updated_at`, `deleted_at`); booleans are `INTEGER 0/1`; objects are `TEXT` JSON.

## Records

A record is a row with your fields plus `RecordMeta`:

| Field       | Column       | Meaning                                           |
| ----------- | ------------ | ------------------------------------------------- |
| `id`        | `id`         | UUID v7 from `newId()`, sortable by creation time |
| `createdAt` | `created_at` | ISO date-time, set on first write                 |
| `updatedAt` | `updated_at` | ISO date-time, moved forward on every write       |
| `deletedAt` | `deleted_at` | `null` while live; set when deleted (a tombstone) |

`nextUpdatedAt(now, current)` guarantees `updatedAt` is strictly later than the previous value even if the device clock went backwards, so ordering by it is stable.

### Defining a table: `RecordTable`

A feature defines one object per table in its `schema.ts`:

```ts
export const doseTable: RecordTable<DoseFields, DoseInput> = {
  table: "dose",
  fields: doseFieldsSchema, // Zod: validates and defaults
  columns: {
    // field -> [column, type]
    medicine: ["medicine", "text"],
    taken: ["taken", "boolean"],
    detail: ["detail", "json"],
  },
};
```

Column types: `text`, `integer` (passed through), `boolean` (stored 0/1, read as `true`/`false`), `json` (stored with `JSON.stringify`, read with `JSON.parse`). `null` and `undefined` store as `NULL`.

Shared field schemas exported from `records.ts`: `idSchema`, `localDateSchema` (a real `YYYY-MM-DD`), `dateTimeSchema` (ISO with offset).

### Reading

- `selectRecords(def, { where?, params?, orderBy? }, executor?)`: live records only (`deleted_at IS NULL` is added for you). `where` and `orderBy` are SQL fragments with `?` parameters. Always pass user input through `params`.
- `selectRecord(def, id, executor?)`: one live record, or `null` if missing or deleted.
- `rowToRecord(def, row)`: the mapping, exported for custom queries.

### Writing

All writes go through `writeTransaction(tables, task)`. It runs `task` in one exclusive transaction (everything commits or nothing does), then calls `notifyTables(tables)` once, so live queries refresh after the commit and never see half a write.

- `putRecord(tx, def, input, now?)`: validates `input` with the table's Zod schema (a bad value throws), then upserts. Creates a record when `input.id` is missing or unknown. **Always a full record, never a partial one**: `updateItem` reads the stored item and writes it whole with the changes applied. Writing the id of a deleted record brings it back (that is how Undo works).
- `tombstoneRecord(tx, def, id, now?)`: soft delete. Sets `deleted_at` and `updated_at`; returns `false` when there was nothing live to delete.
- `wipeLocalDatabase()`: deletes every row of every table, keeping the schema, then notifies all tables. Used after Delete Account, or for a "reset the app" setting.

### Soft delete and Undo

Deleting never removes the row. The repository's `deleteItem(item)` tombstones it and returns an `undo` function that writes the item back. The UI shows a toast with an Undo button wired to it ([glass.md](glass.md#glass-toast)). Tombstones stay in the table; add a purge (hard delete of old tombstones) if the table grows, or when no sync needs them.

## Live queries

```ts
const items = useLiveQuery(["item"], "items:all", listItems);
// items.status: "loading" | "success" | "error"; items.data; items.error
```

`useLiveQuery(tables, key, query)`:

- Runs `query` on mount, then again whenever any table in `tables` is notified.
- `key` identifies the query's inputs (an id, a date, a filter). A new key starts over and reads as `loading` immediately, so you never see the previous input's data under a new title. Include every input in the key (`item:${id}`).
- Overlapping runs are guarded: only the latest result is applied, and results after unmount are dropped.
- On error, `data` keeps the previous result for the same key, so a list can stay visible beside an error.
- The latest `query` closure is used without resubscribing, so inline functions are fine.

Pick the right states in the screen: `loading` shows `ScreenLoading`, `error` shows `DataError` with a retry (bump an `attempt` counter in the key), empty data shows `EmptyState`.

## Change notifications

`notify.ts` holds a map of table name to listeners. `subscribeTables(tables, listener)` returns an unsubscribe. `notifyTables(tables)` calls each listener once even if it watches several of the tables. It is used instead of expo-sqlite's own change listener because that fires once per row and does not exist in tests.

## Testing

```ts
beforeEach(async () => {
  await openTestDatabase();
}); // fresh in-memory DB each test
```

`openTestDatabase(migrations?)` creates a `:memory:` database, serialises transactions like expo-sqlite's exclusive transactions (BEGIN/COMMIT/ROLLBACK), migrates, and sets it as the shared database. Pass your own migrations to test a schema. Only test files import it; Metro never bundles it. See `features/demo/repository.test.ts` for the patterns: defaults and trimming, validation errors, `updatedAt` moving forward, ordering, delete and Undo, notifications, and wiping.

## Adding a sync later

The shell has no sync engine, but the record layer is shaped for one. A common design is an outbox: change `writeTransaction` (or the repositories) to also insert a mutation row (record id, table, full record) into an `outbox` table in the same transaction; a sync module flushes the outbox to the server with `api()` and pulls remote changes, writing them with `putRecord` and `notifyTables`. `updatedAt` (always moving forward) and tombstones (`deletedAt`) are what a last-writer-wins merge needs, and UUID v7 ids sort by creation time. Keep the UI reading the local store only, so it never waits for the network.

## Using a different store

Everything above `SqlExecutor` is storage-agnostic. To use another engine, implement `Database` (`run`, `all`, `first`, `transaction`), call `setDatabase`, and keep the migration runner or replace it. To drop the database entirely, remove `useLocalStore` from `RootLayout`, `expo-sqlite` from the plugins, and `src/lib/db`, `src/features/demo`.
