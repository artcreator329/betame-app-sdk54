-- Migration: Update active_jobs table to use service_provider terminology
-- This migration renames seller_id to service_provider_id in the active_jobs table

BEGIN;

-- Add new service_provider_id column
ALTER TABLE active_jobs 
ADD COLUMN IF NOT EXISTS service_provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Copy data from seller_id to service_provider_id
UPDATE active_jobs SET service_provider_id = seller_id WHERE service_provider_id IS NULL;

-- Create index for service_provider_id
CREATE INDEX IF NOT EXISTS idx_active_jobs_service_provider_id ON active_jobs(service_provider_id);

-- Drop the old seller_id column (after ensuring data is copied)
-- Note: We'll keep seller_id for now to avoid breaking existing code
-- ALTER TABLE active_jobs DROP COLUMN IF EXISTS seller_id;

COMMIT;
