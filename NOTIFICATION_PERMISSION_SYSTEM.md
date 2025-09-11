# Notification Permission System

This document describes the notification permission system that automatically prompts users to enable notifications when they're disabled.

## Overview

The system consists of several components that work together to:
1. **Detect** when notification permissions are disabled
2. **Prompt** users to enable notifications at appropriate times
3. **Provide UI components** for managing notification settings
4. **Respect user preferences** and avoid being intrusive

## Components

### 1. NotificationPermissionService (`lib/notification-permission-service.ts`)

The core service that handles permission checking and prompting logic.

**Key Features:**
- Smart timing to avoid annoying users
- Respects user dismissals (won't prompt again for 24 hours)
- Provides different prompt methods for different use cases
- Tracks permission state using AsyncStorage

**Main Methods:**
```typescript
// Check and prompt if appropriate (respects timing)
await NotificationPermissionService.checkAndPromptIfNeeded();

// Force check (ignores timing restrictions)
await NotificationPermissionService.forceCheckPermissions();

// Get current status without prompting
const status = await NotificationPermissionService.getCurrentPermissionStatus();

// Reset state (for testing/troubleshooting)
await NotificationPermissionService.resetPermissionState();
```

### 2. useNotificationPermissions Hook (`hooks/useNotificationPermissions.ts`)

React hook that provides easy access to notification permission functionality.

**Usage:**
```typescript
import { useNotificationPermissions } from '@/hooks/useNotificationPermissions';

function MyComponent() {
  const { 
    hasPermission, 
    isChecking, 
    checkAndPrompt, 
    forceCheck,
    refreshStatus 
  } = useNotificationPermissions();

  // Component logic here
}
```

**Features:**
- Automatically checks permission status when app becomes active
- Provides loading states
- Handles errors gracefully

### 3. NotificationPermissionBanner (`components/NotificationPermissionBanner.tsx`)

A banner component that can be shown in the UI when permissions are disabled.

**Usage:**
```typescript
import NotificationPermissionBanner from '@/components/NotificationPermissionBanner';

// Show banner when user doesn't have permission
{!hasNotificationPermission && (
  <NotificationPermissionBanner 
    onDismiss={() => setShowBanner(false)}
    showCloseButton={true}
  />
)}
```

### 4. NotificationSettings (`components/NotificationSettings.tsx`)

A comprehensive settings component for managing notification permissions.

**Usage:**
```typescript
import NotificationSettings from '@/components/NotificationSettings';

// In a settings screen
<NotificationSettings 
  showTitle={true}
  style={styles.notificationSettings}
/>
```

## Integration Points

### 1. AuthContext Integration

The system is integrated into the AuthContext to automatically check permissions when users sign in:

```typescript
// In contexts/AuthContext.tsx
setTimeout(async () => {
  try {
    console.log('🔔 AuthContext: Checking notification permissions for user');
    await NotificationPermissionService.checkAndPromptIfNeeded();
  } catch (error) {
    console.error('❌ AuthContext: Error checking notification permissions:', error);
  }
}, 3000); // 3 second delay to let the app fully load
```

### 2. Home Screen Integration

The notification banner is shown on the home screen for authenticated users without permissions:

```typescript
// In app/(tabs)/index.tsx
{user && !hasNotificationPermission && (
  <NotificationPermissionBanner />
)}
```

## User Experience Flow

### 1. New User Sign-In
1. User signs in successfully
2. App loads and settles (3 second delay)
3. System checks if user has notification permissions
4. If not, shows a friendly prompt asking to enable notifications
5. User can choose "Enable" or "Not Now"

### 2. Existing User Without Permissions
1. User opens the app
2. Banner appears on home screen (if they don't have permissions)
3. User can tap "Enable" to grant permissions
4. Banner disappears once permissions are granted

### 3. Settings Management
1. User can go to settings to manage notifications
2. Settings screen shows current permission status
3. User can enable/disable or open system settings
4. Debug options available in development mode

## Smart Timing Logic

The system uses intelligent timing to avoid being intrusive:

- **24-hour cooldown**: Won't prompt again for 24 hours after user dismisses
- **App state awareness**: Checks permissions when app becomes active
- **One-time per session**: Won't repeatedly prompt in the same app session
- **Delayed prompts**: Waits for app to settle before prompting

## Testing

Use the test script to verify functionality:

```javascript
import { testNotificationPermissions } from './scripts/test-notification-permissions';

// Run basic tests
await testNotificationPermissions();

// Reset state and test
await resetAndTestPermissions();

// Force prompt test
await forcePromptTest();
```

## Platform Differences

### iOS
- Uses system permission dialog
- Can't directly open app settings from code
- Provides instructions to manually open settings

### Android
- Uses system permission dialog
- May be able to open app settings directly (device dependent)
- Supports notification channels

## Configuration

### Timing Settings
```typescript
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
```

### Storage Keys
```typescript
const PERMISSION_CHECK_KEY = 'notification_permission_last_check';
const PERMISSION_DISMISSED_KEY = 'notification_permission_dismissed';
```

## Best Practices

1. **Don't be intrusive**: Respect user choices and timing
2. **Provide value**: Explain why notifications are useful
3. **Make it optional**: Always allow users to dismiss or skip
4. **Test thoroughly**: Use the test scripts to verify behavior
5. **Monitor usage**: Track permission grant rates to optimize prompts

## Troubleshooting

### Common Issues

1. **Permissions not working**: Check device settings manually
2. **Prompts not showing**: Verify timing logic and storage state
3. **Banner not appearing**: Check permission status and user authentication

### Debug Tools

- Use `resetPermissionState()` to clear stored state
- Check `getCurrentPermissionStatus()` for detailed status
- Enable debug mode to see additional options in settings
- Use test scripts to verify functionality

## Future Enhancements

Potential improvements to consider:

1. **Analytics**: Track permission grant rates and user behavior
2. **A/B Testing**: Test different prompt messages and timing
3. **Contextual Prompts**: Show prompts when relevant (e.g., before sending a message)
4. **Rich Notifications**: Support for images, actions, and rich content
5. **Notification Categories**: Allow users to choose specific notification types

## Files Modified/Created

### New Files
- `lib/notification-permission-service.ts` - Core service
- `hooks/useNotificationPermissions.ts` - React hook
- `components/NotificationPermissionBanner.tsx` - Banner component
- `components/NotificationSettings.tsx` - Settings component
- `scripts/test-notification-permissions.js` - Test script

### Modified Files
- `contexts/AuthContext.tsx` - Added automatic permission check
- `app/(tabs)/index.tsx` - Added banner display

This system provides a comprehensive, user-friendly way to manage notification permissions while respecting user preferences and avoiding intrusive behavior.