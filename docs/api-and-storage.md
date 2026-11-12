# API, storage and configuration

Everything non-visual in `src/lib` that is not the database, auth, theme or i18n: configuration, the API client, React Query, device storage, ids, dates and the small hooks.

## Configuration

### `app.identity.json`

The only file that says what the app is called. `scripts/init.mjs` rewrites it (see [builds-and-tooling.md](builds-and-tooling.md)).

| Key                                     | Used for                                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `name`                                  | Display name (`App Shell`); dev and staging builds append ` (Dev)` / ` (Staging)`                        |
| `slug`                                  | Expo slug; also the namespace of every storage key (`<slug>.theme`, `<slug>.query-cache`)                |
| `scheme`                                | URL scheme for deep links and the Better Auth redirect. Must be listed in the server's `TRUSTED_ORIGINS` |
| `androidPackage`, `iosBundleIdentifier` | Application ids; dev and staging builds append `.dev` / `.staging` so they install beside production     |
| `easProjectId`                          | Empty until you run `eas init`; needed for push tokens                                                   |

### `env` (`src/lib/env.ts`)

Build-time environment, validated once at import with Zod. A bad value throws an `Invalid environment:` error listing each problem and pointing you to `.env.example`, so the failure is at launch, not later as a confusing request error.

| Field             | Source                                          | Meaning                                                                  |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| `env.appEnv`      | `extra.appEnv` from `app.config.ts` (`APP_ENV`) | `development`, `staging` or `production` (default `production`)          |
| `env.apiUrl`      | `EXPO_PUBLIC_API_URL`                           | Base URL without trailing slashes, or `null` when the app has no backend |
| `env.authEnabled` | `EXPO_PUBLIC_AUTH_ENABLED`                      | `true` only for the exact value `1`                                      |

Rules enforced: `EXPO_PUBLIC_API_URL` must be a full URL when set; `EXPO_PUBLIC_AUTH_ENABLED=1` requires the API URL. `EXPO_PUBLIC_*` variables are inlined by Metro only when written as the literal `process.env.EXPO_PUBLIC_X`, which is why `env.ts` lists them one by one. Never put a secret in an `EXPO_PUBLIC_*` variable: it ships inside the app.

To add a variable: declare it in the Zod schema, add it to the `safeParse` input, expose it on `env`, and add it to `.env.example`.

### `config` (`src/lib/config.ts`)

Runtime identity read from the Expo config and `env`. Import `config`, never `process.env` or literals.

| Field                             | Value                                                          |
| --------------------------------- | -------------------------------------------------------------- |
| `appName`                         | `expoConfig.name`                                              |
| `slug`                            | `expoConfig.slug`                                              |
| `version`                         | `expoConfig.version` (also the React Query cache buster)       |
| `scheme`                          | First URL scheme; the module throws at import if there is none |
| `appEnv`, `apiUrl`, `authEnabled` | From `env`                                                     |

### Adding an environment variable

```ts
const schema = z.object({
  EXPO_PUBLIC_API_URL: z.url().optional(),
  EXPO_PUBLIC_FEATURE_X: z.string().optional(), // 1. declare it
});

const parsed = schema.safeParse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || undefined,
  EXPO_PUBLIC_FEATURE_X: process.env.EXPO_PUBLIC_FEATURE_X || undefined, // 2. read it literally
});
// 3. expose it on `env`; 4. add it to .env.example; 5. add it to eas.json for cloud builds
```

Restart Expo after changing `.env.local` (`pnpm start --clear` if a value seems stuck).

## The API client: `api()`

`src/lib/api.ts`. A typed wrapper around `fetch` for your own backend. Use it for every request; never call `fetch` in a screen. It throws if `EXPO_PUBLIC_API_URL` is not set, so an app without a backend simply never calls it.

```ts
const notes = await api("/api/notes", { query: { limit: 20 }, schema: notesSchema, signal });
await api("/api/notes", { method: "POST", body: { title: "Hi" } });
```

### Options (`ApiRequestOptions<T>`)

