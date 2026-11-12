import { z } from "zod";

import type { RecordMeta, RecordTable } from "@/lib/db/records";

/**
 * The demo's one record: an item with a title, a note, a colour and two flags. It shows how a
 * feature defines a table (the SQL is in `src/lib/db/migrations.ts`). Delete the whole
 * `src/features/demo` folder, its routes and its migration when you start your own app.
 */
export const ITEM_COLORS = [
  "#4F86E8",
  "#8A68D6",
  "#2FA39A",
  "#D9605A",
  "#D6A031",
  "#5BAA62",
  "#7B8798",
  "#CF6FA3",
] as const;

export const itemFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  note: z.string().max(2000).default(""),
  /** A data colour (applied by `style`), not a theme token. */
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  done: z.boolean().default(false),
  favorite: z.boolean().default(false),
});

export type ItemFields = z.output<typeof itemFieldsSchema>;
export type ItemInput = z.input<typeof itemFieldsSchema>;
export type Item = ItemFields & RecordMeta;

export const itemTable: RecordTable<ItemFields, ItemInput> = {
  table: "item",
  fields: itemFieldsSchema,
  columns: {
    title: ["title", "text"],
    note: ["note", "text"],
    color: ["color", "text"],
    done: ["done", "boolean"],
    favorite: ["favorite", "boolean"],
  },
};
