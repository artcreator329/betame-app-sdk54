#!/bin/bash

# Clean Cache and Update App Icon Script
# This script cleans all caches and ensures the new icon is properly used

echo "🧹 Starting comprehensive cache cleaning and icon update..."
echo "============================================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Clean Expo/React Native caches
echo "📱 Cleaning Expo and React Native caches..."

# Clear Expo cache
if command_exists expo; then
    echo "  - Clearing Expo cache..."
    expo r -c
    expo start --clear
else
    echo "  ⚠️  Expo CLI not found, skipping Expo cache clear"
fi

# Clear React Native cache
if command_exists npx; then
    echo "  - Clearing React Native cache..."
    npx react-native start --reset-cache
fi

# 2. Clean Metro bundler cache
echo "🚇 Cleaning Metro bundler cache..."
if command_exists npx; then
    npx react-native start --reset-cache
fi

# 3. Clean npm/yarn cache
echo "📦 Cleaning package manager cache..."
if command_exists npm; then
    echo "  - Clearing npm cache..."
    npm cache clean --force
fi

if command_exists yarn; then
    echo "  - Clearing yarn cache..."
    yarn cache clean
fi

# 4. Clean node_modules and reinstall
echo "🗂️  Cleaning node_modules..."
if [ -d "node_modules" ]; then
    echo "  - Removing node_modules directory..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    echo "  - Removing package-lock.json..."
    rm package-lock.json
fi

if [ -f "yarn.lock" ]; then
    echo "  - Keeping yarn.lock (recommended)"
fi

# 5. Clean iOS specific caches (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Cleaning iOS specific caches..."
    
    # Clean iOS build folder
    if [ -d "ios/build" ]; then
        echo "  - Removing iOS build folder..."
        rm -rf ios/build
    fi
    
    # Clean iOS DerivedData
    if [ -d "~/Library/Developer/Xcode/DerivedData" ]; then
        echo "  - Cleaning Xcode DerivedData..."
        rm -rf ~/Library/Developer/Xcode/DerivedData/*
    fi
    
    # Clean iOS Simulator cache
    if command_exists xcrun; then
        echo "  - Cleaning iOS Simulator cache..."
        xcrun simctl erase all
    fi
fi

# 6. Clean Android specific caches
echo "🤖 Cleaning Android specific caches..."

# Clean Android build folder
if [ -d "android/build" ]; then
    echo "  - Removing Android build folder..."
    rm -rf android/build
fi

if [ -d "android/app/build" ]; then
    echo "  - Removing Android app build folder..."
    rm -rf android/app/build
fi

# Clean Gradle cache
if [ -d "~/.gradle/caches" ]; then
    echo "  - Cleaning Gradle cache..."
    rm -rf ~/.gradle/caches
fi

# 7. Clean system caches
echo "🖥️  Cleaning system caches..."

# Clean temp directories
if [ -d "/tmp/react-native-*" ]; then
    echo "  - Cleaning React Native temp files..."
    rm -rf /tmp/react-native-*
fi

if [ -d "/tmp/metro-*" ]; then
    echo "  - Cleaning Metro temp files..."
    rm -rf /tmp/metro-*
fi

# 8. Verify icon file exists and has proper permissions
echo "🎨 Verifying app icon..."

ICON_PATH="./assets/images/icon.png"
SPLASH_PATH="./assets/images/icon_splashscreen.png"
FAVICON_PATH="./assets/images/favicon.png"

if [ -f "$ICON_PATH" ]; then
    echo "  ✅ Main icon found: $ICON_PATH"
    # Get file size and modification date
    ls -la "$ICON_PATH"
else
    echo "  ❌ Main icon not found: $ICON_PATH"
fi

if [ -f "$SPLASH_PATH" ]; then
    echo "  ✅ Splash screen icon found: $SPLASH_PATH"
    ls -la "$SPLASH_PATH"
else
    echo "  ❌ Splash screen icon not found: $SPLASH_PATH"
fi

if [ -f "$FAVICON_PATH" ]; then
    echo "  ✅ Favicon found: $FAVICON_PATH"
    ls -la "$FAVICON_PATH"
else
    echo "  ❌ Favicon not found: $FAVICON_PATH"
fi

# 9. Reinstall dependencies
echo "📥 Reinstalling dependencies..."
if command_exists yarn; then
    echo "  - Installing with yarn..."
    yarn install
elif command_exists npm; then
    echo "  - Installing with npm..."
    npm install
else
    echo "  ❌ No package manager found!"
    exit 1
fi

# 10. Prebuild (if using Expo)
echo "🔨 Running prebuild to regenerate native code..."
if command_exists expo; then
    echo "  - Running expo prebuild..."
    expo prebuild --clean
else
    echo "  ⚠️  Expo CLI not found, skipping prebuild"
fi

# 11. Final verification
echo "✅ Cache cleaning completed!"
echo ""
echo "📋 Next steps to ensure new icon is used:"
echo "1. For iOS: Delete app from simulator/device and reinstall"
echo "2. For Android: Delete app from emulator/device and reinstall"
echo "3. For development: Run 'expo start --clear' or 'npx react-native start --reset-cache'"
echo "4. For production builds: Create new builds with EAS or your build system"
echo ""
echo "🚀 To start development server with clean cache:"
echo "   expo start --clear"
echo "   # or"
echo "   npx react-native start --reset-cache"
echo ""
echo "🏗️  To create new builds:"
echo "   eas build --platform all --clear-cache"
echo "   # or for specific platform:"
echo "   eas build --platform ios --clear-cache"
echo "   eas build --platform android --clear-cache"