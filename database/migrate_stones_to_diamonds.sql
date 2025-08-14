-- Migration: Convert Stone terminology to Diamond terminology
-- This migration updates all stone-related columns and data to use "diamond" terminology
-- Date: $(date)

-- 1. Update wallets table - rename columns
-- First add new columns with default values
ALTER TABLE wallets 
ADD COLUMN IF NOT EXISTS betame_diamonds INTEGER DEFAULT 0 NOT NULL;

-- Copy data from old stone columns to new diamond columns
UPDATE wallets 
SET betame_diamonds = COALESCE(betame_stones, premium_stones, 0)
WHERE betame_diamonds = 0;

-- Update any existing wallet data to ensure consistency
UPDATE wallets 
SET betame_diamonds = COALESCE(betame_stones, premium_stones, 0)
WHERE betame_stones > 0 OR premium_stones > 0;

-- 2. Update checkins table - rename column
ALTER TABLE checkins 
ADD COLUMN IF NOT EXISTS total_diamonds_earned INTEGER DEFAULT 0 NOT NULL;

-- Copy data from old column to new column
UPDATE checkins 
SET total_diamonds_earned = COALESCE(total_stones_earned, 0)
WHERE total_diamonds_earned = 0;

-- 3. Update referrals table - add new column if it doesn't exist
-- Note: Based on the database analysis, referrals table may not have stones_awarded column yet
-- We'll add diamonds_awarded column
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS diamonds_awarded INTEGER DEFAULT 0 NOT NULL;

-- If stones_awarded column exists, copy data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'referrals' 
               AND column_name = 'stones_awarded') THEN
        UPDATE referrals 
        SET diamonds_awarded = COALESCE(stones_awarded, 0)
        WHERE diamonds_awarded = 0;
    END IF;
END
$$;

-- 4. Update transaction descriptions to use "diamond" terminology
UPDATE transactions 
SET description = REPLACE(description, ' stones', ' diamonds')
WHERE description LIKE '%stones%';

UPDATE transactions 
SET description = REPLACE(description, ' stone', ' diamond')
WHERE description LIKE '%stone%';

UPDATE transactions 
SET description = REPLACE(description, 'Stone Conversion', 'Diamond Conversion')
WHERE description LIKE '%Stone Conversion%';

-- 5. Update transaction types enum comment if needed
COMMENT ON TYPE transaction_type IS 'Transaction types - supports betacoin_purchase, conversion (diamonds to betacoins), feature_purchase, daily_checkin, referral_bonus, service_payment, service_payment_received';

-- 6. Add comments to new columns
COMMENT ON COLUMN wallets.betame_diamonds IS 'Diamond balance - can be earned through daily check-ins and converted to BetaCoins (10 diamonds = 1 BetaCoin)';
COMMENT ON COLUMN checkins.total_diamonds_earned IS 'Total diamonds earned through daily check-ins';
COMMENT ON COLUMN referrals.diamonds_awarded IS 'Diamonds awarded for successful referrals';

-- 7. Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_wallets_betame_diamonds ON wallets(betame_diamonds);
CREATE INDEX IF NOT EXISTS idx_checkins_total_diamonds_earned ON checkins(total_diamonds_earned);

-- Note: We keep the old columns for backwards compatibility during transition
-- The old columns (betame_stones, premium_stones, total_stones_earned) will be 
-- deprecated and can be removed in a future migration after ensuring all 
-- applications are updated to use the new diamond terminology.

-- For now, we'll create a trigger to keep them in sync
CREATE OR REPLACE FUNCTION sync_stones_to_diamonds()
RETURNS TRIGGER AS $$
BEGIN
    -- For wallets table updates
    IF TG_TABLE_NAME = 'wallets' THEN
        -- If diamonds were updated, sync to stones columns
        IF NEW.betame_diamonds != OLD.betame_diamonds THEN
            NEW.betame_stones = NEW.betame_diamonds;
            NEW.premium_stones = NEW.betame_diamonds;
        -- If stones were updated, sync to diamonds column
        ELSIF NEW.betame_stones != OLD.betame_stones THEN
            NEW.betame_diamonds = NEW.betame_stones;
        ELSIF NEW.premium_stones != OLD.premium_stones THEN
            NEW.betame_diamonds = NEW.premium_stones;
        END IF;
    END IF;
    
    -- For checkins table updates
    IF TG_TABLE_NAME = 'checkins' THEN
        -- If diamonds were updated, sync to stones column
        IF NEW.total_diamonds_earned != OLD.total_diamonds_earned THEN
            NEW.total_stones_earned = NEW.total_diamonds_earned;
        -- If stones were updated, sync to diamonds column
        ELSIF NEW.total_stones_earned != OLD.total_stones_earned THEN
            NEW.total_diamonds_earned = NEW.total_stones_earned;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS sync_wallets_stones_diamonds ON wallets;
CREATE TRIGGER sync_wallets_stones_diamonds
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION sync_stones_to_diamonds();

DROP TRIGGER IF EXISTS sync_checkins_stones_diamonds ON checkins;
CREATE TRIGGER sync_checkins_stones_diamonds
    BEFORE UPDATE ON checkins
    FOR EACH ROW
    EXECUTE FUNCTION sync_stones_to_diamonds();

-- Log completion
INSERT INTO migrations_log (migration_name, executed_at, description) 
VALUES (
    'migrate_stones_to_diamonds', 
    NOW(), 
    'Migrated stone terminology to diamond terminology with backwards compatibility'
) ON CONFLICT DO NOTHING;
