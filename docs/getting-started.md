# Getting started

Read this first if you have never seen this repository. It explains what the shell is, the few rules everything follows, how to run it, and how to build a real feature on top of it, step by step.

## What this is

App Shell is an Expo (React Native) starter for iOS and Android. It is not an app; it is the parts every app needs, already built and tested together:

- **A shell:** a floating glass tab bar, screens with a large title that collapses into a glass header, sheets, toasts, menus and dialogs that float above the tab bar.
- **A design system:** HeroUI Native components styled with Tailwind classes (Uniwind), semantic colour tokens, light and dark themes, five accent colours, Inter.
- **Local data:** a SQLite database with migrations, validated record tables, soft delete with Undo and live queries that refresh the screen when data changes.
- **Infrastructure:** settings, onboarding, translations (English and Italian), notification permission, an optional sign-in (Better Auth, off by default), an API client and a server-data cache for when you add a backend.
- **A demo** that uses all of it: a list with swipe and long-press actions, a detail screen, a Components tab. You copy from it, then delete it.

It runs with **no backend**. Everything a user creates lives on the device.

## The rules everything follows

Learn these seven and the rest of the code reads naturally.

1. **Screens read the local database (or React Query) and never wait for the network.** Writes go through a feature's repository, never SQL in a screen.
2. **Every screen with a header is a `LargeTitleScreen`.** No custom headers, no native stack header.
3. **Overlays that must sit above the tab bar are drawn in the tabs layout, not inside a screen.** Open sheets from a tab screen with `useSheet()`; the toast and the long-press menu are already hosted there.
4. **Every colour is a semantic token** (`bg-surface`, `text-muted`, `bg-accent`). Only data colours (a colour the user picked for a record) are applied with `style`.
5. **Every user-visible string goes through `t()`** and exists in every language file, including accessibility labels. A missing key fails typecheck.
6. **Use the existing building block before writing a new one.** The table in [README.md](README.md#find-a-feature) maps needs to components.
7. **Every gesture has an accessibility equivalent** (labels, roles, states, accessibility actions).

## Run it

Requirements: Node 22.13 or newer (tests use the built-in `node:sqlite`), pnpm 12, and a **development build** of the app on a device or simulator (Expo Go shows its own icon and lacks some native modules).

```bash
pnpm install
cp .env.example .env.local      # optional; leave it as is for an app without a backend
pnpm start                      # also generates route and class types
```

Build the dev client once (and after any native change): `pnpm dlx eas-cli build --platform android --profile development`, or `pnpm exec expo run:ios` / `run:android` locally. See [builds-and-tooling.md](builds-and-tooling.md).

Checks, before every commit (the pre-commit hook runs the first three for you):

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

## Make it your app

1. `pnpm run init --name "My App" --package com.me.myapp` rewrites `app.identity.json` (name, slug, URL scheme, bundle ids). Choose the slug once: device settings are stored under it.
2. Replace the images in `assets/images` (icon, adaptive icon, splash light and dark) and the splash colours in `app.config.ts`.
3. Edit the onboarding slides (`SLIDES` in `src/app/onboarding.tsx`) and their `onboarding.*` strings.
4. Change the default accent or palette in `src/global.css` and `src/lib/accent-preference.ts` ([theming.md](theming.md)).
5. Decide about sign-in: leave it off, or set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_AUTH_ENABLED=1` and set up the server ([auth.md](auth.md), [auth-server-setup.md](auth-server-setup.md)).

## Build a feature: a worked example

This walks through a complete feature, a medicine list, using only the shell's building blocks. The same steps make any list-and-detail feature (workouts, games, recipes). Copy `src/features/demo`, which is this exact shape, if you prefer to start from working code.

### 1. The table

Append a migration in `src/lib/db/migrations.ts`. **Never edit an entry that has shipped**; always append.

```ts
export const MIGRATIONS: readonly (readonly string[])[] = [
  [/* 1: the demo's item table */],
  [
    `CREATE TABLE medicine (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      dose TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,${RECORD_COLUMNS}
    )`,
  ],
];
```

### 2. The schema

`src/features/medicine/schema.ts`: the fields (validated by Zod) and how they map to columns.

```ts
import { z } from "zod";
import type { RecordMeta, RecordTable } from "@/lib/db/records";

/** Data colours for the picker (applied with `style`). */
export const MEDICINE_COLORS = ["#4F86E8", "#2FA39A", "#D9605A", "#8A68D6"] as const;

export const medicineFieldsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  dose: z.string().trim().max(60).default(""),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  active: z.boolean().default(true),
});

