import type { TableName } from "./types";

/**
 * Change notifications per table. Writes call `notifyTables` once, after their transaction
 * commits; `useLiveQuery` subscribes to the tables it reads. expo-sqlite's own change listener
 * fires once per row and not in tests, so it is not used.
 */
type Listener = () => void;

const listeners = new Map<TableName, Set<Listener>>();

export function subscribeTables(tables: readonly TableName[], listener: Listener): () => void {
  for (const table of tables) {
    let set = listeners.get(table);
    if (!set) {
      set = new Set();
      listeners.set(table, set);
    }
    set.add(listener);
  }
  return () => {
    for (const table of tables) listeners.get(table)?.delete(listener);
  };
}

/** Calls each subscribed listener once, even when it watches several of the tables. */
export function notifyTables(tables: Iterable<TableName>): void {
  const called = new Set<Listener>();
  for (const table of tables) {
    for (const listener of listeners.get(table) ?? []) {
      if (called.has(listener)) continue;
      called.add(listener);
      listener();
    }
  }
}
