# BetaMe Android Keystore Documentation

## ⚠️ CRITICAL SECURITY INFORMATION

This document contains sensitive information about the Android app signing keystore. Keep this information secure and confidential.

**IMPORTANT**: This documentation contains placeholder values. The actual keystore information is stored securely and should never be committed to version control.

---

## 📋 Keystore Summary

| Property | Value |
|----------|-------|
| **Keystore File** | `[KEYSTORE_FILENAME]` |
| **Location** | `[KEYSTORE_PATH]` |
| **Key Alias** | `[KEY_ALIAS]` |
| **Store Password** | `[STORE_PASSWORD]` |
| **Key Password** | `[KEY_PASSWORD]` |
| **Algorithm** | RSA 2048-bit |
| **Validity** | 10,000 days |
| **Certificate Type** | Self-signed |

---

## 🔐 Keystore Details

### File Information
- **Size**: [SIZE] bytes
- **Created**: [CREATION_DATE]
- **Format**: JKS (Java KeyStore)
- **Status**: ✅ Production Ready

### Certificate Information
- **Serial Number**: [SERIAL_NUMBER]
- **Issuer**: [ISSUER_DETAILS]
- **Subject**: [SUBJECT_DETAILS]
- **Valid From**: [VALID_FROM_DATE]
- **Valid Until**: [VALID_UNTIL_DATE]

### Fingerprints
- **MD5**: `[MD5_FINGERPRINT]`
- **SHA1**: `[SHA1_FINGERPRINT]`
- **SHA256**: `[SHA256_FINGERPRINT]`

---

## 📁 File Locations

### Keystore Files
```
betame-app/
├── keystore.properties                           # Keystore configuration (NOT in version control)
├── [CERTIFICATE_FILE]                            # Google Play certificate
└── android/
    └── app/
        └── [KEYSTORE_FILE]                       # Production keystore (NOT in version control)
```

### Configuration Files
- **keystore.properties** (Project Root - NOT in version control):
  ```properties
  storePassword=[STORE_PASSWORD]
  keyPassword=[KEY_PASSWORD]
  keyAlias=[KEY_ALIAS]
  storeFile=[KEYSTORE_FILE]
  ```

- **[CERTIFICATE_FILE]** (Project Root):
  - Size: [SIZE] bytes
  - Format: RFC format (PEM)
  - Purpose: Google Play Console upload

---

## 🛠️ Keystore Commands

### Generate Keystore
```bash
cd [PROJECT_PATH]/android/app
keytool -genkey -v -keystore [KEYSTORE_FILE] -keyalg RSA -keysize 2048 -validity 10000 -alias [KEY_ALIAS] -storetype JKS -dname "[DISTINGUISHED_NAME]"
```

### Verify Keystore
```bash
keytool -list -v -keystore [KEYSTORE_FILE] -alias [KEY_ALIAS]
```

### Export Certificate
```bash
keytool -export -rfc -keystore [KEYSTORE_FILE] -alias [KEY_ALIAS] -file [CERTIFICATE_FILE]
```

### Test Keystore Password
```bash
keytool -list -v -keystore [KEYSTORE_FILE]
# Enter password when prompted: [STORE_PASSWORD]
```

---

## 🔧 Build Configuration

### Gradle Configuration
The keystore is configured in `android/app/build.gradle`:

```gradle
// Load keystore properties for secure signing
def keystorePropertiesFile = rootProject.file("../keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
}
```

### Verify Signing Configuration
```bash
cd android
./gradlew app:signingReport
```

---

## 🚀 Build Process

### 1. Clean Build
```bash
cd [PROJECT_PATH]/android
./gradlew clean
```

### 2. Build Release AAB
```bash
./gradlew bundleRelease
```

### 3. Verify AAB Signing
```bash
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab | grep -A 5 ">>> Signer"
```

### 4. Check AAB File
```bash
ls -la app/build/outputs/bundle/release/
```

---

## 📱 Google Play Store

### Play App Signing (Recommended)
1. Go to Google Play Console → Setup → App Signing
2. Upload [CERTIFICATE_FILE]
3. Google manages the app signing key securely

