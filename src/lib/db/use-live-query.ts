import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { subscribeTables } from "./notify";
import type { TableName } from "./types";

export type LiveQuery<T> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "success"; data: T; error: undefined }
  | { status: "error"; data: T | undefined; error: Error };

const LOADING = { status: "loading", data: undefined, error: undefined } as const;

/**
 * Runs `query` against the local store and runs it again whenever one of `tables` changes.
 * `key` identifies the query's inputs (for example the date it reads); a new key starts over.
 * Screens never poll and never wait for the network.
 *
 *   const items = useLiveQuery(["item"], "items:all", listItems);
 */
export function useLiveQuery<T>(
  tables: readonly TableName[],
  key: string,
  query: () => Promise<T>
): LiveQuery<T> {
  // Each result remembers the key it belongs to, so a new key reads as loading at once.
  const [state, setState] = useState<{ key: string; result: LiveQuery<T> } | null>(null);
  // The latest query function, so a re-render with a new closure does not resubscribe.
  const queryRef = useRef(query);
  useLayoutEffect(() => {
    queryRef.current = query;
  });
  const tablesKey = tables.join(",");

  useEffect(() => {
    let active = true;
    let run = 0;

    const load = (): void => {
      const current = ++run;
      queryRef.current().then(
        (data) => {
          if (active && current === run) {
            setState({ key, result: { status: "success", data, error: undefined } });
          }
        },
        (error: unknown) => {
          if (!active || current !== run) return;
          setState((previous) => ({
            key,
            result: {
              status: "error",
              data: previous?.key === key ? previous.result.data : undefined,
              error: error instanceof Error ? error : new Error(String(error)),
            },
          }));
        }
      );
    };

    load();
    const unsubscribe = subscribeTables(tablesKey.split(",") as TableName[], load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [key, tablesKey]);

  return state?.key === key ? state.result : LOADING;
}
