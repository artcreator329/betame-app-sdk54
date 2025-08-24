# Referral Program Mixed Reward Update

## Overview
Updated the referral program to use a mixed reward system: 15 BetaCoins for signup and RM4.90 cash for first job completion.

## Changes Made

### Database Updates

#### New Columns Added
- `referrals` table:
  - `signup_betacoins_awarded` (INTEGER, default: 0) - BetaCoins awarded for signup
  - `first_job_cash_awarded` (INTEGER, default: 0) - Cash awarded for first job completion
  - `total_betacoins_earned` (INTEGER, default: 0) - Total BetaCoins earned from this referral
  - `total_cash_earned` (INTEGER, default: 0) - Total cash earned from this referral

- `referral_codes` table:
  - `total_betacoins_earned` (INTEGER, default: 0) - Total BetaCoins earned across all referrals
  - `total_cash_earned` (INTEGER, default: 0) - Total cash earned across all referrals

#### Updated Functions
- `handle_referral_signup()` - Awards 15 BetaCoins for signup
- `handle_referral_first_job()` - Awards RM4.90 (490 cents) for first job completion

### Backend Updates

#### ReferralService Interface Changes
- Updated `Referral` interface to track both BetaCoins and cash rewards
- Updated `ReferralStats` interface to track both BetaCoins and cash earnings
- Modified `getReferralStats()` to calculate both types of earnings

### Frontend Updates

#### ReferralModal Component
- Updated to display both BetaCoins and cash amounts
- Changed reward descriptions to show 15 BetaCoins for signup and RM4.90 for first job
- Updated stats display to show both "BetaCoins Earned" and "Cash Earned"

#### ReferralCard Component
- Updated to display both BetaCoins and cash amounts
- Changed reward descriptions to show mixed rewards
- Updated stats display to show both types of earnings

#### ReferralHistoryModal Component
- Updated to display both BetaCoins and cash amounts in RM format
- Changed all reward references to show mixed system
- Updated empty state message to mention both BetaCoins and cash

#### ReferralStatsInline Component
- Updated to display both BetaCoins and cash amounts
- Changed from single currency display to mixed currency display

### Reward Structure

#### Previous System
- Friend signs up: +15 credits
- Friend completes first job: +25 credits
- Total per referral: 40 credits

#### New Mixed System
- Friend signs up: +15 BetaCoins
- Friend completes first job: +RM4.90
- Total per referral: 15 BetaCoins + RM4.90

## Technical Implementation

### Mixed Reward Storage
- BetaCoins are stored as integers (15 = 15 BetaCoins)
- Cash amounts are stored in cents (490 = RM4.90) for precision
- Display conversion happens in the frontend (dividing cash by 100)

### Transaction Recording
- Referral signup rewards are recorded as `referral_signup` type with BetaCoin amounts
- First job completion rewards are recorded as `referral_first_job` type with cash amounts
- Descriptions include the reward type and amount for clarity

### Wallet Integration
- Signup rewards are automatically added to the user's wallet BetaCoin balance
- First job completion rewards are automatically added to the user's wallet cash balance
- Uses the existing wallet system for both currency types

## Migration Notes

### Existing Data
- Existing referral records retain their credit amounts
- New referrals will use the mixed reward system
- No automatic migration of existing credit rewards

### Backward Compatibility
- The system maintains backward compatibility with existing referral records
- Old credit fields are preserved but not used for new referrals

## Testing

### Test Scenarios
1. **New User Signup with Referral Code**
   - Verify 15 BetaCoins are awarded to referrer
   - Verify transaction is recorded with BetaCoin type
   - Verify wallet BetaCoin balance is updated

2. **First Job Completion**
   - Verify RM4.90 is awarded to referrer
   - Verify referral status is updated
   - Verify wallet cash balance is updated
   - Verify total earnings are calculated correctly

3. **Referral Statistics**
   - Verify both BetaCoins and cash amounts are displayed correctly
   - Verify referral history shows mixed rewards
   - Verify admin dashboard shows correct totals for both currencies

## Future Considerations

### Potential Enhancements
- Add minimum withdrawal amounts for referral cash
- Implement referral tiers with different reward amounts
- Add referral expiration dates
- Create referral leaderboards for both currencies

### Monitoring
- Track referral conversion rates
- Monitor BetaCoin and cash payout volumes separately
- Analyze referral program effectiveness for both reward types
