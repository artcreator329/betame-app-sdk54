# Notification Troubleshooting Guide

## Why System Notifications Might Not Show Up

### 1. **Permissions Not Granted**
- The app needs explicit permission to show notifications
- Check the test panel status indicator
- Tap "Enable" if permissions are disabled

### 2. **App is in Foreground**
- iOS and Android typically don't show system notifications when the app is active
- **Solution**: Put the app in background or close it, then test notifications

### 3. **Device Settings**
- User might have disabled notifications for the app in device settings
- **iOS**: Settings > Notifications > BetaMe
- **Android**: Settings > Apps > BetaMe > Notifications

### 4. **Do Not Disturb Mode**
- Device might be in silent/do not disturb mode
- Check device notification settings

## How to Test System Notifications

### Method 1: Background Testing
1. Open the app
2. Go to Profile tab
3. Tap "Test System Notification" in the test panel
4. **Immediately put the app in background** (home button/gesture)
5. Wait 2-3 seconds
6. Check notification center

### Method 2: Close App Testing
1. Open the app
2. Go to Profile tab  
3. Tap "Test System Notification"
4. **Close the app completely**
5. Wait 2-3 seconds
6. Check notification center

### Method 3: Use Another Device/Simulator
1. Test on a different device
2. Use iOS Simulator or Android Emulator
3. Ensure fresh permissions state

## Expected Behavior

### ✅ **Working System Notifications**
```
📱 Device Notification Center:
┌─────────────────────────────┐
│ BetaMe                  now │
│ 🧪 Test System Notification │
│ This is a test system...    │
└─────────────────────────────┘
```

### ✅ **Working In-App Notifications**
```
📱 Notifications Tab:
🧪 Test System Notification                    just now
This is a test system notification! If you see this...
```

## Debug Steps

### 1. Check Console Logs
Look for these messages:
```
✅ Local notifications configured successfully with permissions
📱 Sending system notification: "Test Title"
✅ System notification sent with ID: abc123
```

### 2. Check Permission Status
The test panel shows:
- ✅ **System Notifications: Enabled** (Good)
- ❌ **System Notifications: Disabled** (Needs fix)

### 3. Manual Permission Check
```javascript
// In browser console or debug mode
import { checkNotificationPermissions } from './lib/local-notifications';
const hasPermission = await checkNotificationPermissions();
console.log('Has permission:', hasPermission);
```

## Platform-Specific Issues

### iOS
- Notifications don't show when app is in foreground by default
- Need to configure notification presentation options
- Simulator might behave differently than real device

### Android
- Need notification channels (handled automatically)
- Different Android versions have different behaviors
- Some manufacturers have aggressive battery optimization

## Quick Fixes

### Fix 1: Reset Permissions
1. Go to device Settings
2. Find BetaMe app
3. Reset notification permissions
4. Reopen app and grant permissions

### Fix 2: Test on Real Device
- Simulators sometimes don't show notifications properly
- Test on physical iOS/Android device

### Fix 3: Check Notification Settings
```javascript
// Add this to test panel for debugging
const debugNotifications = async () => {
  const mod = await import('expo-notifications');
  const permissions = await mod.getPermissionsAsync();
  console.log('Full permission object:', permissions);
};
```

## Success Indicators

### ✅ **Everything Working**
1. Test panel shows "System Notifications: ✅ Enabled"
2. Console shows "✅ System notification sent with ID: ..."
3. Notification appears in device notification center
4. Notification appears in app's Notifications tab
5. Tapping notification navigates correctly

### ❌ **Something Wrong**
1. Test panel shows "System Notifications: ❌ Disabled"
2. Console shows "❌ Notification permission denied"
3. No notification in device notification center
4. Error messages in console

## Testing Checklist

- [ ] Permissions granted in app
- [ ] Permissions enabled in device settings
- [ ] App put in background during test
- [ ] Do Not Disturb mode disabled
- [ ] Tested on real device (not just simulator)
- [ ] Console logs show success messages
- [ ] Notification appears in notification center
- [ ] Notification appears in app notifications tab