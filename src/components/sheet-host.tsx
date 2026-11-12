import {
  createContext,
  Fragment,
  use,
  useCallback,
  useMemo,
  useState,
  type ComponentRef,
  type JSX,
  type ReactNode,
  type RefObject,
} from "react";
import type { View } from "react-native";

export interface SheetRenderProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Pass it on to the sheet so its glass blurs the screen behind (Android). */
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
}

type RenderSheet = (props: SheetRenderProps) => ReactNode;

interface SheetApi {
  /** Opens a sheet. `render` builds it from the host's props: `(p) => <ActionSheet {...p} .../>`. */
  present: (render: RenderSheet) => void;
  dismiss: () => void;
}

const SheetContext = createContext<SheetApi | null>(null);

/**
 * Hosts the sheets that screens open with `useSheet()`. Mount it in the layout that owns the
 * tab bar, after the tabs (as `(tabs)/_layout.tsx` does): the sheet then renders in place above
 * the glass tab bar, like the quick add sheet. A sheet rendered inside a screen sits under the
 * tab bar instead.
 */
export function SheetProvider({
  blurTarget,
  children,
}: {
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
  children: ReactNode;
}): JSX.Element {
  // `id` changes on every present, so each sheet mounts fresh and never keeps the previous
  // sheet's state (editing B after A must not show A's fields).
  const [current, setCurrent] = useState<{ id: number; render: RenderSheet } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const present = useCallback((next: RenderSheet) => {
    setCurrent((previous) => ({ id: (previous?.id ?? 0) + 1, render: next }));
    setIsOpen(true);
  }, []);
  const dismiss = useCallback(() => setIsOpen(false), []);
  const api = useMemo(() => ({ present, dismiss }), [present, dismiss]);

  return (
    <SheetContext value={api}>
      {children}
      {/* Stays mounted after closing so the close animation can play. */}
      {current ? (
        <Fragment key={current.id}>
          {current.render({ isOpen, onOpenChange: setIsOpen, blurTarget })}
        </Fragment>
      ) : null}
    </SheetContext>
  );
}

/** `present` opens a sheet above the tab bar; `dismiss` closes it. Use inside `SheetProvider`. */
export function useSheet(): SheetApi {
  const value = use(SheetContext);
  if (!value) throw new Error("useSheet must be used inside SheetProvider");
  return value;
}
