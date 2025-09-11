-- Manual User Verification Script
-- Run this in your Supabase SQL Editor to verify the user: gzd8onijy7@wyoxafp.com

-- First, let's find the user ID
DO $$
DECLARE
    target_email TEXT := 'gzd8onijy7@wyoxafp.com';
    user_uuid UUID;
    ekyc_exists BOOLEAN := FALSE;
    bank_exists BOOLEAN := FALSE;
    wallet_exists BOOLEAN := FALSE;
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = target_email;
    
    IF user_uuid IS NULL THEN
        RAISE NOTICE 'User not found with email: %', target_email;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user ID: %', user_uuid;
    
    -- Step 1: Update user profile
    UPDATE user_profiles 
    SET 
        verification_status = 'verified',
        is_service_provider = true,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    RAISE NOTICE 'Updated user profile to verified service provider';
    
    -- Step 2: Check and handle eKYC submission
    SELECT EXISTS(
        SELECT 1 FROM ekyc_submissions WHERE user_id = user_uuid
    ) INTO ekyc_exists;
    
    IF ekyc_exists THEN
        -- Update existing eKYC submission
        UPDATE ekyc_submissions 
        SET 
            status = 'approved',
            admin_notes = 'Manually verified by admin',
            reviewed_by = 'admin',
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE user_id = user_uuid;
        
        RAISE NOTICE 'Updated existing eKYC submission to approved';
    ELSE
        -- Create new eKYC submission
        INSERT INTO ekyc_submissions (
            user_id,
            nationality,
            full_name,
            date_of_birth,
            phone_number,
            email,
            address_type,
            address,
            city,
            postcode,
            state,
            status,
            admin_notes,
            reviewed_by,
            reviewed_at,
            pdpa_consent_given,
            pdpa_consent_given_at
        ) VALUES (
            user_uuid,
            'Malaysian',
            'Verified User',
            '1990-01-01',
            '+60123456789',
            target_email,
            'Current Address',
            'Verified Address',
            'Kuala Lumpur',
            '50000',
            'Kuala Lumpur',
            'approved',
            'Manually verified by admin - placeholder submission',
            'admin',
            NOW(),
            true,
            NOW()
        );
        
        RAISE NOTICE 'Created new eKYC submission and approved';
    END IF;
    
    -- Step 3: Check and handle bank statement
    SELECT EXISTS(
        SELECT 1 FROM bank_statements WHERE user_id = user_uuid
    ) INTO bank_exists;
    
    IF bank_exists THEN
        -- Update existing bank statement
        UPDATE bank_statements 
        SET 
            status = 'approved',
            admin_notes = 'Manually verified by admin',
            reviewed_by = 'admin',
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE user_id = user_uuid;
        
        RAISE NOTICE 'Updated existing bank statement to approved';
    ELSE
        -- Create new bank statement
        INSERT INTO bank_statements (
            user_id,
            name,
            ic_number,
            bank_name,
            bank_account_number,
            statement_file_url,
            status,
            admin_notes,
            reviewed_by,
            reviewed_at
        ) VALUES (
            user_uuid,
            'Verified User',
            '123456789012',
            'Verified Bank',
            '1234567890',
            'https://placeholder-statement.pdf',
            'approved',
            'Manually verified by admin - placeholder submission',
            'admin',
            NOW()
        );
        
        RAISE NOTICE 'Created new bank statement and approved';
    END IF;
    
    -- Step 4: Ensure wallet exists
    SELECT EXISTS(
        SELECT 1 FROM wallets WHERE user_id = user_uuid
    ) INTO wallet_exists;
    
    IF NOT wallet_exists THEN
        INSERT INTO wallets (
            user_id,
            premium_stones,
            betame_betacoins,
            betame_stones,
            betame_diamonds,
            cash
        ) VALUES (
            user_uuid,
            0,
            100, -- Give 100 initial BetaCoins
            0,
            50,  -- Give 50 initial diamonds
            0
        );
        
        RAISE NOTICE 'Created wallet with initial balance';
    ELSE
        RAISE NOTICE 'Wallet already exists';
    END IF;
    
    RAISE NOTICE '✅ User verification completed successfully!';
    RAISE NOTICE 'The user % should now be able to create service listings.', target_email;
    
END $$;