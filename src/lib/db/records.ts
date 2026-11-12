import { z } from "zod";

import { isLocalDate } from "../dates";
import { newId } from "../ids";
import { getDatabase } from "./client";
import { notifyTables } from "./notify";
import type { SqlExecutor, SqlValue, TableName } from "./types";

/** Field rules the feature schemas share. */
export const idSchema = z.string().min(1).max(100);
export const localDateSchema = z.string().refine(isLocalDate, "Expected a YYYY-MM-DD date");
export const dateTimeSchema = z.iso.datetime({ offset: true });

/** Fields every record has besides its own fields. */
export interface RecordMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Set when the record is deleted (a tombstone), so Undo can bring it back. */
  deletedAt: string | null;
}

type ColumnType = "text" | "integer" | "boolean" | "json";

/**
 * One record table: its Zod schema for the fields, and how each field maps to a column. Each
 * feature defines its own in `schema.ts`; this is the one place rows become records.
 */
export interface RecordTable<Fields extends object, Input> {
  table: TableName;
  fields: z.ZodType<Fields, Input>;
  columns: { [Key in keyof Fields]-?: readonly [column: string, type: ColumnType] };
}

export type Row = Record<string, SqlValue>;

function toColumnValue(value: unknown, type: ColumnType): SqlValue {
  if (value === undefined || value === null) return null;
  if (type === "boolean") return value ? 1 : 0;
  if (type === "json") return JSON.stringify(value);
  return value as SqlValue;
}

function fromColumnValue(value: SqlValue, type: ColumnType): unknown {
  if (type === "boolean") return value === 1;
  if (type === "json") return value === null ? null : JSON.parse(String(value));
  return value;
}

export function rowToRecord<Fields extends object, Input>(
  def: RecordTable<Fields, Input>,
  row: Row
): Fields & RecordMeta {
  const record: Record<string, unknown> = {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  };
  for (const [key, [column, type]] of Object.entries(def.columns) as [
    string,
    readonly [string, ColumnType],
  ][]) {
    record[key] = fromColumnValue(row[column] ?? null, type);
  }
  return record as Fields & RecordMeta;
}

/** Live records of a table. `where` and `orderBy` are SQL fragments with `?` parameters. */
export async function selectRecords<Fields extends object, Input>(
  def: RecordTable<Fields, Input>,
  options: { where?: string; params?: readonly SqlValue[]; orderBy?: string } = {},
  executor: SqlExecutor = getDatabase()
): Promise<(Fields & RecordMeta)[]> {
  const where = options.where ? `deleted_at IS NULL AND (${options.where})` : "deleted_at IS NULL";
  const order = options.orderBy ? ` ORDER BY ${options.orderBy}` : "";
  const rows = await executor.all<Row>(
    `SELECT * FROM ${def.table} WHERE ${where}${order}`,
    options.params
  );
  return rows.map((row) => rowToRecord(def, row));
}

/** One live record, or null when it does not exist or is deleted. */
export async function selectRecord<Fields extends object, Input>(
  def: RecordTable<Fields, Input>,
  id: string,
  executor: SqlExecutor = getDatabase()
): Promise<(Fields & RecordMeta) | null> {
  const row = await executor.first<Row>(
    `SELECT * FROM ${def.table} WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return row ? rowToRecord(def, row) : null;
}

/**
 * The `updatedAt` for a write: the device clock, but always later than the record's current
 * `updatedAt`, so ordering by it stays right when the clock goes back.
 */
export function nextUpdatedAt(now: Date, current?: string | null): string {
  const previous = current ? Date.parse(current) : Number.NaN;
  const time = Number.isNaN(previous) ? now.getTime() : Math.max(now.getTime(), previous + 1);
  return new Date(time).toISOString();
}

/**
 * Validates and writes a full record inside a write transaction. Creates the record when
 * `input.id` is missing or unknown; writing a deleted record's id brings it back (Undo).
 */
export async function putRecord<Fields extends object, Input>(
  tx: SqlExecutor,
  def: RecordTable<Fields, Input>,
  input: Input & { id?: string },
  now: Date = new Date()
): Promise<Fields & RecordMeta> {
  const fields = def.fields.parse(input);
  const id = input.id ?? newId();
  const existing = await tx.first<{ created_at: string; updated_at: string }>(
    `SELECT created_at, updated_at FROM ${def.table} WHERE id = ?`,
    [id]
  );
  const updatedAt = nextUpdatedAt(now, existing?.updated_at);
  const createdAt = existing?.created_at ?? updatedAt;

  const entries = Object.entries(def.columns) as [string, readonly [string, ColumnType]][];
  const columns = entries.map(([, [column]]) => column);
  const values = entries.map(([key, [, type]]) =>
    toColumnValue((fields as Record<string, unknown>)[key], type)
  );
  const assignments = columns.map((column) => `${column} = excluded.${column}`).join(", ");
  await tx.run(
    `INSERT INTO ${def.table} (id, ${columns.join(", ")}, created_at, updated_at, deleted_at)
     VALUES (?, ${columns.map(() => "?").join(", ")}, ?, ?, NULL)
     ON CONFLICT (id) DO UPDATE SET ${assignments},
       updated_at = excluded.updated_at, deleted_at = NULL`,
    [id, ...values, createdAt, updatedAt]
  );

  const row = await tx.first<Row>(`SELECT * FROM ${def.table} WHERE id = ?`, [id]);
  return rowToRecord(def, row as Row);
}

/** Marks a live record deleted. Returns false when there was nothing to delete. */
export async function tombstoneRecord(
  tx: SqlExecutor,
  def: { table: TableName },
  id: string,
  now: Date = new Date()
): Promise<boolean> {
  const existing = await tx.first<{ updated_at: string }>(
    `SELECT updated_at FROM ${def.table} WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  if (!existing) return false;
  const updatedAt = nextUpdatedAt(now, existing.updated_at);
  await tx.run(`UPDATE ${def.table} SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
    updatedAt,
    updatedAt,
    id,
  ]);
  return true;
}

/**
 * Runs local writes in one transaction, then tells subscribers of `tables` that they changed.
 * Every repository write goes through here.
 */
export async function writeTransaction<T>(
  tables: readonly TableName[],
  task: (tx: SqlExecutor) => Promise<T>
): Promise<T> {
  const result = await getDatabase().transaction(task);
  notifyTables(tables);
  return result;
}

/**
 * Deletes every row of every table, keeping the schema. Use it when the data must not outlive the
 * account (after Delete Account), or for a "reset the app" setting.
 */
export async function wipeLocalDatabase(): Promise<void> {
  const database = getDatabase();
  const tables = (
    await database.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    )
  ).map((row) => row.name);
  await database.transaction(async (tx) => {
    for (const table of tables) await tx.run(`DELETE FROM ${table}`);
  });
  notifyTables(tables);
}
