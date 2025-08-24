# Android App Signing Setup

## Keystore Information

- **Keystore File**: `android/app/betame-release-key-new.jks`
- **Key Alias**: `betame-key`
- **Validity**: 10,000 days (until January 9, 2053)
- **Key Algorithm**: RSA 2048-bit
- **Certificate**: Self-signed

## Certificate Information

- **Certificate File**: `betame-release-certificate.pem`
- **Certificate Type**: RFC format (PEM)
- **Serial Number**: 3570729066290610217
- **Issuer**: CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, ST=Selangor, C=MY
- **Subject**: CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, ST=Selangor, C=MY
- **Valid From**: August 24, 2025
- **Valid Until**: January 9, 2053

## Certificate Details

- **Owner**: CN=BetaMe App, OU=Development, O=BetaMe, L=Kuala Lumpur, ST=Selangor, C=MY
- **SHA1 Fingerprint**: B1:C5:97:26:15:BF:6C:8F:63:6F:A0:6E:1F:99:60:65:A4:97:71:D5
- **SHA256 Fingerprint**: C2:2B:CD:99:54:C3:73:A9:60:5A:1D:2A:76:4E:6D:DA:3A:F8:CA:FA:4B:24:28:C4:25:B1:49:10:F7:DD:8F:C1

## Setup Instructions

### 1. Configure keystore.properties

Edit the `keystore.properties` file in the project root and replace the placeholder values:

```properties
storePassword=your_actual_keystore_password
keyPassword=your_actual_key_password
keyAlias=betame-key
storeFile=android/app/betame-release-key-new.jks
```

### 2. Security Best Practices

- **Never commit** `keystore.properties` to version control (already added to .gitignore)
- **Store passwords securely** - consider using a password manager
- **Backup the keystore file** in a secure location
- **Use different passwords** for keystore and key if possible

### 3. Building Signed Release

To build a signed release AAB:

```bash
cd android
./gradlew bundleRelease
```

The build will automatically use the production signing configuration if `keystore.properties` exists.

### 4. Google Play Console

When uploading to Google Play Console:

1. **For Play App Signing**: Upload the `betame-release-certificate.pem` file
2. **For Manual Signing**: Use the **SHA1 fingerprint** for verification
3. The keystore meets Google Play's validity requirement (valid until 2033+)
4. Consider using **Play App Signing** for additional security

#### Play App Signing Setup

If you choose to use Play App Signing (recommended):

1. Go to Google Play Console → Setup → App Signing
2. Upload the `betame-release-certificate.pem` file
3. Google will manage your app signing key securely
4. You'll receive an upload key for future app updates

## Troubleshooting

### If keystore.properties is missing:
- The build will fall back to debug signing
- Check that the file exists and has correct permissions

### If passwords are incorrect:
- Verify the passwords in keystore.properties match the keystore
- You can verify the keystore with: `keytool -list -v -keystore android/app/betame-release-key-new.jks`

### For team development:
- Share the keystore file securely with team members
- Each developer should have their own `keystore.properties` with the correct passwords
- Consider using environment variables for CI/CD pipelines

## Important Notes

- **Keep the keystore secure** - losing it means you cannot update your app
- **The keystore is valid until 2053** - meets Google Play's 2033+ requirement
- **This setup follows Android Developer best practices** for secure app signing
- **Certificate file ready** - `betame-release-certificate.pem` is ready for Google Play Console upload
- **Play App Signing recommended** - Google manages your app signing key securely
