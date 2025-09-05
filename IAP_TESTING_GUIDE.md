# IAP Testing Guide - Pre-Apple Review

## 🎯 Overview
This guide helps you test your RevenueCat IAP implementation while waiting for Apple to review your IAP products. You have several testing options available.

## 🚀 Quick Start Testing Options

### **Option 1: StoreKit Configuration File (Recommended)**
**Best for**: Local development testing without Apple approval

#### Setup Steps:
1. **StoreKit Config Created**: `ios/BetaMe/Configuration.storekit` ✅
2. **Open Xcode Project**:
   ```bash
   open ios/BetaMe.xcworkspace
   ```
3. **Configure StoreKit Testing**:
   - In Xcode, go to **Product** → **Scheme** → **Edit Scheme**
   - Select **Run** → **Options** tab
   - Set **StoreKit Configuration** to `Configuration.storekit`
4. **Run App**: Build and run in Xcode simulator or device

#### How It Works:
- Uses local StoreKit configuration instead of App Store Connect
- No internet connection required
- Instant purchase simulation
- Perfect for testing purchase flow logic

### **Option 2: Sandbox Testing**
**Best for**: Testing with real App Store environment

#### Setup Steps:
1. **Create Sandbox Testers**:
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Navigate to **Users and Access** → **Sandbox Testers**
   - Create test accounts with different email domains

2. **Test Account Examples**:
   ```
   Email: test1@example.com
   Password: TestPassword123
   
   Email: test2@testdomain.com  
   Password: TestPassword123
   ```

3. **Testing Process**:
   - Install app on physical device
   - Sign out of regular Apple ID in Settings
   - Sign in with sandbox test account
   - Test purchases (they'll be free in sandbox)

### **Option 3: RevenueCat Test Mode**
**Best for**: Testing RevenueCat integration specifically

#### Setup Steps:
1. **Use Test Configuration**:
   ```typescript
   import { REVENUECAT_TEST_CONFIG } from '@/config/revenuecat-test';
   ```

2. **Enable Test Mode**:
   ```typescript
   // In your RevenueCat service
   const isTestMode = REVENUECAT_TEST_CONFIG.TEST_MODE;
   ```

## 🧪 Testing Scenarios

### **Test Case 1: Basic Purchase Flow**
1. **Initialize RevenueCat** ✅
2. **Load Products** ✅
3. **Display Product List** ✅
4. **Initiate Purchase** ✅
5. **Handle Success/Failure** ✅
6. **Add BetaCoins to Wallet** ✅

### **Test Case 2: Error Handling**
- Network connectivity issues
- Invalid product IDs
- Purchase cancellation
- Payment failures

### **Test Case 3: Purchase Restoration**
- Test "Restore Purchases" functionality
- Verify previous purchases are restored
- Handle restoration errors

### **Test Case 4: Edge Cases**
- Multiple rapid purchases
- App backgrounding during purchase
- Device rotation during purchase
- Low memory scenarios

## 🔧 Testing Tools

### **RevenueCat Test Component**
Use the existing `RevenueCatTest` component:
```typescript
// Navigate to: app/revenuecat-test.tsx
// This provides a full testing interface
```

### **Console Logging**
Enable detailed logging:
```typescript
// In RevenueCat service
console.log('🛒 Purchase initiated:', productId);
console.log('✅ Purchase successful:', result);
console.log('❌ Purchase failed:', error);
```

### **RevenueCat Dashboard**
Monitor test purchases at:
- [RevenueCat Dashboard](https://app.revenuecat.com/)
- Check **Events** tab for purchase events
- Verify **Customer Info** updates

## 📱 Device Testing Setup

### **iOS Simulator Testing**
1. **Open Xcode**
2. **Select iOS Simulator**
3. **Run with StoreKit Config**
4. **Test all purchase flows**

### **Physical Device Testing**
1. **Connect iPhone/iPad**
2. **Build and install app**
3. **Use sandbox test account**
4. **Test real purchase flow**

## 🐛 Common Testing Issues

### **Issue 1: Products Not Loading**
**Symptoms**: Empty product list
**Solutions**:
- Check StoreKit configuration file
- Verify product IDs match exactly
- Ensure RevenueCat API key is correct

### **Issue 2: Purchase Failures**
**Symptoms**: Purchase always fails
**Solutions**:
- Check sandbox account is signed in
- Verify app is signed with correct provisioning profile
- Check RevenueCat dashboard for errors

### **Issue 3: BetaCoins Not Added**
**Symptoms**: Purchase succeeds but no BetaCoins
**Solutions**:
- Check WalletService integration
- Verify purchase listener is working
- Check transaction finishing process

## 📊 Testing Checklist

### **Pre-Testing Setup**
- [ ] StoreKit configuration file created
- [ ] RevenueCat API key configured
- [ ] Test accounts created (if using sandbox)
- [ ] App builds successfully
- [ ] RevenueCat service initializes

### **Purchase Flow Testing**
- [ ] Products load correctly
- [ ] Purchase UI displays properly
- [ ] Purchase initiation works
- [ ] Success handling works
- [ ] Error handling works
- [ ] BetaCoins added to wallet
- [ ] Purchase history updated

### **Edge Case Testing**
- [ ] Network disconnection during purchase
- [ ] App backgrounding during purchase
- [ ] Multiple rapid purchases
- [ ] Purchase restoration
- [ ] Invalid product scenarios

## 🚀 Production Readiness

### **Before Apple Review Approval**
- [ ] All test scenarios pass
- [ ] Error handling works properly
- [ ] Purchase flow is smooth
- [ ] BetaCoins are delivered correctly
- [ ] RevenueCat dashboard shows events

### **After Apple Review Approval**
- [ ] Switch to production RevenueCat config
- [ ] Test with real App Store products
- [ ] Verify pricing displays correctly
- [ ] Test with real Apple ID (small purchase)
- [ ] Monitor production analytics

## 📞 Support Resources

### **RevenueCat Support**
- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [RevenueCat Community](https://community.revenuecat.com/)
- [RevenueCat Dashboard](https://app.revenuecat.com/)

### **Apple Resources**
- [StoreKit Testing Guide](https://developer.apple.com/documentation/storekit/testing)
- [App Store Connect Sandbox](https://appstoreconnect.apple.com/)
- [In-App Purchase Guide](https://developer.apple.com/in-app-purchase/)

---

## 🎯 Next Steps

1. **Start with StoreKit Configuration** (easiest)
2. **Test all purchase flows** thoroughly
3. **Set up sandbox testing** for real environment
4. **Monitor RevenueCat dashboard** for events
5. **Wait for Apple review** while testing continues

**Status**: 🟢 **Ready for Testing**
**Estimated Testing Time**: 2-4 hours for comprehensive testing




