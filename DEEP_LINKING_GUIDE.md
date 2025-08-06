# Deep Linking Implementation Guide

## Overview
This app now supports deep linking for email verification and password reset flows. Users will be automatically redirected back to the app after clicking links in their emails.

## Deep Link Scheme
- **Scheme**: `betame://`
- **Bundle ID**: `com.betame.app`

## Implemented Deep Links

### 1. Email Verification
- **URL Pattern**: `betame://auth/verify-email?token=<token>&type=signup`
- **Flow**: 
  1. User signs up with email/password
  2. Receives verification email with deep link
  3. Clicks link → opens app → auto-verifies → redirects to appropriate dashboard

### 2. Password Reset
- **URL Pattern**: `betame://auth/reset-password?token=<token>&type=recovery`
- **Flow**:
  1. User requests password reset
  2. Receives reset email with deep link
  3. Clicks link → opens app → shows password reset form

### 3. OAuth Callback
- **URL Pattern**: `betame://auth/callback`
- **Flow**:
  1. User initiates Google/Apple sign-in
  2. Completes OAuth flow
  3. Redirects back to app → auto-signs in → redirects to dashboard

## Files Modified

### Configuration
- `app.json`: Updated scheme and bundle identifiers
- `_layout.tsx`: Added deep link screens to navigation stack

### Authentication Service
- `auth-service.ts`: Updated redirect URLs for all auth flows

### New Screens
- `auth/verify-email.tsx`: Handles email verification
- `auth/reset-password.tsx`: Handles password reset
- `auth/callback.tsx`: Handles OAuth callbacks

### Updated Screens
- `auth/login.tsx`: Modified sign-up flow to show email verification message

## Testing Deep Links

### Development Testing
1. **iOS Simulator**: Use `xcrun simctl openurl booted "betame://auth/verify-email?token=test"`
2. **Android Emulator**: Use `adb shell am start -W -a android.intent.action.VIEW -d "betame://auth/verify-email?token=test"`
3. **Physical Device**: Send yourself the deep link via email/message

### Production Testing
1. Complete actual sign-up flow
2. Check email for verification link
3. Click link on mobile device
4. Verify app opens and completes verification

## Security Considerations

1. **Token Validation**: All tokens are validated server-side via Supabase
2. **Error Handling**: Invalid/expired tokens show appropriate error messages
3. **Fallback Navigation**: Failed verifications redirect to login screen
4. **Session Management**: Proper cleanup and state management throughout flows

## Troubleshooting

### Common Issues
1. **App doesn't open**: Check if scheme is registered correctly in app.json
2. **Invalid token errors**: Tokens may have expired (check Supabase settings)
3. **Navigation issues**: Ensure all screens are properly added to navigation stack

### Debug Steps
1. Check console logs for navigation and auth state changes
2. Verify Supabase auth settings match redirect URLs
3. Test with fresh app install to simulate new user experience

## Next Steps

1. **Testing**: Thoroughly test all deep link flows on both iOS and Android
2. **Analytics**: Consider adding analytics to track deep link usage
3. **Error Reporting**: Implement crash reporting for deep link failures
4. **User Experience**: Consider adding loading states and better error messages