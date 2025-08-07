-- Create escrow transactions table for holding payments until job completion
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_offer_id UUID NOT NULL, -- Links to the service offer
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL, -- Amount in credits
    platform_fee INTEGER DEFAULT 0, -- Platform fee amount
    total_amount INTEGER NOT NULL, -- Total amount (amount + platform_fee)
    status TEXT DEFAULT 'held' CHECK (status IN (
        'held',           -- Money is held in escrow
        'released',       -- Money released to seller
        'refunded',       -- Money refunded to buyer
        'disputed'        -- In dispute resolution
    )) NOT NULL,
    service_title TEXT NOT NULL,
    service_description TEXT,
    work_start_date DATE,
    work_end_date DATE,
    buyer_confirmation_date TIMESTAMPTZ,
    seller_completion_date TIMESTAMPTZ,
    payment_release_date TIMESTAMPTZ,
    dispute_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create job status tracking table
CREATE TABLE IF NOT EXISTS job_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_offer_id UUID NOT NULL UNIQUE, -- One status per service offer
    escrow_transaction_id UUID REFERENCES escrow_transactions(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    current_status TEXT DEFAULT 'payment_received' CHECK (current_status IN (
        'payment_received',    -- Payment received and held in escrow
        'work_in_progress',   -- Seller has started work
        'work_completed',     -- Seller marked work as complete
        'buyer_reviewing',    -- Buyer is reviewing the work
        'completed',          -- Buyer confirmed completion
        'disputed',           -- In dispute
        'cancelled'           -- Job cancelled
    )) NOT NULL,
    work_started_at TIMESTAMPTZ,
    work_completed_at TIMESTAMPTZ,
    buyer_review_started_at TIMESTAMPTZ,
    completion_confirmed_at TIMESTAMPTZ,
    auto_release_date TIMESTAMPTZ, -- Auto-release payment if buyer doesn't respond
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create platform wallet for holding escrowed funds
CREATE TABLE IF NOT EXISTS platform_wallet (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    total_escrowed_credits INTEGER DEFAULT 0 NOT NULL,
    total_platform_fees INTEGER DEFAULT 0 NOT NULL,
    total_released_today INTEGER DEFAULT 0 NOT NULL,
    total_refunded_today INTEGER DEFAULT 0 NOT NULL,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert initial platform wallet record
INSERT INTO platform_wallet (total_escrowed_credits, total_platform_fees) 
VALUES (0, 0) 
ON CONFLICT DO NOTHING;

-- Create job milestones table for tracking work progress
CREATE TABLE IF NOT EXISTS job_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_status_id UUID REFERENCES job_status(id) ON DELETE CASCADE NOT NULL,
    milestone_title TEXT NOT NULL,
    milestone_description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id), -- Who marked it complete
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create job communications table for buyer-seller messaging
CREATE TABLE IF NOT EXISTS job_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_status_id UUID REFERENCES job_status(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message_type TEXT DEFAULT 'message' CHECK (message_type IN (
        'message',
        'work_update',
        'completion_notice',
        'dispute_raised',
        'system_notification'
    )) NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_buyer_id ON escrow_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_seller_id ON escrow_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_status ON escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_service_offer_id ON escrow_transactions(service_offer_id);

CREATE INDEX IF NOT EXISTS idx_job_status_buyer_id ON job_status(buyer_id);
CREATE INDEX IF NOT EXISTS idx_job_status_seller_id ON job_status(seller_id);
CREATE INDEX IF NOT EXISTS idx_job_status_current_status ON job_status(current_status);
CREATE INDEX IF NOT EXISTS idx_job_status_service_offer_id ON job_status(service_offer_id);

CREATE INDEX IF NOT EXISTS idx_job_milestones_job_status_id ON job_milestones(job_status_id);
CREATE INDEX IF NOT EXISTS idx_job_communications_job_status_id ON job_communications(job_status_id);
CREATE INDEX IF NOT EXISTS idx_job_communications_sender_id ON job_communications(sender_id);

-- Enable Row Level Security (RLS)
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_communications ENABLE ROW LEVEL SECURITY;

-- RLS policies for escrow_transactions
CREATE POLICY "Users can view escrow transactions they're involved in" ON escrow_transactions
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- RLS policies for job_status
CREATE POLICY "Users can view job status they're involved in" ON job_status
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can update job status they're involved in" ON job_status
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- RLS policies for job_milestones
CREATE POLICY "Users can view milestones for their jobs" ON job_milestones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM job_status js 
            WHERE js.id = job_milestones.job_status_id 
            AND (js.buyer_id = auth.uid() OR js.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can update milestones for their jobs" ON job_milestones
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM job_status js 
            WHERE js.id = job_milestones.job_status_id 
            AND (js.buyer_id = auth.uid() OR js.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert milestones for their jobs" ON job_milestones
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM job_status js 
            WHERE js.id = job_milestones.job_status_id 
            AND (js.buyer_id = auth.uid() OR js.seller_id = auth.uid())
        )
    );

-- RLS policies for job_communications
CREATE POLICY "Users can view communications for their jobs" ON job_communications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM job_status js 
            WHERE js.id = job_communications.job_status_id 
            AND (js.buyer_id = auth.uid() OR js.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert communications for their jobs" ON job_communications
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM job_status js 
            WHERE js.id = job_communications.job_status_id 
            AND (js.buyer_id = auth.uid() OR js.seller_id = auth.uid())
        )
    );

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_escrow_transactions_updated_at BEFORE UPDATE ON escrow_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_status_updated_at BEFORE UPDATE ON job_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_wallet_updated_at BEFORE UPDATE ON platform_wallet
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_milestones_updated_at BEFORE UPDATE ON job_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically release payment after 7 days if buyer doesn't respond
CREATE OR REPLACE FUNCTION auto_release_escrowed_payments()
RETURNS void AS $$
BEGIN
    -- Auto-release payments where buyer hasn't responded for 7 days
    UPDATE job_status 
    SET current_status = 'completed',
        completion_confirmed_at = NOW()
    WHERE current_status = 'buyer_reviewing' 
    AND auto_release_date < NOW();
    
    -- Update escrow transactions to released
    UPDATE escrow_transactions et
    SET status = 'released',
        payment_release_date = NOW()
    FROM job_status js
    WHERE et.service_offer_id = js.service_offer_id
    AND js.current_status = 'completed'
    AND et.status = 'held'
    AND js.completion_confirmed_at IS NOT NULL;
END;
$$ language 'plpgsql';