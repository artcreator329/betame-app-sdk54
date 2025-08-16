-- Update BetaCoin column comment to remove processing fee reference
-- This migration removes the mention of 2.2% extra charges from the column comment

COMMENT ON COLUMN wallets.betame_betacoins IS 'BetaCoin balance - can be purchased directly or exchanged with Diamond Stones';