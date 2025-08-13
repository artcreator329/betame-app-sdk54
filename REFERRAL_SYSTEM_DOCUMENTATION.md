# Referral System Documentation

## Overview

The BetaMe referral system allows users to earn credits by inviting friends to join the platform. The system provides two reward tiers:

1. **Signup Bonus**: 15 credits when a referred user signs up
2. **First Job Bonus**: 25 credits when the referred user completes their first job as a seller

## Features

### Core Features
- Unique referral codes for each user
- Automatic credit rewards
- Referral tracking and statistics
- Integration with wallet system
- Referral history and management

### User Experience
- Referral card on profile page
- Share referral links via native sharing
- Copy referral codes to clipboard
- View referral history and earnings
- Optional referral code input during signup

## Database Schema

### Tables

#### `referral_codes`
Stores unique referral codes for each user.

```sql
CREATE TABLE referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    total_referrals INTEGER DEFAULT 0,
    total_credits_earned INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `referrals`
Tracks referral relationships and rewards.

```sql
ALTER TABLE referrals 
ADD COLUMN referral_code VARCHAR(20) UNIQUE,
ADD COLUMN signup_credits_awarded INTEGER DEFAULT 0,
ADD COLUMN first_job_credits_awarded INTEGER DEFAULT 0,
ADD COLUMN total_credits_earned INTEGER DEFAULT 0,
ADD COLUMN first_job_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

### Database Functions

#### `generate_referral_code(user_id_param UUID)`
Generates a unique 8-character referral code for a user.

#### `handle_referral_signup(referred_user_id UUID, referral_code_param VARCHAR(20))`
Processes a referral signup and awards 15 credits to the referrer.

#### `handle_referral_first_job(referred_user_id UUID)`
Processes the first job completion and awards 25 credits to the referrer.

### Triggers

#### `create_referral_code_trigger`
Automatically creates a referral code when a new user signs up.

## API Services

### ReferralService

#### Methods

- `getUserReferralCode(userId: string)`: Get user's referral code
- `createReferralCode(userId: string)`: Create referral code for user
- `handleReferralSignup(referredUserId: string, referralCode: string)`: Process referral signup
- `handleFirstJobCompletion(referredUserId: string)`: Process first job completion
- `getReferralStats(userId: string)`: Get referral statistics
- `getUserReferrals(userId: string)`: Get user's referrals with details
- `validateReferralCode(referralCode: string)`: Validate referral code
- `generateReferralLink(referralCode: string)`: Generate shareable referral link
- `checkUserReferralStatus(userId: string)`: Check if user was referred
- `trackJobCompletion(sellerId: string)`: Track job completion for referral system

## UI Components

### ReferralCard
Main referral component displayed on the profile page.

**Features:**
- Display referral statistics
- Show referral code with copy functionality
- Share referral link
- Explain how the referral system works

**Props:**
- `userId?: string` - User ID (optional, will get from auth context if not provided)

### ReferralHistoryModal
Modal showing detailed referral history.

**Features:**
- List all referrals with status
- Show credits earned per referral
- Display user information for each referral

**Props:**
- `visible: boolean` - Modal visibility
- `onClose: () => void` - Close handler
- `userId?: string` - User ID

### ReferralInputModal
Modal for entering referral codes during signup.

**Features:**
- Input field for referral code
- Validation and error handling
- Explanation of benefits

**Props:**
- `visible: boolean` - Modal visibility
- `onClose: () => void` - Close handler
- `onSuccess: () => void` - Success handler
- `userId: string` - New user ID

## Integration Points

### Signup Flow
1. User completes signup
2. `ReferralInputModal` is shown (optional)
3. If referral code is entered, `handleReferralSignup` is called
4. Referrer receives 15 credits immediately

### Job Completion Flow
1. Seller completes a job via `JobCompletionService`
2. `referralService.trackJobCompletion()` is called
3. If this is the seller's first job and they were referred, referrer gets 25 credits

### Profile Page
1. `ReferralCard` is displayed showing user's referral stats
2. Users can share their referral code/link
3. Users can view referral history

## Credit System Integration

### Wallet Updates
- Credits are automatically added to the referrer's wallet
- Transaction records are created for audit trail
- Real-time balance updates

### Transaction Types
- `referral_bonus` - Credits earned from referrals

## Security & Validation

### Referral Code Validation
- Codes are unique and case-insensitive
- Active status checking
- Self-referral prevention
- Duplicate referral prevention

### Database Security
- Row Level Security (RLS) enabled
- Users can only access their own referral data
- Proper foreign key constraints

## Testing

### Test Script
Run the referral system test:

```bash
node scripts/test-referral-system.js
```

### Test Coverage
- Referral code generation
- Code validation
- Signup processing
- First job completion
- Statistics calculation
- Wallet integration

## Usage Examples

### Basic Integration

```typescript
import { referralService } from '@/lib/referral-service';

// Get user's referral stats
const stats = await referralService.getReferralStats(userId);

// Handle referral signup
const success = await referralService.handleReferralSignup(newUserId, referralCode);

// Track job completion
await referralService.trackJobCompletion(sellerId);
```

### Component Usage

```tsx
import { ReferralCard } from '@/components/ReferralCard';

// In your profile component
<ReferralCard userId={user?.id} />
```

## Configuration

### Environment Variables
- `EXPO_PUBLIC_APP_URL` - Base URL for referral links

### Customization
- Referral code length: 8 characters (configurable in `generate_referral_code` function)
- Signup bonus: 15 credits (configurable in `handle_referral_signup` function)
- First job bonus: 25 credits (configurable in `handle_referral_first_job` function)

## Troubleshooting

### Common Issues

1. **Referral code not working**
   - Check if code exists and is active
   - Verify user hasn't already been referred
   - Ensure no self-referral

2. **Credits not awarded**
   - Check transaction logs
   - Verify wallet exists for user
   - Check database function execution

3. **First job bonus not triggered**
   - Ensure job completion service calls `trackJobCompletion`
   - Verify referral status is 'signup_completed'
   - Check job completion status

### Debug Queries

```sql
-- Check referral code
SELECT * FROM referral_codes WHERE referral_code = 'CODE123';

-- Check referral status
SELECT * FROM referrals WHERE referred_user_id = 'user-id';

-- Check transactions
SELECT * FROM transactions WHERE type = 'referral_bonus' AND user_id = 'user-id';
```

## Future Enhancements

### Potential Features
- Multi-tier referral system (referrals of referrals)
- Time-limited bonus campaigns
- Referral leaderboards
- Custom referral codes
- Referral analytics dashboard
- Email notifications for referral events

### Performance Optimizations
- Caching referral statistics
- Batch processing for large referral volumes
- Indexing optimization for referral queries

## Conclusion

The referral system is fully integrated into the BetaMe platform, providing a seamless way for users to earn credits by inviting friends. The system is designed to be scalable, secure, and user-friendly, with comprehensive tracking and reporting capabilities.