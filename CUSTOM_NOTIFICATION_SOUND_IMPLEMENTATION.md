# Custom Notification Sound Implementation

## Overview
The BetaMe app now uses a custom notification sound (`sfx.wav`) instead of the default system sound for all notifications.

## Changes Made

### 1. App Configuration (`app.json`)
- Added `expo-notifications` plugin configuration
- Specified custom sound file: `"./assets/sfx.wav"`
- Set notification icon: `"./assets/images/icon.png"`
- Configured notification color: `"#007AFF"`

### 2. Local Notifications (`lib/local-notifications.ts`)
- Updated Android notification channel to use `sound: 'sfx.wav'`
- Updated notification content to use `sound: 'sfx.wav'` for both iOS and Android
- Added logging to confirm custom sound configuration

### 3. Admin Dashboard (`admin-deploy-temp/lib/local-notifications.ts`)
- Applied the same changes to the admin dashboard notification system

## File Locations
- **Sound File**: `/assets/sfx.wav` (212KB)
- **Icon File**: `/assets/images/icon.png`
- **Configuration**: `app.json`
- **Implementation**: `lib/local-notifications.ts`

## Platform Support
- **iOS**: Custom sound will play when notifications are received
- **Android**: Custom sound configured in notification channel
- **Web**: Uses browser's default notification sound

## Testing
To test the custom notification sound:

1. **Background Testing**:
   - Open the app
   - Go to Profile tab
   - Tap "Test System Notification"
   - Immediately put the app in background
   - Listen for the custom sound

2. **Real Notifications**:
   - Receive any notification (chat, order, etc.)
   - The custom sound should play

## Requirements
- The `sfx.wav` file must be in the `/assets/` directory
- The file must be a valid WAV format
- For iOS, the sound file should be relatively short (under 30 seconds)
- For Android, the sound file is referenced by filename only

## Troubleshooting
If the custom sound doesn't play:

1. **Check File Path**: Ensure `sfx.wav` is in `/assets/` directory
2. **Rebuild App**: Custom sounds require a fresh build
3. **Check Permissions**: Ensure notification permissions are granted
4. **Device Settings**: Check if device is not in silent mode
5. **Platform Differences**: iOS and Android may handle custom sounds differently

## Notes
- The sound file is bundled with the app during build
- Changes to the sound file require a new app build
- The custom sound applies to all notifications in the app
- Fallback to default sound if custom sound fails to load
