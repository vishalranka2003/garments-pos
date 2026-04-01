# Mobile App

React Native mobile client for Garments POS (Expo + TypeScript).

## Project

- App source: `mobile/pos-app`
- Stitch references: `mobile/stitch`

## Run

```bash
cd mobile/pos-app
cp .env.example .env
# Edit .env: EXPO_PUBLIC_API_URL must reach your FastAPI server
npm install
npm start
```

## API connection

- Set `EXPO_PUBLIC_API_URL` to your backend (see `.env.example`).
- **Auth**: if the backend uses `AUTH_BYPASS=true` in dev, leave `EXPO_PUBLIC_AUTH_TOKEN` empty.
- **Single shop**: leave `EXPO_PUBLIC_STORE_ID` empty to use the first store, or auto-create **Main Shop** if none exist. Or set it to your store UUID.
- **Android emulator** cannot use `127.0.0.1` for the host machine; use `http://10.0.2.2:8000`.
