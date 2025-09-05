# StoreKit Configuration Fix Guide

## Problem
RevenueCat can't fetch products because they're in "WAITING_FOR_REVIEW" status. We need to fix the StoreKit configuration so IAP works for testing.

## Root Cause
- Products exist in StoreKit config but RevenueCat offerings system doesn't work with unapproved products
- Need to bypass RevenueCat offerings and use direct StoreKit integration
- StoreKit configuration file may not be properly linked in Xcode

## Solution Implemented

### 1. Updated RevenueCat Service
- **File**: `lib/revenuecat-iap-service.ts`
- Bypasses RevenueCat offerings system
- Loads products directly from StoreKit configuration
- Uses modern `purchaseStoreProduct` method
- Better error handling for StoreKit testing

### 2. Key Changes Made

#### Product Loading Strategy
```typescript
// Old: Relied on RevenueCat offerings (doesn't work with unapproved products)
const offerings = await Purchases.getOfferings();

// New: Direct StoreKit product loading (works with StoreKit config)
const products = await Purchases.getProducts(this.productIds);
```

#### Purchase Method
```typescript
// Old: Used RevenueCat packages
await Purchases.purchasePackage(product.package);

// New: Direct StoreKit purchase
await Purchases.purchaseStoreProduct(product.storeProduct);
```

## Xcode Configuration Steps

### 1. Verify StoreKit Configuration File
1. Open Xcode project
2. Check that `ios/BetaMe/BetaCoins.storekit` is in project
3. Ensure it's added to target membership
4. Verify product IDs match exactly:
   - `betacoins_20`
   - `betacoins_100` 
   - `betacoins_250`
   - `betacoins_600`
   - `betacoins_1000`
   - `betacoins_2000`

### 2. Enable StoreKit Testing
1. In Xcode, go to Product → Scheme → Edit Scheme
2. Select "Run" tab
3. Go to "Options" section
4. Under "StoreKit Configuration", select `BetaCoins.storekit`
5. Make sure "StoreKit Configuration" is enabled

### 3. Build Settings
1. Ensure `ENABLE_STOREKIT_TESTING = YES` in build settings
2. Verify bundle identifier matches StoreKit config
3. Check that StoreKit framework is linked

## Testing Steps

### 1. Run Configuration Test
```bash
# Test the StoreKit configuration
node scripts/test-storekit-configuration.js
```

### 2. Expected Results
- ✅ RevenueCat initializes successfully
- ✅ Products load from StoreKit configuration
- ✅ Each product shows correct pricing and BetaCoin amounts
- ✅ Purchase flow can be initiated

### 3. Test Purchase Flow
1. Open app in iOS Simulator
2. Navigate to wallet/purchase screen
3. Try to purchase BetaCoins
4. Should see StoreKit purchase dialog
5. Complete test purchase
6. Verify BetaCoins are added to wallet

## Troubleshooting

### If No Products Load
1. **Check StoreKit file linking**:
   - File must be in Xcode project
   - Must be added to target
   - Must be selected in scheme settings

2. **Verify product IDs**:
   - Must match exactly between code and StoreKit config
   - Case sensitive
   - No extra spaces or characters

3. **Check bundle identifier**:
   - Must match between app and StoreKit config
   - Usually `com.betame.app`

### If Purchase Fails
1. **"Couldn't find product" error**:
   - StoreKit config not properly loaded
   - Product ID mismatch
   - StoreKit testing not enabled

2. **"Purchase cancelled" error**:
   - Normal user cancellation
   - Test with different product

3. **Network errors**:
   - RevenueCat API issues
   - Check internet connection
   - Verify API key

## Verification Checklist

- [ ] StoreKit configuration file linked in Xcode
- [ ] StoreKit testing enabled in scheme
- [ ] Product IDs match exactly
- [ ] Bundle identifier matches
- [ ] RevenueCat API key configured
- [ ] Products load successfully
- [ ] Purchase dialog appears
- [ ] BetaCoins added to wallet after purchase

## Next Steps After Fix

1. **Test thoroughly in simulator**
2. **Test with TestFlight build**
3. **Submit products to Apple for review**
4. **Test with approved products in production**

## Files Modified

1. `lib/revenuecat-iap-service.ts` - Updated to work with StoreKit directly
2. `scripts/test-storekit-configuration.js` - New testing script
3. `STOREKIT_CONFIGURATION_FIX.md` - This guide

The system now bypasses RevenueCat's offerings system and works directly with StoreKit configuration for testing, while maintaining compatibility for production use once products are approved.