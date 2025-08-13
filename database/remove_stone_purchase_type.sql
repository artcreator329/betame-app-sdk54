-- Remove stone_purchase from transaction types enum
-- This migration updates the transaction_type enum to remove stone_purchase

-- First, create a new enum without stone_purchase
CREATE TYPE transaction_type_new AS ENUM (
    'conversion',
    'feature_purchase', 
    'credit_purchase', 
    'daily_checkin', 
    'referral_bonus', 
    'service_payment', 
    'service_payment_received'
);

-- Update the transactions table to use the new enum
ALTER TABLE transactions 
ALTER COLUMN type TYPE transaction_type_new 
USING type::text::transaction_type_new;

-- Drop the old enum
DROP TYPE transaction_type;

-- Rename the new enum to the original name
ALTER TYPE transaction_type_new RENAME TO transaction_type;

-- Add comment to document the change
COMMENT ON TYPE transaction_type IS 'Transaction types - stone_purchase removed in favor of credit_purchase only';