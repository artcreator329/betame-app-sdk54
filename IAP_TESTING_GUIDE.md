# IAP Testing Guide - RevenueCat Sandbox

## Overview
This guide covers testing in-app purchases using RevenueCat with sandbox accounts. StoreKit configuration has been removed in favor of RevenueCat's more robust testing and analytics platform.

## Prerequisites

### ✅ **Completed Setup**
- [x] StoreKit configuration files removed
- [x] RevenueCat service implemented
- [x] iOS project cleaned of StoreKit references
- [x] RevenueCat API key configured

### 🔄 **Required Setup**
- [ ] RevenueCat dashboard products configured
- [ ] App Store Connect products approved
- [ ] Sandbox test user created
- [ ] Test device prepared

## Step 1: RevenueCat Dashboard Setup

### 1.1 Create Products in RevenueCat
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Navigate to **Products** → **Products**
3. Add each BetaCoin product:

| Product ID | Display Name | Type | Price |
|------------|--------------|------|-------|
| `betacoins_20` | 20 BetaCoins | Consumable | RM4.90 |
| `betacoins_100` | 100 BetaCoins | Consumable | RM19.90 |
| `betacoins_250` | 250 BetaCoins | Consumable | RM34.90 |
| `betacoins_600` | 600 BetaCoins | Consumable | RM79.90 |
| `betacoins_1000` | 1000 BetaCoins | Consumable | RM99.90 |
| `betacoins_2000` | 2000 BetaCoins | Consumable | RM179.90 |

### 1.2 Create Offering
1. Go to **Products** → **Offerings**
2. Create new offering: "BetaCoin Bundles"
3. Add all 6 products to this offering
4. Set as **Current** offering

### 1.3 Configure App Settings
1. Go to **Project Settings** → **Apps**
2. Add your iOS app with Bundle ID: `com.betame.app`
3. Link to App Store Connect

## Step 2: App Store Connect Setup

### 2.1 Verify Products
Ensure these products exist and are approved in App Store Connect:

```
betacoins_20    - 20 BetaCoins - RM4.90
betacoins_100   - 100 BetaCoins - RM19.90  
betacoins_250   - 250 BetaCoins - RM34.90
betacoins_600   - 600 BetaCoins - RM79.90
betacoins_1000  - 1000 BetaCoins - RM99.90
betacoins_2000  - 2000 BetaCoins - RM179.90
```

### 2.2 Create Sandbox Test User
1. Go to App Store Connect → **Users and Access** → **Sandbox Testers**
2. Click **+** to add new tester
3. Fill in details:
   - **Email**: Use a unique email (e.g., `test+sandbox@yourdomain.com`)
   - **Password**: Strong password
   - **Country**: Malaysia
   - **App Store Territory**: Malaysia

## Step 3: Device Preparation

### 3.1 iOS Device Setup
1. **Sign out of App Store**:
   - Settings → [Your Name] → Media & Purchases → Sign Out
   - Or Settings → App Store → Sign Out

2. **Clear App Store cache**:
   - Settings → General → iPhone Storage → App Store → Offload App
   - Reinstall App Store from App Store

3. **Verify sandbox mode**:
   - Device should show "Sandbox" in App Store when signed out

### 3.2 Simulator Setup
1. **Reset simulator**:
   ```bash
   xcrun simctl erase all
   ```

2. **Sign out of App Store** in simulator
3. **Install your app** on simulator

## Step 4: Build and Test

### 4.1 Build App
```bash
# Clean and build iOS app
cd ios
rm -rf build/
pod install
cd ..
npx expo run:ios
```

### 4.2 Test RevenueCat Integration
```bash
# Run RevenueCat test script
node scripts/test-revenuecat-sandbox.js
```

Expected output:
```
✅ RevenueCat iOS API key is configured
✅ All BetaCoin products are configured
✅ RevenueCat IAP service exists
✅ iOS project exists
✅ StoreKit configuration files removed
```

### 4.3 Test Purchase Flow

1. **Launch app** on test device/simulator
2. **Sign in** to your BetaMe account
3. **Navigate** to BetaCoin purchase screen
4. **Select** a BetaCoin bundle
5. **Tap purchase** - should show Apple purchase dialog
6. **Sign in** with sandbox test user when prompted
7. **Complete purchase** - should be free in sandbox
8. **Verify** BetaCoins added to wallet

## Step 5: Debugging

### 5.1 Enable Debug Logging
Add to your app initialization:
```typescript
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// Enable debug logging
Purchases.setLogLevel(LOG_LEVEL.DEBUG);
```

