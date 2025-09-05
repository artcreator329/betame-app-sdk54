# RevenueCat Setup Guide for BetaMe App

## Overview
This guide will help you set up RevenueCat for in-app purchases of BetaCoins in your BetaMe app. RevenueCat provides a robust solution with better analytics, cross-platform support, and subscription management.

## What RevenueCat Provides

### ✅ **Key Benefits**
- **Better Analytics**: Detailed purchase analytics and user behavior insights
- **iOS-Only**: Optimized for iOS App Store in-app purchases
- **Subscription Management**: Built-in subscription handling and renewal logic
- **Receipt Validation**: Server-side receipt validation for security
- **A/B Testing**: Test different pricing and product configurations
- **Web Dashboard**: Comprehensive dashboard for monitoring purchases
- **Customer Support**: Better error handling and user support tools

### 📱 **Platform Strategy**
- **iOS**: RevenueCat for in-app purchases through App Store
- **Android**: Curlec payment gateway for direct payments
- **Web**: Curlec payment gateway for web-based purchases

### 🔄 **Migration Benefits**
- **Simplified Code**: Cleaner, more maintainable purchase logic
- **Better Error Handling**: More specific error codes and messages
- **Automatic Sync**: Automatic purchase synchronization across devices
- **Offline Support**: Handles offline purchase scenarios better

## Step 1: RevenueCat Account Setup

### 1.1 Create RevenueCat Account
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Sign up for a free account
3. Create a new project for "BetaMe App"

### 1.2 Get API Keys
1. In your RevenueCat dashboard, go to **Project Settings** → **API Keys**
2. Copy your **iOS API Key** (Android uses Curlec instead)
3. Update `config/revenuecat.ts` with your iOS key:

```typescript
export const REVENUECAT_CONFIG = {
  IOS_API_KEY: 'appl_YOUR_ACTUAL_IOS_KEY_HERE',
  // Note: Android uses Curlec payment system
  // ... rest of config
};
```

## Step 2: App Store Connect Configuration

### 2.1 Product Setup
RevenueCat will automatically sync with your existing App Store Connect products. Ensure these are configured:

| Product ID | BetaCoins | Price (MYR) | Status |
|------------|-----------|--------------|---------|
| `betacoins_20` | 20 | RM4.90 | ✅ Active |
| `betacoins_100` | 100 | RM19.90 | ✅ Active |
| `betacoins_250` | 250 | RM34.90 | ✅ Active |
| `betacoins_600` | 600 | RM79.90 | ✅ Active |
| `betacoins_1000` | 1000 | RM99.90 | ✅ Active |
| `betacoins_2000` | 2000 | RM179.90 | ✅ Active |

### 2.2 RevenueCat Product Configuration
1. In RevenueCat dashboard, go to **Products**
2. Create a new **Offering** called "BetaCoin Bundles"
3. Add all 6 BetaCoin products to this offering
4. Set the offering as **Current** (this makes it the default)

## Step 3: Code Implementation

### 3.1 Service Integration ✅ **COMPLETED**
The `RevenueCatIAPService` has been implemented and replaces the old `IAPService`:

```typescript
// Old implementation
import IAPService from '@/lib/iap-service';

// New implementation  
import RevenueCatIAPService from '@/lib/revenuecat-iap-service';
```

### 3.2 Component Updates ✅ **COMPLETED**
The `BetaCoinPurchase` component has been updated to use RevenueCat:

```typescript
const iapService = RevenueCatIAPService.getInstance();
await iapService.initialize();
```

### 3.3 Configuration ✅ **COMPLETED**
The `config/revenuecat.ts` file has been created with your iOS API key. Android users will continue using the Curlec payment system.

## Step 4: Testing Setup

### 4.1 Sandbox Testing
1. **iOS**: Use App Store Connect sandbox testers
2. **Android**: Use Google Play Console test accounts
3. **RevenueCat**: Monitor purchases in the dashboard

