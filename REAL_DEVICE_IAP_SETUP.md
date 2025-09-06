# Real Device IAP Setup - Fix Physical Device Testing

## 🚨 Problem Identified

**Simulator**: Shows Apple purchase dialog ✅ (using StoreKit Configuration)  
**Real Device**: No purchase dialog ❌ (trying to connect to App Store Connect)

## 🔍 Root Cause

Physical devices bypass StoreKit Configuration files and connect directly to App Store Connect. Your products are currently in `"READY_TO_SUBMIT"` status, which prevents real device testing.

## ✅ Solution Steps

### **Step 1: Update Product Status in App Store Connect**

1. **Go to**: [App Store Connect](https://appstoreconnect.apple.com)
2. **Navigate**: Your App → Features → In-App Purchases
3. **Find Products**:
   - `betacoins_new_20`
   - `betacoins_new_100`

### **Step 2: Change Product Status for Testing**

For each product:

1. **Current Status**: "Ready to Submit" 
2. **Required Action**: Submit for Review OR set to "Approved for Sale"
3. **Alternative**: Create a new app version and include these products

### **Step 3: Sandbox Testing Setup**

For immediate real device testing:

1. **Create Sandbox Tester**:
   - App Store Connect → Users and Access → Sandbox Testers
   - Create a test Apple ID (different from your personal one)

2. **Configure Device**:
   - **Sign out** of App Store on physical device
   - **Sign in** with sandbox tester account
   - Go to Settings → App Store → Sandbox Account

3. **Test App**:
   - Install your app on physical device
   - Try BetaCoin purchase
   - Should show real Apple purchase dialog

### **Step 4: Alternative - TestFlight Distribution**

1. **Upload to TestFlight**: Build and upload your app
2. **Internal Testing**: Add yourself as internal tester
3. **Install via TestFlight**: Download app through TestFlight
4. **Test IAP**: Should work with sandbox purchases

## 🔧 Quick Fix Commands

### **Build for TestFlight**
```bash
# Build release version
npx expo build:ios --type archive

# Or using EAS
eas build --platform ios
```

### **Local Testing Setup**
```bash
# Ensure latest build
npx expo run:ios --configuration Release
```

## 📱 Expected Results After Fix

### **Simulator** (StoreKit Config)
```
✅ Apple purchase dialog appears
✅ Products: betacoins_new_20, betacoins_new_100
✅ Testing mode: "For testing purposes only"
```

### **Real Device** (App Store Connect)
```
✅ Apple purchase dialog appears
✅ Sandbox testing with real Apple ID
✅ Actual App Store purchase flow
```

## 🎯 Immediate Action Required

**Choose one of these options:**

### **Option A: Sandbox Testing** (Recommended for immediate testing)
1. Create sandbox Apple ID
2. Sign out of App Store on device
3. Sign in with sandbox account
4. Test purchases

### **Option B: Submit for Review** (For production)
1. Submit app with IAP products for review
2. Wait for Apple approval
3. Products become available for real purchases

### **Option C: TestFlight** (Best for team testing)
1. Upload build to TestFlight
2. Add testers
3. Test via TestFlight app

## 🔍 Verification Steps

1. **Check Product Status**: App Store Connect → In-App Purchases
2. **Verify Sandbox Setup**: Device signed into sandbox account
3. **Test Purchase**: Should show real Apple dialog on device
4. **Check Logs**: Should see successful purchase flow

## ⚠️ Important Notes

- **StoreKit Config**: Only works in simulator/Xcode
- **Real Devices**: Need App Store Connect configuration
- **Sandbox Testing**: Requires sandbox Apple ID
- **Production**: Requires approved products

## 🎉 Success Indicators

✅ **Real device shows Apple purchase dialog**  
✅ **Sandbox purchases complete successfully**  
✅ **BetaCoins added to wallet**  
✅ **No "simulation" messages in logs**

The key is setting up proper sandbox testing for real device development!