export type MedicineInput = z.input<typeof medicineFieldsSchema>;
export type Medicine = z.output<typeof medicineFieldsSchema> & RecordMeta;

export const medicineTable: RecordTable<z.output<typeof medicineFieldsSchema>, MedicineInput> = {
  table: "medicine",
  fields: medicineFieldsSchema,
  columns: {
    name: ["name", "text"],
    dose: ["dose", "text"],
    color: ["color", "text"],
    active: ["active", "boolean"],
  },
};
```

### 3. The repository

`src/features/medicine/repository.ts`: the only code that touches the table.

```ts
import {
  putRecord,
  selectRecord,
  selectRecords,
  tombstoneRecord,
  writeTransaction,
} from "@/lib/db/records";
import { type Medicine, type MedicineInput, medicineTable } from "./schema";

const TABLES = [medicineTable.table];

export const listMedicines = (): Promise<Medicine[]> =>
  selectRecords(medicineTable, { orderBy: "active DESC, name COLLATE NOCASE" });

export const getMedicine = (id: string): Promise<Medicine | null> =>
  selectRecord(medicineTable, id);

export const saveMedicine = (input: MedicineInput & { id?: string }): Promise<Medicine> =>
  writeTransaction(TABLES, (tx) => putRecord(tx, medicineTable, input));

/** Records are always written whole. */
export function updateMedicine(
  medicine: Medicine,
  changes: Partial<MedicineInput>
): Promise<Medicine> {
  const { id, name, dose, color, active } = medicine;
  return saveMedicine({ id, name, dose, color, active, ...changes });
}

