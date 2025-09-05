# RevenueCat Troubleshooting Guide

## Current Error Analysis

### Error Message
```
ERROR [RevenueCat] Error fetching offerings - None of the products could be fetched from App Store Connect
ERROR App Store purchase failed: [Error: Couldn't find product.]
```

### Root Cause
This error occurs when:
1. ✅ Products exist in App Store Connect 
2. ❌ Products are NOT configured in RevenueCat dashboard
3. ❌ RevenueCat can't sync products between the two systems

## Quick Fix Solutions

### Solution 1: Configure RevenueCat Dashboard (Recommended)

#### Step 1: Access Dashboard
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Sign in and select your BetaMe project

#### Step 2: Add Products
Navigate to **Products** → **Products** and add each product:

| Product ID | Display Name | Type | Store Product ID |
|------------|--------------|------|------------------|
| `betacoins_20` | 20 BetaCoins | Consumable | betacoins_20 |
| `betacoins_100` | 100 BetaCoins | Consumable | betacoins_100 |
| `betacoins_250` | 250 BetaCoins | Consumable | betacoins_250 |
| `betacoins_600` | 600 BetaCoins | Consumable | betacoins_600 |
| `betacoins_1000` | 1000 BetaCoins | Consumable | betacoins_1000 |
| `betacoins_2000` | 2000 BetaCoins | Consumable | betacoins_2000 |

#### Step 3: Create Offering
1. Go to **Products** → **Offerings**
2. Create new offering: "BetaCoin Bundles"
3. Add all 6 products to this offering
4. Set as **Current** offering

#### Step 4: Wait for Sync
- RevenueCat needs 5-10 minutes to sync with App Store Connect
- Check dashboard for sync status

### Solution 2: Use Testing Mode (Immediate)

If you need to test immediately without waiting for RevenueCat setup:

1. **Current Implementation**: The app automatically falls back to static products
2. **Testing Capability**: You can test purchase flow and wallet integration
3. **Limitation**: Purchases won't appear in RevenueCat analytics
4. **Production**: Must configure RevenueCat dashboard before production

## Testing Commands

### Check Configuration Status
```bash
# Run comprehensive configuration check
node scripts/fix-revenuecat-configuration.js

# Test current setup
node scripts/test-revenuecat-sandbox.js
```

### Test Purchase Flow
```bash
# Build and test app
npx expo run:ios

# Check console for these messages:
# ✅ Products loaded from RevenueCat offerings (Dashboard configured)
# OR
# ✅ Static products loaded for testing (fallback mode)
```

## Expected Behavior by Configuration

### ✅ RevenueCat Dashboard Configured
```
🔄 Trying RevenueCat offerings...
📋 Found offering with 6 packages
✅ Products loaded from RevenueCat offerings: 6
🛒 Using RevenueCat package for betacoins_20...
✅ RevenueCat package purchase successful
```

### ⚠️ Dashboard Not Configured (Testing Mode)
```
⚠️ No RevenueCat offerings found
🔄 Using static fallback products for testing...
✅ Static products loaded for testing: 6
🛒 Using static product purchase for betacoins_20...
✅ Static product purchase simulated successfully
```

## Verification Steps

### 1. Check RevenueCat Dashboard
- [ ] Products exist in Products section
- [ ] Offering exists and is set as Current
- [ ] App Store Connect integration is active
- [ ] API keys are correct

### 2. Test App Behavior
- [ ] App launches without errors
- [ ] Products display in purchase screen
- [ ] Purchase dialog appears (real or simulated)
- [ ] BetaCoins are added to wallet
- [ ] No console errors

### 3. Monitor Analytics
- [ ] Purchases appear in RevenueCat dashboard (if configured)
- [ ] User profiles show purchase history
- [ ] Revenue tracking works

## Common Issues & Solutions

### Issue: "API Key Invalid"
**Symptoms**: RevenueCat initialization fails
**Solution**: 
1. Check `config/revenuecat.ts` has correct iOS API key
2. Verify key in RevenueCat dashboard → Project Settings → API Keys

### Issue: "Bundle ID Mismatch"
**Symptoms**: Products don't sync between systems
**Solution**:
1. Ensure Bundle ID matches in both App Store Connect and RevenueCat
2. Should be: `com.betame.app`

### Issue: "Products Pending Review"
**Symptoms**: Products exist but can't be purchased
**Solution**:
1. Check App Store Connect product status
2. Wait for Apple approval (24-48 hours)
3. Use sandbox testing in the meantime

### Issue: "Sandbox User Issues"
**Symptoms**: Purchase dialog doesn't appear
**Solution**:
1. Sign out of production App Store on device
2. Create new sandbox test user
3. Use unique email for sandbox user

## Production Readiness Checklist

### RevenueCat Configuration
- [ ] All products configured in dashboard
- [ ] Offering created and set as current
- [ ] App Store Connect integration verified
- [ ] API keys are production keys (not test)

### App Store Connect
- [ ] All products approved by Apple
- [ ] Bundle ID matches RevenueCat configuration
- [ ] Tax and banking information complete
- [ ] App submitted and approved

### Testing Verification
- [ ] Sandbox testing successful
- [ ] Real device testing with sandbox user
- [ ] Purchase flow works end-to-end
- [ ] Analytics appear in RevenueCat dashboard
- [ ] Wallet integration working

## Support Resources

### RevenueCat Documentation
- [Product Setup](https://docs.revenuecat.com/docs/entitlements)
- [iOS Configuration](https://docs.revenuecat.com/docs/ios-products)
- [Troubleshooting](https://rev.cat/why-are-offerings-empty)
- [React Native Guide](https://docs.revenuecat.com/docs/react-native)

### Apple Documentation
- [App Store Connect](https://developer.apple.com/app-store-connect/)
- [In-App Purchase Guide](https://developer.apple.com/in-app-purchase/)
- [Sandbox Testing](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_in_sandbox)

### BetaMe App Files
- Configuration: `config/revenuecat.ts`
- Service: `lib/revenuecat-iap-service.ts`
- Component: `components/BetaCoinPurchase.tsx`
- Fix Script: `scripts/fix-revenuecat-configuration.js`

## Timeline Expectations

### Dashboard Configuration
- **Setup Time**: 10-15 minutes
- **Sync Time**: 5-10 minutes
- **Testing Time**: 5 minutes
- **Total**: ~30 minutes

### Production Deployment
- **App Store Review**: 24-48 hours
- **Product Approval**: 24-48 hours (if not already approved)
- **RevenueCat Sync**: 5-10 minutes after approval

## Next Steps

### Immediate (Testing)
1. Run configuration fix script: `node scripts/fix-revenuecat-configuration.js`
2. Test with current fallback system
3. Verify wallet integration works

### Short Term (Production Setup)
1. Configure RevenueCat dashboard products
2. Create and set current offering
3. Test with RevenueCat analytics

### Long Term (Monitoring)
1. Monitor purchase success rates
2. Track user behavior and conversion
3. Optimize product offerings based on data

---

**Current Status**: ⚠️ RevenueCat dashboard configuration needed
**Immediate Action**: Configure products in RevenueCat dashboard
**Fallback**: Static products available for testing
**Production Ready**: After dashboard configuration and testing