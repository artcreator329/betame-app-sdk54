# Automatic Version Management System

This guide explains how the automatic version management system works in the BetaMe app, ensuring that version numbers are automatically updated with each build.

## Overview

The version management system automatically:
- Updates app version numbers (semantic versioning)
- Increments iOS build numbers
- Increments Android version codes
- Displays current version in the app settings
- Integrates with build processes

## Components

### 1. Version Utilities (`utils/version-utils.ts`)
- `getAppVersionInfo()` - Gets comprehensive version information
- `getDisplayVersion()` - Returns formatted version for UI display
- `getFullVersion()` - Returns version with build number
- `isDevelopmentBuild()` - Checks if running in development mode

### 2. Version Display Component (`components/VersionDisplay.tsx`)
- Reusable component for showing version information
- Supports development badges and build numbers
- Long press for debug information in development

### 3. Version Update Script (`scripts/update-version.js`)
- Automatically increments version numbers
- Supports semantic versioning (major, minor, patch)
- Platform-specific build number increments

### 4. Build Integration
- Pre-build hooks automatically update versions
- EAS Build integration
- Local build script integration

## Usage

### Manual Version Updates

```bash
# Increment patch version and both build numbers
npm run version:patch

# Increment minor version and both build numbers  
npm run version:minor

# Increment major version and both build numbers
npm run version:major

# Only increment build numbers (no version change)
npm run version:build

# Platform-specific build number increments
node scripts/update-version.js ios
node scripts/update-version.js android
node scripts/update-version.js both
```

### Automatic Updates During Builds

#### Android Builds
```bash
npm run build:android
```
This automatically:
1. Increments Android version code
2. Runs the build process

#### iOS Builds (EAS)
```bash
npm run build:ios
# or
eas build --platform ios
```
This automatically:
1. Increments iOS build number via pre-build hook
2. Runs the EAS build

### Version Display in App

The version is automatically displayed in:
- Settings page (`app/settings.tsx`)
- Admin settings (`app/admin/settings.tsx`)
- Login page (`app/auth/login.tsx`)
- Reset password page (`app/auth/reset-password.tsx`)

```tsx
import { VersionDisplay } from '@/components/VersionDisplay';

<VersionDisplay 
  showBuildNumber={true}
  showDevelopmentBadge={true}
/>
```

## Configuration Files

### app.json
Contains the main version configuration:
```json
{
  "expo": {
    "version": "1.0.1",
    "ios": {
      "buildNumber": "12"
    },
    "android": {
      "versionCode": 18
    }
  }
}
```

### package.json
Contains the npm package version (kept in sync):
```json
{
  "version": "1.0.1"
}
```

### eas.json
Contains pre-build hooks for automatic version updates:
```json
{
  "build": {
    "production": {
      "prebuildCommand": "node scripts/pre-build-hook.js"
    }
  }
}
```

## Version Numbering Strategy

### App Version (Semantic Versioning)
- **Major** (1.0.0 → 2.0.0): Breaking changes, major new features
- **Minor** (1.0.0 → 1.1.0): New features, backwards compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes, small improvements

### Build Numbers
- **iOS Build Number**: Increments with each iOS build (string)
- **Android Version Code**: Increments with each Android build (integer)

## Development vs Production

### Development Builds
- Show "(Dev)" badge in version display
- Include debug information
- Long press version for debug details

### Production Builds
- Clean version display
- No debug information
- Optimized for app store submission

## Troubleshooting

### Version Not Updating
1. Check if `utils/version-utils.ts` is properly imported
2. Verify `app.json` has correct version numbers
3. Ensure build scripts are running pre-build hooks

### Build Number Issues
1. Verify `expo-application` is installed
2. Check platform-specific configuration in `app.json`
3. Ensure native builds have access to version information

### EAS Build Integration
1. Verify `prebuildCommand` is set in `eas.json`
2. Check build logs for pre-build hook execution
3. Ensure scripts have proper permissions

## Best Practices

1. **Always use scripts** for version updates to maintain consistency
2. **Test version display** after updates in both development and production
3. **Commit version changes** before building for release
4. **Use semantic versioning** appropriately for user-facing changes
5. **Monitor build numbers** to ensure they increment correctly

## Integration with CI/CD

For automated builds, you can integrate version management:

```bash
# In your CI/CD pipeline
npm run version:patch  # or appropriate version bump
git add app.json package.json
git commit -m "chore: bump version to $(node -p "require('./package.json').version")"
git push
eas build --platform all
```

## Future Enhancements

- Automatic changelog generation
- Version-based feature flags
- App store metadata updates
- Release notes automation
- Version rollback capabilities