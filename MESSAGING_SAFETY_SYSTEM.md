# Messaging Safety System

## Overview

The messaging safety system is designed to prevent users from sharing personal contact information outside the platform, ensuring all communication happens within the secure app environment. This system includes enhanced content detection, progressive warnings, and automatic user restrictions.

## Features

### 1. Enhanced Contact Information Detection

The system detects various forms of contact information sharing:

#### Phone Numbers
- Malaysian mobile numbers: `+6012-345-6789`, `012-345-6789`
- Malaysian landlines: `+603-1234-5678`, `03-1234-5678`
- International numbers: `+1-555-123-4567`
- Generic phone patterns: `123-456-7890`

#### Email Addresses
- All standard email formats: `user@example.com`

#### Social Media & Messaging Apps
- WhatsApp, Telegram, WeChat, Line, Viber, Signal, Discord, Skype
- Instagram, Facebook, Twitter, TikTok, Snapchat

#### Contact Requests
- "call me", "text me", "dm me", "contact me"
- "my number", "my phone", "my email", "my whatsapp"
- "add me on", "find me on", "follow me on"

#### Bypass Attempts
- Numbers spelled out: "zero one two three"
- Obfuscated formats: "1*2*3", "1-a-2-b-3"
- Spaced characters: "@ g m a i l"

### 2. Progressive Warning System

#### First Violation
- **Action**: Warning message displayed
- **Message**: "Warning: Sharing personal contact information is not allowed. Please use the platform's messaging system for communication."
- **Consequence**: Message blocked, warning recorded

#### Second Violation
- **Action**: Second warning
- **Message**: "Second Warning: You have attempted to share contact information again. Further violations may result in account restrictions."
- **Consequence**: Message blocked, warning count increased

#### Third Violation
- **Action**: 24-hour temporary ban
- **Message**: "Your account has been temporarily banned for 1 day due to multiple attempts to share contact information."
- **Consequence**: Cannot send messages for 24 hours

#### Fifth Violation
- **Action**: 7-day temporary ban
- **Message**: "Your account has been temporarily banned for 7 days due to repeated attempts to share contact information."
- **Consequence**: Cannot send messages for 7 days

#### Seventh Violation
- **Action**: Permanent ban
- **Message**: "Your account has been permanently banned for repeated policy violations."
- **Consequence**: Cannot send messages permanently

### 3. User Interface Components

#### Moderation Warning Modal
- Shows account status (active/restricted)
- Displays violation statistics
- Lists recent warnings with acknowledgment
- Provides safety guidelines
- Accessible via Shield icon in chat header

#### In-Chat Notifications
- Real-time alerts when messages are blocked
- Progressive warning notifications
- Ban status notifications

#### Visual Indicators
- Shield icon in chat header (changes color based on status)
- Red shield for banned users
- Blue shield for active users

### 4. Database Schema

#### Tables Created
- `user_violations`: Records each policy violation
- `user_moderation_status`: Tracks user's overall moderation status
- `user_warnings`: Stores warning messages sent to users

#### Automatic Functions
- `update_user_moderation_status()`: Updates violation counts
- `check_auto_ban_user()`: Applies bans based on violation thresholds
- `is_user_banned()`: Checks current ban status and handles expiration

### 5. API Integration

#### ModerationService
- `moderateMessage()`: Analyzes message content
- `recordViolation()`: Records policy violations
- `isUserBanned()`: Checks ban status
- `getUserModerationStatus()`: Gets user's moderation info
- `getUserWarnings()`: Retrieves user warnings

#### Enhanced Chat Service
- Integrated with existing `SupabaseChatService`
- Automatic moderation on message send
- Ban status checking before message processing

## Implementation Details

### Message Flow
1. User types message and hits send
2. System checks if user is banned
3. If not banned, message content is analyzed
4. If violation detected:
   - Message is blocked
   - Violation is recorded in database
   - Triggers check for automatic ban
   - Warning/ban notification is created
   - User is notified of the action

### Ban Management
- Temporary bans automatically expire
- Ban status is checked on each message attempt
- Expired bans are automatically lifted
- Progressive escalation based on violation count

### User Experience
- Clear feedback when messages are blocked
- Educational warnings about platform policies
- Easy access to account status information
- Transparent violation tracking

## Configuration

### Violation Thresholds
- Contact info violations: 3 → 24h ban, 5 → 7d ban, 7 → permanent
- Total violations: 10 → permanent ban
- Configurable via database functions

### Pattern Sensitivity
- High sensitivity for phone numbers and emails
- Medium sensitivity for social media references
- Low sensitivity for general spam patterns

## Security Considerations

- All moderation data is protected by Row Level Security (RLS)
- Users can only view their own violations and warnings
- Admin functions require appropriate permissions
- Violation patterns are server-side to prevent bypass

## Future Enhancements

1. **Admin Dashboard**: Interface for reviewing violations and managing bans
2. **Appeal System**: Allow users to contest violations
3. **Machine Learning**: AI-powered content analysis for better detection
4. **Reporting Integration**: Connect with user reporting system
5. **Whitelist System**: Allow certain contact sharing for verified businesses

## Testing

To test the system:

1. Send a message with a phone number (e.g., "Call me at 012-345-6789")
2. Observe the blocked message notification
3. Check the Shield icon in chat header for status
4. Repeat to trigger progressive warnings and bans
5. Verify ban expiration after waiting period

## Monitoring

The system provides comprehensive logging:
- All violations are recorded with timestamps
- Warning acknowledgments are tracked
- Ban durations and reasons are logged
- Pattern matches are stored for analysis

This ensures platform safety while maintaining a positive user experience through clear communication and progressive enforcement.