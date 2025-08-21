-- eKYC Profile Sync Database Trigger
-- This ensures that profile verification status is automatically updated when eKYC status changes

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS ekyc_status_sync_trigger ON ekyc_submissions;
DROP FUNCTION IF EXISTS sync_ekyc_profile_status();

-- Create the sync function
CREATE OR REPLACE FUNCTION sync_ekyc_profile_status()
RETURNS TRIGGER AS $$
DECLARE
    new_verification_status TEXT;
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Only process if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Determine the new verification status based on eKYC status
        CASE NEW.status
            WHEN 'approved' THEN
                new_verification_status := 'verified';
            WHEN 'rejected' THEN
                new_verification_status := 'rejected';
            WHEN 'pending' THEN
                new_verification_status := 'in_progress';
            ELSE
                new_verification_status := 'in_progress';
        END CASE;

        -- Get user details for logging
        SELECT email INTO user_email 
        FROM auth.users 
        WHERE id = NEW.user_id;
        
        SELECT full_name INTO user_name 
        FROM user_profiles 
        WHERE user_id = NEW.user_id;

        -- Update the user profile verification status
        UPDATE user_profiles 
        SET 
            verification_status = new_verification_status,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;

        -- Log the sync operation
        INSERT INTO ekyc_sync_log (
            ekyc_submission_id,
            user_id,
            user_email,
            user_name,
            old_ekyc_status,
            new_ekyc_status,
            new_verification_status,
            sync_timestamp,
            trigger_source
        ) VALUES (
            NEW.id,
            NEW.user_id,
            user_email,
            user_name,
            OLD.status,
            NEW.status,
            new_verification_status,
            NOW(),
            'database_trigger'
        );

        -- Raise a notice for debugging (will appear in logs)
        RAISE NOTICE 'eKYC sync: User % (%) status changed from % to %, profile updated to %', 
            user_name, user_email, OLD.status, NEW.status, new_verification_status;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER ekyc_status_sync_trigger
    AFTER UPDATE ON ekyc_submissions
    FOR EACH ROW
    EXECUTE FUNCTION sync_ekyc_profile_status();

-- Create a log table to track sync operations
CREATE TABLE IF NOT EXISTS ekyc_sync_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ekyc_submission_id UUID REFERENCES ekyc_submissions(id),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    user_name TEXT,
    old_ekyc_status TEXT,
    new_ekyc_status TEXT,
    new_verification_status TEXT,
    sync_timestamp TIMESTAMPTZ DEFAULT NOW(),
    trigger_source TEXT DEFAULT 'database_trigger',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ekyc_sync_log_user_id ON ekyc_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ekyc_sync_log_timestamp ON ekyc_sync_log(sync_timestamp);
CREATE INDEX IF NOT EXISTS idx_ekyc_sync_log_submission_id ON ekyc_sync_log(ekyc_submission_id);

-- Enable RLS on the log table
ALTER TABLE ekyc_sync_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the log table
CREATE POLICY "Admins can view all sync logs" ON ekyc_sync_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can view their own sync logs" ON ekyc_sync_log
    FOR SELECT USING (user_id = auth.uid());

