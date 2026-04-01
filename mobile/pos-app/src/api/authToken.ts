import { AUTH_TOKEN as STATIC_AUTH_TOKEN_RAW } from "../config";

type TokenGetter = () => Promise<string | null | undefined>;

let clerkGetToken: TokenGetter | null = null;

/** Called from ClerkTokenBridge when user is signed in. */
export function setClerkTokenGetter(getter: TokenGetter | null): void {
  clerkGetToken = getter;
}

/** Strip common .env mistakes: quotes, accidental "Bearer " prefix. */
export function normalizeBearerValue(raw: string): string {
  let t = raw.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  const lower = t.toLowerCase();
  if (lower.startsWith("bearer ")) {
    t = t.slice(7).trim();
  }
  return t;
}

/** Clerk session JWTs are three base64url segments separated by dots. */
export function isLikelyJwt(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length > 0);
}

function staticJwtFromEnv(): string | null {
  let t = normalizeBearerValue(STATIC_AUTH_TOKEN_RAW);
  if (!t || t === "undefined" || t === "null") return null;
  if (t.startsWith("pk_test_") || t.startsWith("pk_live_")) {
    if (__DEV__) {
      console.warn(
        "[auth] EXPO_PUBLIC_AUTH_TOKEN looks like a Clerk publishable key — ignoring it. Put that in EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY instead."
      );
    }
    return null;
  }
  if (!isLikelyJwt(t)) {
    if (__DEV__) {
      console.warn(
        "[auth] EXPO_PUBLIC_AUTH_TOKEN is not a valid JWT shape (need three parts: a.b.c). Remove it or fix it — falling back to Clerk session token if you are signed in."
      );
    }
    return null;
  }
  return t;
}

/** Static .env JWT wins when valid; invalid static is ignored so Clerk token can be used. */
export async function resolveBearerToken(): Promise<string | null> {
  const staticToken = staticJwtFromEnv();
  if (staticToken) {
    return staticToken;
  }
  if (!clerkGetToken) {
    return null;
  }
  try {
    const raw = await clerkGetToken();
    if (raw == null || raw === "") {
      return null;
    }
    const token = normalizeBearerValue(String(raw));
    if (!isLikelyJwt(token)) {
      if (__DEV__) {
        console.warn(
          "[auth] Clerk getToken() did not return a JWT-shaped token. Try signing out and in again, or check Clerk Dashboard / JWT templates."
        );
      }
      return null;
    }
    return token;
  } catch {
    return null;
  }
}
