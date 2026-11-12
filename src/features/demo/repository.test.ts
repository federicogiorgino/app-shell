import { beforeEach, describe, expect, test } from "vitest";

import { subscribeTables } from "@/lib/db/notify";
import { wipeLocalDatabase } from "@/lib/db/records";
import { openTestDatabase } from "@/lib/db/test-db";

import { addSampleItems, deleteItem, getItem, listItems, saveItem, updateItem } from "./repository";

describe("demo items", () => {
  beforeEach(async () => {
    await openTestDatabase();
  });

  test("save creates an item with defaults and record times", async () => {
    const item = await saveItem({ title: "  Groceries ", color: "#4F86E8" });
    expect(item).toMatchObject({ title: "Groceries", note: "", done: false, favorite: false });
    expect(item.createdAt).toBe(item.updatedAt);
    expect(await getItem(item.id)).toEqual(item);
  });

  test("an empty title is rejected", async () => {
    await expect(saveItem({ title: "  ", color: "#4F86E8" })).rejects.toThrow();
  });

  test("update keeps the other fields and moves updatedAt forward", async () => {
    const item = await saveItem({ title: "Read", color: "#4F86E8" });
    const done = await updateItem(item, { done: true });
    expect(done).toMatchObject({ title: "Read", done: true, createdAt: item.createdAt });
    expect(done.updatedAt > item.updatedAt).toBe(true);
  });

  test("favourites come first, then the newest", async () => {
    const [first, second, third] = await addSampleItems(["A", "B", "C"]);
    expect(first.favorite).toBe(true);
    const titles = (await listItems()).map((item) => item.title);
    expect(titles[0]).toBe("A");
    expect(titles).toHaveLength(3);
    expect(new Set(titles)).toEqual(new Set([first.title, second.title, third.title]));
  });

  test("delete hides the item and undo brings it back", async () => {
    const item = await saveItem({ title: "Call Sam", color: "#4F86E8" });
    const undo = await deleteItem(item);
    expect(await getItem(item.id)).toBeNull();
    expect(await listItems()).toHaveLength(0);
    await undo();
    expect(await getItem(item.id)).toMatchObject({ id: item.id, title: "Call Sam" });
  });

  test("writes notify live queries of the item table", async () => {
    let calls = 0;
    const unsubscribe = subscribeTables(["item"], () => {
      calls += 1;
    });
    await saveItem({ title: "Ping", color: "#4F86E8" });
    unsubscribe();
    expect(calls).toBe(1);
  });

  test("wiping the database removes every item", async () => {
    await addSampleItems(["A", "B"]);
    await wipeLocalDatabase();
    expect(await listItems()).toHaveLength(0);
  });
});