-- Create a function to check for sync mismatches
CREATE OR REPLACE FUNCTION check_ekyc_profile_sync_mismatches()
RETURNS TABLE(
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    ekyc_status TEXT,
    profile_status TEXT,
    ekyc_updated_at TIMESTAMPTZ,
    profile_updated_at TIMESTAMPTZ,
    mismatch_duration INTERVAL
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        e.user_id,
        au.email as user_email,
        p.full_name as user_name,
        e.status as ekyc_status,
        p.verification_status as profile_status,
        e.updated_at as ekyc_updated_at,
        p.updated_at as profile_updated_at,
        NOW() - GREATEST(e.updated_at, p.updated_at) as mismatch_duration
    FROM ekyc_submissions e
    INNER JOIN user_profiles p ON e.user_id = p.user_id
    INNER JOIN auth.users au ON e.user_id = au.id
    WHERE 
        (e.status = 'approved' AND p.verification_status != 'verified') OR
        (e.status = 'rejected' AND p.verification_status != 'rejected') OR
        (e.status = 'pending' AND p.verification_status NOT IN ('in_progress', 'not_started'))
    ORDER BY e.updated_at DESC;
$$;

-- Create a function to get sync statistics
CREATE OR REPLACE FUNCTION get_ekyc_sync_stats()
RETURNS TABLE(
    total_submissions BIGINT,
    approved_submissions BIGINT,
    rejected_submissions BIGINT,
    pending_submissions BIGINT,
    verified_profiles BIGINT,
    sync_mismatches BIGINT,
    recent_syncs_24h BIGINT,
    last_sync_time TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        (SELECT COUNT(*) FROM ekyc_submissions) as total_submissions,
        (SELECT COUNT(*) FROM ekyc_submissions WHERE status = 'approved') as approved_submissions,
        (SELECT COUNT(*) FROM ekyc_submissions WHERE status = 'rejected') as rejected_submissions,
        (SELECT COUNT(*) FROM ekyc_submissions WHERE status = 'pending') as pending_submissions,
        (SELECT COUNT(*) FROM user_profiles WHERE verification_status = 'verified') as verified_profiles,
        (SELECT COUNT(*) FROM check_ekyc_profile_sync_mismatches()) as sync_mismatches,
        (SELECT COUNT(*) FROM ekyc_sync_log WHERE sync_timestamp > NOW() - INTERVAL '24 hours') as recent_syncs_24h,
        (SELECT MAX(sync_timestamp) FROM ekyc_sync_log) as last_sync_time;
$$;

-- Create a function to manually fix sync issues (for admin use)
CREATE OR REPLACE FUNCTION fix_ekyc_sync_mismatch(target_user_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    old_status TEXT,
    new_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ekyc_status TEXT;
    current_profile_status TEXT;
    new_verification_status TEXT;
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RETURN QUERY SELECT FALSE, 'Access denied: Admin privileges required', NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Get current statuses
    SELECT e.status, p.verification_status, au.email, p.full_name
    INTO ekyc_status, current_profile_status, user_email, user_name
    FROM ekyc_submissions e
    INNER JOIN user_profiles p ON e.user_id = p.user_id
    INNER JOIN auth.users au ON e.user_id = au.id
    WHERE e.user_id = target_user_id
    ORDER BY e.created_at DESC
    LIMIT 1;

    IF ekyc_status IS NULL THEN
        RETURN QUERY SELECT FALSE, 'User not found or no eKYC submission', NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Determine correct verification status
    CASE ekyc_status
        WHEN 'approved' THEN new_verification_status := 'verified';
        WHEN 'rejected' THEN new_verification_status := 'rejected';
        WHEN 'pending' THEN new_verification_status := 'in_progress';
        ELSE new_verification_status := 'in_progress';
    END CASE;

    -- Check if fix is needed
    IF current_profile_status = new_verification_status THEN
        RETURN QUERY SELECT TRUE, 'No fix needed - statuses are already in sync', current_profile_status, new_verification_status;
        RETURN;
    END IF;

    -- Apply the fix
    UPDATE user_profiles 
    SET 
        verification_status = new_verification_status,
        updated_at = NOW()
    WHERE user_id = target_user_id;

    -- Log the manual fix
    INSERT INTO ekyc_sync_log (
        user_id,
        user_email,
        user_name,
        old_ekyc_status,
        new_ekyc_status,
        new_verification_status,
        sync_timestamp,
        trigger_source
    ) VALUES (
        target_user_id,
        user_email,
        user_name,
        ekyc_status,
        ekyc_status,
        new_verification_status,
        NOW(),
        'manual_fix_by_admin'
    );

    RETURN QUERY SELECT TRUE, 'Sync mismatch fixed successfully', current_profile_status, new_verification_status;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ekyc_sync_log TO authenticated;
GRANT EXECUTE ON FUNCTION check_ekyc_profile_sync_mismatches() TO authenticated;
GRANT EXECUTE ON FUNCTION get_ekyc_sync_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_ekyc_sync_mismatch(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION sync_ekyc_profile_status() IS 'Automatically syncs user profile verification status when eKYC status changes';
COMMENT ON TRIGGER ekyc_status_sync_trigger ON ekyc_submissions IS 'Triggers profile sync when eKYC status is updated';
COMMENT ON TABLE ekyc_sync_log IS 'Logs all eKYC profile sync operations for monitoring and debugging';
COMMENT ON FUNCTION check_ekyc_profile_sync_mismatches() IS 'Returns users with mismatched eKYC and profile verification statuses';
COMMENT ON FUNCTION get_ekyc_sync_stats() IS 'Returns comprehensive statistics about eKYC sync operations';
COMMENT ON FUNCTION fix_ekyc_sync_mismatch(UUID) IS 'Manually fixes sync mismatch for a specific user (admin only)';

-- Success message
SELECT 'eKYC sync trigger and monitoring system created successfully!' as result;