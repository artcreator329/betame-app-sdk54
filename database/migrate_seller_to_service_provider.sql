-- Migration: Change all "seller" terminology to "service_provider" terminology
-- This migration renames columns, updates functions, policies, and indexes
-- to use "service_provider" instead of "seller" throughout the database

-- Start transaction to ensure atomicity
BEGIN;

-- ============================================================================
-- STEP 1: Add new columns alongside existing ones (for zero-downtime migration)
-- ============================================================================

-- Update job_proposals table
ALTER TABLE job_proposals 
ADD COLUMN IF NOT EXISTS service_provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Copy data from seller_id to service_provider_id
UPDATE job_proposals SET service_provider_id = seller_id WHERE service_provider_id IS NULL;

-- Update job_proposals table tracking columns
ALTER TABLE job_proposals 
ADD COLUMN IF NOT EXISTS is_read_by_service_provider BOOLEAN DEFAULT FALSE;

-- Copy data from is_read_by_seller to is_read_by_service_provider
UPDATE job_proposals SET is_read_by_service_provider = is_read_by_seller WHERE is_read_by_service_provider IS NULL;

-- Update escrow_transactions table
ALTER TABLE escrow_transactions 
ADD COLUMN IF NOT EXISTS service_provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Copy data from seller_id to service_provider_id
UPDATE escrow_transactions SET service_provider_id = seller_id WHERE service_provider_id IS NULL;

-- Update job_status table
ALTER TABLE job_status 
ADD COLUMN IF NOT EXISTS service_provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Copy data from seller_id to service_provider_id
UPDATE job_status SET service_provider_id = seller_id WHERE service_provider_id IS NULL;

-- Update orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS service_provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Copy data from seller_id to service_provider_id
UPDATE orders SET service_provider_id = seller_id WHERE service_provider_id IS NULL;

-- Update temporary_payouts table
ALTER TABLE temporary_payouts 
ADD COLUMN IF NOT EXISTS service_provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Copy data from seller_id to service_provider_id
UPDATE temporary_payouts SET service_provider_id = seller_id WHERE service_provider_id IS NULL;

-- Update user_profiles table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_seller') THEN
        ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_service_provider BOOLEAN DEFAULT FALSE;
        UPDATE user_profiles SET is_service_provider = is_seller WHERE is_service_provider IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'seller_badge') THEN
        ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS service_provider_badge TEXT;
        UPDATE user_profiles SET service_provider_badge = seller_badge WHERE service_provider_badge IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'seller_badge_subtitle') THEN
        ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS service_provider_badge_subtitle TEXT;
        UPDATE user_profiles SET service_provider_badge_subtitle = seller_badge_subtitle WHERE service_provider_badge_subtitle IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'seller_description') THEN
        ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS service_provider_description TEXT;
        UPDATE user_profiles SET service_provider_description = seller_description WHERE service_provider_description IS NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create new indexes with service_provider naming
-- ============================================================================

-- Create new indexes for job_proposals
CREATE INDEX IF NOT EXISTS idx_job_proposals_service_provider_id ON job_proposals(service_provider_id);

-- Create new indexes for escrow_transactions
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_service_provider_id ON escrow_transactions(service_provider_id);

-- Create new indexes for job_status
CREATE INDEX IF NOT EXISTS idx_job_status_service_provider_id ON job_status(service_provider_id);

-- Create new indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_service_provider_id ON orders(service_provider_id);

-- Create new indexes for temporary_payouts
CREATE INDEX IF NOT EXISTS idx_temporary_payouts_service_provider_id ON temporary_payouts(service_provider_id);

-- ============================================================================
-- STEP 3: Update database functions to use new parameter names
-- ============================================================================

-- Update mark_work_completed function
CREATE OR REPLACE FUNCTION mark_work_completed(
    p_order_id UUID,
    p_service_provider_id UUID
)
RETURNS BOOLEAN AS $
DECLARE
    order_record orders%ROWTYPE;
BEGIN
    -- Get order details (check both old and new column names for compatibility)
    SELECT * INTO order_record FROM orders 
    WHERE id = p_order_id 
    AND (service_provider_id = p_service_provider_id OR seller_id = p_service_provider_id);
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Only allow if work is in progress
    IF order_record.status != 'work_in_progress' THEN
        RETURN FALSE;
    END IF;
    
    -- Update order status
    UPDATE orders 
    SET 
        status = 'buyer_reviewing',
        work_completed_at = NOW(),
        buyer_review_started_at = NOW(),
        auto_release_at = NOW() + INTERVAL '24 hours',
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Add timeline event
    PERFORM add_order_timeline_event(
        p_order_id,
        'work_completed',
        'Service provider marked work as completed. Buyer has 24 hours to review.',
        p_service_provider_id
    );
    
    RETURN TRUE;