### Manual Signing (Alternative)
- Use SHA1 fingerprint: `[SHA1_FINGERPRINT]`
- Keep keystore file secure - losing it means you cannot update your app

### Upload Requirements
- **AAB File**: `app/build/outputs/bundle/release/app-release.aab`
- **Certificate**: [CERTIFICATE_FILE]
- **Validity**: ✅ Valid until [VALID_UNTIL_DATE] (meets Google Play requirements)

---

## 🔒 Security Best Practices

### Keystore Storage
- ✅ **Encrypted Backup**: Store keystore in encrypted backup
- ✅ **Multiple Locations**: Backup to multiple secure locations
- ✅ **Access Control**: Limit access to authorized personnel only
- ❌ **Never commit** keystore or keystore.properties to version control

### Password Management
- ✅ **Strong Password**: [PASSWORD_COMPLEXITY_INFO]
- ✅ **Secure Storage**: Store in password manager
- ✅ **Documentation**: Record in secure location
- 🔄 **Periodic Rotation**: Consider rotating passwords annually

### Team Development
- ✅ **Shared Keystore**: Team uses same keystore for consistency
- ✅ **Individual Configs**: Each developer has own `keystore.properties`
- ✅ **CI/CD Ready**: Environment variables for automated builds

---

## 🚨 Critical Warnings

### ⚠️ LOST KEYSTORE = LOST APP UPDATES
If you lose the keystore file, you **cannot update your app** on Google Play Store. Users will need to uninstall and reinstall.

### ⚠️ BACKUP REQUIREMENTS
- **Keystore File**: [KEYSTORE_FILE]
- **Passwords**: [PASSWORD_INFO]
- **Certificate**: [CERTIFICATE_FILE]
- **Documentation**: This file (with actual values stored securely)

### ⚠️ SECURITY REQUIREMENTS
- Never share passwords in plain text
- Never commit sensitive files to version control
- Use secure channels for sharing keystore files
- Regularly verify keystore integrity

---

## 🔍 Verification Commands

### Verify Keystore Integrity
```bash
# Check keystore details
keytool -list -v -keystore [KEYSTORE_PATH] -alias [KEY_ALIAS]

# Verify certificate
openssl x509 -in [CERTIFICATE_FILE] -text -noout

# Check AAB signing
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab
```

### Expected Outputs
- **Keystore**: Should show [APP_NAME] certificate
- **Certificate**: Should show valid dates and fingerprints
- **AAB**: Should show "[APP_NAME]" as signer

---

## 📞 Emergency Contacts

### If Keystore is Lost
1. **Immediate Action**: Stop all app updates
2. **Assessment**: Determine if keystore can be recovered
3. **Backup Check**: Check all backup locations
4. **Team Notification**: Inform all team members
5. **Plan B**: Prepare for app re-release if necessary

### Recovery Process
1. Check encrypted backups
2. Check secure storage locations
3. Contact team members who might have copies
4. If unrecoverable, plan for app re-release with new keystore

---

## 📝 Version History

| Date | Version | Action | Keystore Status |
|------|---------|--------|-----------------|
| [DATE] | [VERSION] | Initial Production Build | ✅ Created & Used |
| [DATE] | - | Keystore Creation | ✅ Generated |
| [DATE] | - | Certificate Export | ✅ Generated |

---

## ✅ Checklist

- [x] Keystore created with RSA 2048-bit
- [x] Validity set to 10,000 days
- [x] Certificate exported for Google Play Console
- [x] keystore.properties configured
- [x] Build.gradle updated with signing config
- [x] AAB built and verified with production signing
- [x] Documentation completed
- [x] Backups created
- [x] Team access configured

---

## 🔐 Secure Storage

The actual keystore information is stored securely in:
- **Password Manager**: [PASSWORD_MANAGER_INFO]
- **Encrypted Backup**: [BACKUP_LOCATION]
- **Team Secure Channel**: [TEAM_CHANNEL_INFO]

**NEVER** store actual passwords, file paths, or sensitive data in this documentation file.

---

*This document should be updated whenever keystore information changes or new builds are created.*

**Last Updated**: [LAST_UPDATED_DATE]  
**Next Review**: [NEXT_REVIEW_DATE]
