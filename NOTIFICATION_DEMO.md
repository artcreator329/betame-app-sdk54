# Notification System Demo

This document shows how the new notification features appear to users.

## 1. In-App Notifications (Notifications Tab)

When users tap the Notifications tab, they'll see various notification types:

### Marketing Notification
```
🌟 Discover New Services                                    2m ago
Check out trending services in your area and find amazing deals!

[Turn off marketing notifications] button appears below
```

### Check-in Reminder
```
👋 Time to Check In!                                        1h ago
Share your location and discover new opportunities around you!
```

### Chat Notification (for comparison)
```
New message from John Doe                                   5m ago
Hey! I saw your service listing and I'm interested. Can we...

[Profile image of John Doe shown]
```

### Service Offer Notification
```
New offer from Sarah Wilson                                 10m ago
Website Design & Development - RM 1500

📋 Website Design & Development
💰 RM 1500
```

## 2. System Notifications (iOS/Android)

These appear as push notifications on the user's device:

### Marketing Notification
```
BetaMe
🌟 Discover New Services
Check out trending services in your area and find amazing deals!
```

### Check-in Reminder
```
BetaMe
👋 Time to Check In!
Share your location and discover new opportunities around you!
```

### Chat Notification
```
BetaMe
New message from John Doe
Hey! I saw your service listing and I'm interested. Can we...
```

## 3. Notification Scheduling

### Marketing Notifications
- **Time**: Every day at 10:00 AM
- **Content**: Rotates between 5 different messages:
  1. "🌟 Discover New Services" - About trending services and deals
  2. "💼 Grow Your Business" - About listing services
  3. "🎯 Perfect Match Waiting" - About job opportunities
  4. "🔥 Hot Deals Today" - About limited-time offers
  5. "⭐ Rate Your Experience" - About rating services

### Check-in Reminders
- **Time**: Every 3 days at 9:00 AM
- **Condition**: Only if user hasn't checked in recently
- **Content**: Always the same check-in reminder message

## 4. User Controls

### Notification Settings Page
Users can access this via Settings > Notifications:

```
🔔 Notification Settings

📢 Marketing Notifications                    [ON/OFF Toggle]
Daily notifications about new services, deals, and 
opportunities (10:00 AM)

📍 Check-in Reminders                         [ON/OFF Toggle]
Reminders to check in and discover opportunities 
near you (every 3 days)

ℹ️ You can always change these settings later. Important 
notifications like messages and orders will still be delivered.
```

### Quick Disable for Marketing
When users see a marketing notification, they can tap "Turn off marketing notifications" to instantly disable them.

## 5. Visual Appearance

### In-App Notification Cards
- **Marketing**: Orange/yellow gradient with megaphone icon
- **Check-in**: Green gradient with map pin icon
- **Chat**: Green gradient with message icon
- **Offers**: Purple gradient with gift icon

### Swipe Actions
- Swipe right to reveal delete button
- Swipe all the way right to delete immediately
- Tap to navigate to relevant page

### Unread Indicators
- Blue dot next to unread notifications
- Bold text for unread notifications
- Unread count badge in tab bar

## 6. Navigation Behavior

### Marketing Notifications
- Tap → Navigate to home page (main feed)

### Check-in Reminders  
- Tap → Navigate to check-in page (/check-in)

### Chat Notifications
- Tap → Navigate to chat with specific user

### Offer Notifications
- Tap → Navigate to chat where offer was made

## 7. Testing

Use the test panel in the Profile tab (development only) to:
- Create sample notifications of all types
- Test individual notification types
- Check scheduler status
- Verify user preferences

The test panel has 4 buttons:
1. **Create Samples** - Creates all notification types at once
2. **Marketing** - Creates a single marketing notification
3. **Check-in** - Creates a single check-in reminder
4. **Status** - Shows current notification preferences