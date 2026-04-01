import { API_BASE_URL } from "../config";
import { resolveBearerToken } from "./authToken";

/** Abort hanging requests (wrong host, firewall, no backend). */
const DEFAULT_TIMEOUT_MS = 20_000;

/** Set EXPO_PUBLIC_LOG_FULL_BEARER=1 in .env to print the entire JWT in Metro (dev only — do not ship). */
function logBearerDebug(bearer: string | null): void {
  if (!__DEV__ || bearer == null) return;
  const full = process.env.EXPO_PUBLIC_LOG_FULL_BEARER === "1";
  if (full) {
    console.warn("[api] Bearer (full):", bearer);
    return;
  }
  const n = bearer.length;
  const preview = n <= 36 ? `${bearer.slice(0, 8)}…` : `${bearer.slice(0, 12)}…${bearer.slice(-12)} (${n} chars)`;
  console.warn("[api] Bearer (truncated):", preview);
}

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { parseJson?: true; timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, parseJson: _omitParseJson, ...restInit } = options;
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(restInit.headers as Record<string, string>),
  };

  if (__DEV__) {
    console.warn(`[api] ${restInit.method ?? "GET"} ${url}`);
  }

  const bearer = await resolveBearerToken();
  logBearerDebug(bearer);
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  if (restInit.body && typeof restInit.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, { ...restInit, headers, signal: controller.signal });
  } catch (e: unknown) {
    if (timedOut) {
      throw new ApiError(
        `Request timed out after ${timeoutMs / 1000}s — check EXPO_PUBLIC_API_URL (Android emulator: http://10.0.2.2:8000, iOS simulator: http://127.0.0.1:8000, real device: your PC LAN IP).`,
        0,
        ""
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(text || res.statusText, res.status, text);
  }
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}
