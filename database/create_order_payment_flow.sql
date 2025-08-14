-- Enhanced Order Payment Flow System
-- This creates a comprehensive order management system with automatic payment release

-- Create order_status enum for better type safety
DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM (
        'payment_received',     -- Payment received and held in escrow
        'work_in_progress',    -- Seller has started work
        'work_completed',      -- Seller marked work as complete
        'buyer_reviewing',     -- Buyer is reviewing the work (24-hour window)
        'completed',           -- Job completed successfully (auto or manual confirmation)
        'disputed',            -- In dispute resolution
        'cancelled',           -- Job cancelled
        'refund_requested',    -- Buyer requested refund
        'partial_refund'       -- Partial refund scenario
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create dispute_status enum
DO $$ BEGIN
    CREATE TYPE dispute_status_enum AS ENUM (
        'none',
        'raised',
        'under_review',
        'resolved_seller_favor',
        'resolved_buyer_favor',
        'resolved_partial'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create refund_preference enum
DO $$ BEGIN
    CREATE TYPE refund_preference_enum AS ENUM (
        'store_as_credit',
        'request_refund'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enhanced orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_offer_id UUID NOT NULL UNIQUE,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Payment details
    amount INTEGER NOT NULL,
    platform_fee INTEGER DEFAULT 0,
    total_amount INTEGER NOT NULL,
    
    -- Order status
    status order_status_enum DEFAULT 'payment_received' NOT NULL,
    dispute_status dispute_status_enum DEFAULT 'none' NOT NULL,
    
    -- Service details
    service_title TEXT NOT NULL,
    service_description TEXT,
    
    -- Timeline tracking
    payment_received_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    work_started_at TIMESTAMPTZ,
    work_completed_at TIMESTAMPTZ,
    buyer_review_started_at TIMESTAMPTZ,
    completion_confirmed_at TIMESTAMPTZ,
    payment_released_at TIMESTAMPTZ,
    
    -- Auto-release mechanism (24 hours after work completion)
    auto_release_at TIMESTAMPTZ,
    
    -- Dispute handling
    dispute_raised_at TIMESTAMPTZ,
    dispute_reason TEXT,
    dispute_resolved_at TIMESTAMPTZ,
    
    -- Refund handling
    refund_requested_at TIMESTAMPTZ,
    refund_preference refund_preference_enum,
    refund_amount INTEGER DEFAULT 0,
    refund_processed_at TIMESTAMPTZ,
    
    -- Admin intervention
    requires_admin_intervention BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    admin_resolved_at TIMESTAMPTZ,
    admin_resolved_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create order_timeline table for detailed tracking
CREATE TABLE IF NOT EXISTS order_timeline (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,
    event_description TEXT NOT NULL,
    triggered_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create dispute_communications table
CREATE TABLE IF NOT EXISTS dispute_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sender_role TEXT CHECK (sender_role IN ('buyer', 'seller', 'admin')) NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create temporary_payouts table for manual payout tracking
CREATE TABLE IF NOT EXISTS temporary_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    payout_method TEXT DEFAULT 'betacoin_credit' CHECK (payout_method IN (
        'betacoin_credit',
        'manual_transfer',
        'bank_transfer',
        'digital_wallet'
    )) NOT NULL,
    payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN (
        'pending',
        'processing',
        'completed',
        'failed'
    )) NOT NULL,
    payout_reference TEXT,
    payout_notes TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_auto_release_at ON orders(auto_release_at);
CREATE INDEX IF NOT EXISTS idx_orders_dispute_status ON orders(dispute_status);
CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON order_timeline(order_id);
CREATE INDEX IF NOT EXISTS idx_dispute_communications_order_id ON dispute_communications(order_id);
CREATE INDEX IF NOT EXISTS idx_temporary_payouts_seller_id ON temporary_payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_temporary_payouts_status ON temporary_payouts(payout_status);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "Users can view orders they're involved in" ON orders
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can update orders they're involved in" ON orders
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- RLS Policies for order_timeline
CREATE POLICY "Users can view timeline for their orders" ON order_timeline
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = order_timeline.order_id 
            AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        )
    );

-- RLS Policies for dispute_communications
CREATE POLICY "Users can view dispute communications for their orders" ON dispute_communications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = dispute_communications.order_id 
            AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert dispute communications for their orders" ON dispute_communications
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = dispute_communications.order_id 
            AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        )
    );

-- RLS Policies for temporary_payouts
CREATE POLICY "Sellers can view their payouts" ON temporary_payouts
    FOR SELECT USING (auth.uid() = seller_id);

