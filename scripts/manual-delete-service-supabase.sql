-- MANUAL SERVICE DELETION SCRIPT FOR SUPABASE SQL EDITOR
-- Replace 'YOUR_SERVICE_ID_HERE' with the actual service ID you want to delete
-- Run this directly in Supabase SQL Editor

-- Step 1: Find the service and see what's blocking it
SELECT 
    'SERVICE TO DELETE' as info,
    s.id,
    s.title,
    s.user_id,
    s.status
FROM services s 
WHERE s.id = 'YOUR_SERVICE_ID_HERE';

-- Step 2: See what service offers exist
SELECT 
    'SERVICE OFFERS' as info,
    so.id as offer_id,
    so.status,
    so.created_at
FROM service_offers so 
WHERE so.service_id = 'YOUR_SERVICE_ID_HERE';

-- Step 3: See what active jobs are blocking
SELECT 
    'ACTIVE JOBS BLOCKING DELETION' as info,
    aj.id as job_id,
    aj.title,
    aj.status,
    aj.service_offer_id
FROM active_jobs aj
JOIN service_offers so ON aj.service_offer_id = so.id
WHERE so.service_id = 'YOUR_SERVICE_ID_HERE';

-- Step 4: ACTUAL DELETION (uncomment the lines below to execute)
-- WARNING: This will permanently delete data!

-- BEGIN;

-- -- Delete active job completion photos first
-- DELETE FROM active_job_completion_photos 
-- WHERE active_job_id IN (
--     SELECT aj.id 
--     FROM active_jobs aj
--     JOIN service_offers so ON aj.service_offer_id = so.id
--     WHERE so.service_id = 'YOUR_SERVICE_ID_HERE'
-- );

-- -- Delete active jobs
-- DELETE FROM active_jobs 
-- WHERE service_offer_id IN (
--     SELECT id FROM service_offers WHERE service_id = 'YOUR_SERVICE_ID_HERE'
-- );

-- -- Delete job communications
-- DELETE FROM job_communications 
-- WHERE job_status_id IN (
--     SELECT js.id 
--     FROM job_status js
--     JOIN service_offers so ON js.service_offer_id = so.id
--     WHERE so.service_id = 'YOUR_SERVICE_ID_HERE'
-- );

-- -- Delete job completion photos
-- DELETE FROM job_completion_photos 
-- WHERE job_status_id IN (
--     SELECT js.id 
--     FROM job_status js
--     JOIN service_offers so ON js.service_offer_id = so.id
--     WHERE so.service_id = 'YOUR_SERVICE_ID_HERE'
-- );

-- -- Delete job status records
-- DELETE FROM job_status 
-- WHERE service_offer_id IN (
--     SELECT id FROM service_offers WHERE service_id = 'YOUR_SERVICE_ID_HERE'
-- );

-- -- Delete escrow transactions
-- DELETE FROM escrow_transactions 
-- WHERE service_offer_id IN (
--     SELECT id FROM service_offers WHERE service_id = 'YOUR_SERVICE_ID_HERE'
-- );

-- -- Delete service offers
-- DELETE FROM service_offers WHERE service_id = 'YOUR_SERVICE_ID_HERE';

-- -- Delete other service-related data
-- DELETE FROM service_views WHERE service_id = 'YOUR_SERVICE_ID_HERE';
-- DELETE FROM service_analytics WHERE service_id = 'YOUR_SERVICE_ID_HERE';
-- DELETE FROM favorites WHERE service_id = 'YOUR_SERVICE_ID_HERE';
-- DELETE FROM reviews WHERE service_id = 'YOUR_SERVICE_ID_HERE';
-- DELETE FROM service_feature_applications WHERE service_id = 'YOUR_SERVICE_ID_HERE';
-- DELETE FROM service_locations WHERE service_id = 'YOUR_SERVICE_ID_HERE';

-- -- Delete chat messages for chats related to this service
-- DELETE FROM chat_messages 
-- WHERE chat_id IN (
--     SELECT id FROM chats WHERE service_id = 'YOUR_SERVICE_ID_HERE'
-- );

-- -- Delete chats
-- DELETE FROM chats WHERE service_id = 'YOUR_SERVICE_ID_HERE';

-- -- Delete service variants (child services)
-- DELETE FROM services WHERE parent_service_id = 'YOUR_SERVICE_ID_HERE';

-- -- Finally delete the main service
-- DELETE FROM services WHERE id = 'YOUR_SERVICE_ID_HERE';

-- COMMIT;

-- Step 5: Verify deletion
-- SELECT 'VERIFICATION - Should return 0' as info, COUNT(*) as remaining_count 
-- FROM services WHERE id = 'YOUR_SERVICE_ID_HERE';