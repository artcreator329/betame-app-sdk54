# Android AAB Build Documentation

## Overview
This document provides a comprehensive guide for building Android App Bundle (AAB) files for the BetaMe app using local Gradle builds with production signing.

## Prerequisites

### Required Tools
- Android SDK (API Level 35)
- Java Development Kit (JDK)
- Gradle 8.13
- Production Keystore file

### Environment Setup
- **Android SDK Location**: `/Users/christopher/Library/Android/sdk`
- **Build Tools Version**: 35.0.0
- **Target SDK**: 35
- **Min SDK**: 24

## Keystore Configuration

### Keystore Details
- **Location**: `/Users/christopher/Main/Project/BETAME/cert/betame-release-key-new.jks`
- **Key Alias**: `betame-key`
- **Password**: `Betame##888`
- **Certificate**: CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, ST=Selangor, C=MY
- **Algorithm**: SHA256withRSA, 2048-bit key
- **Valid Until**: January 9, 2053

### Keystore Properties File
Create `keystore.properties` in the project root:

```properties
storePassword=Betame##888
keyPassword=Betame##888
keyAlias=betame-key
storeFile=/Users/christopher/Main/Project/BETAME/cert/betame-release-key-new.jks
```

## Build Configuration

### Version Management
The app version is managed in two files that must be kept in sync:

#### 1. `android/app/build.gradle`
```gradle
defaultConfig {
    applicationId 'com.betame.app'
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 15
    versionName "1.0.1"
}
```

#### 2. `app.json`
```json
{
  "expo": {
    "android": {
      "package": "com.betame.app",
      "versionCode": 15
    },
    "version": "1.0.1"
  }
}
```

### Signing Configuration
The signing configuration in `android/app/build.gradle`:

```gradle
// Load keystore properties
def keystorePropertiesFile = rootProject.file("../keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

## Build Process

### Step 1: Navigate to Android Directory
```bash
cd /Users/christopher/Main/Project/betame-app/android
```

### Step 2: Clean Previous Builds
```bash
./gradlew clean
```

### Step 3: Verify Signing Configuration
```bash
./gradlew app:signingReport
```

Expected output for release variant:
```
Variant: release
Config: release
Store: /Users/christopher/Main/Project/BETAME/cert/betame-release-key-new.jks
Alias: betame-key
MD5: [hash]
SHA1: [hash]
SHA-256: [hash]
Valid until: Sunday, January 9, 2053
```

### Step 4: Build AAB
```bash
./gradlew bundleRelease
```

### Step 5: Verify Build Output
```bash
ls -lh app/build/outputs/bundle/release/app-release.aab
```

Expected output:
```
-rw-r--r--@ 1 christopher staff 111M Sep 8 15:42 app-release.aab
```

### Step 6: Verify AAB Signing
```bash
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab | grep -A 5 ">>> Signer" | head -10
```

Expected output:
```
>>> Signer
X.509, CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, ST=Selangor, C=MY
Signature algorithm: SHA256withRSA, 2048-bit key
[certificate is valid from 8/24/25, 8:43 PM to 1/9/53, 8:43 PM]
```

## Version Code Management

### Google Play Console Requirements
- Version codes must be **monotonically increasing**
- Each new release must have a higher version code than the previous one
- Version codes cannot be reused

### Current Version History
- **Version Code 14** (1.0.0) - Currently active in production
- **Version Code 15** (1.0.1) - Latest build (ready for upload)

### Best Practices
1. **Always increment version code** for new releases
2. **Keep version codes in sync** between `build.gradle` and `app.json`
3. **Use semantic versioning** for version names (e.g., 1.0.1, 1.0.2)
4. **Document version changes** in release notes

## Troubleshooting

### Common Issues

#### 1. "You can't rollout this release because it doesn't allow any existing users to upgrade"
**Cause**: Version code is not higher than the current active version
**Solution**: Increment version code to be higher than the current active version

#### 2. "Version code X has already been used"
**Cause**: Attempting to reuse a version code
**Solution**: Use a higher version code that hasn't been used before

#### 3. Signing Configuration Issues
**Cause**: Keystore properties not loaded correctly
**Solution**: 
- Verify `keystore.properties` file exists and has correct path
- Check that `build.gradle` references the correct keystore properties file path
- Ensure keystore file exists at the specified location

#### 4. Build Failures
**Common causes**:
- Missing dependencies
- Incorrect SDK versions
- Gradle cache issues

**Solutions**:
```bash
# Clean and rebuild
./gradlew clean
./gradlew bundleRelease

# Clear Gradle cache if needed
./gradlew clean --refresh-dependencies
```

## Build Output

### AAB File Location
```
/Users/christopher/Main/Project/betame-app/android/app/build/outputs/bundle/release/app-release.aab
```

### File Properties
- **Size**: ~111MB
- **Format**: Android App Bundle (.aab)
- **Signing**: Production keystore
- **Target**: Google Play Store

## Upload to Google Play Console

### Steps
1. **Navigate** to Google Play Console
2. **Select** your app
3. **Go to** Production track
4. **Create new release** or edit existing release
5. **Upload** the AAB file
6. **Set release notes**
7. **Review and rollout**

### Release Checklist
- [ ] Version code is higher than current active version
- [ ] Version name follows semantic versioning
- [ ] AAB file is properly signed
- [ ] Release notes are prepared
- [ ] Testing has been completed

## Security Considerations

### Keystore Security
- **Never commit** keystore files to version control
- **Backup keystore** securely (lose it = cannot update app)
- **Use strong passwords** for keystore and key
- **Store keystore** in secure location

### Build Security
- **Use production keystore** only for release builds
- **Verify signing** before uploading
- **Test on real devices** before release

## Maintenance

### Regular Tasks
1. **Update version codes** for new releases
2. **Keep SDK versions** up to date
3. **Monitor build warnings** and deprecations
4. **Backup keystore** regularly
5. **Document version changes**

### Version Code Tracking
Keep a record of used version codes:
- Version Code 1: Initial release
- Version Code 2: Bug fixes
- Version Code 5: Feature updates
- Version Code 6: Performance improvements
- Version Code 14: Major update (1.0.0)
- Version Code 15: Current build (1.0.1)

## Support

### Build Issues
If you encounter build issues:
1. Check this documentation first
2. Verify all prerequisites are met
3. Check keystore configuration
4. Review version code management
5. Contact development team if issues persist

### Google Play Console Issues
For Google Play Console specific issues:
1. Check Google Play Console documentation
2. Verify version code requirements
3. Check app bundle compatibility
4. Review release requirements

---

**Last Updated**: September 8, 2024
**Document Version**: 1.0
**Build Version**: 1.0.1 (Version Code 15)
