# BetaMe Android Keystore Documentation

## ⚠️ CRITICAL SECURITY INFORMATION

This document contains sensitive information about the Android app signing keystore. Keep this information secure and confidential.

---

## 📋 Keystore Summary

| Property | Value |
|----------|-------|
| **Keystore File** | `betame-release-key-new.jks` |
| **Location** | `/Users/christopher/Desktop/Project/betame-app/android/app/betame-release-key-new.jks` |
| **Key Alias** | `betame-key` |
| **Store Password** | `Betame##888` |
| **Key Password** | `Betame##888` |
| **Algorithm** | RSA 2048-bit |
| **Validity** | 10,000 days (until January 9, 2053) |
| **Certificate Type** | Self-signed |

---

## 🔐 Keystore Details

### File Information
- **Size**: 2,267 bytes
- **Created**: August 24, 2025 at 20:43
- **Format**: JKS (Java KeyStore)
- **Status**: ✅ Production Ready

### Certificate Information
- **Serial Number**: 318dc72ad16a0029
- **Issuer**: CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, ST=Selangor, C=MY
- **Subject**: CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, ST=Selangor, C=MY
- **Valid From**: August 24, 2025 at 20:43:41 MYT
- **Valid Until**: January 9, 2053 at 20:43:41 MYT

### Fingerprints
- **MD5**: `4D:EA:CF:B0:7B:38:6B:DB:EA:53:E3:BE:7E:ED:FF:4F`
- **SHA1**: `B1:C5:97:26:15:BF:6C:8F:63:6F:A0:6E:1F:99:60:65:A4:97:71:D5`
- **SHA256**: `C2:2B:CD:99:54:C3:73:A9:60:5A:1D:2A:76:4E:6D:DA:3A:F8:CA:FA:4B:24:28:C4:25:B1:49:10:F7:DD:8F:C1`

---

## 📁 File Locations

### Keystore Files
```
betame-app/
├── keystore.properties                           # Keystore configuration
├── betame-release-certificate.pem                # Google Play certificate
└── android/
    └── app/
        └── betame-release-key-new.jks            # Production keystore
```

### Configuration Files
- **keystore.properties** (Project Root):
  ```properties
  storePassword=Betame##888
  keyPassword=Betame##888
  keyAlias=betame-key
  storeFile=betame-release-key-new.jks
  ```

- **betame-release-certificate.pem** (Project Root):
  - Size: 1,307 bytes
  - Format: RFC format (PEM)
  - Purpose: Google Play Console upload

---

## 🛠️ Keystore Commands

### Generate Keystore
```bash
cd /Users/christopher/Desktop/Project/betame-app/android/app
keytool -genkey -v -keystore betame-release-key-new.jks -keyalg RSA -keysize 2048 -validity 10000 -alias betame-key -storetype JKS -dname "CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, S=Selangor, C=MY"
```

### Verify Keystore
```bash
keytool -list -v -keystore betame-release-key-new.jks -alias betame-key
```

### Export Certificate
```bash
keytool -export -rfc -keystore betame-release-key-new.jks -alias betame-key -file betame-release-certificate.pem
```

### Test Keystore Password
```bash
keytool -list -v -keystore betame-release-key-new.jks
# Enter password when prompted: Betame##888
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
cd /Users/christopher/Desktop/Project/betame-app/android
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
2. Upload `betame-release-certificate.pem`
3. Google manages the app signing key securely

### Manual Signing (Alternative)
- Use SHA1 fingerprint: `B1:C5:97:26:15:BF:6C:8F:63:6F:A0:6E:1F:99:60:65:A4:97:71:D5`
- Keep keystore file secure - losing it means you cannot update your app

### Upload Requirements
- **AAB File**: `app/build/outputs/bundle/release/app-release.aab`
- **Certificate**: `betame-release-certificate.pem`
- **Validity**: ✅ Valid until 2053 (meets Google Play requirements)

---

## 🔒 Security Best Practices

### Keystore Storage
- ✅ **Encrypted Backup**: Store keystore in encrypted backup
- ✅ **Multiple Locations**: Backup to multiple secure locations
- ✅ **Access Control**: Limit access to authorized personnel only
- ❌ **Never commit** keystore or keystore.properties to version control

### Password Management
- ✅ **Strong Password**: `Betame##888` (meets complexity requirements)
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
- **Keystore File**: `betame-release-key-new.jks`
- **Passwords**: `Betame##888`
- **Certificate**: `betame-release-certificate.pem`
- **Documentation**: This file

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
keytool -list -v -keystore android/app/betame-release-key-new.jks -alias betame-key

# Verify certificate
openssl x509 -in betame-release-certificate.pem -text -noout

# Check AAB signing
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab
```

### Expected Outputs
- **Keystore**: Should show BetaMe App certificate
- **Certificate**: Should show valid dates and fingerprints
- **AAB**: Should show "CN=BetaMe App" as signer

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
| Aug 24, 2025 | 1.0.0 (Code 4) | Initial Production Build | ✅ Created & Used |
| Aug 24, 2025 | - | Keystore Creation | ✅ Generated |
| Aug 24, 2025 | - | Certificate Export | ✅ Generated |

---

## ✅ Checklist

- [x] Keystore created with RSA 2048-bit
- [x] Validity set to 10,000 days (until 2053)
- [x] Certificate exported for Google Play Console
- [x] keystore.properties configured
- [x] Build.gradle updated with signing config
- [x] AAB built and verified with production signing
- [x] Documentation completed
- [x] Backups created
- [x] Team access configured

---

*This document should be updated whenever keystore information changes or new builds are created.*

**Last Updated**: August 24, 2025  
**Next Review**: January 2026
