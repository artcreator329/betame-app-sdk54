-- Create user moderation system for tracking violations and banning users
-- This system tracks when users attempt to share contact information

-- Table to track user violations
CREATE TABLE IF NOT EXISTS user_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    violation_type TEXT NOT NULL CHECK (violation_type IN (
        'contact_info_sharing',
        'spam',
        'inappropriate_content',
        'harassment',
        'other'
    )),
    violation_details TEXT,
    message_content TEXT, -- Store the original message that triggered the violation
    chat_id UUID, -- Reference to the chat where violation occurred
    severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id), -- Admin who resolved the violation
    resolution_notes TEXT
);

-- Table to track user moderation status
CREATE TABLE IF NOT EXISTS user_moderation_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    total_violations INTEGER DEFAULT 0 NOT NULL,
    contact_info_violations INTEGER DEFAULT 0 NOT NULL,
    spam_violations INTEGER DEFAULT 0 NOT NULL,
    last_violation_at TIMESTAMPTZ,
    warning_count INTEGER DEFAULT 0 NOT NULL,
    is_banned BOOLEAN DEFAULT FALSE NOT NULL,
    banned_at TIMESTAMPTZ,
    banned_until TIMESTAMPTZ, -- NULL for permanent ban
    ban_reason TEXT,
    banned_by UUID REFERENCES auth.users(id), -- Admin who banned the user
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table to track warning messages sent to users
CREATE TABLE IF NOT EXISTS user_warnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    violation_id UUID REFERENCES user_violations(id) ON DELETE CASCADE,
    warning_type TEXT NOT NULL CHECK (warning_type IN (
        'first_warning',
        'second_warning',
        'final_warning',
        'ban_notice'
    )),
    warning_message TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_violations_user_id ON user_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_violations_created_at ON user_violations(created_at);
CREATE INDEX IF NOT EXISTS idx_user_violations_type ON user_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_user_moderation_status_user_id ON user_moderation_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_status_banned ON user_moderation_status(is_banned);
CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id ON user_warnings(user_id);

-- Enable RLS
ALTER TABLE user_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_moderation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_violations (only admins and the user themselves can view)
CREATE POLICY "Users can view their own violations" ON user_violations
    FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for user_moderation_status (users can view their own status)
CREATE POLICY "Users can view their own moderation status" ON user_moderation_status
    FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for user_warnings (users can view their own warnings)
