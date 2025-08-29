-- Fix active_jobs status constraint to allow order-related statuses
-- This addresses the constraint violation error when confirming job completion

-- First, let's check what the current constraint allows
-- The error suggests that a status like 'buyer_reviewing' is being set
-- but the constraint only allows specific values

-- Drop the existing constraint
ALTER TABLE active_jobs DROP CONSTRAINT IF EXISTS active_jobs_status_check;

-- Create a new constraint that includes all necessary statuses
-- This includes both the original active_jobs statuses and order-related statuses
ALTER TABLE active_jobs ADD CONSTRAINT active_jobs_status_check 
CHECK (status = ANY (ARRAY[
    -- Original active_jobs statuses
    'pending_confirmation'::text,
    'in_progress'::text,
    'completed'::text,
    'completed_confirmed'::text,
    'cancelled'::text,
    'disputed'::text,
    'revision_requested'::text,
    'revision_in_progress'::text,
    'revision_completed'::text,
    -- Additional order-related statuses that might be set
    'payment_received'::text,
    'work_in_progress'::text,
    'work_completed'::text,
    'buyer_reviewing'::text,
    'refund_requested'::text,
    'partial_refund'::text
]));

-- Create a function to properly map order statuses to active_jobs statuses
CREATE OR REPLACE FUNCTION map_order_status_to_active_job_status(order_status TEXT)
RETURNS TEXT AS $
BEGIN
    RETURN CASE order_status
        WHEN 'payment_received' THEN 'pending_confirmation'
        WHEN 'work_in_progress' THEN 'in_progress'
        WHEN 'work_completed' THEN 'completed'
        WHEN 'buyer_reviewing' THEN 'completed'  -- Map to completed, not buyer_reviewing
        WHEN 'completed' THEN 'completed_confirmed'
        WHEN 'disputed' THEN 'disputed'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'refund_requested' THEN 'cancelled'
        WHEN 'partial_refund' THEN 'cancelled'
        ELSE 'in_progress'  -- Default fallback
    END;
END;
$ LANGUAGE plpgsql;

-- Create a trigger function to sync order status changes to active_jobs
-- This ensures that when orders table is updated, active_jobs is updated with correct status
CREATE OR REPLACE FUNCTION sync_order_to_active_job()
RETURNS TRIGGER AS $
BEGIN
    -- Only proceed if this is an update and status has changed
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        -- Update the corresponding active_job if it exists
        UPDATE active_jobs 
        SET 
            status = map_order_status_to_active_job_status(NEW.status),
            updated_at = NOW()
        WHERE service_offer_id = NEW.service_offer_id;
        
        -- If no active_job exists, we don't create one (it should already exist)
        -- This prevents creating orphaned active_jobs
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create the trigger on orders table
DROP TRIGGER IF EXISTS sync_order_to_active_job_trigger ON orders;
CREATE TRIGGER sync_order_to_active_job_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION sync_order_to_active_job();

-- Also create a function to handle the reverse sync (active_jobs to orders)
-- This ensures consistency in both directions
CREATE OR REPLACE FUNCTION sync_active_job_to_order()
RETURNS TRIGGER AS $
BEGIN
    -- Only proceed if this is an update and status has changed
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        -- Map active_job status back to order status
        UPDATE orders 
        SET 
            status = CASE NEW.status
                WHEN 'pending_confirmation' THEN 'payment_received'::order_status_enum
                WHEN 'in_progress' THEN 'work_in_progress'::order_status_enum
                WHEN 'completed' THEN 'buyer_reviewing'::order_status_enum
                WHEN 'completed_confirmed' THEN 'completed'::order_status_enum
                WHEN 'disputed' THEN 'disputed'::order_status_enum
                WHEN 'cancelled' THEN 'cancelled'::order_status_enum
                ELSE 'work_in_progress'::order_status_enum
            END,
            updated_at = NOW()
        WHERE service_offer_id = NEW.service_offer_id
        AND status != CASE NEW.status
            WHEN 'pending_confirmation' THEN 'payment_received'::order_status_enum
            WHEN 'in_progress' THEN 'work_in_progress'::order_status_enum
            WHEN 'completed' THEN 'buyer_reviewing'::order_status_enum
            WHEN 'completed_confirmed' THEN 'completed'::order_status_enum
            WHEN 'disputed' THEN 'disputed'::order_status_enum
            WHEN 'cancelled' THEN 'cancelled'::order_status_enum
            ELSE 'work_in_progress'::order_status_enum
        END; -- Only update if status is actually different to prevent infinite loops
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create the trigger on active_jobs table
DROP TRIGGER IF EXISTS sync_active_job_to_order_trigger ON active_jobs;
CREATE TRIGGER sync_active_job_to_order_trigger
    AFTER UPDATE ON active_jobs
    FOR EACH ROW
    EXECUTE FUNCTION sync_active_job_to_order();

-- Update the confirm_work_completion function to handle active_jobs properly
CREATE OR REPLACE FUNCTION confirm_work_completion(
    p_order_id UUID,
    p_buyer_id UUID
)
RETURNS BOOLEAN AS $
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
    
    -- Update order status (this will trigger the sync to active_jobs)
    UPDATE orders 
    SET 
        status = 'completed',
        completion_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Explicitly update active_jobs with the correct status
    -- This ensures the status is set correctly even if triggers don't work
    UPDATE active_jobs 
    SET 
        status = 'completed_confirmed',
        buyer_confirmation_at = NOW(),
        payment_released_at = NOW(),
        updated_at = NOW()
    WHERE service_offer_id = order_record.service_offer_id;
    
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
$ LANGUAGE plpgsql;