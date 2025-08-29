-- Migration script to ensure existing completed jobs are properly handled
-- by the new chat status integration system

-- This script ensures that existing jobs with 'completed' status
-- will be properly displayed in chat based on user roles

-- 1. First, let's check what job statuses currently exist
-- (This is for reference - the actual migration happens in the chat service)

-- 2. Update any service offers that might have outdated status
-- but have corresponding completed job status
UPDATE service_offers 
SET status = 'accepted'
WHERE id IN (
    SELECT service_offer_id 
    FROM job_status 
    WHERE current_status IN ('completed', 'payment_release_in_progress', 'work_completed', 'buyer_reviewing')
    AND service_offer_id IS NOT NULL
)
AND status = 'pending';

-- 3. Ensure all job statuses have the correct service_provider_id field
-- (This is important for role-based status display)
UPDATE job_status 
SET service_provider_id = seller_id 
WHERE service_provider_id IS NULL 
AND seller_id IS NOT NULL;

-- 4. Add any missing job status records for service offers that don't have them
-- This ensures all service offers can be properly tracked
INSERT INTO job_status (
    service_offer_id,
    buyer_id,
    seller_id,
    service_provider_id,
    current_status,
    created_at,
    updated_at
)
SELECT 
    so.id as service_offer_id,
    so.buyer_id,
    so.seller_id,
    so.service_provider_id,
    CASE 
        WHEN so.status = 'accepted' THEN 'payment_received'
        WHEN so.status = 'rejected' THEN 'cancelled'
        WHEN so.status = 'cancelled' THEN 'cancelled'
        ELSE 'payment_received'
    END as current_status,
    so.created_at,
    so.updated_at
FROM service_offers so
LEFT JOIN job_status js ON so.id = js.service_offer_id
WHERE js.id IS NULL
AND so.status IN ('accepted', 'rejected', 'cancelled');

-- 5. Create a function to sync job status with service offer status
-- This ensures consistency between the two systems
CREATE OR REPLACE FUNCTION sync_job_status_with_service_offer()
RETURNS void AS $$
BEGIN
    -- Update job status based on service offer status for any mismatches
    UPDATE job_status 
    SET current_status = 
        CASE 
            WHEN so.status = 'accepted' AND js.current_status = 'payment_received' THEN 'payment_received'
            WHEN so.status = 'rejected' THEN 'cancelled'
            WHEN so.status = 'cancelled' THEN 'cancelled'
            ELSE js.current_status
        END,
        updated_at = NOW()
    FROM service_offers so
    WHERE js.service_offer_id = so.id
    AND (
        (so.status = 'rejected' AND js.current_status != 'cancelled') OR
        (so.status = 'cancelled' AND js.current_status != 'cancelled')
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Run the sync function
SELECT sync_job_status_with_service_offer();

-- 7. Create a view to help monitor job status consistency
CREATE OR REPLACE VIEW job_status_summary AS
SELECT 
    js.current_status,
    COUNT(*) as count,
    MIN(js.created_at) as earliest_job,
    MAX(js.updated_at) as latest_update
FROM job_status js
GROUP BY js.current_status
ORDER BY count DESC;

-- 8. Add comments to document the migration
COMMENT ON FUNCTION sync_job_status_with_service_offer() IS 
'Function to ensure job status and service offer status are in sync for chat display';

COMMENT ON VIEW job_status_summary IS 
'View to monitor job status distribution and help identify any inconsistencies';

-- 9. Create an index to improve chat service performance
CREATE INDEX IF NOT EXISTS idx_job_status_service_offer_id 
ON job_status(service_offer_id);

CREATE INDEX IF NOT EXISTS idx_job_status_current_status 
ON job_status(current_status);

-- 10. Add a trigger to automatically update job status when service offer changes
CREATE OR REPLACE FUNCTION update_job_status_on_service_offer_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update job status when service offer status changes
    IF OLD.status != NEW.status THEN
        UPDATE job_status 
        SET 
            current_status = 
                CASE 
                    WHEN NEW.status = 'rejected' THEN 'cancelled'
                    WHEN NEW.status = 'cancelled' THEN 'cancelled'
                    ELSE current_status
                END,
            updated_at = NOW()
        WHERE service_offer_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_job_status_on_service_offer_change ON service_offers;
CREATE TRIGGER trigger_update_job_status_on_service_offer_change
    AFTER UPDATE ON service_offers
    FOR EACH ROW
    EXECUTE FUNCTION update_job_status_on_service_offer_change();

-- 11. Final verification query
-- This shows the current state of job statuses for monitoring
SELECT 
    'Migration completed successfully. Current job status distribution:' as message,
    current_status,
    count
FROM job_status_summary;



