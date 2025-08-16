# Chat Self-Notification Bug Fix - CORRECTED

## Problem
Andriana was receiving system notifications for her own messages when sending messages to other users. The notifications showed "New message from Andriana Chua" even though she was the sender.

## Root Cause Analysis
The issue was in the `NotificationService.addNotification()` method. The problematic flow was:

1. User (Andriana) sends a message
2. Chat service correctly identifies the other participant as the recipient
3. Chat service calls `notificationService.addChatNotification()` with correct parameters
4. **BUG**: In `addNotification()`, the service temporarily switched the current user context to the target user
5. This caused the notification to be added to the current user's local notification list
6. The `notifyListeners()` call then notified the current user (Andriana) about her own message

## Initial Fix (Too Restrictive)
The first fix was too aggressive and blocked ALL notifications by checking if `targetUserId === this.currentUserId`. This prevented legitimate notifications from reaching users.

## The Corrected Fix

### 1. Proper Self-Notification Prevention
**Only prevent notifications when sender === recipient:**
```typescript
// In addChatNotification() - CORRECT
if (senderId === participantId) {
  console.log('Skipping self-notification - sender and recipient are the same');
  return;
}
```

**Removed overly restrictive check:**
```typescript
// REMOVED - This was blocking legitimate notifications
if (this.currentUserId === senderId) {
  return; // This blocked notifications when current user was sender
}
```

### 2. Smart Local vs Remote Notification Handling
```typescript
// Always send to Supabase for persistence and realtime
await supabase.rpc('create_notification', { ... });

// Only add to local state if target is current user
if (targetUserId === this.currentUserId) {
  // Add to local notifications and show system notification
  this.notifications.unshift(newNotification);
  this.notifyListeners();
  await showLocalNotification(newNotification);
} else {
  // Target user will receive via Supabase realtime subscription
}
```

### 3. Cross-Platform Messaging Support
The corrected fix properly handles:
- **Web → Mobile**: Web user sends message, mobile user receives notification
- **Mobile → Web**: Mobile user sends message, web user receives notification  
- **Mobile → Mobile**: Both users receive notifications correctly
- **Self-messages**: Properly blocked (sender === recipient)

## Flow Comparison

### Before (Buggy):
1. User A sends message to User B
2. Notification service switches context to User B
3. **BUG**: Adds notification to User A's local state (wrong context)
4. User A sees notification for their own message

### After Initial Fix (Too Restrictive):
1. User A sends message to User B
2. Check: `targetUserId === currentUserId` → blocks notification
3. **PROBLEM**: No notifications reach anyone

### After Corrected Fix (Correct):
1. User A sends message to User B
2. Check: `senderId === recipientId` → allows (different users)
3. Send to Supabase for User B
4. If User B is current user → add to local state + show notification
5. If User B is different user → they receive via realtime subscription

## Files Modified
- `lib/notification-service.ts` - Corrected `addNotification()`, `addChatNotification()`, and `addOfferNotification()` methods

## Testing
Created test scripts to verify:
- ✅ `scripts/test-notification-fix-v2.js` - Comprehensive testing
- ✅ Different users receive notifications correctly
- ✅ Self-notifications are prevented
- ✅ Cross-platform messaging works
- ✅ Local and system notifications function properly

## Result
- ✅ Andriana no longer receives notifications for her own messages
- ✅ Other users receive notifications correctly (fixed the regression)
- ✅ Cross-platform messaging works (web ↔ mobile)
- ✅ System notifications appear properly
- ✅ In-app notifications display correctly

## Key Insight
The critical insight was understanding that `this.currentUserId` represents the app context (whose phone/browser is running), not the message sender. The correct logic is:
- Prevent notifications when **sender === recipient** (same person)
- Allow notifications when **sender ≠ recipient** (different people)
- Handle local state only when **recipient === current app user**