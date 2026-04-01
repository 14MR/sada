#!/usr/bin/env bash
# Preflight checks before running Maestro Android E2E tests.
# Fails fast with actionable errors when Maestro, adb, device, or app is missing.

set -euo pipefail

APP_ID="com.anonymous.sadamobile"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

die() {
  echo -e "${RED}maestro-preflight:${NC} $*" >&2
  exit 1
}

info() {
  echo -e "${GREEN}maestro-preflight:${NC} $*"
}

warn() {
  echo -e "${YELLOW}maestro-preflight:${NC} $*" >&2
}

ensure_maestro() {
  if ! command -v maestro &>/dev/null; then
    die "Maestro CLI not found on PATH.

Install: curl -Ls \"https://get.maestro.mobile.dev\" | bash
Then add to PATH: export PATH=\"\$PATH:\$HOME/.maestro/bin\""
  fi
  info "Maestro found: $(command -v maestro)"
}

ensure_adb() {
  local sdk_ptools="${HOME}/Library/Android/sdk/platform-tools"
  if ! command -v adb &>/dev/null; then
    if [[ -x "${sdk_ptools}/adb" ]]; then
      export PATH="${PATH}:${sdk_ptools}"
      info "Using adb from ${sdk_ptools} (add to PATH for permanent fix)"
    fi
  fi
  if ! command -v adb &>/dev/null; then
    die "adb not found on PATH.

Install Android SDK Platform-Tools, then:
  export PATH=\"\$PATH:\$HOME/Library/Android/sdk/platform-tools\""
  fi
  info "adb found: $(command -v adb)"
}

first_ready_device_serial() {
  # Lines like: emulator-5554	device
  # Skip header, only state == "device"
  adb devices 2>/dev/null | awk 'NR > 1 && $2 == "device" { print $1; exit }'
}

list_non_ready() {
  adb devices 2>/dev/null | awk 'NR > 1 && NF >= 2 && $2 != "device" { print $1 " (" $2 ")" }'
}

ensure_device_and_app() {
  local serial=""
  if [[ -n "${ANDROID_SERIAL:-}" ]]; then
    serial="${ANDROID_SERIAL}"
    local state
    state="$(adb devices | awk -v s="$serial" '$1 == s { print $2 }')"
    if [[ "$state" != "device" ]]; then
      die "ANDROID_SERIAL=$serial is not ready (state: ${state:-missing}).

Fix: start an emulator or connect USB debugging, then run: adb devices"
    fi
  else
    serial="$(first_ready_device_serial)"
    if [[ -z "$serial" ]]; then
      local extra
      extra="$(list_non_ready)"
      if [[ -n "$extra" ]]; then
        warn "No device in 'device' state. Other entries:\n$extra"
      fi
      die "No Android emulator or device connected (adb devices is empty or none ready).

1) Start an emulator, e.g.:
   ~/Library/Android/sdk/emulator/emulator -avd <Your_AVD> &
2) Or connect a device with USB debugging.
3) Verify: adb devices
4) Install the app: npx expo run:android (or adb install <apk>)"
    fi
  fi

  info "Using device: $serial"

  if ! adb -s "$serial" shell pm list packages "$APP_ID" 2>/dev/null | grep -q "^package:${APP_ID}$"; then
    die "App ${APP_ID} is not installed on $serial.

Install and launch once, then re-run E2E:
  cd sada-mobile && npx expo run:android
Or: adb -s $serial install path/to/app.apk"
  fi

  info "App package ${APP_ID} is installed."
}

ensure_metro_dev_server() {
  if [[ "${SKIP_METRO_CHECK:-0}" == "1" ]]; then
    warn "Skipping Metro dev server check (SKIP_METRO_CHECK=1)."
    return 0
  fi

  local status=""
  status="$(curl -fsS --max-time 2 http://127.0.0.1:8081/status 2>/dev/null || true)"
  if [[ "$status" != *"packager-status:running"* ]]; then
    die "Metro is not reachable on http://127.0.0.1:8081.

Dev-client based Maestro flows require Metro to load JS bundles.

Start Metro in sada-mobile:
  npx expo start --dev-client

Then re-run:
  npm run test:e2e:login

If you are testing a standalone APK (not dev client), rerun with:
  SKIP_METRO_CHECK=1 npm run test:e2e:login"
  fi

  info "Metro dev server is running on 127.0.0.1:8081."
}

main() {
  info "Running Maestro Android preflight..."
  ensure_maestro
  ensure_adb
  ensure_device_and_app
  ensure_metro_dev_server
  info "Preflight OK — starting Maestro."
}

main "$@"
