-- Add payment_released status to job_status table
-- This migration adds support for the payment_released status when admin releases payments

-- Update the CHECK constraint to include payment_released status
ALTER TABLE job_status 
DROP CONSTRAINT IF EXISTS job_status_current_status_check;

ALTER TABLE job_status 
ADD CONSTRAINT job_status_current_status_check 
CHECK (current_status IN (
    'payment_received',
    'acknowledgment_pending', 
    'work_in_progress',
    'work_completed',
    'buyer_reviewing',
    'payment_release_in_progress',
    'completed',
    'payment_released',
    'disputed',
    'cancelled'
));

-- Add payment_released_at timestamp column to track when payment was released
ALTER TABLE job_status 
ADD COLUMN IF NOT EXISTS payment_released_at TIMESTAMPTZ;

-- Add admin_release_by column to track which admin released the payment
ALTER TABLE job_status 
ADD COLUMN IF NOT EXISTS admin_release_by UUID REFERENCES auth.users(id);

-- Create function to update job status when admin releases payment
CREATE OR REPLACE FUNCTION update_job_status_on_payment_release()
RETURNS TRIGGER AS $$
BEGIN
    -- When escrow transaction is released, update job status to payment_released
    IF NEW.status = 'released' AND OLD.status = 'held' THEN
        UPDATE job_status 
        SET 
            current_status = 'payment_released',
            payment_released_at = NEW.payment_release_date,
            updated_at = NOW()
        WHERE escrow_transaction_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update job status when escrow is released
DROP TRIGGER IF EXISTS trigger_update_job_status_on_payment_release ON escrow_transactions;
CREATE TRIGGER trigger_update_job_status_on_payment_release
    AFTER UPDATE ON escrow_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_job_status_on_payment_release();

-- Update existing completed jobs that have released escrow to payment_released status
UPDATE job_status 
SET 
    current_status = 'payment_released',
    payment_released_at = et.payment_release_date,
    updated_at = NOW()
FROM escrow_transactions et
WHERE job_status.escrow_transaction_id = et.id 
  AND et.status = 'released' 
  AND job_status.current_status = 'completed'
  AND et.payment_release_date IS NOT NULL;

-- Create index for better performance on payment_released queries
CREATE INDEX IF NOT EXISTS idx_job_status_payment_released 
ON job_status(current_status, payment_released_at) 
WHERE current_status = 'payment_released';


