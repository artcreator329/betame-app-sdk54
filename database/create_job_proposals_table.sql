-- Create job proposals table to track seller proposals for job postings
CREATE TABLE IF NOT EXISTS job_proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_listing_id UUID REFERENCES job_listings(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
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
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',     -- Proposal submitted, waiting for buyer response
        'accepted',    -- Buyer accepted the proposal
        'rejected',    -- Buyer rejected the proposal
        'withdrawn',   -- Seller withdrew the proposal
        'expired'      -- Proposal expired (e.g., after 30 days)
    )) NOT NULL,
    
    -- Response details
    buyer_response TEXT,
    buyer_response_date TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Tracking
    is_read_by_buyer BOOLEAN DEFAULT FALSE,
    is_read_by_seller BOOLEAN DEFAULT FALSE,
    proposal_count INTEGER DEFAULT 1, -- Track if seller submitted multiple proposals
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create job proposal activities table for tracking all updates/notifications
CREATE TABLE IF NOT EXISTS job_proposal_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_proposal_id UUID REFERENCES job_proposals(id) ON DELETE CASCADE NOT NULL,
    job_listing_id UUID REFERENCES job_listings(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'proposal_submitted',
        'proposal_updated', 
        'proposal_accepted',
        'proposal_rejected',
        'proposal_withdrawn',
        'buyer_message',
        'seller_message',
        'work_started',
        'work_completed',
        'payment_released'
    )),
    actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Who performed the action
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Who should be notified
    activity_description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional data like old/new values
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create job listing stats table to track proposal counts and activity
CREATE TABLE IF NOT EXISTS job_listing_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_listing_id UUID NOT NULL UNIQUE,
    total_proposals INTEGER DEFAULT 0,
    pending_proposals INTEGER DEFAULT 0,
    accepted_proposals INTEGER DEFAULT 0,
    rejected_proposals INTEGER DEFAULT 0,
    unique_sellers INTEGER DEFAULT 0, -- Count of unique sellers who proposed
    last_proposal_date TIMESTAMPTZ,
    last_activity_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_proposals_job_listing_id ON job_proposals(job_listing_id);
CREATE INDEX IF NOT EXISTS idx_job_proposals_seller_id ON job_proposals(seller_id);
CREATE INDEX IF NOT EXISTS idx_job_proposals_buyer_id ON job_proposals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_job_proposals_status ON job_proposals(status);
CREATE INDEX IF NOT EXISTS idx_job_proposals_created_at ON job_proposals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_proposal_activities_job_proposal_id ON job_proposal_activities(job_proposal_id);
CREATE INDEX IF NOT EXISTS idx_job_proposal_activities_job_listing_id ON job_proposal_activities(job_listing_id);
CREATE INDEX IF NOT EXISTS idx_job_proposal_activities_target_user_id ON job_proposal_activities(target_user_id);
CREATE INDEX IF NOT EXISTS idx_job_proposal_activities_is_read ON job_proposal_activities(is_read);
CREATE INDEX IF NOT EXISTS idx_job_proposal_activities_created_at ON job_proposal_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_listing_stats_job_listing_id ON job_listing_stats(job_listing_id);

-- Add foreign key constraint after creating the index
ALTER TABLE job_listing_stats 
ADD CONSTRAINT fk_job_listing_stats_job_listing_id 
FOREIGN KEY (job_listing_id) REFERENCES job_listings(id) ON DELETE CASCADE;

-- Enable Row Level Security (RLS)
ALTER TABLE job_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_proposal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listing_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_proposals
CREATE POLICY "Sellers can insert proposals for jobs" ON job_proposals
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can view proposals they're involved in" ON job_proposals
    FOR SELECT USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE POLICY "Sellers can update their own proposals" ON job_proposals
    FOR UPDATE USING (auth.uid() = seller_id AND status = 'pending');

CREATE POLICY "Buyers can update proposal status" ON job_proposals
    FOR UPDATE USING (
        auth.uid() = buyer_id AND 
        (status = 'pending' OR (status IN ('accepted', 'rejected') AND OLD.status = 'pending'))
    );

