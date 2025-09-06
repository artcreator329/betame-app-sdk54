# Add Products to Existing App Version - Quick Solution

## ✅ You Can Use Your Current Version!

### Option 1: Add to Existing Draft Version (EASIEST)

If you already have a version in **"Prepare for Submission"** status:

1. **App Store Connect** → Your App
2. Click on your **existing draft version** (e.g., 1.0.1)
3. Scroll to **"In-App Purchases"** section
4. Click **"+"** to add products:
   - `betacoins_new_20`
   - `betacoins_new_100`
5. **Save** the changes
6. **Submit for Review** (when ready)

**Result**: Products become available in TestFlight immediately after submission!

### Option 2: If Version Already Submitted

If your current version is already **"Waiting for Review"**:

1. You can still **create a new version** (e.g., 1.0.2)
2. But you can also:
   - **Remove from Review** the current version
   - Add the products
   - **Resubmit** the same version

### Option 3: Quick TestFlight-Only Build

You don't need a full App Store release! You can:

1. Increment just the **build number** (not version)
   - Version stays 1.0.0
   - Build goes from 1 → 2
2. Upload to TestFlight
3. Products work in TestFlight without App Store submission

## 🚀 Fastest Solution for TestFlight

### If you just need TestFlight to work NOW:

1. **Keep same version number** (e.g., 1.0.0)
2. **Increment build number** only:
   ```json
   // app.json
   "ios": {
     "buildNumber": "2"  // Increment this
   }
   ```
3. **Archive and upload** to TestFlight
4. TestFlight treats it as a new build with working IAP

## 🎯 The Key Point

You **DON'T** need a new version number! You can:
- ✅ Add products to existing draft version
- ✅ Use same version with new build number
- ✅ Remove and resubmit current version

## 📱 For Your Specific Situation

Since you said "can't submit with newer build version", here's what to do:

1. **Check your current status** in App Store Connect:
   - If **"Prepare for Submission"** → Add products to this version
   - If **"Waiting for Review"** → Remove from review, add products, resubmit
   - If **"In Review"** → Wait or create new version

2. **For immediate TestFlight testing**:
   - Just increment build number
   - Upload to TestFlight
   - No App Store submission needed!

## ⚡ Quick Command

```bash
# Just increment build and upload to TestFlight
eas build --platform ios --profile preview
eas submit -p ios --latest
```

This gives you a TestFlight build with working IAP without changing version!
