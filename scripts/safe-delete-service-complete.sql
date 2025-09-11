-- Complete script to safely delete a service and ALL its dependencies
-- Replace 'YOUR_SERVICE_ID' with the actual service ID you want to delete
-- WARNING: This will permanently delete all data related to this service

BEGIN;

-- Get service offers for this service
CREATE TEMP TABLE temp_service_offers AS
SELECT id FROM service_offers WHERE service_id = 'YOUR_SERVICE_ID';

-- Step 1: Delete active jobs that reference service offers
DELETE FROM active_jobs 
WHERE service_offer_id IN (SELECT id FROM temp_service_offers);

-- Step 2: Delete job status records
DELETE FROM job_status 
WHERE service_offer_id IN (SELECT id FROM temp_service_offers);

-- Step 3: Delete escrow transactions
DELETE FROM escrow_transactions 
WHERE service_offer_id IN (SELECT id FROM temp_service_offers);

-- Step 4: Delete service offers
DELETE FROM service_offers 
WHERE service_id = 'YOUR_SERVICE_ID';

-- Step 5: Delete other service-related data
DELETE FROM service_views WHERE service_id = 'YOUR_SERVICE_ID';
DELETE FROM service_analytics WHERE service_id = 'YOUR_SERVICE_ID';
DELETE FROM favorites WHERE service_id = 'YOUR_SERVICE_ID';
DELETE FROM service_feature_applications WHERE service_id = 'YOUR_SERVICE_ID';
DELETE FROM service_locations WHERE service_id = 'YOUR_SERVICE_ID';
DELETE FROM chats WHERE service_id = 'YOUR_SERVICE_ID';

-- Step 6: Delete service variants (child services) - you may need to run this recursively
DELETE FROM services WHERE parent_service_id = 'YOUR_SERVICE_ID';

-- Step 7: Finally delete the main service
DELETE FROM services WHERE id = 'YOUR_SERVICE_ID';

-- Clean up temp table
DROP TABLE temp_service_offers;

COMMIT;

-- Verify deletion
SELECT 'Verification - Service should not exist:' as message;
SELECT COUNT(*) as remaining_services FROM services WHERE id = 'YOUR_SERVICE_ID';

SELECT 'Verification - No service offers should remain:' as message;
SELECT COUNT(*) as remaining_offers FROM service_offers WHERE service_id = 'YOUR_SERVICE_ID';