---
description: Steps to build and push the SADA mobile app to Apple TestFlight using EAS
---

# Deploying to TestFlight

To push the `sada-mobile` app to TestFlight, we use **EAS (Expo Application Services)**.

### Prerequisites
1.  **Apple Developer Program**: You must have a paid Apple Developer account ($99/year).
2.  **Expo Account**: You need an account at [expo.dev](https://expo.dev).
3.  **EAS CLI**: Installed globally.

### 1. Install EAS CLI
Run this in your terminal:
```bash
npm install -g eas-cli
```

### 2. Login & Configure
Run these commands inside the `sada-mobile` directory:
```bash
# Login to your Expo account
eas login

# Initialize EAS configuration
eas build:configure
```
*Note: Choose 'yes' when asked to configure iOS.*

### 3. Create a Production Build
This will bundle your app and send it to Expo's build servers.
```bash
eas build --platform ios --profile production
```
*Note: You will be prompted to login to your Apple ID to generate certificates and provisioning profiles. Expo handles this securely.*

### 4. Submit to TestFlight
Once the build is finished, you can upload it:
```bash
eas submit --platform ios --latest
```

### Alternative: Build & Auto-Submit
You can combine the steps to automatically upload to TestFlight once the build is successful:
```bash
eas build --platform ios --profile production --auto-submit
```

### Internal Testing Note
Once uploaded, go to [App Store Connect](https://appstoreconnect.apple.com), select your app, and go to the **TestFlight** tab to invite internal or external testers.
