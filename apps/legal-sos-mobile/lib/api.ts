// Thin fetch wrapper for talking to the lawyers.bh SOS backend.
// - Prepends the configured base URL.
// - Sends JSON by default (set `raw: true` to skip).
// - Adds an Authorization: Bearer header when a session token exists.
// - Normalises errors into ApiError so screens can show useful messages.

import { env } from "../constants/env";
import { getSessionToken } from "./secureStore";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface ApiOptions extends Omit<RequestInit, "body"> {
  /** JSON-serialisable body. Skipped if undefined. */
  json?: unknown;
  /** Raw body to send verbatim (skips JSON serialization). */
  body?: BodyInit;
  /** If true, skip auto JSON content-type and pass body verbatim. */
  raw?: boolean;
  /** If true, skip attaching the session token. */
  anonymous?: boolean;
  /** Abort after N ms. Default 20s. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;

export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${env.apiUrl}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((opts.headers as Record<string, string> | undefined) ?? {}),
  };

  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.body && !opts.raw) {
    body = opts.body as BodyInit;
  }

  if (!opts.anonymous) {
    const token = await getSessionToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      ...opts,
      headers,
      body,
      signal: ac.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Request timed out"
        : "Network error";
    throw new ApiError(message, 0, null);
  }
  clearTimeout(timer);

  // Try to parse JSON regardless of status — backend always returns JSON
  // for /api/* routes (success or error). Falls back gracefully.
  let parsed: unknown = null;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
  } else {
    try {
      parsed = await res.text();
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const errorCode =
      (parsed as { error?: string } | null)?.error ?? `http_${res.status}`;
    throw new ApiError(errorCode, res.status, parsed);
  }

  return parsed as T;
}
