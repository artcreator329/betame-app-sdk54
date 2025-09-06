# App Store Connect - Complete BetaCoin Products Setup

## 🎯 Products to Create in App Store Connect

You need to create these **6 consumable products** in App Store Connect:

### 1. **20 BetaCoins Pack**
- **Product ID**: `betacoins_new_20`
- **Reference Name**: 20 BetaCoins Pack
- **Price**: RM 4.90 (Tier 3)
- **Description**: Purchase 20 BetaCoins to boost your services and unlock premium features in the BetaMe marketplace app
- **Malay Description**: Beli 20 BetaCoins untuk meningkatkan perkhidmatan anda dan membuka kunci ciri premium dalam aplikasi BetaMe

### 2. **100 BetaCoins Pack** ⭐ MOST POPULAR
- **Product ID**: `betacoins_new_100`
- **Reference Name**: 100 BetaCoins Pack
- **Price**: RM 19.90 (Tier 11)
- **Description**: Purchase 100 BetaCoins to boost your services and unlock premium features in the BetaMe marketplace app
- **Malay Description**: Beli 100 BetaCoins untuk meningkatkan perkhidmatan anda dan membuka kunci ciri premium dalam aplikasi BetaMe

### 3. **250 BetaCoins Pack**
- **Product ID**: `betacoins_new_250`
- **Reference Name**: 250 BetaCoins Pack
- **Price**: RM 34.90 (Tier 19)
- **Description**: Purchase 250 BetaCoins - Great value pack for frequent users
- **Malay Description**: Beli 250 BetaCoins - Pakej nilai hebat untuk pengguna kerap

### 4. **600 BetaCoins Pack**
- **Product ID**: `betacoins_new_600`
- **Reference Name**: 600 BetaCoins Pack
- **Price**: RM 79.90 (Tier 42)
- **Description**: Purchase 600 BetaCoins - Power user pack with bonus coins
- **Malay Description**: Beli 600 BetaCoins - Pakej pengguna kuasa dengan syiling bonus

### 5. **1000 BetaCoins Pack** 💎 BEST VALUE
- **Product ID**: `betacoins_new_1000`
- **Reference Name**: 1000 BetaCoins Pack
- **Price**: RM 99.90 (Tier 52)
- **Description**: Purchase 1000 BetaCoins - Best value per coin
- **Malay Description**: Beli 1000 BetaCoins - Nilai terbaik setiap syiling

### 6. **2000 BetaCoins Pack** 👑 ULTIMATE
- **Product ID**: `betacoins_new_2000`
- **Reference Name**: 2000 BetaCoins Pack
- **Price**: RM 179.90 (Tier 92)
- **Description**: Purchase 2000 BetaCoins - Ultimate pack for business users
- **Malay Description**: Beli 2000 BetaCoins - Pakej muktamad untuk pengguna perniagaan

## 📱 Step-by-Step Setup

### 1. Access App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your **BetaMe** app
3. Navigate to **Features** → **In-App Purchases**

### 2. Create Each Product
For each product above:

1. Click **"+"** to create new
2. Select **"Consumable"**
3. Enter the **Product ID** exactly as shown
4. Fill in:
   - **Reference Name**
   - **Price Schedule** (select the tier)
   - **Localizations** (English and Malay)
   - **Review Information**

### 3. Important Settings
- **Cleared for Sale**: ✅ Yes
- **Screenshot**: Upload any BetaCoin purchase screenshot
- **Review Notes**: "Virtual currency for in-app features"

### 4. Submit with App Version
After creating all 6 products:

1. Go to your app version (or create new)
2. In **"In-App Purchases"** section
3. Click **"+"** and add all 6 products
4. Submit for review

## 🚀 RevenueCat Setup

After App Store Connect setup:

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select **BetaMe** project
3. Navigate to **Products** → **Add Product**
4. Add each product with matching Product IDs
5. Create/Update offering to include all 6 products

## ✅ Verification

Once setup is complete:
- Products show in TestFlight immediately after submission
- Simulator shows all 6 options via StoreKit Configuration
- Production users see products after Apple approval

## 💡 Price Tiers Reference

| BetaCoins | Price (RM) | Tier | Savings |
|-----------|------------|------|---------|
| 20        | 4.90       | 3    | -       |
| 100       | 19.90      | 11   | ~19%    |
| 250       | 34.90      | 19   | ~43%    |
| 600       | 79.90      | 42   | ~46%    |
| 1000      | 99.90      | 52   | ~59%    |
| 2000      | 179.90     | 92   | ~63%    |

**Note**: Savings calculated based on base rate of RM 0.245/coin (20 pack)
