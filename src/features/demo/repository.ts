import {
  putRecord,
  selectRecord,
  selectRecords,
  tombstoneRecord,
  writeTransaction,
} from "@/lib/db/records";

import { ITEM_COLORS, type Item, type ItemInput, itemTable } from "./schema";

/**
 * Reads and writes for the demo items. Screens read with `useLiveQuery(["item"], ...)` and write
 * through these functions, which notify the live queries when the transaction commits.
 */
const TABLES = [itemTable.table];

/** Favourites first, then newest first. */
export function listItems(): Promise<Item[]> {
  return selectRecords(itemTable, { orderBy: "favorite DESC, created_at DESC" });
}

export function getItem(id: string): Promise<Item | null> {
  return selectRecord(itemTable, id);
}

/** Creates the item when `input.id` is missing; otherwise replaces it with the full input. */
export function saveItem(input: ItemInput & { id?: string }): Promise<Item> {
  return writeTransaction(TABLES, (tx) => putRecord(tx, itemTable, input));
}

/** Changes some fields of a stored item (it is always written whole). */
export async function updateItem(item: Item, changes: Partial<ItemInput>): Promise<Item> {
  const { id, title, note, color, done, favorite } = item;
  return saveItem({ id, title, note, color, done, favorite, ...changes });
}

/** Deletes an item and returns a function that brings it back (for the Undo toast). */
export async function deleteItem(item: Item): Promise<() => Promise<void>> {
  await writeTransaction(TABLES, (tx) => tombstoneRecord(tx, itemTable, item.id));
  return async () => {
    await updateItem(item, {});
  };
}

/** Writes a few sample items so the demo list has something to swipe. */
export function addSampleItems(titles: readonly string[]): Promise<Item[]> {
  return writeTransaction(TABLES, async (tx) => {
    const items: Item[] = [];
    for (const [index, title] of titles.entries()) {
      items.push(
        await putRecord(tx, itemTable, {
          title,
          color: ITEM_COLORS[index % ITEM_COLORS.length],
          favorite: index === 0,
        })
      );
    }
    return items;
  });
}
