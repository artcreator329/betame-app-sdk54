-- QUICK DELETE - Replace SERVICE_ID with actual ID
-- Run this in Supabase SQL Editor

BEGIN;

-- Delete in the correct order to avoid foreign key constraints
DELETE FROM active_job_completion_photos 
WHERE active_job_id IN (
    SELECT aj.id FROM active_jobs aj
    JOIN service_offers so ON aj.service_offer_id = so.id
    WHERE so.service_id = 'SERVICE_ID'
);

DELETE FROM active_jobs 
WHERE service_offer_id IN (
    SELECT id FROM service_offers WHERE service_id = 'SERVICE_ID'
);

DELETE FROM job_communications 
WHERE job_status_id IN (
    SELECT js.id FROM job_status js
    JOIN service_offers so ON js.service_offer_id = so.id
    WHERE so.service_id = 'SERVICE_ID'
);

DELETE FROM job_completion_photos 
WHERE job_status_id IN (
    SELECT js.id FROM job_status js
    JOIN service_offers so ON js.service_offer_id = so.id
    WHERE so.service_id = 'SERVICE_ID'
);

DELETE FROM job_status 
WHERE service_offer_id IN (
    SELECT id FROM service_offers WHERE service_id = 'SERVICE_ID'
);

DELETE FROM service_offers WHERE service_id = 'SERVICE_ID';

DELETE FROM service_views WHERE service_id = 'SERVICE_ID';
DELETE FROM service_analytics WHERE service_id = 'SERVICE_ID';
DELETE FROM favorites WHERE service_id = 'SERVICE_ID';
DELETE FROM reviews WHERE service_id = 'SERVICE_ID';
DELETE FROM service_feature_applications WHERE service_id = 'SERVICE_ID';
DELETE FROM service_locations WHERE service_id = 'SERVICE_ID';

DELETE FROM chat_messages 
WHERE chat_id IN (SELECT id FROM chats WHERE service_id = 'SERVICE_ID');

DELETE FROM chats WHERE service_id = 'SERVICE_ID';

DELETE FROM services WHERE parent_service_id = 'SERVICE_ID';
DELETE FROM services WHERE id = 'SERVICE_ID';

COMMIT;