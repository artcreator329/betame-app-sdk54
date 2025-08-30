# iOS Build Process Documentation - BetaMe App

## Overview
This document outlines the complete iOS build process for the BetaMe app, including the transition from personal account to Betame Sdn Bhd organization account.

## Project Information
- **App Name**: BetaMe
- **Bundle Identifier**: `com.betame.app`
- **Organization**: Betame Sdn Bhd
- **Apple Team ID**: T72JDH8ZL6
- **Project ID**: 205a3431-8510-43a6-8801-b21297ac679e

## Build Configuration

### App Configuration (app.json)
```json
{
  "expo": {
    "name": "BetaMe",
    "slug": "betame",
    "version": "1.0.0",
    "owner": "betame-sdn-bhd",
    "ios": {
      "bundleIdentifier": "com.betame.app",
      "supportsTablet": true
    }
  }
}
```

### EAS Configuration (eas.json)
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium",
        "buildConfiguration": "Debug"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium",
        "buildConfiguration": "Release"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "buildConfiguration": "Release"
      }
    }
  }
}
```

## Build Process Steps

### Local Build Process (Version 1.0.0 Build 2)

#### 1. Update Build Numbers
- **app.json**: Added `"buildNumber": "2"` to iOS configuration
- **Info.plist**: Updated `CFBundleVersion` to `2`
- **project.pbxproj**: Updated `CURRENT_PROJECT_VERSION` to `2` in both Debug and Release configurations

#### 2. Update Encryption Compliance
- **Info.plist**: Added `ITSAppUsesNonExemptEncryption = false`
- **Bundle Identifier**: Fixed URL schemes to use `com.betame.app`

#### 3. Local Build Commands
```bash
# Clean project
xcodebuild clean -workspace BetaMe.xcworkspace -scheme BetaMe

# Archive for App Store
xcodebuild -workspace BetaMe.xcworkspace -scheme BetaMe -configuration Release -destination 'generic/platform=iOS' -archivePath ./build/BetaMe.xcarchive archive -allowProvisioningUpdates

# Export IPA
xcodebuild -exportArchive -archivePath ./build/BetaMe.xcarchive -exportPath ./build/ipa -exportOptionsPlist exportOptions.plist -allowProvisioningUpdates
```

#### 4. Export Configuration
- **exportOptions.plist**: Created with App Store Connect distribution settings
- **Team ID**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Method**: app-store-connect
- **Signing**: Automatic

### EAS Build Process Steps

### 1. Initial Setup Issues
**Problem**: Project was configured under personal account with wrong bundle identifier
- **Original Bundle ID**: `com.artcreator329.boltexponativewind`
- **Original Project**: `@artcreator329/bolt-expo-nativewind`
- **Original Owner**: `artcreator329`

### 2. Account Configuration
**Solution**: Updated to Betame Sdn Bhd organization
- **New Bundle ID**: `com.betame.app`
- **New Project**: `@betame-sdn-bhd/betame`
- **New Owner**: `betame-sdn-bhd`
- **Apple Team**: BETAME SDN. BHD. (T72JDH8ZL6)

### 3. iOS Project Updates
Updated `ios/BetaMe.xcodeproj/project.pbxproj`:
```diff
- PRODUCT_BUNDLE_IDENTIFIER = com.artcreator329.boltexponativewind;
+ PRODUCT_BUNDLE_IDENTIFIER = com.betame.app;

- DEVELOPMENT_TEAM = FK3KJ2BT3H;
+ DEVELOPMENT_TEAM = T72JDH8ZL6;
```

### 4. EAS Project Reinitialization
```bash
# Removed old project ID from app.json
# Updated owner to betame-sdn-bhd
# Updated slug to betame

