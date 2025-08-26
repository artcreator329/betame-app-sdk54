-- Fix Order Notifications Schema
-- This migration fixes database schema issues preventing order notifications

-- 1. Fix service_offers table
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS service_provider_id UUID REFERENCES auth.users(id);

-- Update service_provider_id from seller_id where null
UPDATE service_offers SET service_provider_id = seller_id WHERE service_provider_id IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_offers_status ON service_offers(status);
CREATE INDEX IF NOT EXISTS idx_service_offers_service_provider ON service_offers(service_provider_id);
CREATE INDEX IF NOT EXISTS idx_service_offers_buyer ON service_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_service_offers_chat ON service_offers(chat_id);

-- 2. Fix orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_provider_id UUID REFERENCES auth.users(id);

-- Update service_provider_id from seller_id where null
UPDATE orders SET service_provider_id = seller_id WHERE service_provider_id IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_service_provider ON orders(service_provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_service_offer ON orders(service_offer_id);

-- 3. Fix notifications RLS policies
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Create permissive policies for system operations
CREATE POLICY "Allow notification creation for system" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id::uuid OR auth.uid() IS NULL);

CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id::uuid OR auth.uid() IS NULL);

CREATE POLICY "Users can delete their notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id::uuid OR auth.uid() IS NULL);

-- 4. Create or update the create_notification RPC function
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL,
  p_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Generate ID if not provided
  IF p_id IS NULL THEN
    notification_id := gen_random_uuid();
  ELSE
    notification_id := p_id::uuid;
  END IF;
  
  -- Insert notification
  INSERT INTO notifications (
    id,
    user_id,
    type,
    title,
    message,
    data,
    created_at,
    is_read
  ) VALUES (
    notification_id,
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_data,
    NOW(),
    false
  );
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update the order notification trigger function to handle new schema
CREATE OR REPLACE FUNCTION notify_order_created()
RETURNS TRIGGER AS $$
DECLARE
    buyer_profile RECORD;
    service_offer RECORD;
BEGIN
    -- Only send notification for new orders
    IF TG_OP = 'INSERT' AND NEW.status = 'payment_received' THEN
        -- Get buyer profile information
        SELECT full_name, avatar_url INTO buyer_profile
        FROM profiles 
        WHERE id = NEW.buyer_id;
        
        -- Get service offer information for chat_id
        SELECT chat_id INTO service_offer
        FROM service_offers
        WHERE id = NEW.service_offer_id;
        
        -- Use the create_notification RPC function
        PERFORM create_notification(
            NEW.service_provider_id,  -- Use service_provider_id instead of seller_id
            'order',
            'New Order from ' || COALESCE(buyer_profile.full_name, 'Customer'),
            'Payment received for "' || NEW.service_title || '" - $' || NEW.amount,
            jsonb_build_object(
                'orderId', NEW.id,
                'chatId', service_offer.chat_id,
                'participantId', NEW.buyer_id,
                'participantName', COALESCE(buyer_profile.full_name, 'Customer'),
                'participantImage', COALESCE(buyer_profile.avatar_url, ''),
                'serviceTitle', NEW.service_title,
                'amount', NEW.amount,
                'currency', 'USD',
                'orderStatus', NEW.status
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_notify_order_created ON orders;
CREATE TRIGGER trigger_notify_order_created
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_created();