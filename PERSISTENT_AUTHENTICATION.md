# Persistent Authentication Implementation

This document explains how persistent authentication has been implemented to prevent session timeouts and keep users signed in until they explicitly sign out.

## Overview

The app now implements a comprehensive persistent authentication system that ensures users stay signed in across app restarts, network interruptions, and extended periods of inactivity.

## Key Features

### 1. AsyncStorage Persistence
- Sessions are automatically stored in AsyncStorage using Supabase's built-in persistence
- Sessions survive app restarts and device reboots
- No manual session management required

### 2. Automatic Session Refresh
- Sessions are automatically refreshed every 25 minutes (before the 30-minute timeout)
- Prevents session timeouts during extended app usage
- Handles network interruptions gracefully

### 3. Enhanced Error Handling
- Comprehensive error handling for all authentication operations
- Graceful fallback when session refresh fails
- Automatic sign-out when sessions become truly invalid

### 4. Session Manager
- Centralized session management with the `SessionManager` class
- Singleton pattern ensures consistent session state across the app
- Automatic cleanup on app unmount

## Implementation Details

### Supabase Client Configuration (`lib/supabase.ts`)

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable persistent sessions using AsyncStorage
    storage: AsyncStorage,
    // Auto-refresh tokens to prevent session timeouts
    autoRefreshToken: true,
    // Persist session across app restarts
    persistSession: true,
    // Detect session in URL for deep linking
    detectSessionInUrl: false,
  },
});
```

### Session Manager (`lib/session-manager.ts`)

The SessionManager provides:
- Automatic session refresh every 25 minutes
- Manual session refresh capability
- Session validation
- Cleanup utilities

### Enhanced AuthContext (`contexts/AuthContext.tsx`)

The AuthContext now includes:
- Integration with SessionManager
- Automatic session refresh setup
- Enhanced error handling
- Proper cleanup on sign-out

### App-Level Initialization (`app/_layout.tsx`)

Session management is initialized at the app level to ensure:
- Early session restoration
- Consistent session state
- Proper cleanup on app unmount

## How It Works

### 1. App Startup
1. SessionManager initializes and checks for stored sessions
2. Supabase client automatically restores session from AsyncStorage
3. AuthContext detects the restored session and updates app state
4. User remains signed in without requiring re-authentication

### 2. During App Usage
1. SessionManager automatically refreshes sessions every 25 minutes
2. AuthContext monitors auth state changes
3. Failed refresh attempts trigger graceful sign-out
4. Network interruptions are handled transparently

### 3. App Shutdown
1. Session data persists in AsyncStorage
2. SessionManager cleanup removes intervals
3. Next app startup automatically restores session

## Benefits

### For Users
- **No More Session Timeouts**: Users stay signed in until they explicitly sign out
- **Seamless Experience**: No interruptions during extended app usage
- **Offline Resilience**: Sessions survive network interruptions
- **Cross-Device Consistency**: Sessions persist across app restarts

### For Developers
- **Automatic Management**: No manual session handling required
- **Robust Error Handling**: Comprehensive error recovery
- **Debugging Support**: Detailed logging for troubleshooting
- **Testable**: SessionStatus component for testing

## Testing

Use the `SessionStatus` component to test persistent authentication:

```typescript
import SessionStatus from '@/components/SessionStatus';

// Display session status
<SessionStatus />

// Display with manual refresh button
<SessionStatus showRefreshButton={true} />
```

## Configuration

### Session Refresh Interval
Default: 25 minutes (before 30-minute timeout)
Location: `lib/session-manager.ts`

```typescript
// Refresh session every 25 minutes (before the 30-minute timeout)
this.refreshInterval = setInterval(async () => {
  // ... refresh logic
}, 25 * 60 * 1000); // 25 minutes
```

### Supabase Auth Settings
Location: `lib/supabase.ts`

```typescript
auth: {
  storage: AsyncStorage,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
}
```

## Troubleshooting

### Common Issues

1. **Session Not Persisting**
   - Check AsyncStorage permissions
   - Verify Supabase client configuration
   - Check console logs for initialization errors

2. **Frequent Sign-Outs**
   - Check network connectivity
   - Verify session refresh interval
   - Check Supabase project settings

3. **Performance Issues**
   - Monitor session refresh frequency
   - Check for memory leaks in intervals
   - Verify cleanup on component unmount

### Debug Logs

The implementation includes comprehensive logging:
- `🔄 SessionManager:` - Session management operations
- `✅ SessionManager:` - Successful operations
- `❌ SessionManager:` - Error conditions
- `🔄 AuthContext:` - Authentication state changes
- `🔔 AuthContext:` - Chat subscription events

## Security Considerations

1. **Token Storage**: Sessions are stored securely in AsyncStorage
2. **Automatic Cleanup**: Sessions are cleared on explicit sign-out
3. **Error Recovery**: Invalid sessions trigger automatic sign-out
4. **Network Security**: All communication uses HTTPS

## Future Enhancements

1. **Biometric Authentication**: Add fingerprint/face ID support
2. **Multi-Device Sync**: Synchronize sessions across devices
3. **Advanced Analytics**: Track session patterns and user behavior
4. **Custom Timeouts**: Configurable session timeout periods

## Conclusion

This persistent authentication implementation ensures users have a seamless, uninterrupted experience while maintaining security and reliability. The system automatically handles session management, preventing timeouts and providing a smooth user experience. 