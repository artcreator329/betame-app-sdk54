# BetaCoin Complete Reset Guide

## Overview

This guide provides instructions for resetting all users' betacoin counts and transaction history. This is a **destructive operation** that will permanently delete all betacoin-related data.

## ⚠️ Important Warnings

- **This action is IRREVERSIBLE** - All betacoin data will be permanently lost
- **Create a database backup** before proceeding
- **Inform users** about the reset as they will lose all purchased features
- **Schedule during low-traffic hours** to minimize user impact

## What Will Be Reset

The reset operation will clear the following data:

### 1. User Balances
- All `betame_betacoins` in the `wallets` table will be set to 0
- Diamond balances (`betame_stones`) will remain unchanged

### 2. Transaction History
- All `betacoin_purchase` transactions
- All `daily_checkin` transactions (since they award betacoins)
- All `referral_bonus` transactions (since they award betacoins)  
- All `conversion` transactions (diamond to betacoin conversions)

### 3. Payment Records
- All payment transaction records where `payment_type = 'betacoin_purchase'`

### 4. Purchased Features
- All records in `purchased_features` table (since features are purchased with betacoins)
- Users will need to re-purchase features after the reset

### 5. Check-in Data
- All check-in streaks and history (since check-ins award betacoins)

### 6. Referral Data  
- All referral records (since referrals award betacoins)

### 7. Payout Records
- Any `betacoin_credit` payouts in the `temporary_payouts` table

## Execution Methods

### Method 1: Automated Script (Recommended)

Execute the automated reset script:

```bash
cd /Users/christopher/Desktop/Project/betame-app
./scripts/reset-betacoin-data.sh
```

The script will:
1. Show a warning and ask for confirmation
2. Verify Supabase CLI is installed and you're logged in
3. Execute the migration
4. Provide verification queries

### Method 2: Manual SQL Execution

If the script doesn't work, you can execute the SQL manually:

#### Step 1: Connect to your Supabase database
- Open [Supabase Dashboard](https://app.supabase.com)
- Navigate to your project
- Go to SQL Editor

#### Step 2: Execute the migration SQL
Copy and paste the contents of `database/reset_all_betacoin_data.sql` into the SQL Editor and execute.

#### Step 3: Verify the reset
Run these verification queries:

```sql
-- Check users with betacoins (should return 0)
SELECT COUNT(*) as users_with_betacoins FROM wallets WHERE betame_betacoins > 0;

-- Check betacoin transactions (should return 0)
SELECT COUNT(*) as betacoin_transactions FROM transactions WHERE type = 'betacoin_purchase';

-- Check payment transactions (should return 0)
SELECT COUNT(*) as payment_transactions FROM payment_transactions WHERE payment_type = 'betacoin_purchase';

-- Check purchased features (should return 0)
SELECT COUNT(*) as purchased_features FROM purchased_features;

-- Check check-ins (should return 0)
SELECT COUNT(*) as check_ins FROM check_ins;

-- Check referrals (should return 0)
SELECT COUNT(*) as referrals FROM referrals;
```

### Method 3: Supabase CLI Direct Migration

If you have the Supabase CLI set up with proper credentials:

```bash
supabase db reset --linked
supabase migration new reset_betacoin_data
# Copy the SQL from database/reset_all_betacoin_data.sql to the new migration file
supabase db push
```

## Post-Reset Actions

After the reset is complete:

### 1. Verify Data Reset
Run the verification queries above to ensure all betacoin data has been cleared.

### 2. Update App Users
- Send push notifications about the reset
- Update any in-app announcements
- Consider providing compensation (free diamonds, etc.)

### 3. Monitor System
- Watch for any errors related to missing betacoin data
- Monitor user feedback and support requests
- Check that the wallet creation function still works for new users

### 4. Update Documentation
- Update any user-facing documentation about betacoin balances
- Consider updating terms of service if needed

## New User Defaults

After the reset, new users will still receive the default allocation:
- 10 Diamond Stones
- 5 BetaCoins

This is maintained by the `create_user_wallet()` function which is updated during the migration.

## Rollback Plan

Since this is a destructive operation, **there is no automatic rollback**. To restore data:

1. Restore from database backup (if created before reset)
2. Manually re-credit users based on previous transaction history
3. Re-import purchase records from payment gateway logs

## Support

If you encounter issues during the reset:

1. Check Supabase logs for error messages
2. Verify database connection and permissions
3. Ensure the migration SQL syntax is correct
4. Contact Supabase support if database-level issues occur

## Files Created

- `database/reset_all_betacoin_data.sql` - Migration SQL script
- `scripts/reset-betacoin-data.sh` - Automated execution script
- `BETACOIN_RESET_GUIDE.md` - This documentation file

