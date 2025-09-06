-- Migration: Reset All BetaCoin Data and Transaction History
-- WARNING: This migration will permanently delete all betacoin balances, 
-- transaction history, and related data. Use with extreme caution.
-- 
-- BACKUP RECOMMENDATION: Create a database backup before running this migration.

-- Step 1: Reset all betacoin balances to 0 in wallets table
UPDATE wallets 
SET betame_betacoins = 0, 
    updated_at = NOW()
WHERE betame_betacoins > 0;

-- Step 2: Delete all betacoin-related transactions
-- This includes purchases, daily check-ins, referral bonuses, and conversions
DELETE FROM transactions 
WHERE type IN (
    'betacoin_purchase',
    'daily_checkin', 
    'referral_bonus',
    'conversion'
);

-- Step 3: Delete all payment transactions for betacoin purchases
-- This removes payment records for betacoin purchases
DELETE FROM payment_transactions 
WHERE payment_type = 'betacoin_purchase';

-- Step 4: Delete all purchased features
-- Since features are purchased with betacoins, we reset all purchased features
-- Users will need to re-purchase features with their reset betacoin balance
DELETE FROM purchased_features;

-- Step 5: Reset all check-in data
-- Check-ins award betacoins, so we reset the check-in history
DELETE FROM check_ins;

-- Step 6: Reset all referral data
-- Referrals award betacoins, so we reset referral data
DELETE FROM referrals;

-- Step 7: Reset any betacoin-related payouts in temporary_payouts table
DELETE FROM temporary_payouts 
WHERE payout_method = 'betacoin_credit';

-- Step 8: Update the user wallet creation function to maintain default values
-- Ensure new users still get the default 10 diamonds and 5 betacoins
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id, betame_stones, betame_betacoins)
    VALUES (NEW.id, 10, 5);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 9: Log this migration for audit purposes
INSERT INTO transactions (user_id, type, amount, description)
SELECT 
    auth.uid() as user_id,
    'conversion' as type, 
    0 as amount,
    'BetaCoin data reset - all balances and history cleared by admin' as description
WHERE auth.uid() IS NOT NULL;

-- Verification queries (to run after migration):
-- SELECT COUNT(*) as users_with_betacoins FROM wallets WHERE betame_betacoins > 0;
-- SELECT COUNT(*) as betacoin_transactions FROM transactions WHERE type = 'betacoin_purchase';
-- SELECT COUNT(*) as payment_transactions FROM payment_transactions WHERE payment_type = 'betacoin_purchase';
-- SELECT COUNT(*) as purchased_features FROM purchased_features;
-- SELECT COUNT(*) as check_ins FROM check_ins;
-- SELECT COUNT(*) as referrals FROM referrals;

-- Add a comment documenting this reset
COMMENT ON TABLE wallets IS 'Wallet balances - BetaCoin data reset on ' || NOW()::DATE;

