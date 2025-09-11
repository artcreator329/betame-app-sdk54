-- Add CASCADE delete to the foreign key constraint
-- WARNING: This will automatically delete all related service offers when a service is deleted

BEGIN;

-- Drop the existing foreign key constraint
ALTER TABLE service_offers 
DROP CONSTRAINT service_offers_service_id_fkey;

-- Add the constraint back with CASCADE delete
ALTER TABLE service_offers 
ADD CONSTRAINT service_offers_service_id_fkey 
FOREIGN KEY (service_id) 
REFERENCES services(id) 
ON DELETE CASCADE;

COMMIT;