import { Button, Dialog } from "heroui-native";
import { createContext, use, useCallback, useRef, useState, type JSX, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (delete, sign out everywhere). */
  destructive?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * Promise-based confirmation dialog. Mount it once inside `HeroUINativeProvider`:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete note?", destructive: true, confirmLabel: "Delete" })) { ... }
 */
export function ConfirmProvider({ children }: { children: ReactNode }): JSX.Element {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setIsOpen(false);
  }, []);

  const confirm = useCallback<Confirm>((next) => {
    // A second request replaces the first, which counts as cancelled.
    resolver.current?.(false);
    setOptions(next);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  return (
    <ConfirmContext value={confirm}>
      {children}
      <Dialog
        isOpen={isOpen}
        onOpenChange={(open) => {
          // Dismissing by tapping the overlay or swiping away counts as cancelling.
          if (!open) settle(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <View className="gap-1.5">
              <Dialog.Title>{options?.title}</Dialog.Title>
              {options?.message ? <Dialog.Description>{options.message}</Dialog.Description> : null}
            </View>
            <View className="mt-5 flex-row justify-end gap-3">
              <Button variant="tertiary" size="sm" onPress={() => settle(false)}>
                <Button.Label>{options?.cancelLabel ?? t("common.cancel")}</Button.Label>
              </Button>
              <Button
                variant={options?.destructive ? "danger" : "primary"}
                size="sm"
                onPress={() => settle(true)}
              >
                <Button.Label>{options?.confirmLabel ?? t("common.confirm")}</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </ConfirmContext>
  );
}

export function useConfirm(): Confirm {
  const value = use(ConfirmContext);
  if (!value) throw new Error("useConfirm must be used inside ConfirmProvider");
  return value;
}

/**
 * The preset confirmation for a destructive action: a danger button labelled Delete.
 *
 *   if (await confirmDelete(t("note.deleteTitle"), t("note.deleteMessage"))) { ... }
 */
export function useConfirmDelete(): (title: string, message?: string) => Promise<boolean> {
  const { t } = useTranslation();
  const confirm = useConfirm();
  return useCallback(
    (title, message) =>
      confirm({ title, message, confirmLabel: t("common.delete"), destructive: true }),
    [confirm, t]
  );
}
