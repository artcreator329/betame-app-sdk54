# Xcode StoreKit Configuration Setup Guide

## Current Issue
```
ERROR [RevenueCat] Error fetching offerings - None of the products could be fetched from StoreKit Configuration
ERROR StoreKit purchase failed: [Error: Couldn't find product.]
```

This means the StoreKit configuration file is not properly linked or loaded in Xcode.

## Step-by-Step Xcode Setup

### 1. Verify StoreKit Configuration File

1. **Open Xcode project**
   ```bash
   cd ios
   open BetaMe.xcworkspace
   ```

2. **Check if BetaCoins.storekit exists**
   - Look for `ios/BetaMe/BetaCoins.storekit` in project navigator
   - If missing, you need to add it to the project

3. **Add StoreKit file to project (if missing)**
   - Right-click on BetaMe folder in Xcode
   - Select "Add Files to BetaMe"
   - Navigate to `ios/BetaMe/BetaCoins.storekit`
   - Make sure "Add to target" is checked for BetaMe target
   - Click "Add"

### 2. Configure Build Scheme

1. **Edit Scheme**
   - In Xcode menu: Product → Scheme → Edit Scheme
   - Or press `Cmd + <`

2. **Select Run Configuration**
   - Click "Run" in left sidebar
   - Go to "Options" tab

3. **Enable StoreKit Configuration**
   - Find "StoreKit Configuration" section
   - Check the checkbox to enable it
   - Select `BetaCoins.storekit` from dropdown
   - Make sure it shows the correct file path

4. **Save Scheme**
   - Click "Close" to save changes

### 3. Verify Target Membership

1. **Select StoreKit file**
   - Click on `BetaCoins.storekit` in project navigator

2. **Check Target Membership**
   - In right panel, look for "Target Membership"
   - Ensure "BetaMe" target is checked
   - If not checked, check the box

### 4. Build Settings Verification

1. **Select BetaMe target**
   - Click on project name at top of navigator
   - Select "BetaMe" target

2. **Check Build Settings**
   - Go to "Build Settings" tab
   - Search for "StoreKit"
   - Ensure `ENABLE_STOREKIT_TESTING = YES`

3. **Bundle Identifier**
   - Verify Bundle Identifier matches StoreKit config
   - Should be `com.betame.app`

### 5. Clean and Rebuild

1. **Clean Build Folder**
   ```
   Product → Clean Build Folder (Cmd + Shift + K)
   ```

2. **Delete Derived Data**
   ```
   Xcode → Preferences → Locations → Derived Data → Click arrow → Delete folder
   ```

3. **Rebuild Project**
   ```
   Product → Build (Cmd + B)
   ```

## Verification Steps

### 1. Check StoreKit File Content

The `BetaCoins.storekit` should contain:

```json
{
  "identifier" : "A2C4B0A0",
  "products" : [
    {
      "displayPrice" : "4.90",
      "productID" : "betacoins_20",
      "referenceName" : "20 BetaCoins",
      "type" : "Consumable"
    },
    {
      "displayPrice" : "19.90", 
      "productID" : "betacoins_100",
      "referenceName" : "100 BetaCoins",
      "type" : "Consumable"
    }
    // ... other products
  ]
}
```

### 2. Test in Simulator

1. **Run in iOS Simulator**
   ```
   Product → Run (Cmd + R)
   ```

2. **Check Console Output**
   - Look for StoreKit configuration loading messages
   - Should see products being loaded

3. **Test Purchase Flow**
   - Navigate to BetaCoin purchase screen
   - Try to purchase any bundle
   - Should see Apple's purchase dialog

## Troubleshooting Common Issues

### Issue 1: StoreKit File Not Found
```
⚠️ No products returned from StoreKit
```

**Solution:**
1. Verify file exists at `ios/BetaMe/BetaCoins.storekit`
2. Check target membership is enabled
3. Ensure scheme has StoreKit configuration selected

### Issue 2: Products Don't Match
```
❌ Product betacoins_20 not found
```

**Solution:**
1. Check product IDs in StoreKit file match code exactly
2. Verify no typos or extra spaces
3. Ensure case sensitivity matches

### Issue 3: Scheme Not Configured
```
❌ StoreKit Configuration not enabled
```

**Solution:**
1. Edit scheme (Product → Scheme → Edit Scheme)
2. Enable StoreKit Configuration in Options
3. Select correct .storekit file

### Issue 4: Bundle ID Mismatch
```
❌ Bundle identifier doesn't match
```

**Solution:**
1. Check Bundle ID in project settings
2. Verify it matches StoreKit configuration
3. Usually should be `com.betame.app`

## Alternative: Create New StoreKit Configuration

If the existing file is corrupted, create a new one:

1. **Create New StoreKit Configuration**
   - File → New → File
   - Choose "StoreKit Configuration File"
   - Name it "BetaCoins"
   - Add to BetaMe target

2. **Add Products**
   - Click "+" to add products
   - Add each BetaCoin product with correct IDs
   - Set prices and descriptions

3. **Configure Scheme**
   - Follow steps above to link new file

## Expected Results After Fix

✅ **Console Output:**
```
🎉 Found 6 products from StoreKit configuration!
📦 StoreKit Product: betacoins_20 - 20 BetaCoins - RM4.90
✅ Products loaded from StoreKit configuration: 6
```

✅ **Purchase Flow:**
- Apple purchase dialog appears
- Purchase completes successfully
- BetaCoins added to wallet

✅ **No Errors:**
- No "Couldn't find product" errors
- No "offerings empty" errors
- Clean console output

## Final Checklist

- [ ] StoreKit file exists and is linked to project
- [ ] Target membership enabled for BetaMe target
- [ ] Scheme configured with StoreKit Configuration
- [ ] Bundle ID matches StoreKit configuration
- [ ] Product IDs match exactly between code and StoreKit
- [ ] Project builds without errors
- [ ] Purchase dialog appears in simulator
- [ ] Products load successfully in app

Once all items are checked, the StoreKit integration should work properly for testing.