-- RLS policies for job_proposal_activities
CREATE POLICY "Users can view activities for their job proposals" ON job_proposal_activities
    FOR SELECT USING (
        auth.uid() = target_user_id OR 
        EXISTS (
            SELECT 1 FROM job_proposals jp 
            WHERE jp.id = job_proposal_activities.job_proposal_id 
            AND (jp.seller_id = auth.uid() OR jp.buyer_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert activities for their proposals" ON job_proposal_activities
    FOR INSERT WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "Users can update read status of their activities" ON job_proposal_activities
    FOR UPDATE USING (auth.uid() = target_user_id);

-- RLS policies for job_listing_stats
CREATE POLICY "Job owners can view their listing stats" ON job_listing_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM job_listings jl 
            WHERE jl.id = job_listing_stats.job_listing_id 
            AND jl.user_id = auth.uid()
        )
    );

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_job_proposals_updated_at BEFORE UPDATE ON job_proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_listing_stats_updated_at BEFORE UPDATE ON job_listing_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update job listing stats when proposals change
CREATE OR REPLACE FUNCTION update_job_listing_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stats for the job listing
    INSERT INTO job_listing_stats (job_listing_id, total_proposals, pending_proposals, accepted_proposals, rejected_proposals, unique_sellers, last_proposal_date, last_activity_date)
    SELECT 
        NEW.job_listing_id,
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'accepted'),
        COUNT(*) FILTER (WHERE status = 'rejected'),
        COUNT(DISTINCT seller_id),
        MAX(created_at),
        NOW()
    FROM job_proposals 
    WHERE job_listing_id = NEW.job_listing_id
    ON CONFLICT (job_listing_id) 
    DO UPDATE SET
        total_proposals = EXCLUDED.total_proposals,
        pending_proposals = EXCLUDED.pending_proposals,
        accepted_proposals = EXCLUDED.accepted_proposals,
        rejected_proposals = EXCLUDED.rejected_proposals,
        unique_sellers = EXCLUDED.unique_sellers,
        last_proposal_date = EXCLUDED.last_proposal_date,
        last_activity_date = EXCLUDED.last_activity_date,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update stats when proposals are inserted/updated
CREATE TRIGGER update_job_listing_stats_trigger
    AFTER INSERT OR UPDATE ON job_proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_job_listing_stats();

-- Function to create activity when proposal status changes
CREATE OR REPLACE FUNCTION create_job_proposal_activity()
RETURNS TRIGGER AS $$
DECLARE
    activity_type_val TEXT;
    activity_desc TEXT;
    target_user UUID;
BEGIN
    -- Determine activity type and target user based on the change
    IF TG_OP = 'INSERT' THEN
        activity_type_val = 'proposal_submitted';
        activity_desc = 'New proposal submitted for your job posting';
        target_user = NEW.buyer_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
            activity_type_val = 'proposal_accepted';
            activity_desc = 'Your proposal has been accepted!';
            target_user = NEW.seller_id;
        ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
            activity_type_val = 'proposal_rejected';
            activity_desc = 'Your proposal has been rejected';
            target_user = NEW.seller_id;
        ELSIF OLD.status = 'pending' AND NEW.status = 'withdrawn' THEN
            activity_type_val = 'proposal_withdrawn';
            activity_desc = 'Proposal has been withdrawn';
            target_user = NEW.buyer_id;
        ELSE
            activity_type_val = 'proposal_updated';
            activity_desc = 'Proposal has been updated';
            target_user = CASE WHEN OLD.seller_id = NEW.seller_id THEN NEW.buyer_id ELSE NEW.seller_id END;
        END IF;
    END IF;

    -- Insert activity record
    INSERT INTO job_proposal_activities (
        job_proposal_id,
        job_listing_id,
        activity_type,
        actor_id,
        target_user_id,
        activity_description,
        metadata
    ) VALUES (
        NEW.id,
        NEW.job_listing_id,
        activity_type_val,
        COALESCE(NEW.seller_id, NEW.buyer_id), -- Actor is the one making the change
        target_user,
        activity_desc,
        jsonb_build_object(
            'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
            'new_status', NEW.status,
            'proposed_price', NEW.proposed_price
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log activities
CREATE TRIGGER create_job_proposal_activity_trigger
    AFTER INSERT OR UPDATE OF status ON job_proposals
    FOR EACH ROW
    EXECUTE FUNCTION create_job_proposal_activity();