| Option      | Default | Meaning                                                                                                           |
| ----------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `method`    | `GET`   | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`                                                                           |
| `query`     | none    | Appended to the URL; `null` and `undefined` values are skipped                                                    |
| `body`      | none    | Serialised as JSON; sets `Content-Type`                                                                           |
| `headers`   | none    | Merged over `Accept: application/json`                                                                            |
| `signal`    | none    | Pass React Query's `signal` so leaving a screen cancels the request                                               |
| `timeoutMs` | `15000` | Aborts and throws `TIMEOUT`                                                                                       |
| `schema`    | none    | A Zod schema; validates and types the response. A mismatch throws `INVALID_RESPONSE` with the issues in `details` |

### What it does for you

- Attaches the Better Auth session cookie by hand (`authClient.getCookie()`) and sends `credentials: "omit"` so the native cookie jar never adds its own.
- Reads the body as JSON when it parses, else as text; an empty body is `undefined`.
- Maps every failure to an `ApiError`.
- On a 401, calls the handler set by `setUnauthorizedHandler` once. The auth gate uses it to end the session, so the app returns to sign-in without any screen code.

### `ApiError`

| Field            | Meaning                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| `status`         | HTTP status, or `0` when no response arrived                                   |
| `code`           | Server code, or `NETWORK`, `TIMEOUT`, `INVALID_RESPONSE`                       |
| `details`        | The parsed body (or the Zod issues)                                            |
| `retryAfterMs`   | From a `Retry-After` header (seconds or an HTTP date); `undefined` when absent |
| `isNetworkError` | `status === 0`                                                                 |

Error messages come from the body (`message`, also under a nested `error`) or, failing that, a translated message for the status (`errors.sessionExpired`, `forbidden`, `notFound`, `tooManyRequests`, `server`, `generic`).

### Helpers

- `isApiError(error)`: type guard.
- `getErrorMessage(error, fallback?)`: a message safe to show for any thrown value; the `ApiError` message, else the fallback (`errors.generic`).
- `parseRetryAfter(value, now?)`: exported for tests.
- `setUnauthorizedHandler(handler | null)`: used by the auth gate.

## Server state: React Query

`src/lib/query-client.ts` and `query-provider.tsx`. Fetched data lives in TanStack Query, not in `useState`/`useEffect`.

Defaults: `staleTime` 30 s; `gcTime` 24 h (`CACHE_MAX_AGE`, which must be at least the persister's `maxAge` or restored data is collected immediately); queries retry at most twice and never on a 4xx; mutations do not retry.

- **Offline**: `onlineManager` follows `expo-network`; fetching pauses offline and resumes on reconnect.
- **Foreground**: `QueryProvider` sets `focusManager` from `AppState`, so stale queries refetch when the app returns.
- **Persistence**: `PersistQueryClientProvider` stores the cache in AsyncStorage under `<slug>.query-cache` (throttled to 1 s), restores it after a restart, and discards it when `config.version` changes (`cacheBuster`).
- **Opting out**: only successful queries are stored, and a query with `meta: { persist: false }` stays in memory. Use that for sensitive data.
- **Sign-out**: `clearQueryCache()` clears memory and disk. The auth gate calls it when the session ends.

### A resource hook

Write one hook per resource next to the feature, with a key factory:

```ts
// src/features/notes/queries.ts
export const noteKeys = {
  all: ["notes"] as const,
  detail: (id: string) => ["notes", id] as const,
};

