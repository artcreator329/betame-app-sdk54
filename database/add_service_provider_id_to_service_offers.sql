-- Migration: Add service_provider_id column to service_offers table
-- This migration adds the missing service_provider_id column to align with the seller-to-service-provider terminology change

BEGIN;

-- Add service_provider_id column to service_offers table
ALTER TABLE service_offers 
ADD COLUMN IF NOT EXISTS service_provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Copy data from seller_id to service_provider_id
UPDATE service_offers SET service_provider_id = seller_id WHERE service_provider_id IS NULL;

-- Create index for service_provider_id
CREATE INDEX IF NOT EXISTS idx_service_offers_service_provider_id ON service_offers(service_provider_id);

-- Update RLS policies to include service_provider_id
-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Sellers can create service offers" ON service_offers;
DROP POLICY IF EXISTS "Users can update their own service offers" ON service_offers;
DROP POLICY IF EXISTS "Users can view service offers they are involved in" ON service_offers;

-- Create updated policies that use both seller_id and service_provider_id for backward compatibility
CREATE POLICY "Service providers can create service offers" ON service_offers
FOR INSERT WITH CHECK (
  auth.uid() = COALESCE(service_provider_id, seller_id)
);

CREATE POLICY "Users can update their own service offers" ON service_offers
FOR UPDATE USING (
  auth.uid() = COALESCE(service_provider_id, seller_id) AND status = 'pending'
);

CREATE POLICY "Users can view service offers they are involved in" ON service_offers
FOR SELECT USING (
  auth.uid() = buyer_id OR auth.uid() = COALESCE(service_provider_id, seller_id)
);

COMMIT;
