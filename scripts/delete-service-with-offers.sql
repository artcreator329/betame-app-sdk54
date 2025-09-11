-- Script to safely delete a service and its related offers
-- Replace 'YOUR_SERVICE_ID' with the actual service ID you want to delete

BEGIN;

-- First, check what service offers exist for this service
SELECT 
    so.id as offer_id,
    so.status,
    so.created_at,
    s.title as service_title
FROM service_offers so
JOIN services s ON so.service_id = s.id
WHERE so.service_id = 'YOUR_SERVICE_ID';

-- Delete all service offers for this service first
DELETE FROM service_offers 
WHERE service_id = 'YOUR_SERVICE_ID';

-- Now delete the service
DELETE FROM services 
WHERE id = 'YOUR_SERVICE_ID';

COMMIT;