END;
$ LANGUAGE plpgsql;

-- Update process_payment_release function to work with new column names
CREATE OR REPLACE FUNCTION process_payment_release(p_order_id UUID)
RETURNS BOOLEAN AS $
DECLARE
    order_record orders%ROWTYPE;
    payout_id UUID;
    service_provider_id_val UUID;
BEGIN
    -- Get order details
    SELECT * INTO order_record FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Only process if completed
    IF order_record.status != 'completed' THEN
        RETURN FALSE;
    END IF;
    
    -- Get service provider ID (prefer new column, fallback to old)
    service_provider_id_val := COALESCE(order_record.service_provider_id, order_record.seller_id);
    
    -- Create temporary payout record
    INSERT INTO temporary_payouts (
        order_id,
        service_provider_id,
        seller_id, -- Keep old column for compatibility
        amount,
        payout_method,
        payout_status,
        payout_notes
    ) VALUES (
        p_order_id,
        service_provider_id_val,
        service_provider_id_val, -- Duplicate for compatibility
        order_record.amount,
        'betacoin_credit',
        'pending',
        'Automatic payment release after successful job completion'
    ) RETURNING id INTO payout_id;
    
    -- Update order
    UPDATE orders 
    SET 
        payment_released_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Add timeline event
    PERFORM add_order_timeline_event(
        p_order_id,
        'payment_released',
        'Payment released to service provider via temporary payout system',
        NULL,
        jsonb_build_object('payout_id', payout_id)
    );
    
    -- Process the actual credit transfer (temporary implementation)
    PERFORM process_temporary_payout(payout_id);
    
    RETURN TRUE;
END;
$ LANGUAGE plpgsql;

-- Update process_temporary_payout function
CREATE OR REPLACE FUNCTION process_temporary_payout(p_payout_id UUID)
RETURNS BOOLEAN AS $
DECLARE
    payout_record temporary_payouts%ROWTYPE;
    service_provider_id_val UUID;
BEGIN
    -- Get payout details
    SELECT * INTO payout_record FROM temporary_payouts WHERE id = p_payout_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get service provider ID (prefer new column, fallback to old)
    service_provider_id_val := COALESCE(payout_record.service_provider_id, payout_record.seller_id);
    
    -- Update service provider's wallet
    INSERT INTO wallets (user_id, betame_credits)
    VALUES (service_provider_id_val, payout_record.amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        betame_credits = wallets.betame_credits + payout_record.amount,
        updated_at = NOW();
    
    -- Add transaction record
    INSERT INTO transactions (
        user_id,
        type,
        amount,
        description
    ) VALUES (
        service_provider_id_val,
        'service_payment_received',
        payout_record.amount,
        'Payment received for completed service (Order #' || payout_record.order_id || ')'
    );
    
    -- Update payout status
    UPDATE temporary_payouts 
    SET 
        payout_status = 'completed',
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payout_id;
    
    RETURN TRUE;
END;
$ LANGUAGE plpgsql;

-- Update job listing stats function
CREATE OR REPLACE FUNCTION update_job_listing_stats()
RETURNS TRIGGER AS $
BEGIN
    -- Update stats for the job listing
    INSERT INTO job_listing_stats (job_listing_id, total_proposals, pending_proposals, accepted_proposals, rejected_proposals, unique_service_providers, last_proposal_date, last_activity_date)
    SELECT 
        NEW.job_listing_id,
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'accepted'),
        COUNT(*) FILTER (WHERE status = 'rejected'),
        COUNT(DISTINCT COALESCE(service_provider_id, seller_id)), -- Use new column, fallback to old
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
        unique_service_providers = EXCLUDED.unique_service_providers,
        last_proposal_date = EXCLUDED.last_proposal_date,
        last_activity_date = EXCLUDED.last_activity_date,
        updated_at = NOW();
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Update job proposal activity function
CREATE OR REPLACE FUNCTION create_job_proposal_activity()
RETURNS TRIGGER AS $
DECLARE
    activity_type_val TEXT;
    activity_desc TEXT;
    target_user UUID;
    service_provider_id_val UUID;
