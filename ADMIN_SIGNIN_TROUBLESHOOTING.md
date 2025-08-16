# Admin Sign-In Flow Troubleshooting Guide

## What We've Implemented

### ✅ Backend (Database)
- **Admin Detection Function**: `is_user_admin(user_id)` - secure database function
- **RLS Policies**: Proper row-level security for admin_roles table
- **Admin Roles Table**: Contains admin user mappings

### ✅ Frontend Components
- **AdminSignInChoiceModal**: Modal with "Continue to App" and "Go to Dashboard" options
- **Admin Preferences Service**: Stores user choices in AsyncStorage
- **Enhanced Login Flow**: Detects admin users and shows choice modal
- **Admin Preferences Page**: Full UI for managing sign-in behavior

## Testing Steps

### 1. Verify Database Setup
Run this to confirm your admin user exists:
```bash
node scripts/final-admin-signin-test.js
```

Expected output: "Admin detection result: true"

### 2. Test in App (Temporary Debug Component)

Add this to any screen to test the flow:
```tsx
import { AdminFlowDebugger } from '@/components/AdminFlowDebugger';

// In your component's render:
<AdminFlowDebugger />
```

This will show:
- Current user info
- Admin status check
- Modal trigger test
- Debug information

### 3. Manual Testing Steps

1. **Sign in with admin account** (`developer@betame.com.my`)
2. **Check console logs** for any errors
3. **Look for the modal** - it should appear automatically
4. **If modal doesn't appear**, use the debug component

## Common Issues & Solutions

### Issue 1: Modal Not Appearing
**Symptoms**: Admin user signs in but no modal shows

**Debug Steps**:
1. Check React Native logs for JavaScript errors
2. Add `console.log` in login flow to see if admin detection works
3. Use AdminFlowDebugger component to test manually

**Possible Causes**:
- Navigation interference (another redirect happening first)
- State not updating correctly
- Modal rendering issue

### Issue 2: Admin Detection Fails
**Symptoms**: `isAdmin` returns false for admin user

**Debug Steps**:
1. Run `node scripts/final-admin-signin-test.js`
2. Check if user exists in admin_roles table
3. Verify database function is working

**Solution**: Database function should be working (test confirms this)

### Issue 3: Modal Renders But Doesn't Show
**Symptoms**: Modal component renders but not visible

**Debug Steps**:
1. Check if `visible={true}` is being passed
2. Look for z-index or styling issues
3. Test modal independently with AdminFlowDebugger

### Issue 4: Preferences Not Saving
**Symptoms**: Modal appears every time despite "Remember choice"

**Debug Steps**:
1. Check AsyncStorage permissions
2. Verify adminPreferencesService is working
3. Check for AsyncStorage errors in logs

## Quick Fix Checklist

### ✅ Database
- [ ] Admin user exists in admin_roles table
- [ ] `is_user_admin()` function returns true for admin user
- [ ] RLS policies allow function access

### ✅ Code Integration
- [ ] AdminSignInChoiceModal imported in login.tsx
- [ ] adminService.isAdmin() called after sign-in
- [ ] Modal state (showAdminChoice) being set to true
- [ ] Modal component receiving correct props

### ✅ React Native
- [ ] No JavaScript errors in console
- [ ] Modal component renders (check with debugger)
- [ ] No navigation conflicts
- [ ] AsyncStorage working for preferences

## Debug Commands

```bash
# Test database function
node scripts/test-admin-function.js

# Test complete flow
node scripts/final-admin-signin-test.js

# Check admin user exists
node scripts/debug-admin-signin.js
```

## Expected Flow

1. **Admin user signs in**
2. **`adminService.isAdmin()` calls `is_user_admin()` function**
3. **Function returns `true`**
4. **`adminPreferencesService.shouldShowChoiceModal()` returns `true` (no saved preferences)**
5. **`setShowAdminChoice(true)` called**
6. **`AdminSignInChoiceModal` renders with `visible={true}`**
7. **Modal appears on screen**

## If Still Not Working

1. **Add temporary logging**:
```tsx
// In login.tsx, after admin detection:
console.log('Admin detected, setting modal visible');
setShowAdminChoice(true);
console.log('showAdminChoice state:', showAdminChoice);
```

2. **Test modal independently**:
```tsx
// Add to any screen:
<AdminSignInChoiceModal
  visible={true}
  onContinueToApp={() => console.log('Continue to app')}
  onGoToDashboard={() => console.log('Go to dashboard')}
  userEmail="test@example.com"
/>
```

3. **Check for navigation interference**:
- Look for other `router.replace()` calls
- Check if auth context is redirecting elsewhere
- Verify no other modals are blocking

The backend is confirmed working - the issue is likely in the React Native frontend integration.