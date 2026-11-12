import { useEffect, useState } from "react";

import { openAppDatabase } from "./expo";

/** The local database could not be opened; the root error boundary shows `DataError`. */
export class LocalStoreError extends Error {
  override name = "LocalStoreError";

  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
  }
}

/**
 * Opens the local database and runs its migrations once at startup. Returns false until it is
 * ready, so the caller keeps the splash screen up. A failure is thrown during render, so the root
 * error boundary shows it with a retry (which mounts this hook again and retries the open).
 *
 * `prepare` runs once after the database is ready, before the app renders (a dev seed, say).
 */
export function useLocalStore(prepare?: () => Promise<void>): boolean {
  const [state, setState] = useState<{ ready: boolean; error: Error | null }>({
    ready: false,
    error: null,
  });

  useEffect(() => {
    let active = true;
    openAppDatabase()
      .then(() => prepare?.())
      .then(
        () => {
          if (active) setState({ ready: true, error: null });
        },
        (error: unknown) => {
          if (active) {
            setState({
              ready: false,
              error: new LocalStoreError(error),
            });
          }
        }
      );
    return () => {
      active = false;
    };
    // `prepare` is a startup step and must run once, even if the caller re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.error) throw state.error;
  return state.ready;
}
