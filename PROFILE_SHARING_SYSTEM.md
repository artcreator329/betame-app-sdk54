# Profile Sharing System Documentation

## Overview

The profile sharing system allows users to share their profiles with others through deep links. When someone receives a shared profile link, it will:

1. **If they have the app installed**: Open the profile directly in the BetaMe app
2. **If they don't have the app**: Show a web page prompting them to download the app

## Components

### 1. Deep Link Service (`lib/deep-link-service.ts`)

Handles all deep linking functionality:
- Generates deep links for profiles
- Creates universal links that work on web and mobile
- Handles incoming deep links
- Provides app store links for fallback

**Key Methods:**
- `generateProfileLink(userId, userName?)` - Creates app-specific deep link
- `generateUniversalProfileLink(userId, userName?)` - Creates web-compatible link
- `generateSmartLink(userId, userName?, userBio?)` - Creates intelligent link with fallback
- `handleIncomingLink(url)` - Parses and handles incoming deep links

### 2. Profile Share Modal (`components/ProfileShareModal.tsx`)

A modal component that provides multiple sharing options:
- Native share (uses device's built-in sharing)
- Copy link to clipboard
- Share via message
- Share via email

### 3. Deep Linking Hook (`hooks/useDeepLinking.ts`)

React hook that:
- Listens for incoming deep links
- Handles app state changes
- Routes users to appropriate screens based on deep link

### 4. Dynamic Profile Page (`app/profile/[userId].tsx`)

A new page that displays any user's profile:
- Shows user information, services, and reviews
- Allows starting chats with other users
- Includes share functionality
- Handles loading states and errors

### 5. Web Fallback (`web-fallback/smart-link.html`)

A standalone HTML page that:
- Attempts to open the app automatically
- Shows profile information if available
- Provides download links for app stores
- Detects user's platform (iOS/Android/Web)

## Deep Link Structure

### App Deep Links
```
betame://profile/[userId]?name=[userName]
```

### Universal Links
```
https://betame.com.my/profile/[userId]?name=[userName]
```

### Smart Links (with fallback)
```
https://betame.com.my/smart-link?userId=[userId]&name=[userName]&bio=[userBio]&deepLink=[encodedDeepLink]
```

## Configuration

### App Configuration (`app.json`)

Added linking configuration:
```json
{
  "linking": {
    "prefixes": ["betame://", "https://betame.com.my"],
    "config": {
      "screens": {
        "profile/[userId]": "profile/:userId"
      }
    }
  }
}
```

### URL Scheme
- **App Scheme**: `betame://` (defined in app.json)
- **Domain**: `betame.com.my` (your actual domain)

## Usage

### Sharing a Profile

1. User opens their profile or views another user's profile
2. Taps the share button
3. ProfileShareModal opens with sharing options
4. User selects sharing method (native share, copy link, etc.)
5. Smart link is generated and shared

### Receiving a Shared Profile

1. User receives link via message, email, etc.
2. **If app is installed**: Link opens profile directly in app
3. **If app is not installed**: Web fallback page opens
4. Web page attempts to open app, shows download options if needed

## Implementation Steps Completed

1. ✅ Created `DeepLinkService` for link generation and handling
2. ✅ Built `ProfileShareModal` component for sharing UI
3. ✅ Added `useDeepLinking` hook for link handling
4. ✅ Created dynamic profile page at `app/profile/[userId].tsx`
5. ✅ Updated main profile page to use new sharing system
6. ✅ Added deep linking configuration to `app.json`
7. ✅ Created web fallback page for users without the app
8. ✅ Integrated deep linking into root layout

## Testing

### Test Deep Links

You can test the deep linking system using these URLs:

**App Deep Link:**
```
betame://profile/[actual-user-id]?name=TestUser
```

**Universal Link:**
```
https://betame.com.my/profile/[actual-user-id]?name=TestUser
```

**Smart Link:**
```
https://betame.com.my/smart-link?userId=[actual-user-id]&name=TestUser&bio=Amazing%20service%20provider&deepLink=betame%3A//profile/[actual-user-id]%3Fname%3DTestUser
```

### Testing Steps

1. **With App Installed:**
   - Open any of the test links above
   - Should open the profile page in the app

2. **Without App Installed:**
   - Open the smart link in a web browser
   - Should show the web fallback page
   - Should attempt to open app and show download options

3. **Sharing Flow:**
   - Open any profile in the app
   - Tap share button
   - Try different sharing methods
   - Verify links work correctly

## Customization

### App Store Links

Update the app store links in `DeepLinkService`:
```typescript
static getAppStoreLinks() {
  return {
    ios: 'https://apps.apple.com/app/betame/id[YOUR_APP_ID]',
    android: 'https://play.google.com/store/apps/details?id=com.artcreator329.boltexponativewind',
    web: 'https://betame.com.my'
  };
}
```

### Domain Configuration

The domain `betame.com.my` is configured in:
- `lib/deep-link-service.ts`
- `web-fallback/smart-link.html`
- `app.json` linking configuration

### Styling

The web fallback page can be customized by editing `web-fallback/smart-link.html`. The current design includes:
- Responsive layout
- Gradient backgrounds
- App store buttons
- Profile information display
- Loading states

## Security Considerations

1. **User ID Validation**: Always validate user IDs before displaying profiles
2. **Privacy**: Only show public profile information in shared links
3. **Rate Limiting**: Consider implementing rate limiting for profile sharing
4. **Deep Link Validation**: Validate all incoming deep link parameters

## Future Enhancements

1. **Analytics**: Track sharing and conversion metrics
2. **Custom Domains**: Support custom branded domains
3. **QR Codes**: Generate QR codes for profile sharing
4. **Social Media Integration**: Add specific sharing for social platforms
5. **Referral System**: Track who shared profiles and reward referrals