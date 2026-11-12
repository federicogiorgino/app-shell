import { focusManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect } from "react";
import type { JSX, ReactNode } from "react";
import { AppState } from "react-native";

import { CACHE_MAX_AGE, cacheBuster, queryClient, queryPersister } from "./query-client";

/**
 * Provides the shared QueryClient and restores/persists its cache on the device. Queries whose
 * `meta.persist` is `false` are kept in memory only.
 */
export function QueryProvider({ children }: { children: ReactNode }): JSX.Element {
  // Refetch stale queries when the app returns to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    return () => subscription.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: CACHE_MAX_AGE,
        buster: cacheBuster,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" && query.meta?.persist !== false,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