### 5.2 Common Issues and Solutions

#### Issue: "No products found"
**Cause**: RevenueCat not configured or products not synced
**Solution**:
1. Check RevenueCat dashboard products
2. Verify API key is correct
3. Ensure offering is set as current

#### Issue: "Purchase failed - product not available"
**Cause**: App Store Connect products not approved
**Solution**:
1. Check product status in App Store Connect
2. Wait for Apple approval (can take 24-48 hours)
3. Use RevenueCat's product override for testing

#### Issue: "User not signed in to sandbox"
**Cause**: Device still signed in to production App Store
**Solution**:
1. Sign out of App Store completely
2. Clear App Store cache
3. Restart device

#### Issue: "Purchase dialog doesn't appear"
**Cause**: StoreKit configuration conflict
**Solution**:
1. Verify all StoreKit files removed
2. Clean and rebuild project
3. Check Xcode scheme settings

### 5.3 Debug Commands
```typescript
// Check RevenueCat status
const customerInfo = await Purchases.getCustomerInfo();
console.log('Customer Info:', customerInfo);

// Check available products
const offerings = await Purchases.getOfferings();
console.log('Offerings:', offerings);

// Check if user can make purchases
const canMakePayments = await Purchases.canMakePayments();
console.log('Can make payments:', canMakePayments);
```

## Step 6: Monitoring

### 6.1 RevenueCat Dashboard
Monitor purchases in real-time:
1. Go to **Dashboard** → **Overview**
2. Check **Recent Transactions**
3. View **Customer Profiles**

### 6.2 App Logs
Check console for RevenueCat logs:
```
[RevenueCat] - INFO: Purchases SDK initialized
[RevenueCat] - INFO: Products loaded: 6
[RevenueCat] - INFO: Purchase successful: betacoins_20
```

### 6.3 Wallet Verification
Verify BetaCoins added to user wallet:
```sql
-- Check user's BetaCoin balance
SELECT betacoin_balance 
FROM profiles 
WHERE id = 'user_id_here';

-- Check recent transactions
SELECT * 
FROM wallet_transactions 
WHERE user_id = 'user_id_here' 
ORDER BY created_at DESC 
LIMIT 5;
```

## Testing Checklist

### Pre-Test Setup
- [ ] RevenueCat dashboard configured
- [ ] Products created and offering set
- [ ] App Store Connect products approved
- [ ] Sandbox test user created
- [ ] Device signed out of production App Store
- [ ] App built and installed

### Purchase Flow Test
- [ ] App launches successfully
- [ ] User can sign in
- [ ] BetaCoin purchase screen loads
- [ ] Products display with correct prices
- [ ] Purchase dialog appears when tapping buy
- [ ] Sandbox login prompt appears
- [ ] Purchase completes successfully
- [ ] BetaCoins added to wallet
- [ ] Transaction appears in RevenueCat dashboard

### Error Handling Test
- [ ] Cancel purchase works correctly
- [ ] Network error handling
- [ ] Invalid product handling
- [ ] User not signed in handling

## Production Deployment

### Pre-Production Checklist
- [ ] All sandbox tests passing
- [ ] RevenueCat analytics configured
- [ ] Error tracking implemented
- [ ] Customer support flow tested
- [ ] App Store Connect products approved
- [ ] Revenue tracking verified

### Go-Live Steps
1. **Submit app** to App Store with RevenueCat integration
2. **Monitor** RevenueCat dashboard for real purchases
3. **Track** conversion rates and user behavior
4. **Support** users with purchase issues

## Support Resources

### RevenueCat Documentation
- [iOS SDK Guide](https://docs.revenuecat.com/docs/ios)
- [React Native Guide](https://docs.revenuecat.com/docs/react-native)
- [Sandbox Testing](https://docs.revenuecat.com/docs/sandbox)
- [Troubleshooting](https://docs.revenuecat.com/docs/troubleshooting)

### Apple Documentation
- [In-App Purchase Testing](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases)
- [Sandbox Testing](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_in_sandbox)

### BetaMe App Support
- Configuration: `config/revenuecat.ts`
- Service: `lib/revenuecat-iap-service.ts`
- Component: `components/BetaCoinPurchase.tsx`

---

**Status**: 🟢 **Ready for Sandbox Testing**
**Next Action**: Configure RevenueCat dashboard and create sandbox test user
**Testing Time**: 30-60 minutes per test cycle

## Quick Test Command
```bash
# Run comprehensive test
node scripts/test-revenuecat-sandbox.js

# Build and test on iOS
npx expo run:ios
```

Happy testing! 🚀