export function useNote(id: string) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    // Pass the signal so leaving the screen cancels the request.
    queryFn: ({ signal }) => api(`/api/notes/${id}`, { signal, schema: noteSchema }),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string }) =>
      api("/api/notes", { method: "POST", body: input, schema: noteSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}
```

In the screen, cover every state:

```tsx
const { data, isPending, isError, error, refetch } = useNote(id);

if (isPending)
  return (
    <LargeTitleScreen title={t("notes.title")}>
      <ScreenLoading />
    </LargeTitleScreen>
  );
if (isError) {
  return (
    <LargeTitleScreen title={t("notes.title")}>
      <EmptyState
        icon="cloud-offline-outline"
        title={t("notes.loadFailed")}
        description={getErrorMessage(error)}
        actionLabel={t("common.tryAgain")}
        onAction={() => void refetch()}
      />
    </LargeTitleScreen>
  );
}
```

### Infinite lists and pull to refresh

```tsx
const insets = useSafeAreaInsets();
const query = useInfiniteQuery({
  queryKey: ["notes"],
  queryFn: ({ pageParam, signal }) =>
    api("/api/notes", { query: { cursor: pageParam, limit: 20 }, signal, schema: pageSchema }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});
const notes = query.data?.pages.flatMap((page) => page.items) ?? [];

<LargeTitleScreen<Note>
  title={t("notes.title")}
  list={{ data: notes, keyExtractor: (n) => n.id, renderItem: (n) => <NoteRow note={n} /> }}
  // Fires once near the bottom; re-arms when more content arrives.
  onEndReached={() => {
    if (query.hasNextPage && !query.isFetchingNextPage && !query.isFetchNextPageError) {
      void query.fetchNextPage();
    }
  }}
  scrollViewProps={{
    refreshControl: (
      <RefreshControl
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => void query.refetch()}
        progressViewOffset={insets.top + HEADER_BAR_HEIGHT}
      />
    ),
  }}
>
  {null}
</LargeTitleScreen>;
```

Guard `onEndReached` with `isFetchingNextPage` and `isFetchNextPageError` so a failing page does not retry in a loop, and show a Retry button (in `list.footer`) for that case.

## Device storage: three stores

| Store        | Module                                                               | Sync?       | Use it for                                                                                      | Never for               |
| ------------ | -------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------- | ----------------------- |
| SecureStore  | `flags.ts`: `readSetting(name)`, `writeSetting(name, value)`         | synchronous | Tiny values needed on the first render: theme, accent, language, onboarded, reduce transparency | Large data              |
| AsyncStorage | `storage.ts`: `readJSON<T>`, `writeJSON`, `removeItem`, `storageKey` | async       | Larger non-secret JSON, the query cache                                                         | Secrets (not encrypted) |
| SQLite       | `src/lib/db` ([database.md](database.md))                            | async       | The app's records                                                                               | Settings                |

All keys are namespaced `<slug>.<name>`. Every function swallows storage errors (a full disk, web without SecureStore): a read returns `null`, a write silently does not persist, so the app works without storage and a setting just resets.

`readSetting` returns a string or `null`. Settings in this app: `onboarded` (`"1"`), plus the theme, accent, language and reduce-transparency keys documented in [theming.md](theming.md) and [i18n.md](i18n.md).

```ts
await writeJSON("draft", { title, body });
const draft = await readJSON<{ title: string; body: string }>("draft"); // null when missing
```

Session tokens are not yours to store: `authClient` keeps them in SecureStore (the keychain). SecureStore values are small (about 2 KB); put anything bigger in `storage.ts`. Neither is a database: for lists, relations or offline data, use the [local database](database.md). Settings that belong to the user's account rather than the device should be saved on the server through `api()`.

## Ids: `newId()`

`src/lib/ids.ts`. UUID v7: the first 48 bits are the creation time in milliseconds, so ids sort by creation time. A 12-bit counter keeps ids strictly increasing even inside one millisecond (and borrows the next millisecond after 2048 in one), so a list ordered by id keeps creation order. Use `newId()` for every record id.

`createUuidV7Generator(random?)` builds an independent generator with an injectable random source (the tests use it). Randomness: `random.native.ts` (expo-crypto) on iOS and Android, `random.ts` (Web Crypto) elsewhere and in tests; Metro picks the right file.

## Dates: `src/lib/dates.ts`

Dates are **local `YYYY-MM-DD` strings** (`LocalDate`), never UTC dates and never `Date` objects in storage. Weekdays follow JavaScript: 0 is Sunday. All arithmetic is calendar arithmetic, so daylight saving changes do not matter.

| Function                            | Returns                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `today(now?)`, `toLocalDate(date)`  | The local date of now / of a moment                                              |
| `isLocalDate(value)`                | `true` for a real calendar date (rejects `2026-02-30`)                           |
| `parseLocalDate(value)`             | Local midnight `Date`; throws on a malformed date                                |
| `addDays`, `addMonths`              | Shifted date; `addMonths` clamps to the month's last day                         |
| `daysBetween(from, to)`             | Whole days, negative if `to` is earlier                                          |
| `weekdayOf`, `isWeekend`            | 0 to 6; Saturday or Sunday                                                       |
| `weekRange(value, weekStart = 1)`   | The week containing the date, starting Monday by default                         |
| `monthRange`, `quarterRange`        | First and last day of the month / quarter                                        |
| `customRange(a, b)`                 | A range from two dates in either order                                           |
| `isInRange(value, range)`           | Inclusive                                                                        |
| `monthGrid(year, month, weekStart)` | `{ leadingBlanks, days }` for a calendar grid (the `Calendar` component uses it) |
| `msUntilNextDay(now?)`              | Milliseconds to the next local midnight                                          |
| `eachDay(range)`                    | Every date in the range, oldest first                                            |

Types: `LocalDate`, `Weekday`, `DateRange { start, end }`. Tested in `dates.test.ts`.

## Hooks

| Hook                                       | File                 | Behaviour                                                                                                                                                        |
| ------------------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useToday()`                               | `use-today.ts`       | Today's `LocalDate`; updates one second after midnight and whenever the app returns to the foreground, so a screen left open overnight moves to the new day      |
| `useNow(intervalMs = 1000, active = true)` | `use-now.ts`         | The current `Date`, refreshed on an interval while `active`. Use it in the one small component that shows a live value so the tick re-renders only that text     |
| `useLargerText()`                          | `use-larger-text.ts` | `true` when the system font scale is at least `LARGER_TEXT_SCALE` (1.3), to let one-line titles wrap. Follows the system setting only; there is no in-app switch |
| `useNotify()`                              | `use-notify.ts`      | Toast shortcuts, see [feedback-and-states.md](feedback-and-states.md)                                                                                            |

## Schemas and form helpers: `src/lib/schemas.ts`

Shared Zod field rules. They take `t` so messages follow the language; build the schema inside the component.

- `emailField(t)`: trimmed, required, valid email.
- `requiredText(message)`: trimmed, at least one character.
- `newPasswordField(t)`: at least `MIN_PASSWORD_LENGTH` (10) characters.
- `setFormError(form, message)`: puts a non-field error (a failed request) at `root.server`; `FormTextField`-based screens render it above the form.

See [forms.md](forms.md).

## Platform files

| File                             | Purpose                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- |
| `random.ts` / `random.native.ts` | Random bytes for ids (see above)                                           |
| `db/expo.ts` / `db/test-db.ts`   | The SQLite adapters for the app and for tests ([database.md](database.md)) |

## Testing

`pnpm test` runs Vitest (`vitest.config.mts`). Pure logic has tests next to it: `dates.test.ts`, `ids.test.ts`, `schemas.test.ts`, `db` and `features/demo/repository.test.ts`. Keep logic that needs no React Native in plain TypeScript so it stays testable in Node.
