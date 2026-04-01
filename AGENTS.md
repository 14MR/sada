# SADA — Agent Runbook (Monorepo Root)

## Repository structure

```
sada/
├── sada-backend/    # Express API + Socket.io (see sada-backend/AGENTS.md)
├── sada-mobile/     # Expo React Native app (see sada-mobile/AGENTS.md)
```

Each sub-project has its own `AGENTS.md` with detailed setup, testing, and troubleshooting instructions. **Read the relevant sub-project's `AGENTS.md` before making changes.**

## Quick start — full local stack

Three things must be running for the mobile app and E2E tests to work:

### 1. Android emulator

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools:$HOME/Library/Android/sdk/emulator"
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_34 &
adb wait-for-device
```

### 2. Backend (port 3001)

```bash
cd sada-backend
docker compose up -d   # Postgres 5433, Redis 6380
npm install            # first time
npm run dev
```

### 3. Mobile + Metro (port 8081)

```bash
cd sada-mobile
npm install            # first time
npx expo start --dev-client
```

If the app isn't installed: `npx expo run:android` (builds and installs the dev client).

## Running tests

| What | Command | Where |
|------|---------|-------|
| Backend unit/E2E tests | `npm test` | `sada-backend/` |
| Mobile E2E (Maestro) | `npm run test:e2e` | `sada-mobile/` |
| Single Maestro flow | `npm run test:e2e:login` | `sada-mobile/` |

## Cross-project gotchas

- Backend routes are at **root** (`/auth/signin`, `/rooms`), not under `/api`. Production uses `/api` at the reverse proxy level.
- Mobile `.env` must set `EXPO_PUBLIC_API_URL=http://10.0.2.2:3001` (no `/api` suffix) for local dev. The API client in `src/api/client.ts` auto-strips `/api` for local hosts.
- Room creation: mobile sends `categoryId` (not `category`). If you rename this field on either side, update the other.
- `CLOUDFLARE_APP_SECRET` is intentionally empty in local dev — the backend stubs audio sessions so room creation still works.
