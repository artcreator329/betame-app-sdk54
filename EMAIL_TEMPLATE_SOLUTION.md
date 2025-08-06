# Email Template Solution for Deep Linking

## Problem
The current email template using `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup` creates a redirect loop because it redirects back to the same URL without proper token handling.

## Solution
We need to customize the Supabase email templates to create proper deep links that work with our mobile app's verification flow.

## Required Email Template Changes

### 1. Confirm Signup Template
Replace the current template with:

```html
<h2>Confirm your signup</h2>
<p>Welcome to BetaMe! Please confirm your email address to complete your registration.</p>
<p>
  <a href="betame://auth/verify-email?token_hash={{ .TokenHash }}&type=signup" 
     style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
    Confirm Your Email
  </a>
</p>
<p>If the button doesn't work, copy and paste this link into your mobile browser:</p>
<p><code>betame://auth/verify-email?token_hash={{ .TokenHash }}&type=signup</code></p>
<p>This link will expire in 24 hours for security reasons.</p>
```

### 2. Password Recovery Template
Update the recovery template:

```html
<h2>Reset Your Password</h2>
<p>You requested a password reset for your BetaMe account.</p>
<p>
  <a href="betame://auth/reset-password?token_hash={{ .TokenHash }}&type=recovery" 
     style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
    Reset Password
  </a>
</p>
<p>If the button doesn't work, copy and paste this link into your mobile browser:</p>
<p><code>betame://auth/reset-password?token_hash={{ .TokenHash }}&type=recovery</code></p>
<p>This link will expire in 1 hour for security reasons.</p>
```

### 3. Magic Link Template
Update the magic link template:

```html
<h2>Your Magic Link</h2>
<p>Click the link below to sign in to your BetaMe account:</p>
<p>
  <a href="betame://auth/verify-email?token_hash={{ .TokenHash }}&type=magiclink" 
     style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
    Sign In
  </a>
</p>
<p>If the button doesn't work, copy and paste this link into your mobile browser:</p>
<p><code>betame://auth/verify-email?token_hash={{ .TokenHash }}&type=magiclink</code></p>
<p>This link will expire in 1 hour for security reasons.</p>
```

## Implementation Steps

### Step 1: Update Supabase Email Templates
1. Go to [Supabase Dashboard Email Templates](https://supabase.com/dashboard/project/rkcfgebgpixgfvggbwmc/auth/templates)
2. Update each template with the HTML above
3. Save the changes

### Step 2: Configure Redirect URLs
1. Go to [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/rkcfgebgpixgfvggbwmc/auth/url-configuration)
2. Add `betame://**` to the redirect URL allow list
3. Ensure `betame://auth/verify-email` is in the list
4. Ensure `betame://auth/reset-password` is in the list

### Step 3: Update Verification Screen (if needed)
The current `verify-email.tsx` should work correctly with these templates as it expects:
- `token_hash` parameter (mapped to `token` in the component)
- `type` parameter

### Step 4: Test the Flow
1. Sign up with a new email
2. Check the email for the verification link
3. Click the link on a mobile device
4. Verify the app opens and completes verification

## Key Points

1. **Direct Deep Links**: The templates now create direct `betame://` URLs instead of redirecting through Supabase
2. **Token Hash**: Using `{{ .TokenHash }}` which is the hashed version of the token
3. **Type Parameter**: Including the correct type for each flow (signup, recovery, magiclink)
4. **Fallback**: Providing the raw URL as text for manual copying if needed
5. **Security**: Links include expiration information

## Alternative: OTP-Based Verification

If deep linking continues to cause issues, you can use OTP-based verification:

```html
<h2>Confirm your signup</h2>
<p>Welcome to BetaMe! Use this 6-digit code to verify your email:</p>
<div style="text-align: center; margin: 20px 0;">
  <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #3B82F6;">{{ .Token }}</span>
</div>
<p>Open the BetaMe app and enter this code to complete your registration.</p>
<p>This code will expire in 10 minutes for security reasons.</p>
```

This approach requires updating the app to accept OTP codes instead of handling deep links.