/** Soft delete; returns an undo for the toast. */
export async function deleteMedicine(medicine: Medicine): Promise<() => Promise<void>> {
  await writeTransaction(TABLES, (tx) => tombstoneRecord(tx, medicineTable, medicine.id));
  return async () => void (await updateMedicine(medicine, {}));
}
```

Test it like `src/features/demo/repository.test.ts` (`openTestDatabase()` in `beforeEach`), then `pnpm test`. Details: [database.md](database.md).

### 4. The strings

Add a `medicine` group to `src/lib/i18n/en.ts` and the same keys to `it.ts` (typecheck fails until both match), plus the tab label:

```ts
tabs: { home: "Home", components: "Components", medicines: "Medicines", quickAdd: "Add item" },
medicine: {
  title: "Medicines",
  emptyTitle: "No medicines yet",
  emptyDescription: "Add the medicines you take to track them here.",
  add: "Add medicine",
  edit: "Edit medicine",
  name: "Name",
  dose: "Dose",
  deleted: "Medicine deleted",
  actions: "Actions for {{name}}",
},
```

### 5. The list screen (a new tab)

Create `src/app/(tabs)/medicines.tsx` and add `{ name: "medicines", href: "/medicines", label: "tabs.medicines", icon: "medkit" }` to `ITEMS` in `src/app/(tabs)/_layout.tsx` ([tab-bar.md](tab-bar.md)).

```tsx
export default function MedicinesScreen(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const notify = useNotify();
  const showToast = useGlassToast();
  const { present } = useSheet();
  const [attempt, setAttempt] = useState(0);
  const medicines = useLiveQuery(["medicine"], `medicines:${attempt}`, listMedicines);

  const openEditor = (medicine?: Medicine): void =>
    present((sheet) => <MedicineSheet {...sheet} medicine={medicine} />);

  const remove = (medicine: Medicine): void => {
    deleteMedicine(medicine)
      .then((undo) => showToast({ label: t("medicine.deleted"), onUndo: () => void undo() }))
      .catch(() => notify.error(t("errors.generic")));
  };

  const header = {
    title: t("medicine.title"),
    rightContent: (
      <HeaderIconButton icon="add" label={t("medicine.add")} onPress={() => openEditor()} />
    ),
    scrollViewProps: { onScrollBeginDrag: () => void closeOpenRow() },
  };

  if (medicines.status === "loading")
    return (
      <LargeTitleScreen {...header}>
        <ScreenLoading />
      </LargeTitleScreen>
    );
  if (medicines.status === "error") {
    return (
      <LargeTitleScreen {...header}>
        <DataError onRetry={() => setAttempt((n) => n + 1)} />
      </LargeTitleScreen>
    );
  }

  return (
    <LargeTitleScreen<Medicine>
      {...header}
      list={{
        data: medicines.data,
        keyExtractor: (medicine) => medicine.id,
        renderItem: (medicine) => (
          <View className="mx-4 mb-2 overflow-hidden rounded-3xl">
            <SwipeableRow
              accessibilityLabel={medicine.name}
              onPress={() =>
                router.push({ pathname: "/medicine/[id]", params: { id: medicine.id } })
              }
              trailingActions={[
                {
                  key: "edit",
                  label: t("common.edit"),
                  icon: "create-outline",
                  tone: "accent",
                  onAction: () => openEditor(medicine),
                },
                {
                  key: "delete",
                  label: t("common.delete"),
                  icon: "trash-outline",
                  tone: "danger",
                  onAction: () => remove(medicine),
                },
              ]}
              fullSwipe
            >
              <MedicineRowContent medicine={medicine} />
            </SwipeableRow>
          </View>
        ),
        empty: (
          <EmptyState
            icon="medkit-outline"
            title={t("medicine.emptyTitle")}
            description={t("medicine.emptyDescription")}
            actionLabel={t("medicine.add")}
            onAction={() => openEditor()}
          />
        ),
      }}
    >
      {null}
    </LargeTitleScreen>
  );
}
```

`MedicineRowContent` is your row's content (a plain component, like the demo's `ItemRowContent`); keep it separate so the long-press menu can draw it again. Add a long-press menu with `onLongPress={(rect) => openMenu({ rect, preview: <MedicineRowContent medicine={medicine} />, label: t("medicine.actions", { name: medicine.name }), items: [...] })}` from `useContextMenu()` ([lists-and-gestures.md](lists-and-gestures.md)). When the commands grow, gather them in a `useMedicineActions()` hook like the demo's `use-item-actions.ts`.

### 6. The add and edit sheet

A component with its own state inside a `GlassSheet`, opened through `useSheet()` so it floats above the tab bar ([glass.md](glass.md)):

```tsx
const SheetTextInput = withUniwind(BottomSheetTextInput);

