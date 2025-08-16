-- Migration: Change Credits to BetaCoins
-- This migration renames the betame_credits column to betame_betacoins
-- and updates all related transaction types and references

-- Step 1: Rename the column in wallets table
ALTER TABLE wallets RENAME COLUMN betame_credits TO betame_betacoins;

-- Step 2: Update transaction types from credit_purchase to betacoin_purchase
UPDATE transactions 
SET type = 'betacoin_purchase' 
WHERE type = 'credit_purchase';

-- Step 3: Update transaction descriptions that mention "credit" or "Credit"
UPDATE transactions 
SET description = REPLACE(description, 'credit', 'BetaCoin')
WHERE description ILIKE '%credit%';

UPDATE transactions 
SET description = REPLACE(description, 'Credit', 'BetaCoin')
WHERE description ILIKE '%Credit%';

-- Step 4: Update the CHECK constraint for transaction types
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN (
    'conversion', 
    'feature_purchase', 
    'betacoin_purchase', 
    'daily_checkin', 
    'referral_bonus', 
    'service_payment', 
    'service_payment_received'
));

-- Step 5: Update the automatic wallet creation function
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $
BEGIN
    INSERT INTO wallets (user_id, betame_stones, betame_betacoins)
    VALUES (NEW.id, 10, 5);
    RETURN NEW;
END;
$ language 'plpgsql';

-- Add comment for documentation
COMMENT ON COLUMN wallets.betame_betacoins IS 'BetaCoin balance - can be purchased directly or exchanged with Diamond Stones';