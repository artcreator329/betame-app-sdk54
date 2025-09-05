# In-App Purchase (IAP) Setup Guide for BetaMe App

## Overview
This guide will help you complete the In-App Purchase setup for the BetaMe app to enable real App Store purchases of BetaCoins.

## Current Status ✅
- **IAP Service**: Fully implemented and integrated with `react-native-iap`
- **Product IDs**: All 6 BetaCoin products created in App Store Connect
- **iOS Configuration**: Entitlements and app configuration complete
- **Code Integration**: Real StoreKit calls implemented

## Step-by-Step App Store Connect Configuration

### 1. Complete Product Metadata

For each of the 6 products, you need to add the following information:

#### **Product: betacoins_20**
- **Reference Name**: `20 BetaCoins`
- **Product ID**: `betacoins_20`
- **Type**: `Consumable`
- **Display Name**: `20 BetaCoins`
- **Description**: `Purchase 20 BetaCoins for RM4.90`
- **Pricing**: Set to match RM4.90 (Tier 1 or appropriate tier)
- **Localization**: English (Malaysia)

#### **Product: betacoins_100**
- **Reference Name**: `100 BetaCoins`
- **Product ID**: `betacoins_100`
- **Type**: `Consumable`
- **Display Name**: `100 BetaCoins`
- **Description**: `Purchase 100 BetaCoins for RM19.90`
- **Pricing**: Set to match RM19.90 (Tier 4 or appropriate tier)
- **Localization**: English (Malaysia)

#### **Product: betacoins_250**
- **Reference Name**: `250 BetaCoins`
- **Product ID**: `betacoins_250`
- **Type**: `Consumable`
- **Display Name**: `250 BetaCoins`
- **Description**: `Purchase 250 BetaCoins for RM34.90`
- **Pricing**: Set to match RM34.90 (Tier 7 or appropriate tier)
- **Localization**: English (Malaysia)

#### **Product: betacoins_600**
- **Reference Name**: `600 BetaCoins`
- **Product ID**: `betacoins_600`
- **Type**: `Consumable`
- **Display Name**: `600 BetaCoins`
- **Description**: `Purchase 600 BetaCoins for RM79.90`
- **Pricing**: Set to match RM79.90 (Tier 16 or appropriate tier)
- **Localization**: English (Malaysia)

#### **Product: betacoins_1000**
- **Reference Name**: `1000 BetaCoins`
- **Product ID**: `betacoins_1000`
- **Type**: `Consumable`
- **Display Name**: `1000 BetaCoins`
- **Description**: `Purchase 1000 BetaCoins for RM99.90`
- **Pricing**: Set to match RM99.90 (Tier 20 or appropriate tier)
- **Localization**: English (Malaysia)

#### **Product: betacoins_2000**
- **Reference Name**: `2000 BetaCoins`
- **Product ID**: `betacoins_2000`
- **Type**: `Consumable`
- **Display Name**: `2000 BetaCoins`
- **Description**: `Purchase 2000 BetaCoins for RM179.90`
- **Pricing**: Set to match RM179.90 (Tier 36 or appropriate tier)
- **Localization**: English (Malaysia)

### 2. Pricing Tier Configuration

**Important**: Malaysian Ringgit (MYR) pricing is automatically converted by Apple based on the pricing tier you select. Choose the tier that most closely matches your desired price.

**Pricing Tier Reference** (Updated for new pricing):
- Tier 1: $0.99 USD ≈ RM4.90 (20 BetaCoins)
- Tier 4: $1.99 USD ≈ RM19.90 (100 BetaCoins)  
- Tier 7: $2.99 USD ≈ RM34.90 (250 BetaCoins)
- Tier 16: $7.99 USD ≈ RM79.90 (600 BetaCoins)
- Tier 20: $9.99 USD ≈ RM99.90 (1000 BetaCoins)
- Tier 36: $19.99 USD ≈ RM179.90 (2000 BetaCoins)

**Note**: Apple will automatically convert prices to local currencies, so Malaysian users will see prices in MYR.

### 3. Submit Products for Review

1. **Complete all metadata** for each product
2. **Set appropriate pricing tiers**
3. **Add localization** (English)
4. **Submit for review** in App Store Connect

**Review Process**: Apple typically takes 1-3 days to review IAP products.

### 4. Test with Sandbox Users

#### Create Sandbox Test Users:
1. Go to **Users and Access** → **Sandbox Testers**
2. Click **+** to add new sandbox testers
3. Create test accounts with different email domains
4. Use these accounts to test purchases in the app

#### Testing Process:
1. **Install the app** on a test device
2. **Sign out** of your regular Apple ID
3. **Sign in** with a sandbox test account
4. **Test purchases** using the sandbox environment
5. **Verify BetaCoins** are added to the wallet

### 5. Production Deployment

Once products are approved:
1. **Products will automatically go live** after approval
2. **Real users can make purchases** using their Apple IDs
3. **BetaCoins will be delivered** immediately after successful purchase
4. **Receipts will be generated** for accounting purposes

## Technical Implementation Status ✅

### Code Integration Complete:
- **IAP Service**: Real StoreKit integration implemented
- **Product Loading**: Fetches products from App Store Connect
- **Purchase Flow**: Handles real App Store purchases
- **Transaction Management**: Properly finishes transactions
- **Error Handling**: Comprehensive error handling and logging
- **Purchase Restoration**: Implements Apple's restore purchases feature

### iOS Configuration Complete:
- **Entitlements**: `com.apple.developer.in-app-purchase` enabled
- **App Configuration**: `react-native-iap` plugin configured
- **Build Process**: iOS project builds successfully

## Testing Checklist

### Before App Store Submission:
- [ ] All 6 products have complete metadata
- [ ] Products are submitted for review
- [ ] Products are approved by Apple
- [ ] Sandbox testing completed successfully
- [ ] Purchase flow works end-to-end
- [ ] BetaCoins are added to wallet correctly
- [ ] Purchase restoration works
- [ ] Error handling works properly

### Production Testing:
- [ ] Real purchases work with approved products
- [ ] Receipts are generated correctly
- [ ] BetaCoins are delivered immediately
- [ ] Purchase history is recorded
- [ ] Wallet balance updates correctly

## Troubleshooting

### Common Issues:

1. **"Missing Metadata" Error**:
   - Complete all required fields for each product
   - Ensure pricing tiers are set correctly
   - Add proper localization

2. **Products Not Loading**:
   - Verify products are approved in App Store Connect
   - Check product IDs match exactly in code
   - Ensure app is signed with correct provisioning profile

3. **Purchase Failures**:
   - Test with sandbox users first
   - Verify user is signed into App Store
   - Check device has internet connection

4. **BetaCoins Not Added**:
   - Check purchase listener is working
   - Verify WalletService integration
   - Check transaction finishing process

## Support Resources

- **Apple Developer Documentation**: [In-App Purchase](https://developer.apple.com/in-app-purchase/)
- **App Store Connect Help**: [IAP Configuration](https://help.apple.com/app-store-connect/#/devae49fb6a6)
- **React Native IAP**: [Documentation](https://github.com/dooboolab/react-native-iap)

## Next Steps

1. **Complete product metadata** in App Store Connect
2. **Submit products for review**
3. **Test with sandbox users**
4. **Deploy to production** once approved
5. **Monitor real user purchases**

---

**Status**: 🟡 **Ready for App Store Connect Configuration**
**Next Action**: Complete product metadata and submit for review
**Estimated Time to Production**: 3-5 days (including review time)