-- Create triggers
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_temporary_payouts_updated_at BEFORE UPDATE ON temporary_payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to add timeline events
CREATE OR REPLACE FUNCTION add_order_timeline_event(
    p_order_id UUID,
    p_event_type TEXT,
    p_event_description TEXT,
    p_triggered_by UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    timeline_id UUID;
BEGIN
    INSERT INTO order_timeline (order_id, event_type, event_description, triggered_by, metadata)
    VALUES (p_order_id, p_event_type, p_event_description, p_triggered_by, p_metadata)
    RETURNING id INTO timeline_id;
    
    RETURN timeline_id;
END;
$$ LANGUAGE plpgsql;

-- Function to handle work completion
CREATE OR REPLACE FUNCTION mark_work_completed(
    p_order_id UUID,
    p_seller_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    order_record orders%ROWTYPE;
BEGIN
    -- Get order details
    SELECT * INTO order_record FROM orders WHERE id = p_order_id AND seller_id = p_seller_id;
    
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
        'Seller marked work as completed. Buyer has 24 hours to review.',
        p_seller_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to handle buyer confirmation
CREATE OR REPLACE FUNCTION confirm_work_completion(
    p_order_id UUID,
    p_buyer_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    order_record orders%ROWTYPE;
BEGIN
    -- Get order details
    SELECT * INTO order_record FROM orders WHERE id = p_order_id AND buyer_id = p_buyer_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Only allow if buyer is reviewing
    IF order_record.status != 'buyer_reviewing' THEN
        RETURN FALSE;
    END IF;
    
    -- Update order status
    UPDATE orders 
    SET 
        status = 'completed',
        completion_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Add timeline event
    PERFORM add_order_timeline_event(
        p_order_id,
        'buyer_confirmed',
        'Buyer confirmed work completion.',
        p_buyer_id
    );
    
    -- Process payment release
    PERFORM process_payment_release(p_order_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to raise dispute
CREATE OR REPLACE FUNCTION raise_dispute(
    p_order_id UUID,
    p_buyer_id UUID,
    p_dispute_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    order_record orders%ROWTYPE;
BEGIN
    -- Get order details
    SELECT * INTO order_record FROM orders WHERE id = p_order_id AND buyer_id = p_buyer_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Only allow dispute within 24 hours of work completion
    IF order_record.status NOT IN ('buyer_reviewing', 'work_completed') THEN
        RETURN FALSE;
    END IF;
    
    -- Check if within 24-hour window
    IF order_record.work_completed_at IS NOT NULL AND 
       order_record.work_completed_at + INTERVAL '24 hours' < NOW() THEN
        RETURN FALSE;
    END IF;
    
    -- Update order status
    UPDATE orders 
    SET 
        status = 'disputed',
        dispute_status = 'raised',
        dispute_raised_at = NOW(),
        dispute_reason = p_dispute_reason,
        requires_admin_intervention = TRUE,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Add timeline event
    PERFORM add_order_timeline_event(
        p_order_id,
        'dispute_raised',
        'Buyer raised a dispute: ' || p_dispute_reason,
        p_buyer_id,
        jsonb_build_object('dispute_reason', p_dispute_reason)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to process payment release
CREATE OR REPLACE FUNCTION process_payment_release(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    order_record orders%ROWTYPE;
    payout_id UUID;
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
    
    -- Create temporary payout record
    INSERT INTO temporary_payouts (
        order_id,
        seller_id,
        amount,
        payout_method,
        payout_status,
        payout_notes
    ) VALUES (
        p_order_id,
        order_record.seller_id,
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
        'Payment released to seller via temporary payout system',
        NULL,
        jsonb_build_object('payout_id', payout_id)
    );
    
    -- Process the actual credit transfer (temporary implementation)
    PERFORM process_temporary_payout(payout_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to process temporary payout (adds credits to seller's wallet)
CREATE OR REPLACE FUNCTION process_temporary_payout(p_payout_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    payout_record temporary_payouts%ROWTYPE;
BEGIN
    -- Get payout details
    SELECT * INTO payout_record FROM temporary_payouts WHERE id = p_payout_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update seller's wallet
    INSERT INTO wallets (user_id, betame_credits)
    VALUES (payout_record.seller_id, payout_record.amount)
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
        payout_record.seller_id,
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
$$ LANGUAGE plpgsql;

-- Function to auto-release payments (run by cron job)
CREATE OR REPLACE FUNCTION auto_release_payments()
RETURNS INTEGER AS $$
DECLARE
    released_count INTEGER := 0;
    order_record RECORD;
BEGIN
    -- Find orders that should be auto-released
    FOR order_record IN 
        SELECT id, buyer_id, seller_id 
        FROM orders 
        WHERE status = 'buyer_reviewing' 
        AND auto_release_at <= NOW()
        AND dispute_status = 'none'
    LOOP
        -- Auto-confirm completion
        UPDATE orders 
        SET 
            status = 'completed',
            completion_confirmed_at = NOW(),
            updated_at = NOW()
        WHERE id = order_record.id;
        
        -- Add timeline event
        PERFORM add_order_timeline_event(
            order_record.id,
            'auto_released',
            'Payment auto-released after 24-hour review period expired',
            NULL
        );
        
        -- Process payment release
        PERFORM process_payment_release(order_record.id);
        
        released_count := released_count + 1;
    END LOOP;
    
    RETURN released_count;
END;
$$ LANGUAGE plpgsql;

-- Function to handle refund requests
CREATE OR REPLACE FUNCTION request_refund(
    p_order_id UUID,
    p_buyer_id UUID,
    p_refund_preference refund_preference_enum,
    p_refund_amount INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    order_record orders%ROWTYPE;
    actual_refund_amount INTEGER;
BEGIN
    -- Get order details
    SELECT * INTO order_record FROM orders WHERE id = p_order_id AND buyer_id = p_buyer_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Determine refund amount
    actual_refund_amount := COALESCE(p_refund_amount, order_record.total_amount);
    
    -- Update order
    UPDATE orders 
    SET 
        refund_requested_at = NOW(),
        refund_preference = p_refund_preference,
        refund_amount = actual_refund_amount,
        requires_admin_intervention = TRUE,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Add timeline event
    PERFORM add_order_timeline_event(
        p_order_id,
        'refund_requested',
        'Buyer requested refund: ' || p_refund_preference::text,
        p_buyer_id,
        jsonb_build_object(
            'refund_preference', p_refund_preference,
            'refund_amount', actual_refund_amount
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;