eas init
# Created new project: @betame-sdn-bhd/betame
```

## Build Results

### Preview Build (Ad Hoc)
- **Build ID**: 8f24ba2d-8e3f-477e-be94-f53708a08f23
- **Status**: ✅ Completed
- **Distribution**: Internal (Ad Hoc)
- **Installation**: Available via QR code for registered devices

### Production Build (App Store) - EAS
- **Build ID**: 5cd8bc49-edae-4c7c-860f-c6e749df663e
- **Status**: ✅ Completed
- **Distribution**: Store
- **Artifact**: https://expo.dev/artifacts/eas/csYzYxQ3CGWDHiAkvgbmBy.ipa

### Local Production Build (App Store) - Version 1.0.0 (2)
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (69.3 MB)
- **Build Number**: 2
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile

### Local Production Build (App Store) - Version 1.0.0 (3)
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (69.6 MB)
- **Build Number**: 3
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile
- **Created**: August 24, 2025
- **Rebuilt**: August 24, 2025 (13:50)

### Local Production Build (App Store) - Version 1.0.0 (4)
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (69.6 MB)
- **Build Number**: 4
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile
- **Created**: August 24, 2025 (21:53)

### Local Production Build (App Store) - Version 1.0.0 (5)
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (70.4 MB)
- **Build Number**: 5
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile
- **Created**: August 25, 2025 (16:03)

### Local Production Build (App Store) - Version 1.0.0 (6)
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (70.4 MB)
- **Build Number**: 6
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile
- **Created**: August 26, 2025 (13:59)

### Local Production Build (App Store) - Version 1.0.0 (7)
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (70.4 MB)
- **Build Number**: 7
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile
- **Created**: August 26, 2025 (20:51)

### Local Production Build (App Store) - Version 1.0.0 (8)
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (70.4 MB)
- **Build Number**: 8
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile
- **Created**: August 27, 2025 (21:48)

### Local Production Build (App Store) - Version 1.0.0 (9)
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (70.4 MB)
- **Build Number**: 9
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile
- **Created**: August 28, 2025 (14:29)

### Local Production Build (App Store) - Version 1.0.0 (10)
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (70.6 MB)
- **Build Number**: 10
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile
- **Created**: August 28, 2025 (20:43)

### Local Production Build (App Store) - Version 1.0.0 (11)
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (70.6 MB)
- **Build Number**: 11
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile
- **Created**: August 29, 2025 (13:31)

### Local Production Build (App Store) - Version 1.0.0 (12)
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (70.6 MB)
- **Build Number**: 12
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile
- **Created**: August 29, 2025 (16:58)

### Local Production Build (App Store) - Version 1.0.0 (13)
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (70.7 MB)
- **Build Number**: 13
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile
- **Created**: August 29, 2025 (21:46)

### Local Production Build (App Store) - Version 1.0.0 (13) - Recreated
- **Build Method**: Local Xcode build (no EAS)
- **Status**: ✅ Completed
- **Distribution**: App Store Connect
- **Artifact**: `ios/build/ipa/BetaMe.ipa` (70.7 MB)
- **Build Number**: 13
- **Certificate**: Cloud Managed Apple Distribution
- **Team**: T72JDH8ZL6 (BETAME SDN. BHD.)
- **Provisioning Profile**: iOS Team Store Provisioning Profile
- **Created**: August 29, 2025 (22:40)

## Apple Developer Account Setup

### Credentials Created
1. **Distribution Certificate**
   - Serial Number: 20406EF8B7AE45E5BF14AB4091CB1F84
   - Expiration: Sun, 23 Aug 2026 16:24:25 GMT+0800
   - Team: T72JDH8ZL6 (BETAME SDN. BHD.)

2. **Provisioning Profile**
   - Developer Portal ID: B4S6LX7L5K
   - Status: active
   - Expiration: Sun, 23 Aug 2026 16:24:25 GMT+0800

3. **Push Notifications Key**
   - Created new Apple Push Notifications service key
   - Assigned to: betame: com.betame.app

### Device Registration
- **Device**: MacBook Pro
- **UDID**: 00008132-000C04402EF0801C
- **Class**: Mac
- **Status**: Registered for Ad Hoc distribution

## App Store Connect Submission

### Attempted Automatic Submission
```bash
eas submit --platform ios --latest
```

**Issues Encountered**:
1. **API Key Permission Error**: "Access forbidden - The API key in use does not allow this request"
2. **Manual Submission Required**: Due to API key limitations

### Manual Submission Process
1. **Download Build Artifact**: https://expo.dev/artifacts/eas/csYzYxQ3CGWDHiAkvgbmBy.ipa
2. **Use Transporter App**: Upload .ipa file manually
3. **App Store Connect Web**: Alternative web-based submission

## App Store Connect Configuration

### Required Information
- **Bundle ID**: `com.betame.app`
- **SKU**: `betame-app` (recommended)
- **App Name**: `BetaMe`
- **Version**: 1.0.0
- **Build Number**: 1

### Encryption Compliance
- **Encryption Type**: Standard algorithms (SHA-256) via `expo-crypto`
- **Export Compliance**: Exempt from export controls
- **Info.plist Setting**: `ITSAppUsesNonExemptEncryption = false`
- **CCATS Requirement**: **NOT REQUIRED** - app uses exempt encryption

### TestFlight Setup
- **Group Created**: Team (Expo)
- **TestFlight Access**: Enabled for alexanderhoe@hotmail.com
- **Status**: Ready for internal testing

## Key Learnings

### 1. Bundle Identifier Management
- Always update both `app.json` and native iOS project files
- Bundle identifier must match Apple Developer account team
- Cannot reuse bundle IDs from different teams

### 2. Account Switching
- EAS projects are tied to specific accounts
- Need to reinitialize project when switching organizations
- API keys are account-specific

### 3. Build Types
- **Preview**: Ad Hoc distribution for internal testing
- **Production**: App Store distribution for TestFlight/App Store

### 4. Push Notifications
- Push keys are team-specific
- Cannot use personal account keys for organization apps
- Must create new keys under organization account

## Next Steps

### Immediate Actions
1. **Complete App Store Connect Submission**
   - Use Transporter app or web interface
   - Upload local production build: `ios/build/ipa/BetaMe.ipa`
   - Configure app metadata

2. **TestFlight Distribution**
   - Add internal testers
   - Submit for beta review
   - Distribute to testers

3. **Local Build Ready for Submission**
   - **IPA Location**: `ios/build/ipa/BetaMe.ipa`
   - **Size**: 69.6 MB
   - **Version**: 1.0.0 (3)
   - **Ready for**: App Store Connect upload

### Future Improvements
1. **API Key Permissions**
   - Request proper App Store Connect API key permissions
   - Enable automated submissions

2. **Build Automation**
   - Set up automated builds for releases
   - Configure version management

3. **Push Notifications**
   - Complete push notification setup
   - Test notification delivery

## Troubleshooting

### Common Issues
1. **Bundle ID Mismatch**: Update both app.json and native project
2. **Team ID Issues**: Ensure development team matches organization
3. **API Key Permissions**: Manual submission required if permissions insufficient
4. **Push Key Conflicts**: Create new keys under correct team

### Commands Reference
```bash
# Check build status
eas build:list --limit 1

# View build details
eas build:view [BUILD_ID]

# Submit to App Store Connect
eas submit --platform ios --latest

# Project information
eas project:info

# Account information
eas whoami
```

## Build URLs
- **Project**: https://expo.dev/accounts/betame-sdn-bhd/projects/betame
- **Latest Build**: https://expo.dev/accounts/betame-sdn-bhd/projects/betame/builds/5cd8bc49-edae-4c7c-860f-c6e749df663e
- **Build Artifact**: https://expo.dev/artifacts/eas/csYzYxQ3CGWDHiAkvgbmBy.ipa

---
*Document created: August 23, 2025*
*Last updated: August 23, 2025*
