/**
 * Set in `.env` (Expo loads EXPO_PUBLIC_* automatically) or app.config `extra`.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

/** Optional fixed store UUID for single-shop mode */
export const CONFIG_STORE_ID = process.env.EXPO_PUBLIC_STORE_ID?.trim() || "";

/** Bearer token (Clerk JWT). Leave empty when using @clerk/clerk-expo session, or backend AUTH_BYPASS. */
export const AUTH_TOKEN = process.env.EXPO_PUBLIC_AUTH_TOKEN?.trim() || "";

/** Set to enable Clerk (same as Dashboard → API Keys → Publishable key). */
export const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || "";