BEGIN
    -- Get service provider ID (prefer new column, fallback to old)
    service_provider_id_val := COALESCE(NEW.service_provider_id, NEW.seller_id);
    
    -- Determine activity type and target user based on the change
    IF TG_OP = 'INSERT' THEN
        activity_type_val = 'proposal_submitted';
        activity_desc = 'New proposal submitted for your job posting';
        target_user = NEW.buyer_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
            activity_type_val = 'proposal_accepted';
            activity_desc = 'Your proposal has been accepted!';
            target_user = service_provider_id_val;
        ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
            activity_type_val = 'proposal_rejected';
            activity_desc = 'Your proposal has been rejected';
            target_user = service_provider_id_val;
        ELSIF OLD.status = 'pending' AND NEW.status = 'withdrawn' THEN
            activity_type_val = 'proposal_withdrawn';
            activity_desc = 'Proposal has been withdrawn';
            target_user = NEW.buyer_id;
        ELSE
            activity_type_val = 'proposal_updated';
            activity_desc = 'Proposal has been updated';
            target_user = CASE WHEN service_provider_id_val = service_provider_id_val THEN NEW.buyer_id ELSE service_provider_id_val END;
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
        COALESCE(service_provider_id_val, NEW.buyer_id), -- Actor is the one making the change
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
$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Update job_listing_stats table structure
-- ============================================================================

-- Add new column for unique_service_providers
ALTER TABLE job_listing_stats 
ADD COLUMN IF NOT EXISTS unique_service_providers INTEGER DEFAULT 0;

-- Copy data from unique_sellers to unique_service_providers
UPDATE job_listing_stats SET unique_service_providers = unique_sellers WHERE unique_service_providers = 0;

-- ============================================================================
-- STEP 5: Update RLS policies to use new column names
-- ============================================================================

-- Drop old policies and create new ones for job_proposals
DROP POLICY IF EXISTS "Service providers can insert proposals for jobs" ON job_proposals;
DROP POLICY IF EXISTS "Users can view proposals they're involved in" ON job_proposals;
DROP POLICY IF EXISTS "Service providers can update their own proposals" ON job_proposals;
DROP POLICY IF EXISTS "Buyers can update proposal status" ON job_proposals;

-- Create new policies with updated logic
CREATE POLICY "Service providers can insert proposals for jobs" ON job_proposals
    FOR INSERT WITH CHECK (auth.uid() = COALESCE(service_provider_id, seller_id));

CREATE POLICY "Users can view proposals they're involved in" ON job_proposals
    FOR SELECT USING (auth.uid() = COALESCE(service_provider_id, seller_id) OR auth.uid() = buyer_id);

CREATE POLICY "Service providers can update their own proposals" ON job_proposals
    FOR UPDATE USING (auth.uid() = COALESCE(service_provider_id, seller_id) AND status = 'pending');

CREATE POLICY "Buyers can update proposal status" ON job_proposals
    FOR UPDATE USING (
        auth.uid() = buyer_id AND 
        (status = 'pending' OR (status IN ('accepted', 'rejected') AND OLD.status = 'pending'))
    );

-- Update policies for escrow_transactions
DROP POLICY IF EXISTS "Users can view escrow transactions they're involved in" ON escrow_transactions;
CREATE POLICY "Users can view escrow transactions they're involved in" ON escrow_transactions
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = COALESCE(service_provider_id, seller_id));

-- Update policies for job_status
DROP POLICY IF EXISTS "Users can view job status they're involved in" ON job_status;
DROP POLICY IF EXISTS "Users can update job status they're involved in" ON job_status;

CREATE POLICY "Users can view job status they're involved in" ON job_status
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = COALESCE(service_provider_id, seller_id));

CREATE POLICY "Users can update job status they're involved in" ON job_status
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = COALESCE(service_provider_id, seller_id));

-- Update policies for orders
DROP POLICY IF EXISTS "Users can view orders they're involved in" ON orders;
DROP POLICY IF EXISTS "Users can update orders they're involved in" ON orders;

CREATE POLICY "Users can view orders they're involved in" ON orders
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = COALESCE(service_provider_id, seller_id));

CREATE POLICY "Users can update orders they're involved in" ON orders
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = COALESCE(service_provider_id, seller_id));

-- Update policies for temporary_payouts
DROP POLICY IF EXISTS "Service providers can view their payouts" ON temporary_payouts;
CREATE POLICY "Service providers can view their payouts" ON temporary_payouts
    FOR SELECT USING (auth.uid() = COALESCE(service_provider_id, seller_id));

-- Update policies for job_milestones
DROP POLICY IF EXISTS "Users can view milestones for their jobs" ON job_milestones;
DROP POLICY IF EXISTS "Users can update milestones for their jobs" ON job_milestones;
DROP POLICY IF EXISTS "Users can insert milestones for their jobs" ON job_milestones;

CREATE POLICY "Users can view milestones for their jobs" ON job_milestones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM job_status js 
            WHERE js.id = job_milestones.job_status_id 
            AND (js.buyer_id = auth.uid() OR COALESCE(js.service_provider_id, js.seller_id) = auth.uid())
        )
    );

CREATE POLICY "Users can update milestones for their jobs" ON job_milestones
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM job_status js 
            WHERE js.id = job_milestones.job_status_id 
            AND (js.buyer_id = auth.uid() OR COALESCE(js.service_provider_id, js.seller_id) = auth.uid())
        )
    );

