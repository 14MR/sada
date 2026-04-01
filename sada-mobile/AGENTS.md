# SADA Mobile — Agent Runbook

## Architecture

- **`sada-backend/`** — Express + TypeORM API on port **3001** (Postgres 5433, Redis 6380 via Docker)
- **`sada-mobile/`** — Expo React Native dev-client app, package **`com.anonymous.sadamobile`**
- Backend routes are at root (`/auth/signin`, `/rooms`, etc.) — **not** under `/api`
- Production routes use the `/api` prefix; `src/api/client.ts` auto-strips `/api` for local hosts (`10.0.2.2`, `localhost`, `127.0.0.1`)

## API URL configuration

| Context | `EXPO_PUBLIC_API_URL` | Effective base URL |
|---------|----------------------|--------------------|
| Emulator (local dev) | `http://10.0.2.2:3001` | `http://10.0.2.2:3001` |
| Production | `https://sada.mustafin.dev/api` | `https://sada.mustafin.dev/api` |

The `.env` in `sada-mobile/` **must not** include a trailing `/api` for local dev — the local backend serves routes at root.

## Bringing up the full local stack

Run in this order. All three must be running for E2E tests to pass.

### 1. Start emulator

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools:$HOME/Library/Android/sdk/emulator"
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_34 &
# Wait for device to be ready:
adb wait-for-device && adb shell getprop sys.boot_completed | grep -q 1
```

### 2. Start backend

```bash
cd sada-backend
docker compose up -d          # Postgres on 5433, Redis on 6380
npm install                   # first time only
npm run dev                   # nodemon, reads .env (PORT=3001, DB_PORT=5433, JWT_SECRET set)
```

Verify: `curl -s http://127.0.0.1:3001/health` should return `{"status":"ok",...}`.

The backend `.env` is already committed with working local-dev values. No env vars need to be exported manually.

### 3. Start Metro + install app

```bash
cd sada-mobile
npm install                   # first time only
npx expo start --dev-client   # starts Metro on port 8081
```

Verify Metro: `curl -s http://127.0.0.1:8081/status` should return `packager-status:running`.

If the app is not yet installed on the emulator, build and install once:
```bash
npx expo run:android
```

## Running E2E tests

### Prerequisites (all must be true)

| Requirement | How to verify |
|-------------|---------------|
| Emulator running | `adb devices` shows a line ending with `device` |
| App installed | `adb shell pm list packages com.anonymous.sadamobile` returns the package |
| Backend healthy | `curl -s http://127.0.0.1:3001/health` returns `{"status":"ok",...}` |
| Metro running | `curl -s http://127.0.0.1:8081/status` returns `packager-status:running` |

### Run all tests

```bash
cd sada-mobile
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools:$HOME/.maestro/bin"
npm run test:e2e
```

### Run a single flow

```bash
npm run test:e2e:login
# or directly:
maestro test .maestro/login.yaml
```

### Preflight only (no Maestro)

```bash
npm run test:e2e:preflight
```

### npm scripts

| Script | What it runs |
|--------|--------------|
| `npm run test:e2e` | `scripts/maestro-preflight.sh` then `maestro test .maestro/` |
| `npm run test:e2e:login` | Preflight then `maestro test .maestro/login.yaml` |
| `npm run test:e2e:preflight` | Only `scripts/maestro-preflight.sh` |

## Maestro flow architecture

All flows live in `.maestro/`. Every flow calls `runFlow: login.yaml` first.

### login.yaml (shared bootstrap)

1. `launchApp` — brings app to foreground (preserves state, no `clearState`)
2. Dismisses Expo Dev Launcher overlays with `tapOn optional:true` for: `Continue`, `sada-mobile`, `http://10.0.2.2:8081`, `Reload`
3. If `Sign in with Apple (Dev)` is visible, taps it (mock dev auth, creates `dev-user-<timestamp>`)
4. Waits up to 60 s for `Live Rooms` (Home screen)
5. Asserts `Live Rooms` is visible

**Key design decisions:**
- **No `clearState`** — avoids triggering the Expo Dev Launcher on every flow, which causes timing races with the onboarding overlay
- **`optional: true` taps** — handle overlays that may or may not appear depending on app state
- **Conditional sign-in** — if already logged in from a previous flow, skips straight to `Live Rooms`

