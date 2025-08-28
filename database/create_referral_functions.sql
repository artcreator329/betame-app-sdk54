-- Create referral system database functions

-- Function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code(user_id_param UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    new_code VARCHAR(20);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        new_code := upper(substring(md5(random()::text || user_id_param::text || now()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM referral_codes WHERE referral_code = new_code) INTO code_exists;
        
        -- Exit loop if code is unique
        IF NOT code_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to handle referral signup
CREATE OR REPLACE FUNCTION handle_referral_signup(
    referred_user_id UUID,
    referral_code_param VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
    referrer_user_id UUID;
    referral_exists BOOLEAN;
    signup_bonus INTEGER := 15; -- 15 BetaCoins for signup
BEGIN
    -- Check if referral code exists and is active
    SELECT rc.user_id INTO referrer_user_id
    FROM referral_codes rc
    WHERE rc.referral_code = referral_code_param AND rc.is_active = true;
    
    IF referrer_user_id IS NULL THEN
        RETURN FALSE; -- Invalid or inactive referral code
    END IF;
    
    -- Prevent self-referral
    IF referrer_user_id = referred_user_id THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user was already referred
    SELECT EXISTS(SELECT 1 FROM referrals WHERE referred_user_id = referred_user_id) INTO referral_exists;
    
    IF referral_exists THEN
        RETURN FALSE; -- User already referred
    END IF;
    
    -- Create referral record
    INSERT INTO referrals (
        referrer_id,
        referred_user_id,
        status,
        referral_code,
        signup_betacoins_awarded,
        total_betacoins_earned
    ) VALUES (
        referrer_user_id,
        referred_user_id,
        'signup_completed',
        referral_code_param,
        signup_bonus,
        signup_bonus
    );
    
    -- Update referrer's wallet with BetaCoins
    UPDATE wallets 
    SET betame_betacoins = betame_betacoins + signup_bonus,
        updated_at = NOW()
    WHERE user_id = referrer_user_id;
    
    -- Create transaction record
    INSERT INTO transactions (
        user_id,
        type,
        amount,
        description
    ) VALUES (
        referrer_user_id,
        'referral_bonus',
        signup_bonus,
        'Referral signup bonus: +' || signup_bonus || ' BetaCoins'
    );
    
    -- Update referral code stats
    UPDATE referral_codes 
    SET total_referrals = total_referrals + 1,
        total_betacoins_earned = total_betacoins_earned + signup_bonus,
        updated_at = NOW()
    WHERE user_id = referrer_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to handle first job completion
CREATE OR REPLACE FUNCTION handle_referral_first_job(
    referred_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    referrer_user_id UUID;
    referral_record RECORD;
    first_job_cash_bonus INTEGER := 490; -- RM4.90 in cents
BEGIN
    -- Get referral record for this user
    SELECT * INTO referral_record
    FROM referrals 
    WHERE referred_user_id = referred_user_id 
    AND status = 'signup_completed';
    
    IF referral_record IS NULL THEN
        RETURN FALSE; -- No eligible referral found
    END IF;
    
    referrer_user_id := referral_record.referrer_id;
    
    -- Update referral status and cash reward
    UPDATE referrals 
    SET status = 'first_job_completed',
        first_job_cash_awarded = first_job_cash_bonus,
        total_cash_earned = first_job_cash_bonus,
        first_job_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = referral_record.id;
    
    -- Update referrer's wallet with cash
    UPDATE wallets 
    SET cash = cash + first_job_cash_bonus,
        updated_at = NOW()
    WHERE user_id = referrer_user_id;
    
    -- Create transaction record
    INSERT INTO transactions (
        user_id,
        type,
        amount,
        description
    ) VALUES (
        referrer_user_id,
        'referral_bonus',
        first_job_cash_bonus,
        'Referral first job bonus: +RM' || (first_job_cash_bonus::DECIMAL / 100)::TEXT
    );
    
    -- Update referral code stats
    UPDATE referral_codes 
    SET total_cash_earned = total_cash_earned + first_job_cash_bonus,
        updated_at = NOW()
    WHERE user_id = referrer_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate referral codes for new users
CREATE OR REPLACE FUNCTION create_referral_code_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_referral_code VARCHAR(20);
BEGIN
    -- Generate referral code for new user
    SELECT generate_referral_code(NEW.id) INTO new_referral_code;
    
    -- Insert referral code
    INSERT INTO referral_codes (user_id, referral_code)
    VALUES (NEW.id, new_referral_code);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS create_referral_code_trigger ON auth.users;
CREATE TRIGGER create_referral_code_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_referral_code_for_new_user();