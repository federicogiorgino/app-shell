import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Surface, useThemeColor } from "heroui-native";
import {
  createContext,
  use,
  useRef,
  useState,
  type ComponentRef,
  type JSX,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useResolveClassNames, withUniwind } from "uniwind";

import { ColorChips, FieldLabel } from "@/components/fields";
import { GlassSheet } from "@/components/glass-sheet";
import { useNotify } from "@/lib/use-notify";

import { saveItem } from "../repository";
import { ITEM_COLORS, type Item } from "../schema";

/** Gorhom's sheet-aware input with class support, so the sheet rides above the keyboard. */
const SheetTextInput = withUniwind(BottomSheetTextInput);

interface Draft {
  id?: string;
  title: string;
  note: string;
  color: string;
  done: boolean;
  favorite: boolean;
}

interface ItemSheetApi {
  openAdd: () => void;
  openEdit: (item: Item) => void;
}

const ItemSheetContext = createContext<ItemSheetApi | null>(null);

/** Opens the Add and Edit sheet. Use inside the tabs (the provider is in `(tabs)/_layout.tsx`). */
export function useItemSheet(): ItemSheetApi {
  const api = use(ItemSheetContext);
  if (!api) throw new Error("useItemSheet must be used inside ItemSheetProvider");
  return api;
}

/**
 * Hosts the demo's Add and Edit sheet: a glass sheet with a title, a note and a colour. Render
 * it in the tabs layout, after the tabs, with their `blurTarget`, so its glass matches the tab
 * bar (the same pattern as the context menu and the toast).
 */
export function ItemSheetProvider({
  blurTarget,
  children,
}: {
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
  children: ReactNode;
}): JSX.Element {
  const { t } = useTranslation();
  const notify = useNotify();
  const [muted, accent] = useThemeColor(["muted", "accent"]);
  // BottomSheetTextInput forwards its ref to React Native's TextInput, whose old type Gorhom
  // uses; the ref is kept as what we call and cast where it is passed.
  const title = useRef<{ focus: () => void } | null>(null);
  // Classes resolved to styles for the third-party input: the app's fonts and colours.
  const titleText = useResolveClassNames("text-title font-bold text-foreground");
  const noteText = useResolveClassNames("text-body text-foreground");

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const update = (changes: Partial<Draft>): void =>
    setDraft((current) => (current ? { ...current, ...changes } : current));

  const openAdd = (): void => {
    setDraft({ title: "", note: "", color: ITEM_COLORS[0], done: false, favorite: false });
    setIsOpen(true);
  };

  const openEdit = (item: Item): void => {
    const { id, title: itemTitle, note, color, done, favorite } = item;
    setDraft({ id, title: itemTitle, note, color, done, favorite });
    setIsOpen(true);
  };

  const canSave = Boolean(draft?.title.trim());

  const save = (): void => {
    if (!draft || !canSave) return;
    setIsOpen(false);
    saveItem(draft)
      .then(() => notify.success(draft.id ? t("demo.saved") : t("demo.added")))
      .catch(() => notify.error(t("errors.generic")));
  };

  return (
    <ItemSheetContext value={{ openAdd, openEdit }}>
      {children}
      <GlassSheet
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        blurTarget={blurTarget}
        title={draft?.id ? t("demo.editTitle") : t("demo.newTitle")}
        onConfirm={save}
        confirmLabel={t("common.save")}
        isConfirmDisabled={!canSave}
        onShown={() => {
          if (!draft?.id) title.current?.focus();
        }}
      >
        {draft ? (
          <>
            <Surface>
              <SheetTextInput
                ref={title as never}
                value={draft.title}
                onChangeText={(text) => update({ title: text })}
                placeholder={t("demo.titlePlaceholder")}
                placeholderTextColor={muted}
                accessibilityLabel={t("demo.titleLabel")}
                returnKeyType="done"
                submitBehavior="submit"
                onSubmitEditing={save}
                selectionColor={accent}
                style={[titleText, styles.titleInput]}
              />
              <SheetTextInput
                value={draft.note}
                onChangeText={(text) => update({ note: text })}
                placeholder={t("demo.notePlaceholder")}
                accessibilityLabel={t("demo.noteLabel")}
                placeholderTextColor={muted}
                multiline
                selectionColor={accent}
                style={[noteText, styles.noteInput]}
              />
            </Surface>
            <Surface>
              <FieldLabel>{t("demo.color")}</FieldLabel>
              <ColorChips
                options={ITEM_COLORS.map((color, index) => ({
                  id: color,
                  name: t("demo.colorName", { number: index + 1 }),
                  color,
                }))}
                selected={[draft.color]}
                onToggle={(color) => update({ color })}
              />
            </Surface>
          </>
        ) : null}
      </GlassSheet>
    </ItemSheetContext>
  );
}

const styles = StyleSheet.create({
  titleInput: { paddingVertical: 4 },
  noteInput: { minHeight: 64, paddingTop: 8, textAlignVertical: "top" },
});
