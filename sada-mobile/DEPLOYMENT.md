# SADA Mobile — Deployment Guide

## Prerequisites

### Accounts & Credentials Needed
- **Apple Developer Account** ($99/year) — [developer.apple.com](https://developer.apple.com)
- **EAS (Expo Application Services)** account — sign up via `eas login`
- **App Store Connect** access (linked to Apple Developer account)

### Credentials Checklist
| Credential | Where to Get | Used For |
|---|---|---|
| Apple ID (email) | Your Apple account | EAS submit, App Store Connect |
| Apple Team ID | [developer.apple.com](https://developer.apple.com/account) → Membership | Code signing |
| App Store Connect App ID | App Store Connect → My Apps | `eas submit` |
| Apple app-specific password | [appleid.apple.com](https://appleid.apple.com) → App-Specific Passwords | EAS submit |
| EAS token | `eas login` | CLI authentication |

---

## 1. EAS Setup (One-Time)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in to your Expo account
eas login

# Verify project is linked (projectId is in app.json)
eas whoami
```

## 2. Build Profiles

The project has three build profiles in `eas.json`:

| Profile | Purpose | Distribution |
|---|---|---|
| `development` | Dev client with debugging | Internal |
| `preview` | QA/beta testing | Internal |
| `production` | App Store / Play Store | Store |

### Build Commands

```bash
# Development build (for internal testing)
eas build --platform ios --profile development

# Preview build (for TestFlight internal testing)
eas build --platform ios --profile preview

# Production build (for App Store submission)
eas build --platform ios --profile production

# Android preview APK
eas build --platform android --profile preview
```

## 3. TestFlight Submission

### Step 1: Create App in App Store Connect
1. Go to [App Store Connect → My Apps](https://appstoreconnect.apple.com/apps)
2. Click **+** → **New App**
3. Fill in:
   - **Name**: SADA
   - **Primary Language**: English
   - **Bundle ID**: `com.sada.app`
   - **SKU**: `sada_app_001`
   - **Full Access**: Enabled

### Step 2: Configure App Store Connect
Before submitting, you need to fill in:
- **Privacy Policy URL** (required for App Review)
- **App Category**: Social Networking
- **Age Rating**: Complete the questionnaire
- **App Description** and keywords
- **Screenshots** for all required device sizes

### Step 3: Submit to TestFlight

```bash
# Build production version
eas build --platform ios --profile production

# Submit to TestFlight (after build completes)
eas submit --platform ios --profile production

# Or build and submit in one command
eas build --platform ios --profile production --auto-submit
```

### Step 4: TestFlight Internal Testing
1. In App Store Connect → your app → **TestFlight**
2. Add **Internal Testers** (up to 100, Apple Developer team members)
3. Once the build is processed, it becomes available to testers

### Step 5: External Testing (Optional)
1. Create an **External Testing Group**
2. Add testers by email (up to 10,000)
3. Beta App Review is required for external testing

## 4. App Review Requirements

Apple will review these items before approving:

### Required
- [x] **Bundle Identifier**: `com.sada.app`
- [x] **ITSAppUsesNonExemptEncryption**: `false` (declared)
- [ ] **Privacy Policy URL**: Must provide a live URL
- [ ] **App Review Information**: Contact info, demo account (if login required)
- [ ] **Screenshots**: Required for iPhone 6.9", iPhone 6.7", iPad 12.9"

### Important Notes
- The app uses **microphone access** (`NSMicrophoneUsageDescription` is configured)
- The app uses **Apple Sign-In** (`usesAppleSignIn: true`)
- The app uses **background audio/VOIP** (`UIBackgroundModes`)
- **Privacy Manifest** is included in app.json
- If using Apple Sign-In, you must also provide an equivalent Sign-In option (e.g., Sign in with Apple + email)

## 5. Credentials Management

EAS handles credentials automatically by default:

```bash
# Let EAS manage certificates/provisioning profiles
eas build --platform ios --profile production

# Or manage manually
eas credentials
```

For **automatic** credential management, EAS will:
- Generate a distribution certificate
- Create a provisioning profile
- Store credentials securely in Expo's servers

## 6. Version Management

- **Version** (`version` in app.json): Semantic version (e.g., `1.0.0`)
- **Build number** (`buildNumber` in app.json): Incremented per upload
- EAS `autoIncrement: true` in the production profile auto-increments the build number

To bump version for a new release:
```bash
# Update version manually in app.json
# "version": "1.0.0" → "1.1.0"

# Build number is auto-incremented by EAS
eas build --platform ios --profile production
```

## 7. Pre-Submission Checklist

Before submitting to App Store Review, these items **must** be resolved (they are currently stubs for development):

- [ ] **Replace mock Apple Sign-In** (`src/screens/LoginScreen.tsx`) with real `expo-apple-authentication` flow
- [ ] **Replace mock IAP receipt data** (`src/api/gems.ts`) with real StoreKit receipt validation
- [ ] **Add Privacy Policy page** — host a live URL and add it to App Store Connect
- [ ] **Add Terms of Service page** — required for apps with user accounts
- [ ] **Remove verbose console.log/error** statements that could leak sensitive info
- [ ] **Add a React error boundary** to prevent white-screen crashes

These do not block TestFlight internal testing — only the App Store review.

## 9. Troubleshooting

### Build Failures
- Check `eas build --platform ios --profile production --watch` for live logs
- Common issues: missing native dependencies, plugin misconfiguration

### App Review Rejection
- **Missing privacy policy**: Host one on your website and add the URL to App Store Connect
- **Missing Sign in with Apple**: Required if you offer any third-party social login
- **Crash on launch**: Test on a real device before submitting
- **Missing background mode justification**: Ensure audio/VOIP usage is clearly explained

### Useful Commands
```bash
# Check build status
eas build:list

# View build logs
eas build:view <BUILD_ID>

# Delete credentials and start fresh
eas credentials --platform ios
```
