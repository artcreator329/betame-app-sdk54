# App Icon Cache Clearing Guide

## Overview
When you update your app icon (`assets/images/icon.png`), various caches need to be cleared to ensure the new icon appears correctly across all platforms and environments.

## Quick Start

### Option 1: Quick Icon Cache Clear (Recommended)
```bash
npm run clear-icon-cache
# or
yarn clear-icon-cache
# or
node scripts/clear-icon-cache.js
```

### Option 2: Full Cache Clean
```bash
npm run clean-cache
# or
yarn clean-cache
# or
node scripts/clean-cache-and-update-icon.js
```

### Option 3: Clean and Start Development
```bash
npm run dev-clean
# or
yarn dev-clean
```

## Manual Steps (If Scripts Don't Work)

### 1. Clear Development Caches
```bash
# Clear Expo cache
expo start --clear

# Clear Metro cache
npx react-native start --reset-cache

# Clear npm/yarn cache
npm cache clean --force
yarn cache clean
```

### 2. Clean Build Directories
```bash
# Remove build folders
rm -rf ios/build
rm -rf android/build
rm -rf android/app/build
rm -rf node_modules
```

### 3. Platform-Specific Clearing

#### iOS (macOS only)
```bash
# Clear Xcode DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Reset iOS Simulator
xcrun simctl erase all

# Clear iOS build cache
rm -rf ios/build
```

#### Android
```bash
# Clear Android build cache
rm -rf android/build
rm -rf android/app/build

# Clear Gradle cache
rm -rf ~/.gradle/caches
```

### 4. Regenerate Native Code
```bash
# Clean prebuild
expo prebuild --clean

# Reinstall dependencies
npm install
# or
yarn install
```

## Critical Steps for Icon Update

### 🚨 Most Important: Delete and Reinstall App
1. **Completely delete** the app from your device/simulator
2. **Don't just close it** - actually uninstall/delete it
3. **Reinstall** the app fresh

This is crucial because:
- iOS caches app icons very aggressively
- Android may cache icons in app data
- Only a fresh install guarantees the new icon appears

### Development Environment
```bash
# Start with clean cache
expo start --clear

# Or for React Native CLI
npx react-native start --reset-cache
```

### Production Builds
```bash
# EAS Build with cache clearing
eas build --platform all --clear-cache

# Or specific platform
eas build --platform ios --clear-cache
eas build --platform android --clear-cache
```

## Troubleshooting

### Icon Still Not Updating?

1. **Verify Icon File**
   - Check `assets/images/icon.png` exists
   - Verify file size and modification date
   - Ensure proper PNG format

2. **Check App Configuration**
   - Verify `app.json` points to correct icon path
   - Ensure icon meets platform requirements (1024x1024 recommended)

3. **Platform-Specific Issues**

   **iOS:**
   - Delete app from simulator completely
   - Reset simulator: Device → Erase All Content and Settings
   - Clear Xcode DerivedData
   - Rebuild with `expo run:ios`

   **Android:**
   - Clear app data: Settings → Apps → Your App → Storage → Clear Data
   - Or uninstall and reinstall
   - Clear Android Studio cache if using Android Studio

4. **Development Server Issues**
   - Kill all Metro/Expo processes
   - Clear all caches with full clean script
   - Restart development server with `--clear` flag

### Common Cache Locations

#### macOS/Linux
- Expo: `~/.expo/`
- Metro: `/tmp/metro-*`
- React Native: `/tmp/react-native-*`
- Xcode: `~/Library/Developer/Xcode/DerivedData/`
- Gradle: `~/.gradle/caches/`

#### Windows
- Expo: `%USERPROFILE%\.expo\`
- Metro: `%TEMP%\metro-*`
- React Native: `%TEMP%\react-native-*`
- Gradle: `%USERPROFILE%\.gradle\caches\`

## Icon Requirements

### General Requirements
- **Format**: PNG
- **Size**: 1024x1024 pixels (recommended)
- **Background**: Should not be transparent for app icons
- **Quality**: High resolution, clear, and recognizable at small sizes

### Platform-Specific
- **iOS**: 1024x1024 PNG, no transparency
- **Android**: 1024x1024 PNG, can have transparency
- **Web**: Favicon should be 32x32 or 16x16

## Scripts Explanation

### `clear-icon-cache.js`
- Focuses specifically on icon-related caches
- Faster execution
- Includes platform-specific icon cache clearing
- Provides clear next steps

### `clean-cache-and-update-icon.js`
- Comprehensive cache cleaning
- Includes all development caches
- Reinstalls dependencies
- More thorough but takes longer

### Available npm/yarn Scripts
- `clear-icon-cache`: Quick icon cache clear
- `clean-cache`: Full cache clean
- `dev-clean`: Clear icon cache and start development server

## Best Practices

1. **Always test on physical devices** - Simulators may behave differently
2. **Clear caches before important demos** - Ensure latest icon is shown
3. **Use version control** - Keep track of icon changes
4. **Test on multiple platforms** - iOS and Android handle icons differently
5. **Document icon changes** - Note when and why icons were updated

## Automation

### Pre-commit Hook (Optional)
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/sh
# Check if icon was modified
if git diff --cached --name-only | grep -q "assets/images/icon.png"; then
    echo "Icon updated - remember to clear caches after commit!"
fi
```

### CI/CD Integration
```yaml
# Example GitHub Actions step
- name: Clear caches for icon update
  run: |
    if git diff --name-only HEAD~1 | grep -q "assets/images/icon.png"; then
      npm run clear-icon-cache
    fi
```

## Support

If you continue to have issues with icon caching:

1. Check the console output of the cache clearing scripts
2. Verify file permissions on icon files
3. Ensure your development environment has proper permissions
4. Try clearing caches manually using the commands above
5. As a last resort, create a new development build from scratch

Remember: **The most reliable way to see a new icon is to completely delete and reinstall the app.**