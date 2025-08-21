-- Simple version for immediate testing - run this SQL directly in Supabase dashboard

-- 1. Job proposals table
CREATE TABLE IF NOT EXISTS job_proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_listing_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    
    -- Proposal details
    proposed_price DECIMAL(10,2),
    proposal_description TEXT NOT NULL,
    proposed_timeline TEXT,
    estimated_hours INTEGER,
    start_date DATE,
    completion_date DATE,
    work_type TEXT DEFAULT 'remote' CHECK (work_type IN ('remote', 'on_site', 'hybrid')),
    experience TEXT,
    qualifications TEXT,
    
    -- Proposal status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')),
    
    -- Response details
    buyer_response TEXT,
    buyer_response_date TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Tracking
    is_read_by_buyer BOOLEAN DEFAULT FALSE,
    is_read_by_seller BOOLEAN DEFAULT FALSE,
    proposal_count INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Job proposal activities table
CREATE TABLE IF NOT EXISTS job_proposal_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_proposal_id UUID NOT NULL,
    job_listing_id UUID NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'proposal_submitted', 'proposal_updated', 'proposal_accepted', 
        'proposal_rejected', 'proposal_withdrawn', 'buyer_message', 
        'seller_message', 'work_started', 'work_completed', 'payment_released'
    )),
    actor_id UUID NOT NULL,
    target_user_id UUID NOT NULL,
    activity_description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Job listing stats table
CREATE TABLE IF NOT EXISTS job_listing_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_listing_id UUID NOT NULL UNIQUE,
    total_proposals INTEGER DEFAULT 0,
    pending_proposals INTEGER DEFAULT 0,
    accepted_proposals INTEGER DEFAULT 0,
    rejected_proposals INTEGER DEFAULT 0,
    unique_sellers INTEGER DEFAULT 0,
    last_proposal_date TIMESTAMPTZ,
    last_activity_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. User notification preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    job_proposals BOOLEAN DEFAULT TRUE,
    proposal_status_updates BOOLEAN DEFAULT TRUE,
    job_messages BOOLEAN DEFAULT TRUE,
    job_completion_reminders BOOLEAN DEFAULT TRUE,
    payment_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    quiet_hours_timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_proposals_job_listing_id ON job_proposals(job_listing_id);
CREATE INDEX IF NOT EXISTS idx_job_proposals_seller_id ON job_proposals(seller_id);
CREATE INDEX IF NOT EXISTS idx_job_proposals_buyer_id ON job_proposals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_job_proposals_status ON job_proposals(status);

CREATE INDEX IF NOT EXISTS idx_job_proposal_activities_target_user_id ON job_proposal_activities(target_user_id);
CREATE INDEX IF NOT EXISTS idx_job_proposal_activities_job_listing_id ON job_proposal_activities(job_listing_id);

CREATE INDEX IF NOT EXISTS idx_job_listing_stats_job_listing_id ON job_listing_stats(job_listing_id);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);

-- Enable RLS
ALTER TABLE job_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_proposal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listing_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_proposals
CREATE POLICY "Users can view proposals they're involved in" ON job_proposals
    FOR SELECT USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE POLICY "Sellers can insert proposals" ON job_proposals
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own proposals" ON job_proposals
    FOR UPDATE USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- RLS Policies for job_proposal_activities  
CREATE POLICY "Users can view activities for their proposals" ON job_proposal_activities
    FOR SELECT USING (auth.uid() = target_user_id OR auth.uid() = actor_id);

CREATE POLICY "Users can insert activities" ON job_proposal_activities
    FOR INSERT WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "Users can update read status" ON job_proposal_activities
    FOR UPDATE USING (auth.uid() = target_user_id);

-- RLS Policies for job_listing_stats
CREATE POLICY "Job owners can view stats" ON job_listing_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM job_listings jl 
            WHERE jl.id = job_listing_stats.job_listing_id 
            AND jl.user_id = auth.uid()
        )
    );

-- RLS Policies for user_notification_preferences
CREATE POLICY "Users can manage their own preferences" ON user_notification_preferences
    FOR ALL USING (auth.uid() = user_id);
