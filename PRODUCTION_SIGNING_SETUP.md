# Production Signing Setup Guide

## Issue
Your Android App Bundle is currently signed with the debug keystore, but Google Play Console expects it to be signed with your production keystore.

**Expected SHA1**: `2D:CB:7C:4C:AC:BA:B4:F2:E3:9B:47:D0:F0:6B:AA:EF:AE:EC:53:09`
**Current SHA1**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

## Solution

### Option 1: If you have the production keystore file

1. **Place your production keystore file** in the `android/app/` directory
   - Common formats: `.jks`, `.keystore`, `.p12`

2. **Update the gradle.properties file** with your keystore details:
   ```properties
   # Production signing configuration
   MYAPP_UPLOAD_STORE_FILE=your-production-keystore.jks
   MYAPP_UPLOAD_KEY_ALIAS=your-key-alias
   MYAPP_UPLOAD_STORE_PASSWORD=your-store-password
   MYAPP_UPLOAD_KEY_PASSWORD=your-key-password
   ```

3. **Rebuild the AAB**:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

### Option 2: If you need to create a new production keystore

1. **Generate a new keystore**:
   ```bash
   keytool -genkey -v -keystore android/app/betame-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias betame-key-alias
   ```

2. **Update gradle.properties**:
   ```properties
   # Production signing configuration
   MYAPP_UPLOAD_STORE_FILE=betame-release-key.jks
   MYAPP_UPLOAD_KEY_ALIAS=betame-key-alias
   MYAPP_UPLOAD_STORE_PASSWORD=your-chosen-password
   MYAPP_UPLOAD_KEY_PASSWORD=your-chosen-password
   ```

3. **Get the SHA1 fingerprint**:
   ```bash
   keytool -list -v -keystore android/app/betame-release-key.jks -alias betame-key-alias
   ```

4. **Update Google Play Console** with the new SHA1 fingerprint

5. **Rebuild the AAB**:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

### Option 3: If you need to find your existing production keystore

1. **Check common locations**:
   - Your development machine
   - Team shared storage
   - Previous build configurations
   - CI/CD systems

2. **Check the SHA1 fingerprint** of any keystore files you find:
   ```bash
   keytool -list -v -keystore path/to/keystore.jks -alias your-alias
   ```

3. **Look for the fingerprint**: `2D:CB:7C:4C:AC:BA:B4:F2:E3:9B:47:D0:F0:6B:AA:EF:AE:EC:53:09`

## Security Notes

⚠️ **Important**: 
- Keep your production keystore file secure
- Don't commit it to version control
- Store passwords securely
- Consider using environment variables for sensitive data

## Verification

After setting up production signing, verify the SHA1 fingerprint:

```bash
# Check the AAB signature
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
```

## Current Configuration

The build.gradle file has been updated to support both debug and production signing:

- **Debug builds**: Use debug keystore
- **Release builds**: Use production keystore if configured, otherwise fall back to debug

## Next Steps

1. **Configure your production keystore** using one of the options above
2. **Rebuild the AAB** with production signing
3. **Upload to Google Play Console**
4. **Verify the SHA1 fingerprint matches** what Google Play Console expects