### 4.2 Test Purchase Flow
1. Initialize RevenueCat service
2. Load products from RevenueCat
3. Make test purchase
4. Verify BetaCoins added to wallet
5. Check RevenueCat dashboard for analytics

## Step 5: Production Deployment

### 5.1 App Store Submission
1. Ensure all products are approved in App Store Connect
2. Submit app update with RevenueCat integration
3. Test with real users after approval

### 5.2 RevenueCat Monitoring
1. Monitor purchase success rates
2. Track user behavior and conversion
3. Analyze revenue and product performance

## Code Structure

### File Organization
```
lib/
├── revenuecat-iap-service.ts    # Main RevenueCat service
├── iap-service.ts               # Old service (can be removed)
└── wallet-service.ts            # Wallet integration

config/
└── revenuecat.ts                # RevenueCat configuration

components/
└── BetaCoinPurchase.tsx         # Updated purchase component
```

### Key Methods
```typescript
// Initialize service
await RevenueCatIAPService.getInstance().initialize();

// Set user ID
await iapService.setUser(userId);

// Purchase product
const result = await iapService.purchaseProduct(productId, userId);

// Restore purchases
await iapService.restorePurchases();

// Get customer info
const customerInfo = await iapService.getCustomerInfo();
```

## RevenueCat Dashboard Features

### 📊 **Analytics Dashboard**
- Purchase conversion rates
- Revenue tracking
- User behavior insights
- Product performance metrics

### 👥 **User Management**
- Customer profiles
- Purchase history
- Subscription status
- Support tools

### 🔧 **Product Management**
- Offerings and packages
- A/B testing
- Pricing optimization
- Product performance

## Troubleshooting

### Common Issues

#### 1. **Products Not Loading**
- Check RevenueCat API keys in config
- Verify products are added to offerings
- Check App Store Connect product status

#### 2. **Purchase Failures**
- Ensure user is logged in to RevenueCat
- Check product IDs match exactly
- Verify sandbox testing setup

#### 3. **BetaCoins Not Added**
- Check purchase listener setup
- Verify WalletService integration
- Check customer info updates

### Debug Commands
```typescript
// Enable debug logging
Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);

// Check service status
const isInitialized = await iapService.initialize();
console.log('Service initialized:', isInitialized);

// Verify products loaded
const products = iapService.getProducts();
console.log('Products loaded:', products.length);
```

## Migration Checklist

### ✅ **Completed Tasks**
- [x] Install `react-native-purchases` package
- [x] Create `RevenueCatIAPService` class
- [x] Update `BetaCoinPurchase` component
- [x] Create configuration file
- [x] Replace old IAP service references

### 🔄 **Next Steps**
- [x] Get RevenueCat iOS API key
- [ ] Configure products in RevenueCat dashboard
- [ ] Test sandbox purchases on iOS
- [ ] Deploy to production
- [ ] Monitor analytics

## Support Resources

### RevenueCat Documentation
- [Getting Started](https://docs.revenuecat.com/docs/react-native)
- [iOS Setup](https://docs.revenuecat.com/docs/ios)
- [Android Setup](https://docs.revenuecat.com/docs/android)
- [API Reference](https://docs.revenuecat.com/reference)

### BetaMe App Support
- Check console logs for detailed error messages
- Verify configuration in `config/revenuecat.ts`
- Test with sandbox accounts first

---

**Status**: 🟡 **Ready for RevenueCat Configuration**
**Next Action**: Get API keys and configure products in RevenueCat dashboard
**Estimated Time to Production**: 2-3 days (including testing)

## Quick Start Commands

```bash
# Install RevenueCat SDK (already done)
npm install react-native-purchases

# Update configuration
# Edit config/revenuecat.ts with your API keys

# Test the integration
npm run ios  # or npm run android
```

The RevenueCat integration is now complete and ready for your API keys and product configuration!
