#!/bin/bash

# Check Xcode StoreKit Configuration
# This script verifies that StoreKit is properly configured in the Xcode project

echo "🔍 Checking Xcode StoreKit Configuration..."
echo ""

# Check if we're in the right directory
if [ ! -d "ios" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

cd ios

# Check 1: StoreKit configuration file exists
echo "📋 Test 1: StoreKit Configuration File"
if [ -f "BetaMe/BetaCoins.storekit" ]; then
    echo "✅ BetaCoins.storekit file found"
    
    # Check file content
    if grep -q "betacoins_20" "BetaMe/BetaCoins.storekit"; then
        echo "✅ Product IDs found in StoreKit file"
    else
        echo "❌ Product IDs not found in StoreKit file"
    fi
else
    echo "❌ BetaCoins.storekit file not found"
    echo "   Expected location: ios/BetaMe/BetaCoins.storekit"
fi
echo ""

# Check 2: Xcode project file
echo "📋 Test 2: Xcode Project Configuration"
if [ -f "BetaMe.xcodeproj/project.pbxproj" ]; then
    echo "✅ Xcode project file found"
    
    # Check if StoreKit file is referenced in project
    if grep -q "BetaCoins.storekit" "BetaMe.xcodeproj/project.pbxproj"; then
        echo "✅ StoreKit file referenced in Xcode project"
    else
        echo "❌ StoreKit file not referenced in Xcode project"
        echo "   You need to add BetaCoins.storekit to the Xcode project"
    fi
else
    echo "❌ Xcode project file not found"
fi
echo ""

# Check 3: Scheme configuration (if available)
echo "📋 Test 3: Scheme Configuration"
SCHEME_FILE="BetaMe.xcodeproj/xcshareddata/xcschemes/BetaMe.xcscheme"
if [ -f "$SCHEME_FILE" ]; then
    echo "✅ Scheme file found"
    
    # Check if StoreKit configuration is enabled
    if grep -q "StoreKitConfigurationFileReference" "$SCHEME_FILE"; then
        echo "✅ StoreKit configuration found in scheme"
    else
        echo "❌ StoreKit configuration not found in scheme"
        echo "   You need to enable StoreKit Configuration in Xcode scheme"
    fi
else
    echo "⚠️  Scheme file not found (may be in xcuserdata)"
    echo "   Check scheme configuration manually in Xcode"
fi
echo ""

# Check 4: Bundle identifier in project
echo "📋 Test 4: Bundle Identifier"
if grep -q "com.betame.app" "BetaMe.xcodeproj/project.pbxproj"; then
    echo "✅ Bundle identifier found: com.betame.app"
else
    echo "⚠️  Bundle identifier com.betame.app not found"
    echo "   Check that bundle ID matches StoreKit configuration"
fi
echo ""

# Check 5: Info.plist
echo "📋 Test 5: Info.plist Configuration"
if [ -f "BetaMe/Info.plist" ]; then
    echo "✅ Info.plist found"
    
    # Check bundle identifier in Info.plist
    if grep -q "com.betame.app" "BetaMe/Info.plist"; then
        echo "✅ Bundle identifier in Info.plist matches"
    else
        echo "⚠️  Bundle identifier in Info.plist may not match"
    fi
else
    echo "❌ Info.plist not found"
fi
echo ""

# Summary
echo "📋 CONFIGURATION SUMMARY"
echo "========================"
echo ""

# Count issues
ISSUES=0

if [ ! -f "BetaMe/BetaCoins.storekit" ]; then
    echo "❌ Issue 1: StoreKit file missing"
    ISSUES=$((ISSUES + 1))
fi

if [ -f "BetaMe.xcodeproj/project.pbxproj" ] && ! grep -q "BetaCoins.storekit" "BetaMe.xcodeproj/project.pbxproj"; then
    echo "❌ Issue 2: StoreKit file not added to Xcode project"
    ISSUES=$((ISSUES + 1))
fi

if [ -f "$SCHEME_FILE" ] && ! grep -q "StoreKitConfigurationFileReference" "$SCHEME_FILE"; then
    echo "❌ Issue 3: StoreKit not configured in scheme"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo "✅ No major configuration issues found!"
    echo "   If you're still having problems:"
    echo "   1. Clean and rebuild in Xcode"
    echo "   2. Restart iOS Simulator"
    echo "   3. Run: node scripts/diagnose-storekit-issue.js"
else
    echo "❌ Found $ISSUES configuration issue(s)"
    echo ""
    echo "🔧 NEXT STEPS:"
    echo "1. Read: XCODE_STOREKIT_SETUP_GUIDE.md"
    echo "2. Open Xcode and fix the issues above"
    echo "3. Run this script again to verify fixes"
fi

echo ""
echo "📖 For detailed instructions, see: XCODE_STOREKIT_SETUP_GUIDE.md"