export function MedicineSheet({
  medicine,
  ...sheet
}: SheetRenderProps & { medicine?: Medicine }): JSX.Element {
  const { t } = useTranslation();
  const notify = useNotify();
  // Third-party inputs take resolved styles, as in the demo's item sheet.
  const nameText = useResolveClassNames("text-title font-bold text-foreground");
  const doseText = useResolveClassNames("text-body text-foreground");
  const [name, setName] = useState(medicine?.name ?? "");
  const [dose, setDose] = useState(medicine?.dose ?? "");
  const [color, setColor] = useState(medicine?.color ?? MEDICINE_COLORS[0]);

  const save = (): void => {
    sheet.onOpenChange(false);
    saveMedicine({ id: medicine?.id, name, dose, color, active: medicine?.active ?? true })
      .then(() => notify.success(t("common.save")))
      .catch(() => notify.error(t("errors.generic")));
  };

  return (
    <GlassSheet
      {...sheet}
      title={medicine ? t("medicine.edit") : t("medicine.add")}
      onConfirm={save}
      isConfirmDisabled={!name.trim()}
    >
      <Surface>
        <SheetTextInput
          value={name}
          onChangeText={setName}
          placeholder={t("medicine.name")}
          accessibilityLabel={t("medicine.name")}
          style={nameText}
        />
        <SheetTextInput
          value={dose}
          onChangeText={setDose}
          placeholder={t("medicine.dose")}
          accessibilityLabel={t("medicine.dose")}
          style={doseText}
        />
      </Surface>
      {/* ColorChips with selected={[color]} and onToggle={setColor} */}
    </GlassSheet>
  );
}
```

Inside a sheet, text fields must be `BottomSheetTextInput` so the sheet rides above the keyboard ([forms.md](forms.md)). If the tab bar's round action button should open this sheet, do what the demo does with `ItemSheetProvider`: a provider in `(tabs)/_layout.tsx` that the bar's `action.onPress` can reach.

### 7. The detail screen

`src/app/medicine/[id].tsx`, registered in `src/app/_layout.tsx` inside the `canEnterApp` group as `<Stack.Screen name="medicine/[id]" />`. Read the id with `useLocalSearchParams<{ id: string }>()`, the record with `useLiveQuery(["medicine"], \`medicine:${id}:${attempt}\`, () => getMedicine(id))`, and handle loading, error and not found (an `EmptyState`with Go back). Use`hero`for artwork,`SettingsSection`with`SettingsSwitchRow`for the`active`flag, and a HeroUI`Menu`on a`HeaderIconButton`for More actions.`src/app/item/[id].tsx`is the complete example. A pushed screen covers the tab bar, so its sheets and confirmations can render inline; delete with`useConfirmDelete()`then`router.back()`and a toast with`aboveTabBar: true`.

### 8. Validate

`pnpm typecheck`, `pnpm lint`, `pnpm test`. Then check on a device: light and dark, a large system font, Reduce Transparency (Settings, Accessibility), VoiceOver or TalkBack on the swipe actions, and Italian.

### 9. Remove the demo

When your feature replaces it: delete `src/features/demo`, `src/app/item`, `src/app/(tabs)/components.tsx` (and its `ITEMS` entry), point `(tabs)/index.tsx` at your first screen (or delete it and make your tab the first `ITEMS` entry), remove `ItemSheetProvider` and the quick-add `action` from `(tabs)/_layout.tsx` (or point the action at your sheet), and delete the `demo` and `showcase` string groups. Keep the `item` migration if anyone already installed the app; otherwise remove it. Details: [demo.md](demo.md).

## Decisions you will meet

| Question                            | Answer                                                                                                                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where does this data live?          | Records the user creates: the local database. Data from your server: React Query with `api()`. A small preference: `readSetting`/`writeSetting`. A larger non-secret blob: `readJSON`/`writeJSON`. |
| Which overlay?                      | A choice of actions: `ActionSheet`. A form or detail: `GlassSheet`. "Are you sure?": `useConfirmDelete()`. An outcome: `useNotify()`. Undoable: a toast with `onUndo`.                             |
| Tab or pushed screen?               | A top-level area the user switches between: a tab (two to five). Anything you drill into: a pushed screen.                                                                                         |
| Confirm or Undo?                    | Data the user can get back (soft-deleted records): delete at once with an Undo toast. Gone for good (an account, a wipe): confirm first.                                                           |
| A new component or an existing one? | Search [README.md](README.md#find-a-feature) and the HeroUI Native docs ([heroui-native/](heroui-native/)) first. Never guess a HeroUI prop: read its page.                                        |
| Native package?                     | Only when needed. Install with `pnpm exec expo install <pkg>` and rebuild the dev client.                                                                                                          |

## For AI coding agents

`CLAUDE.md` (with `AGENTS.md` and `DESIGN.md`) is loaded automatically and holds the project rules. Before working in an area, read its page here (the index is [README.md](README.md)). Before using a HeroUI component, read its page in `.heroui-docs/native/components`. When code and these docs disagree, the code and the installed packages win; fix the doc in the same change.
