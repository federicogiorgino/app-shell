import { useMemo } from "react";

import { type ToastTone, useGlassToast } from "./glass-toast";

/**
 * Short, non-blocking feedback ("Saved", "Couldn't reach the server"). Use a toast for
 * outcomes the user doesn't need to act on; use `useConfirm` when they must decide. It shows the
 * app's one glass toast.
 *
 *   const notify = useNotify();
 *   notify.success("Note saved");
 *   notify.error("Couldn't save", "Check your connection and try again.");
 */
export function useNotify() {
  const show = useGlassToast();

  return useMemo(() => {
    const notify =
      (tone: ToastTone) =>
      (label: string, description?: string): void =>
        show({ tone, label, description });

    return {
      info: notify("default"),
      success: notify("success"),
      warning: notify("warning"),
      error: notify("danger"),
    };
  }, [show]);
}