CREATE POLICY "Users can view their own warnings" ON user_warnings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can acknowledge their own warnings" ON user_warnings
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Function to automatically update moderation status when violations are added
CREATE OR REPLACE FUNCTION update_user_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update user moderation status
    INSERT INTO user_moderation_status (
        user_id,
        total_violations,
        contact_info_violations,
        spam_violations,
        last_violation_at,
        updated_at
    )
    VALUES (
        NEW.user_id,
        1,
        CASE WHEN NEW.violation_type = 'contact_info_sharing' THEN 1 ELSE 0 END,
        CASE WHEN NEW.violation_type = 'spam' THEN 1 ELSE 0 END,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_violations = user_moderation_status.total_violations + 1,
        contact_info_violations = user_moderation_status.contact_info_violations + 
            CASE WHEN NEW.violation_type = 'contact_info_sharing' THEN 1 ELSE 0 END,
        spam_violations = user_moderation_status.spam_violations + 
            CASE WHEN NEW.violation_type = 'spam' THEN 1 ELSE 0 END,
        last_violation_at = NEW.created_at,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update moderation status
DROP TRIGGER IF EXISTS trigger_update_user_moderation_status ON user_violations;
CREATE TRIGGER trigger_update_user_moderation_status
    AFTER INSERT ON user_violations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_moderation_status();

-- Function to check if user should be banned based on violations
CREATE OR REPLACE FUNCTION check_auto_ban_user()
RETURNS TRIGGER AS $$
DECLARE
    contact_violations INTEGER;
    total_violations INTEGER;
    should_ban BOOLEAN := FALSE;
    ban_duration INTERVAL;
BEGIN
    -- Get current violation counts
    SELECT 
        COALESCE(contact_info_violations, 0),
        COALESCE(total_violations, 0)
    INTO contact_violations, total_violations
    FROM user_moderation_status
    WHERE user_id = NEW.user_id;

    -- Auto-ban logic:
    -- 1. 3+ contact info violations = 24 hour ban
    -- 2. 5+ contact info violations = 7 day ban
    -- 3. 7+ contact info violations = permanent ban
    -- 4. 10+ total violations = permanent ban
    
    IF contact_violations >= 7 OR total_violations >= 10 THEN
        should_ban := TRUE;
        ban_duration := NULL; -- Permanent ban
    ELSIF contact_violations >= 5 THEN
        should_ban := TRUE;
        ban_duration := INTERVAL '7 days';
    ELSIF contact_violations >= 3 THEN
        should_ban := TRUE;
        ban_duration := INTERVAL '1 day';
    END IF;

    -- Apply ban if needed
    IF should_ban THEN
        UPDATE user_moderation_status
        SET 
            is_banned = TRUE,
            banned_at = NOW(),
            banned_until = CASE WHEN ban_duration IS NULL THEN NULL ELSE NOW() + ban_duration END,
            ban_reason = CASE 
                WHEN contact_violations >= 7 THEN 'Repeated attempts to share contact information (permanent ban)'
                WHEN total_violations >= 10 THEN 'Multiple policy violations (permanent ban)'
                WHEN contact_violations >= 5 THEN 'Repeated attempts to share contact information (7 day ban)'
                WHEN contact_violations >= 3 THEN 'Multiple attempts to share contact information (24 hour ban)'
                ELSE 'Policy violation'
            END,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;

        -- Create ban warning
        INSERT INTO user_warnings (
            user_id,
            violation_id,
            warning_type,
            warning_message
        ) VALUES (
            NEW.user_id,
            NEW.id,
            'ban_notice',
            CASE 
                WHEN ban_duration IS NULL THEN 'Your account has been permanently banned for repeated policy violations.'
                ELSE 'Your account has been temporarily banned for ' || ban_duration || ' due to policy violations.'
            END
        );
    ELSE
        -- Issue warning based on violation count
        INSERT INTO user_warnings (
            user_id,
            violation_id,
            warning_type,
            warning_message
        ) VALUES (
            NEW.user_id,
            NEW.id,
            CASE 
                WHEN contact_violations = 1 THEN 'first_warning'
                WHEN contact_violations = 2 THEN 'second_warning'
                ELSE 'final_warning'
            END,
            CASE 
                WHEN contact_violations = 1 THEN 'Warning: Sharing personal contact information is not allowed. Please use the platform''s messaging system for communication.'
                WHEN contact_violations = 2 THEN 'Second Warning: You have attempted to share contact information again. Further violations may result in account restrictions.'
                ELSE 'Final Warning: This is your final warning. Any further attempts to share contact information will result in account suspension.'
            END
        );

        -- Update warning count
        UPDATE user_moderation_status
        SET 
            warning_count = warning_count + 1,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-ban checking
DROP TRIGGER IF EXISTS trigger_check_auto_ban_user ON user_violations;
CREATE TRIGGER trigger_check_auto_ban_user
    AFTER INSERT ON user_violations
    FOR EACH ROW
    EXECUTE FUNCTION check_auto_ban_user();

-- Function to check if user is currently banned
CREATE OR REPLACE FUNCTION is_user_banned(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    banned BOOLEAN := FALSE;
    banned_until TIMESTAMPTZ;
BEGIN
    SELECT 
        is_banned,
        banned_until
    INTO banned, banned_until
    FROM user_moderation_status
    WHERE user_id = check_user_id;

    -- If not found, user is not banned
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- If not banned, return false
    IF NOT banned THEN
        RETURN FALSE;
    END IF;

    -- If permanently banned (banned_until is NULL), return true
    IF banned_until IS NULL THEN
        RETURN TRUE;
    END IF;

    -- If temporary ban has expired, unban the user
    IF banned_until <= NOW() THEN
        UPDATE user_moderation_status
        SET 
            is_banned = FALSE,
            banned_until = NULL,
            updated_at = NOW()
        WHERE user_id = check_user_id;
        RETURN FALSE;
    END IF;

    -- User is still banned
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;