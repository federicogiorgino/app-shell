import type { z } from "zod";

import { authClient } from "./auth-client";
import { config } from "./config";
import { i18n } from "./i18n";

const DEFAULT_TIMEOUT_MS = 15_000;

type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions<T> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Appended to the URL; `undefined` and `null` values are skipped. */
  query?: Record<string, QueryValue>;
  /** Serialized as JSON. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Pass React Query's `signal` so leaving a screen cancels the request. */
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Validates and types the response; a mismatch throws an `INVALID_RESPONSE` error. */
  schema?: z.ZodType<T>;
}

/**
 * Error thrown for every failed request. `status` is the HTTP status, or 0 when no response
 * arrived (`code` is then `NETWORK` or `TIMEOUT`).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: unknown;
  /** From a `Retry-After` header (429, 503), in milliseconds; undefined when absent. */
  readonly retryAfterMs: number | undefined;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: unknown,
    retryAfterMs?: number
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfterMs = retryAfterMs;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** A message that is safe to show to the user for any thrown value. */
export function getErrorMessage(error: unknown, fallback = i18n.t("errors.generic")): string {
  if (isApiError(error)) return error.message;
  return fallback;
}

let unauthorizedHandler: (() => void) | null = null;

/** Called once when a request comes back 401. The auth gate uses it to end the session. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  if (!config.apiUrl) {
    throw new Error("api() needs EXPO_PUBLIC_API_URL. Set it in .env.local and restart Expo.");
  }
  const url = `${config.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value != null) params.append(name, String(value));
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

function messageForStatus(status: number): string {
  if (status === 401) return i18n.t("errors.sessionExpired");
  if (status === 403) return i18n.t("errors.forbidden");
  if (status === 404) return i18n.t("errors.notFound");
  if (status === 429) return i18n.t("errors.tooManyRequests");
  if (status >= 500) return i18n.t("errors.server");
  return i18n.t("errors.generic");
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** `Retry-After` is either seconds or an HTTP date. */
export function parseRetryAfter(
  value: string | null,
  now: number = Date.now()
): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

function errorFromBody(status: number, body: unknown, retryAfterMs?: number): ApiError {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const nested = record?.error && typeof record.error === "object" ? record.error : null;
  const source = (nested as Record<string, unknown> | null) ?? record;
  const message = typeof source?.message === "string" ? source.message : messageForStatus(status);
  const code = typeof source?.code === "string" ? source.code : undefined;
  return new ApiError(status, message, code, body, retryAfterMs);
}

/**
 * Typed `fetch` wrapper for the API. It attaches the Better Auth session cookie, serializes
 * JSON, enforces a timeout and turns every failure into an `ApiError`.
 *
 *   const notes = await api("/api/notes", { query: { limit: 20 }, schema: notesSchema });
 */
export async function api<T = unknown>(
  path: string,
  options: ApiRequestOptions<T> = {}
): Promise<T> {
  const {
    method = "GET",
    query,
    body,
    headers,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    schema,
  } = options;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = (): void => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abortFromCaller);

  try {
    const cookie = await authClient.getCookie();
    const requestHeaders: Record<string, string> = { Accept: "application/json", ...headers };
    if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
    if (cookie) requestHeaders.Cookie = cookie;

    let response: Response;
    try {
      response = await fetch(buildUrl(path, query), {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        // The cookie is attached by hand above; the native cookie jar must not add its own.
        credentials: "omit",
        signal: controller.signal,
      });
    } catch (caught) {
      if (timedOut) {
        throw new ApiError(0, i18n.t("errors.timeout"), "TIMEOUT");
      }
      if (signal?.aborted) throw caught;
      throw new ApiError(0, i18n.t("errors.network"), "NETWORK");
    }

    const data = await readBody(response);

    if (!response.ok) {
      if (response.status === 401) unauthorizedHandler?.();
      throw errorFromBody(
        response.status,
        data,
        parseRetryAfter(response.headers.get("Retry-After"))
      );
    }

    if (!schema) return data as T;

    const result = schema.safeParse(data);
    if (!result.success) {
      throw new ApiError(
        response.status,
        i18n.t("errors.invalidResponse"),
        "INVALID_RESPONSE",
        result.error.issues
      );
    }
    return result.data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
