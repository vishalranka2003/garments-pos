# Garments POS (Expo)

## Authentication (Clerk)

This app uses **`@clerk/clerk-expo`** with the patterns from Clerk’s **official Expo quickstart** (not a third-party template):

- [Clerk Expo quickstart](https://clerk.com/docs/quickstarts/expo)

Implementation in this repo:

| Piece | Location |
|--------|-----------|
| `react-dom` (peer of `@clerk/clerk-react`) | `package.json` — required so Metro can resolve Android/iOS bundles |
| `ClerkProvider` + optional no-key fallback | `src/auth/ClerkApp.tsx` |
| Secure token cache (native) | `@clerk/clerk-expo/token-cache` |
| OAuth return handler | `index.ts` → `expo-web-browser` `maybeCompleteAuthSession()` |
| Deep link scheme | `app.json` → `"scheme": "garments-pos"` |
| API `Authorization: Bearer` | `src/auth/ClerkTokenBridge.tsx` + `src/api/authToken.ts` + `src/api/client.ts` |

### Environment

Copy `.env.example` to `.env`. For Clerk sign-in:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — same Clerk application as the backend JWKS/issuer.
- In the Clerk Dashboard, add the **redirect URL** your app prints on the sign-in screen (must match `expo.scheme`).

Optional: `EXPO_PUBLIC_AUTH_TOKEN` overrides the session JWT (e.g. debugging). Leave empty for normal Clerk sessions.

### About sample repos on GitHub

Some repositories are named “expo-clerk-auth” but only contain a default Expo app **without** `@clerk/clerk-expo`. Always check `package.json` for `@clerk/clerk-expo` and compare with the official quickstart above.

## Run

```bash
npm install
npx expo start
```

Uses `.npmrc` with `legacy-peer-deps=true` for compatibility with current React / Clerk peer ranges.

## Stuck on loading?

| What you see | Likely cause |
|----------------|---------------|
| **“Starting Clerk…”** forever | Bad/missing `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, no network, or Clerk outage. Fix key → restart Expo (`npx expo start -c`). |
| **“Connecting to API…”** then error or timeout | Backend URL wrong for where the app runs. **Android emulator:** `http://10.0.2.2:8000`. **iOS simulator:** `http://127.0.0.1:8000`. **Physical phone:** `http://YOUR_COMPUTER_LAN_IP:8000`. Ensure `uvicorn` is running. |
| Blank / only spinner (old build) | Rebuild after pulling changes; clear cache: `npx expo start -c`. |

**Logs:** In development, `console.warn` lines like `[api]`, `[store]`, `[clerk]` appear in the **terminal where Metro runs** (Expo CLI), not inside the app UI.
