# New IAP Setup Guide - RevenueCat Integration

## Overview
This guide covers the setup of the new simplified IAP products with RevenueCat integration.

### New Product Configuration
- **betacoins_new_20**: RM4.90 → 20 BetaCoins
- **betacoins_new_100**: RM19.90 → 100 BetaCoins

## Files Updated

### 1. RevenueCat IAP Service (`lib/revenuecat-iap-service.ts`)
- Updated product IDs to `betacoins_new_20` and `betacoins_new_100`
- Updated product mapping and fallback prices
- Maintained all existing functionality

### 2. StoreKit Configuration (`ios/BetaMe/BetaCoins.storekit`)
- Updated product IDs in StoreKit configuration
- Kept existing internal IDs and structure
- Removed unused products (250, 600, 1000, 2000 BetaCoins)

### 3. RevenueCat Configuration (`config/revenuecat.ts`)
- Updated PRODUCT_IDS, BETACOIN_AMOUNTS, and PRICING
- Simplified to only include the two new products
- Maintained existing API key configuration

### 4. BetaCoin Purchase Component (`components/BetaCoinPurchase.tsx`)
- Updated betacoinBundles array to only include two products
- Updated IAP product IDs
- Added "Popular" badge to 100 BetaCoins bundle

## Setup Steps

### Step 1: App Store Connect Configuration

1. **Go to App Store Connect**
   - Visit: https://appstoreconnect.apple.com/
   - Navigate to your BetaMe app

2. **Create In-App Purchase Products**
   - Go to Features → In-App Purchases
   - Click "+" to create new products

3. **Product 1: 20 BetaCoins Pack**
   ```
   Type: Consumable
   Product ID: betacoins_new_20
   Reference Name: 20 BetaCoins Pack
   Price: RM4.90 (Tier 5)
   Display Name: 20 BetaCoins Pack
   Description: Purchase 20 BetaCoins to boost your services and unlock premium features in the BetaMe marketplace app
   ```

4. **Product 2: 100 BetaCoins Pack**
   ```
   Type: Consumable
   Product ID: betacoins_new_100
   Reference Name: 100 BetaCoins Pack
   Price: RM19.90 (Tier 20)
   Display Name: 100 BetaCoins Pack
   Description: Purchase 100 BetaCoins to boost your services and unlock premium features in the BetaMe marketplace app
   ```

5. **Submit for Review**
   - Add screenshots and metadata
   - Submit both products for Apple review

### Step 2: RevenueCat Dashboard Configuration

1. **Access RevenueCat Dashboard**
   - Visit: https://app.revenuecat.com/
   - Navigate to your iOS app project

2. **Configure Products**
   - Go to Products section
   - Add products with exact IDs:
     - `betacoins_new_20`
     - `betacoins_new_100`

3. **Create Offering**
   - Go to Offerings section
   - Create new offering (e.g., "BetaCoins Packages")
   - Add both products to the offering
   - Set as current offering

4. **Verify API Key**
   - Ensure your iOS API key is correctly configured
   - Current key: `<REDACTED_REVENUECAT_KEY>`

### Step 3: Testing

1. **Run Configuration Test**
   ```bash
   node scripts/test-new-iap-products.js
   ```

2. **Test in Xcode Simulator**
   - Use StoreKit configuration file for testing
   - Products should appear in purchase modal

3. **Test on TestFlight**
   - Once products are approved, test with real Apple IAP
   - Verify RevenueCat integration works

## Technical Details

### Product Mapping
```typescript
const productMapping: Record<string, number> = {
  'betacoins_new_20': 20,
  'betacoins_new_100': 100,
};
```

### Pricing Structure
```typescript
const fallbackPrices: Record<string, number> = {
  'betacoins_new_20': 4.90,
  'betacoins_new_100': 19.90,
};
```

### RevenueCat Integration Flow
1. User selects BetaCoin package
2. iOS: RevenueCat handles Apple IAP
3. Android: Falls back to Curlec payment
4. On successful purchase: BetaCoins added to wallet
5. Transaction recorded in database

## Troubleshooting

### Common Issues

1. **Products Not Loading**
   - Check App Store Connect approval status
   - Verify RevenueCat dashboard configuration
   - Ensure product IDs match exactly

2. **Purchase Fails**
   - Check iOS API key in RevenueCat config
   - Verify user is logged into RevenueCat
   - Check StoreKit configuration

3. **BetaCoins Not Added**
   - Check wallet service integration
   - Verify user ID mapping
   - Check database permissions

### Debug Commands
```bash
# Test IAP configuration
node scripts/test-new-iap-products.js

# Test RevenueCat sandbox
node scripts/test-revenuecat-sandbox.js

# Debug IAP environment
node scripts/test-iap-environment.js
```

## Next Steps

1. **Submit to App Store Connect**
   - Create the two new IAP products
   - Submit for Apple review

2. **Configure RevenueCat Dashboard**
   - Add products and create offering
   - Test with sandbox environment

3. **Test Integration**
   - Verify purchases work in TestFlight
   - Test BetaCoin wallet integration

4. **Monitor Performance**
   - Track purchase success rates
   - Monitor RevenueCat analytics

## Resources

- [RevenueCat Documentation](https://www.revenuecat.com/docs/)
- [App Store Connect Guide](https://developer.apple.com/app-store-connect/)
- [StoreKit Testing](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_storekit_testing)

---

**Status**: Configuration updated, ready for App Store Connect and RevenueCat dashboard setup.