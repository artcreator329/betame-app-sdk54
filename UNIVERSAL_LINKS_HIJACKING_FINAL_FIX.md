# Universal Links Hijacking - Final Fix

## The Problem

Even after updating `.well-known` files and deep link filtering, the app was
STILL hijacking HTTPS verification URLs because of **iOS entitlements caching**.

## Root Cause Found

The issue was in `ios/BetaMe/BetaMe.entitlements`:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:betame.com.my</string>
  <string>webcredentials:betame.com.my</string>
</array>
```

This tells iOS to ALWAYS open the app for ANY `betame.com.my` URL, regardless of
`.well-known` files.

## Complete Fix Applied

### 1. Removed iOS Entitlements

**File:** `ios/BetaMe/BetaMe.entitlements`

```xml
<key>com.apple.developer.associated-domains</key>
<array>
</array>
```

### 2. Added App Detection in Web Page

The verification page now detects if it's opened in the app and redirects to
browser:

```javascript
const isInApp = window.navigator.userAgent.includes("BetaMe") ||
   window.location.protocol === "file:" ||
   !window.location.hostname ||
   window.location.hostname === "localhost";

if (isInApp) {
   // Redirect to browser-only version
}
```

### 3. Created Browser-Only Verification Page

**New file:** `web/auth/verify-email-browser-only.html`

- Designed specifically to work only in browsers
- Provides clear instructions if opened in app
- Includes URL copying functionality

### 4. Multiple Fallback Mechanisms

- Main verification page detects app and redirects
- Browser-only page provides manual instructions
- URL copying functionality for manual browser opening

## Testing the Fix

### Test URLs:

1. **Main verification:**
   `https://betame.com.my/auth/verify-email-universal.html?token_hash=test&type=signup`
2. **Browser-only:**
   `https://betame.com.my/auth/verify-email-browser-only.html?token_hash=test&type=signup`
3. **Debug mode:** Add `&debug=true` to any URL

### Expected Behavior:

1. ✅ Email link opens in BROWSER (not hijacked by app)
2. ✅ If accidentally opened in app, redirects to browser-only version
3. ✅ Browser-only version provides clear instructions
4. ✅ Verification completes in browser
5. ✅ Deep link opens app correctly with `betame://` scheme

## Deployment Steps

### Immediate Fix (No App Rebuild Required):

1. Deploy updated web files to server
2. Use browser-only verification page for testing
3. Update Supabase email template to use browser-only version temporarily

### Complete Fix (Requires App Rebuild):

1. Deploy updated web files
2. Rebuild iOS app with updated entitlements
3. Reinstall app to clear Universal Links cache
4. Switch back to main verification page

## Supabase Email Template Update

### Temporary (Immediate Fix):

```
https://betame.com.my/auth/verify-email-browser-only.html?token_hash={{ .TokenHash }}&type=signup
```

### Permanent (After App Rebuild):

```
https://betame.com.my/auth/verify-email-universal.html?token_hash={{ .TokenHash }}&type=signup
```

## Why This Happens

1. **iOS Universal Links Caching**: iOS aggressively caches Universal Links
   configuration
2. **Entitlements Override**: App entitlements override `.well-known` files
3. **Development Builds**: Dev builds don't always respect `.well-known` changes
   immediately
4. **System-Level Caching**: iOS system caches can persist even after app
   updates

## Prevention for Future

1. **Never add Universal Links** unless absolutely necessary
2. **Use custom URL schemes** (`betame://`) for app-specific links
3. **Keep web verification separate** from app deep linking
4. **Test thoroughly** before adding Universal Links to entitlements

## Verification Checklist

- [ ] Email links open in browser (not app)
- [ ] Browser-only page works correctly
- [ ] App detection and redirection works
- [ ] Deep links (`betame://`) still work for app navigation
- [ ] Auto-login works after email verification
- [ ] Fallback mechanisms work when app not installed

## Files Modified

1. `ios/BetaMe/BetaMe.entitlements` - Removed Universal Links
2. `web/auth/verify-email-universal.html` - Added app detection
3. `web/auth/verify-email-browser-only.html` - New browser-only version
4. `public/.well-known/apple-app-site-association` - Emptied
5. `public/.well-known/assetlinks.json` - Emptied
6. `lib/deep-link-service.ts` - Added HTTPS filtering
7. `hooks/useDeepLinking.ts` - Added HTTPS filtering

The fix ensures email verification ALWAYS happens in the browser first, then
properly redirects to the app via deep links.
