-- Fix wallet creation trigger to use correct column names
-- This fixes the "Database error saving new user" issue during signup

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the function to use the correct column names
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id, betame_diamonds, betame_betacoins)
    VALUES (NEW.id, 0, 0); -- New users start with 0 diamonds and 0 BetaCoins
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_wallet();

-- Add comment for documentation
COMMENT ON FUNCTION create_user_wallet() IS 'Automatically creates a wallet for new users with 0 diamonds and 0 BetaCoins';