CREATE POLICY "Users can insert milestones for their jobs" ON job_milestones
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM job_status js 
            WHERE js.id = job_milestones.job_status_id 
            AND (js.buyer_id = auth.uid() OR COALESCE(js.service_provider_id, js.seller_id) = auth.uid())
        )
    );

-- Update policies for job_communications
DROP POLICY IF EXISTS "Users can view communications for their jobs" ON job_communications;
DROP POLICY IF EXISTS "Users can insert communications for their jobs" ON job_communications;

CREATE POLICY "Users can view communications for their jobs" ON job_communications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM job_status js 
            WHERE js.id = job_communications.job_status_id 
            AND (js.buyer_id = auth.uid() OR COALESCE(js.service_provider_id, js.seller_id) = auth.uid())
        )
    );

CREATE POLICY "Users can insert communications for their jobs" ON job_communications
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM job_status js 
            WHERE js.id = job_communications.job_status_id 
            AND (js.buyer_id = auth.uid() OR COALESCE(js.service_provider_id, js.seller_id) = auth.uid())
        )
    );

-- Update policies for job_proposal_activities
DROP POLICY IF EXISTS "Users can view activities for their job proposals" ON job_proposal_activities;

CREATE POLICY "Users can view activities for their job proposals" ON job_proposal_activities
    FOR SELECT USING (
        auth.uid() = target_user_id OR 
        EXISTS (
            SELECT 1 FROM job_proposals jp 
            WHERE jp.id = job_proposal_activities.job_proposal_id 
            AND (COALESCE(jp.service_provider_id, jp.seller_id) = auth.uid() OR jp.buyer_id = auth.uid())
        )
    );

-- ============================================================================
-- STEP 6: Update activity type enums to include service_provider_message
-- ============================================================================

-- Update the activity_type check constraint to include service_provider_message
ALTER TABLE job_proposal_activities 
DROP CONSTRAINT IF EXISTS job_proposal_activities_activity_type_check;

ALTER TABLE job_proposal_activities 
ADD CONSTRAINT job_proposal_activities_activity_type_check 
CHECK (activity_type IN (
    'proposal_submitted', 'proposal_updated', 'proposal_accepted', 
    'proposal_rejected', 'proposal_withdrawn', 'buyer_message', 
    'seller_message', 'service_provider_message', 'work_started', 
    'work_completed', 'payment_released'
));

-- ============================================================================
-- STEP 7: Create compatibility views (optional - for gradual migration)
-- ============================================================================

-- Create a view that maps old seller terminology to new service_provider terminology
-- This allows existing queries to continue working during the transition period

-- Note: Views are commented out for now as they may cause issues with RLS
-- Uncomment if needed for gradual migration

/*
CREATE OR REPLACE VIEW job_proposals_compat AS
SELECT 
    id,
    job_listing_id,
    COALESCE(service_provider_id, seller_id) as seller_id,
    service_provider_id,
    buyer_id,
    proposed_price,
    proposal_description,
    proposed_timeline,
    estimated_hours,
    start_date,
    completion_date,
    work_type,
    experience,
    qualifications,
    status,
    buyer_response,
    buyer_response_date,
    rejection_reason,
    is_read_by_buyer,
    COALESCE(is_read_by_service_provider, is_read_by_seller) as is_read_by_seller,
    is_read_by_service_provider,
    proposal_count,
    created_at,
    updated_at
FROM job_proposals;
*/

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify success)
-- ============================================================================

-- Verify data integrity
-- SELECT COUNT(*) FROM job_proposals WHERE service_provider_id IS NULL;
-- SELECT COUNT(*) FROM job_proposals WHERE service_provider_id != seller_id;
-- SELECT COUNT(*) FROM escrow_transactions WHERE service_provider_id IS NULL;
-- SELECT COUNT(*) FROM job_status WHERE service_provider_id IS NULL;
-- SELECT COUNT(*) FROM orders WHERE service_provider_id IS NULL;
-- SELECT COUNT(*) FROM temporary_payouts WHERE service_provider_id IS NULL;

-- Verify indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'job_proposals' AND indexname LIKE '%service_provider%';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'escrow_transactions' AND indexname LIKE '%service_provider%';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'job_status' AND indexname LIKE '%service_provider%';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'orders' AND indexname LIKE '%service_provider%';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'temporary_payouts' AND indexname LIKE '%service_provider%';

-- Verify functions exist
-- SELECT proname FROM pg_proc WHERE proname LIKE '%service_provider%' OR proname IN ('mark_work_completed', 'process_payment_release');

-- Verify policies exist
-- SELECT policyname FROM pg_policies WHERE tablename IN ('job_proposals', 'escrow_transactions', 'job_status', 'orders', 'temporary_payouts');