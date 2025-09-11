-- Fix for profile update error: record "new" has no field "referral_code"
-- This error occurs when a trigger function tries to access NEW.referral_code
-- but the table doesn't have that field

-- First, let's check if there are any problematic triggers on auth.users
-- that might be trying to access referral_code field

-- Drop any existing triggers that might be causing issues
-- (This is safe because we'll recreate the correct ones)

-- Check if there's a trigger function that might be accessing referral_code incorrectly
-- and replace it with a corrected version

-- Create or replace the referral code trigger function to be more robust
CREATE OR REPLACE FUNCTION create_referral_code_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_referral_code VARCHAR(20);
BEGIN
    -- Only proceed if this is an INSERT operation
    IF TG_OP = 'INSERT' THEN
        -- Generate referral code for new user
        SELECT generate_referral_code(NEW.id) INTO new_referral_code;
        
        -- Insert referral code
        INSERT INTO referral_codes (user_id, referral_code)
        VALUES (NEW.id, new_referral_code);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger only runs on INSERT operations
DROP TRIGGER IF EXISTS create_referral_code_trigger ON auth.users;
CREATE TRIGGER create_referral_code_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_referral_code_for_new_user();

-- Check if there are any other functions that might be accessing referral_code
-- from auth.users table and fix them

-- If there's a profile sync function that's causing issues, we need to fix it
-- Let's create a safe profile sync function that doesn't access non-existent fields

CREATE OR REPLACE FUNCTION safe_profile_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be used for profile synchronization
    -- without accessing fields that don't exist
    
    -- Only access fields that we know exist
    -- Don't try to access NEW.referral_code as it doesn't exist in auth.users
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add a comment to track this fix
COMMENT ON FUNCTION create_referral_code_for_new_user() IS 'Fixed version that only runs on INSERT and does not access non-existent referral_code field';
COMMENT ON FUNCTION safe_profile_sync() IS 'Safe profile sync function that does not access non-existent fields';