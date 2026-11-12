import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";

import { isApiError } from "./api";
import { config } from "./config";
import { storageKey } from "./storage";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      /** Set to `false` to keep a query out of the on-device cache (for example sensitive data). */
      persist?: boolean;
    };
  }
}

/** How long cached data is kept on the device and restored after a restart. */
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24;

const MAX_RETRIES = 2;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Must be at least `CACHE_MAX_AGE`, or restored data is garbage collected immediately.
      gcTime: CACHE_MAX_AGE,
      retry: (failureCount, error) => {
        // A 4xx will not fix itself; retry only network errors, timeouts and 5xx.
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return failureCount < MAX_RETRIES;
      },
    },
    mutations: { retry: false },
  },
});

// Pause fetching while offline and refetch when the connection comes back.
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  });
  return () => subscription.remove();
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: storageKey("query-cache"),
  throttleTime: 1000,
});

/** Drops every cached query, in memory and on disk. Call on sign-out so users never share data. */
export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  await queryPersister.removeClient();
}

/** Cache entries from another app version are discarded, since their shape may have changed. */
export const cacheBuster = config.version;