### Other flows

| Flow | What it tests after login |
|------|---------------------------|
| `navigation.yaml` | Home → Profile → Home tab switching |
| `notifications.yaml` | Home → tap bell → Notifications screen |
| `profile.yaml` | Home → Profile → asserts Followers, Following, Gems, Sign Out |
| `create_room.yaml` | Home → Create Room → fill form → Go Live → asserts success alert |

## Writing new Maestro flows

1. Create `your_flow.yaml` in `.maestro/`
2. Start with `runFlow: login.yaml` to get to the Home screen
3. Use `assertVisible` for text that's on screen, `extendedWaitUntil` for text that needs loading
4. Match UI text **exactly** (including emoji): check the `<Text>` elements in the React Native screen source
5. Use `tapOn: { text: "...", optional: true }` for elements that may not appear
6. Run with `maestro test .maestro/your_flow.yaml` to verify

**Pattern for asserting after API calls:**
```yaml
- extendedWaitUntil:
    visible: "Expected Text"
    timeout: 15000
- assertVisible: "Expected Text"
```

## Preflight script

`scripts/maestro-preflight.sh` runs before Maestro and verifies:
- `maestro` CLI on `PATH` (auto-detects `~/.maestro/bin`)
- `adb` on `PATH` (auto-detects `~/Library/Android/sdk/platform-tools`)
- At least one device in `device` state
- `com.anonymous.sadamobile` installed on the device
- Metro dev server reachable at `http://127.0.0.1:8081/status`

If `adb` is not on `PATH` but exists at the default macOS SDK location, the script adds it for the run.

Bypass Metro check for standalone APK testing: `SKIP_METRO_CHECK=1 npm run test:e2e`

## Backend notes for local dev

- **Auth**: `POST /auth/signin` with `{ "identityToken": "any-string" }` — in non-production mode, the identity token is used directly as the apple_id (no real Apple verification)
- **JWT_SECRET**: required only in production; falls back to `dev_or_test_only_secret` in dev/test
- **Room creation**: `POST /rooms` with `{ "title", "categoryId", "description" }` — the `categoryId` field name is what the backend expects (not `category`)
- **Audio sessions**: when `CLOUDFLARE_APP_SECRET` is empty (default in local dev), `AudioService.createSession` returns a stub session so room creation still succeeds without Cloudflare credentials

## Build & deploy

### EAS Cloud Build (Recommended)

```bash
npm run build:android-preview   # internal distribution APK
npm run build:android-prod      # production APK
```

### Install APK on emulator

```bash
curl -L -o sada-mobile.apk <eas-build-url>
adb install sada-mobile.apk
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| **Login 404** | `.env` must use `http://10.0.2.2:3001` (no `/api` suffix). Rebuild app after changing `.env`. |
| **Login 500** | Ensure backend is running on port 3001 and `JWT_SECRET` is set (or unset for dev fallback). |
| **Room creation 500** | Normal if `CLOUDFLARE_APP_SECRET` is empty — audio stub kicks in. If still 500, check backend logs. |
| **No emulator/device** | `~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_34 &` then `adb devices`. |
| **App not installed** | `npx expo run:android` or `adb install <apk>`. |
| **`maestro` not found** | `curl -Ls "https://get.maestro.mobile.dev" \| bash` then add `~/.maestro/bin` to `PATH`. |
| **`adb` not found** | `export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"` |
| **Metro not running** | `npx expo start --dev-client` from `sada-mobile/`. |
| **E2E passes locally but fails on rerun** | App state persists between flows by design. If stuck, `adb shell pm clear com.anonymous.sadamobile` to reset, then relaunch app and connect to Metro before rerunning. |
| **Assertions fail after UI changes** | Check exact text in the React Native screen source. Maestro matches text literally (emoji, whitespace, casing all matter). |

## Project links

- **EAS Dashboard:** https://expo.dev/accounts/mustafin_expo/projects/sada-mobile
- **Expo Account:** mustafin_expo
- **Production API:** https://sada.mustafin.dev/api
- **Production Socket:** https://sada.mustafin.dev
