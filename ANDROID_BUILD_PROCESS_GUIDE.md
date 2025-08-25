# Android Build Process Guide

## Overview
This guide documents the complete process for building Android AAB files for the BetaMe app, including keystore creation, configuration, and build steps.

## Table of Contents
1. [Keystore Creation](#keystore-creation)
2. [Keystore Configuration](#keystore-configuration)
3. [Build Configuration](#build-configuration)
4. [Build Process](#build-process)
5. [Troubleshooting](#troubleshooting)
6. [Google Play Store Preparation](#google-play-store-preparation)

---

## Keystore Creation

### Step 1: Generate New Keystore
```bash
cd /Users/christopher/Desktop/Project/betame-app/android/app
keytool -genkey -v -keystore betame-release-key-new.jks -keyalg RSA -keysize 2048 -validity 10000 -alias betame-key -storetype JKS -dname "CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, S=Selangor, C=MY"
```

**⚠️ CRITICAL**: When prompted for passwords, use: `Betame##888`

**Parameters Explained:**
- `-keystore betame-release-key-new.jks`: Output keystore filename
- `-keyalg RSA`: Use RSA algorithm
- `-keysize 2048`: 2048-bit key size (Google Play requirement)
- `-validity 10000`: Valid for 10,000 days (until 2053)
- `-alias betame-key`: Key alias name
- `-storetype JKS`: Java KeyStore format
- `-dname`: Certificate details (Common Name, Organization Unit, Organization, Location, State, Country)

### Step 2: Verify Keystore
```bash
keytool -list -v -keystore betame-release-key-new.jks -alias betame-key
```

**Expected Output:**
```
Alias name: betame-key
Creation date: Aug 24, 2025
Entry type: PrivateKeyEntry
Certificate chain length: 1
Certificate[1]:
Owner: CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, ST=Selangor, C=MY
Issuer: CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, ST=Selangor, C=MY
Serial number: 318dc72ad16a0029
Valid from: Sun Aug 24 20:43:41 MYT 2025 until: Thu Jan 09 20:43:41 MYT 2053
Certificate fingerprints:
         SHA1: B1:C5:97:26:15:BF:6C:8F:63:6F:A0:6E:1F:99:60:65:A4:97:71:D5
         SHA256: C2:2B:CD:99:54:C3:73:A9:60:5A:1D:2A:76:4E:6D:DA:3A:F8:CA:FA:4B:24:28:C4:25:B1:49:10:F7:DD:8F:C1
```

### Step 3: Generate Certificate for Google Play Console
```bash
keytool -export -rfc -keystore betame-release-key-new.jks -alias betame-key -file betame-release-certificate.pem
```

**Purpose:** Creates a `.pem` certificate file required for Google Play App Signing setup.

---

## Keystore Configuration

### Step 1: Create keystore.properties File
Create `keystore.properties` in the project root directory:

```properties
storePassword=Betame##888
keyPassword=Betame##888
keyAlias=betame-key
storeFile=betame-release-key-new.jks
```

**⚠️ CRITICAL**: These are the actual production passwords. Keep them secure!

**Security Notes:**
- This file contains sensitive information
- Added to `.gitignore` to prevent version control
- Store passwords securely

### Step 2: Update .gitignore
Add the following to `.gitignore`:
```gitignore
# Android signing
keystore.properties
```

### Step 3: Verify File Structure
```
betame-app/
├── keystore.properties                    # Keystore configuration
├── betame-release-certificate.pem         # Certificate for Google Play
└── android/
    └── app/
        └── betame-release-key-new.jks     # Keystore file
```

---

## Build Configuration

### Step 1: Update android/app/build.gradle

#### Add Keystore Properties Loading
```gradle
// Load keystore properties for secure signing
def keystorePropertiesFile = rootProject.file("../keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
    println "✅ Keystore properties loaded successfully"
    println "   Store file: ${keystoreProperties['storeFile']}"
    println "   Key alias: ${keystoreProperties['keyAlias']}"
} else {
    println "❌ Keystore properties file not found at: ${keystorePropertiesFile.absolutePath}"
}
```

#### Update Signing Configurations
```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        if (keystorePropertiesFile.exists()) {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        } else if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        } else {
            // Fall back to debug signing if no production keystore is configured
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
}
```

#### Update Build Types
```gradle
buildTypes {
    debug {
        signingConfig signingConfigs.debug
    }
    release {
        // Use production signing if keystore.properties exists, otherwise fall back to debug
        if (keystorePropertiesFile.exists()) {
            signingConfig signingConfigs.release
        } else if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
            signingConfig signingConfigs.release
        } else {
            signingConfig signingConfigs.debug
        }
        shrinkResources (findProperty('android.enableShrinkResourcesInReleaseBuilds')?.toBoolean() ?: false)
        minifyEnabled enableProguardInReleaseBuilds
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        crunchPngs (findProperty('android.enablePngCrunchInReleaseBuilds')?.toBoolean() ?: true)
    }
}
```

### Step 2: Verify Version Configuration
Ensure `android/app/build.gradle` has correct version:
```gradle
defaultConfig {
    applicationId "com.betame.app"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 4
    versionName "1.0.0"
}
```

---

## Build Process

### Step 1: Clean Previous Builds
```bash
cd /Users/christopher/Desktop/Project/betame-app/android
./gradlew clean
```

### Step 2: Verify Signing Configuration
```bash
./gradlew app:signingReport
```

**Expected Output for Release:**
```
Variant: release
Config: release
Store: /Users/christopher/Desktop/Project/betame-app/android/app/betame-release-key-new.jks
Alias: betame-key
MD5: 4D:EA:CF:B0:7B:38:6B:DB:EA:53:E3:BE:7E:ED:FF:4F
SHA1: B1:C5:97:26:15:BF:6C:8F:63:6F:A0:6E:1F:99:60:65:A4:97:71:D5
SHA-256: C2:2B:CD:99:54:C3:73:A9:60:5A:1D:2A:76:4E:6D:DA:3A:F8:CA:FA:4B:24:28:C4:25:B1:49:10:F7:DD:8F:C1
Valid until: Thursday, January 9, 2053
```

### Step 3: Build AAB
```bash
./gradlew bundleRelease
```

**Build Time:** Approximately 2-3 minutes for clean build

### Step 4: Verify AAB Signing
```bash
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab | grep -A 5 ">>> Signer" | head -10
```

**Expected Output:**
```
      >>> Signer
      X.509, CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, ST=Selangor, C=MY
      Signature algorithm: SHA256withRSA, 2048-bit key
      [certificate is valid from 8/24/25, 8:43 PM to 1/9/53, 8:43 PM]
```

### Step 5: Check AAB File
```bash
ls -la app/build/outputs/bundle/release/
```

**Expected Output:**
```
-rw-r--r--@ 1 christopher  staff  104655077 Aug 24 21:22 app-release.aab
```

---

## Troubleshooting

### Issue: Keystore Properties Not Found
**Error:** `❌ Keystore properties file not found`

**Solution:** Check file path in `build.gradle`:
```gradle
def keystorePropertiesFile = rootProject.file("../keystore.properties")
```

### Issue: Wrong Keystore Path
**Error:** `Error: Missing keystore`

**Solution:** Update `keystore.properties`:
```properties
storeFile=betame-release-key-new.jks  # Relative to android/app/
```

### Issue: Debug Certificate Still Used
**Problem:** AAB still shows Android Debug certificate

**Solution:** 
1. Clean build: `./gradlew clean`
2. Verify keystore.properties exists and is readable
3. Check signing report: `./gradlew app:signingReport`

### Issue: Build Fails with Keystore Error
**Error:** `Keystore was tampered with, or password was incorrect`

**Solution:**
1. Verify keystore password in `keystore.properties`
2. Test keystore manually:
   ```bash
   keytool -list -v -keystore betame-release-key-new.jks -alias betame-key
   ```

---

## Google Play Store Preparation

### Required Files
1. **AAB File**: `app/build/outputs/bundle/release/app-release.aab`
2. **Certificate**: `betame-release-certificate.pem`

### Play App Signing Setup
1. Go to Google Play Console → Setup → App Signing
2. Upload `betame-release-certificate.pem`
3. Google will manage your app signing key securely

### Manual Signing (Alternative)
If not using Play App Signing:
1. Use SHA1 fingerprint: `B1:C5:97:26:15:BF:6C:8F:63:6F:A0:6E:1F:99:60:65:A4:97:71:D5`
2. Keep keystore file secure - losing it means you cannot update your app

### Certificate Information
- **Serial Number**: 3570729066290610217
- **Issuer/Subject**: CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, ST=Selangor, C=MY
- **Valid From**: August 24, 2025
- **Valid Until**: January 9, 2053
- **Algorithm**: SHA256withRSA
- **Key Size**: 2048-bit

---

## Security Best Practices

### Keystore Storage
- Store keystore file securely (encrypted backup)
- Never commit keystore or keystore.properties to version control
- Use different keystores for different environments (dev, staging, production)

### Password Management
- Use strong passwords for keystore and key
- Store passwords securely (password manager)
- Rotate passwords periodically

### Backup Strategy
- Backup keystore file to multiple secure locations
- Document keystore details (alias, passwords, fingerprints)
- Test keystore restoration process

---

## Build Commands Summary

```bash
# Clean build
./gradlew clean

# Check signing configuration
./gradlew app:signingReport

# Build release AAB
./gradlew bundleRelease

# Verify AAB signing
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab

# Check AAB file
ls -la app/build/outputs/bundle/release/
```

---

## File Locations Summary

```
betame-app/
├── keystore.properties                           # Keystore configuration
├── betame-release-certificate.pem                # Google Play certificate
├── ANDROID_BUILD_PROCESS_GUIDE.md               # This guide
├── ANDROID_AAB_BUILD_SUMMARY.md                 # Build summary
└── android/
    └── app/
        ├── build.gradle                          # Build configuration
        ├── betame-release-key-new.jks            # Production keystore
        └── build/outputs/bundle/release/
            └── app-release.aab                   # Final AAB file
```

---

## Version History

- **Version 1.0.0 (Code 4)**: August 24, 2025
  - Initial production build with new keystore
  - Edge-to-edge display support
  - All app features included

---

*This guide should be updated whenever the build process changes or new keystores are created.*
