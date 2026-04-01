# SADA Mobile - Android Build Setup

## Build Methods

### EAS Cloud Build (Recommended)
Free tier builds APK in Expo's cloud service.

**Preview Build (for testing):**
```bash
npm run build:android-preview
```

**Production Build:**
```bash
npm run build:android-prod
```

**Install on Emulator/Device:**
```bash
# Download APK from EAS build link
curl -L -o sada-mobile.apk <build-url>

# Install via ADB
adb install sada-mobile.apk

# Launch app
adb shell am start -n com.anonymous.sadamobile/.MainActivity
```

### Local Build (Requires Android Studio)
Not recommended due to Java 24 compatibility issues. Use EAS cloud builds instead.

## App Configuration

**Package:** `com.anonymous.sadamobile`
**Build Type:** APK (not AAB)
**Platform:** Android 24+ (API 36)

**Key Permissions:**
- `RECORD_AUDIO` - For WebRTC audio
- `CAMERA` - For WebRTC video
- `INTERNET` - For API/Socket connection
- `MODIFY_AUDIO_SETTINGS` - Audio management
- `SYSTEM_ALERT_WINDOW` - In-call UI
- `WAKE_LOCK` - Background audio
- `BLUETOOTH` - Bluetooth audio

## Development Workflow

### Emulator Setup
```bash
# Start emulator
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_34 &

# Check devices
adb devices

# View logs
adb logcat | grep ReactNativeJS
```

### Build Scripts
- `npm run build:android-preview` - EAS preview build (internal distribution)
- `npm run build:android-prod` - EAS production build

## Troubleshooting

**Java 24 Compatibility:**
Local builds fail with Java 24 due to CMake restrictions. Use EAS cloud builds instead.

**Missing NDK:**
Android NDK is auto-downloaded during first local build via Android SDK manager.

**Emulator Not Found:**
Ensure Android SDK is installed at `~/Library/Android/sdk` and ADB is in PATH:
```bash
export PATH=$PATH:~/Library/Android/sdk/platform-tools
```

## EAS Configuration

**File:** `eas.json`

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "withoutCredentials": true
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

## E2E tests (Maestro)

End-to-end UI tests drive the **Android** build with package **`com.anonymous.sadamobile`**. Maestro needs a **real emulator or USB device**, `adb`, the app **installed**, and (for flows to pass) a **working API + Metro** so the login/home UI appears.

### One-time setup

1. **Maestro CLI** — install and put it on `PATH`:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   export PATH="$PATH:$HOME/.maestro/bin"
   ```
2. **Android SDK** — Platform Tools (and preferably an AVD). Typical macOS paths:
   ```bash
   export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools:$HOME/Library/Android/sdk/emulator"
   ```
3. **`.env` in `sada-mobile/`** — from the **emulator**, the host machine is **`10.0.2.2`** (not `localhost`):
   ```
   EXPO_PUBLIC_API_URL=http://10.0.2.2:3001
   EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:3001
   ```
4. **Backend** — Postgres/Redis via Docker in `sada-backend`, API on port **3001** (see below).

### How to run (recommended: three terminals)

Use this order so the device is up, the API is up, then the dev client loads `.env` and can reach the backend.

**Terminal 1 — Emulator**

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools:$HOME/Library/Android/sdk/emulator"
# List AVDs: emulator -list-avds
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_34 &
adb devices
# Wait until you see a line ending with `device` (not `offline` / `unauthorized`).
```

**Terminal 2 — Backend (from repo root or `sada-backend/`)**

```bash
cd sada-backend
docker compose up -d
export PORT=3001
export DB_PORT=5433
export JWT_SECRET=<your-dev-secret>
npm install   # first time
npm run dev
```

Confirm the API responds (optional): `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/` or hit a health route if you have one.

**Terminal 3 — App + Maestro (from `sada-mobile/`)**

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools:$HOME/.maestro/bin"
cd sada-mobile

# Install / refresh the dev client (reads .env). First run can take a while.
npx expo run:android

# When the app shows the real UI on the emulator, run all flows:
npm run test:e2e

# Or one flow only:
npm run test:e2e:login

# Device + install checks only (no Maestro flows):
npm run test:e2e:preflight
```

### npm scripts

| Script | What it runs |
|--------|----------------|
| `npm run test:e2e` | Preflight, then `maestro test .maestro/` |
| `npm run test:e2e:login` | Preflight, then `maestro test .maestro/login.yaml` |
| `npm run test:e2e:preflight` | Only `scripts/maestro-preflight.sh` |

### Preflight

`npm run test:e2e` runs **`scripts/maestro-preflight.sh`** before Maestro. It verifies:

- `maestro` and `adb` on `PATH` (if `adb` lives under `~/Library/Android/sdk/platform-tools`, that directory is prepended for that run)
- At least one Android target in **`device`** state in `adb devices`
- **`com.anonymous.sadamobile`** is installed on that target (use **`ANDROID_SERIAL`** if several devices are connected)
- Metro dev server responds on **`http://127.0.0.1:8081/status`** (required for Expo dev client flows)

To call Maestro directly without preflight: `maestro test .maestro/`

If you intentionally run against a standalone APK (not dev client), you can bypass Metro check:
`SKIP_METRO_CHECK=1 npm run test:e2e:login`

### EAS APK instead of dev client

```bash
adb install -r path/to/app.apk
cd sada-mobile && npm run test:e2e
```

The binary must match package **`com.anonymous.sadamobile`**. For API URLs during tests, use a build whose **`EXPO_PUBLIC_*`** values point at your machine (emulator API: **`10.0.2.2:3001`**) or at a reachable server.

### Troubleshooting (E2E)

| Symptom | What to do |
|--------|------------|
| **No emulator/device** | Start an AVD (**Emulator Setup**) or connect USB debugging; `adb devices` must show `device`. |
| **App not installed** | `npx expo run:android` or `adb install <apk>`. |
| **`maestro` not found** | Install Maestro; add `~/.maestro/bin` to `PATH`. |
| **`adb` not found** | Install Platform-Tools; add `~/Library/Android/sdk/platform-tools` to `PATH`. |
| **Multiple devices** | `export ANDROID_SERIAL=<serial>` from `adb devices`. |
| **Preflight OK but assertions fail** (`"SADA صدى"`, `"Sign in with Apple (Dev)"`, `"Live Rooms"` not visible) | Ensure backend is on **3001**, `.env` uses **10.0.2.2**, and the dev client has reloaded after config changes; then reload app and check **`adb logcat`** (filter `ReactNativeJS`). |

Flows live in `.maestro/` (`login`, `create_room`, `profile`, `navigation`, `notifications`).

## Project Links

- **EAS Dashboard:** https://expo.dev/accounts/mustafin_expo/projects/sada-mobile
- **Expo Account:** mustafin_expo
- **API Endpoint:** https://sada.mustafin.dev/api
- **Socket Endpoint:** https://sada.mustafin.dev