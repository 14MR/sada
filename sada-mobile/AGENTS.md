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

## Project Links

- **EAS Dashboard:** https://expo.dev/accounts/mustafin_expo/projects/sada-mobile
- **Expo Account:** mustafin_expo
- **API Endpoint:** https://sada.mustafin.dev/api
- **Socket Endpoint:** https://sada.mustafin.dev