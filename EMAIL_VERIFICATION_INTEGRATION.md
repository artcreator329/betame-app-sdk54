# Email Verification Integration for BetaMe Landing Page

## Overview
This landing page includes integrated email verification functionality for the BetaMe mobile app, enabling seamless user onboarding with automatic login after email verification.

## Files Added

### Email Verification
- `auth/verify-email-universal.html` - Web-based email verification page with auto-login
- `netlify/functions/verify-server.js` - Serverless function for email verification

### Universal Links Configuration
- `.well-known/apple-app-site-association` - iOS Universal Links configuration
- `.well-known/assetlinks.json` - Android App Links configuration

### Deployment Configuration
- `netlify.toml` - Netlify build and deployment configuration
- `_redirects` - URL routing rules for email verification and SPA
- `_headers` - Security headers and CORS configuration

## How It Works

### Email Verification Flow
1. User signs up in mobile app
2. Receives email with verification link: `https://betame.com.my/auth/verify-email-universal.html?token_hash=...`
3. Clicks link → Opens web page → Verifies email with Supabase
4. Web page automatically redirects to mobile app with session tokens
5. Mobile app receives session data and auto-logs user in
6. User is seamlessly authenticated without needing to enter credentials again

### Universal Links
- iOS users: Links open directly in the BetaMe app
- Android users: Links open directly in the BetaMe app
- Fallback: Redirects to App Store/Play Store if app not installed

## Technical Details

### App Integration
The mobile app should handle deep links in the format:
```
betame://auth/verify-email?verified=true&web_verification=success&access_token=...&refresh_token=...
```

### Supabase Configuration
Email templates should use:
```
https://betame.com.my/auth/verify-email-universal.html?token_hash={{ .TokenHash }}&type=signup
```

### Build Process
The build process automatically:
1. Builds the React landing page
2. Copies email verification files
3. Sets up universal links configuration
4. Configures proper routing

## Deployment
Deploy to Netlify with:
```bash
npm run build
# Files are automatically deployed via netlify.toml configuration
```

## Security Features
- Session tokens are securely transferred via URL parameters
- Universal links prevent URL hijacking
- Proper CORS headers for cross-origin requests
- Security headers for XSS protection

## Maintenance
- Email verification logic is self-contained
- Universal links configuration is static
- No database dependencies on landing page side
