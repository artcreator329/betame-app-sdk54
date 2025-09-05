# StoreKit Troubleshooting - Complete Guide

## Current Error Analysis

```
ERROR [RevenueCat] Error fetching offerings - None of the products could be fetched from StoreKit Configuration
ERROR StoreKit purchase failed: [Error: Couldn't find product.]
```

**Root Cause**: StoreKit configuration file is not properly linked or loaded in Xcode.

## Immediate Diagnostic Steps

### 1. Run Configuration Checker
```bash
# Check Xcode project configuration
./scripts/check-xcode-storekit-config.sh

# Diagnose StoreKit issues in app
node scripts/diagnose-storekit-issue.js
```

### 2. Expected Output (If Working)
```
✅ BetaCoins.storekit file found
✅ StoreKit file referenced in Xcode project  
✅ StoreKit configuration found in scheme
✅ Found 6 products from StoreKit configuration!
```

### 3. Common Issues Found
```
❌ StoreKit file not referenced in Xcode project
❌ StoreKit not configured in scheme
❌ No products found from StoreKit
```

## Step-by-Step Fix Process

### Phase 1: Verify File Existence
1. **Check file exists**: `ios/BetaMe/BetaCoins.storekit`
2. **Verify content**: Should contain 6 products with correct IDs
3. **Check permissions**: File should be readable

### Phase 2: Xcode Project Configuration
1. **Open Xcode**: `cd ios && open BetaMe.xcworkspace`
2. **Add StoreKit file**:
   - Right-click BetaMe folder
   - "Add Files to BetaMe"
   - Select `BetaCoins.storekit`
   - Check "Add to target: BetaMe"
3. **Verify target membership**:
   - Select StoreKit file
   - Check "Target Membership" panel
   - Ensure BetaMe is checked

### Phase 3: Scheme Configuration
1. **Edit Scheme**: Product → Scheme → Edit Scheme
2. **Select Run tab**: Click "Run" in sidebar
3. **Go to Options**: Click "Options" tab
4. **Enable StoreKit**:
   - Check "StoreKit Configuration" checkbox
   - Select `BetaCoins.storekit` from dropdown
   - Verify file path is correct
5. **Save**: Click "Close"

### Phase 4: Build Settings
1. **Select BetaMe target**
2. **Build Settings tab**
3. **Search "StoreKit"**
4. **Set**: `ENABLE_STOREKIT_TESTING = YES`
5. **Verify Bundle ID**: Should be `com.betame.app`

### Phase 5: Clean and Rebuild
1. **Clean**: Product → Clean Build Folder (⌘⇧K)
2. **Delete Derived Data**:
   - Xcode → Preferences → Locations
   - Click arrow next to Derived Data
   - Delete the folder
3. **Rebuild**: Product → Build (⌘B)

## Verification Process

### 1. Build Success
- Project builds without errors
- No StoreKit-related warnings

### 2. Run Diagnostic
```bash
node scripts/diagnose-storekit-issue.js
```

**Expected Output:**
```
✅ Running on iOS
✅ RevenueCat API key found
✅ RevenueCat configured successfully
✅ Found 6 products from StoreKit!
   📦 betacoins_20: 20 BetaCoins - RM4.90
   📦 betacoins_100: 100 BetaCoins - RM19.90
   ...
```

### 3. Test Purchase Flow
1. Run app in iOS Simulator
2. Navigate to BetaCoin purchase
3. Try to purchase any bundle
4. Should see Apple purchase dialog
5. Cancel dialog (to avoid charges)

## Common Issues and Solutions

### Issue 1: File Not Found
```
❌ BetaCoins.storekit file not found
```
**Solution:**
- Verify file exists at `ios/BetaMe/BetaCoins.storekit`
- If missing, copy from backup or recreate

### Issue 2: Not Added to Project
```
❌ StoreKit file not referenced in Xcode project
```
**Solution:**
- Add file to Xcode project (Phase 2 above)
- Ensure target membership is enabled

### Issue 3: Scheme Not Configured
```
❌ StoreKit not configured in scheme
```
**Solution:**
- Edit scheme and enable StoreKit Configuration (Phase 3 above)
- Select correct .storekit file

### Issue 4: Product ID Mismatch
```
❌ Product betacoins_20 not found
```
**Solution:**
- Check product IDs in StoreKit file match code exactly
- Verify no typos or case differences

### Issue 5: Bundle ID Mismatch
```
❌ Bundle identifier doesn't match
```
**Solution:**
- Ensure Bundle ID is `com.betame.app`
- Check both project settings and Info.plist

## Alternative: Recreate StoreKit Configuration

If the existing file is corrupted:

### 1. Create New Configuration
1. **File → New → File**
2. **Choose "StoreKit Configuration File"**
3. **Name**: "BetaCoins"
4. **Add to**: BetaMe target

### 2. Add Products
For each product, add:
- **Product ID**: `betacoins_20`, `betacoins_100`, etc.
- **Reference Name**: "20 BetaCoins", "100 BetaCoins", etc.
- **Type**: Consumable
- **Price**: 4.90, 19.90, etc.

### 3. Configure Scheme
- Follow Phase 3 above to link new file

## Success Indicators

✅ **Configuration Check Passes**
```bash
./scripts/check-xcode-storekit-config.sh
# Shows all green checkmarks
```

✅ **Diagnostic Passes**
```bash
node scripts/diagnose-storekit-issue.js
# Shows products loaded successfully
```

✅ **Purchase Dialog Appears**
- App shows Apple purchase dialog
- Products are selectable
- Purchase can be initiated (then cancelled)

✅ **Console Output Clean**
```
🎉 Found 6 products from StoreKit configuration!
✅ Products loaded from StoreKit configuration: 6
```

## Emergency Checklist

If still not working after all steps:

- [ ] StoreKit file exists and has correct content
- [ ] File is added to Xcode project with target membership
- [ ] Scheme has StoreKit Configuration enabled
- [ ] Bundle ID matches (`com.betame.app`)
- [ ] Project builds without errors
- [ ] Derived data cleared and project rebuilt
- [ ] iOS Simulator restarted
- [ ] Diagnostic script shows products loaded
- [ ] Purchase dialog appears in app

## Next Steps After Fix

1. **Test thoroughly** in iOS Simulator
2. **Submit products** to Apple for review
3. **Test with TestFlight** build
4. **Monitor** purchase success rates
5. **Prepare for production** deployment

The key is ensuring the StoreKit configuration file is properly linked and loaded in Xcode. Once this is fixed, the "Couldn't find product" errors will disappear and IAP will work for testing.