-- Fix missing INSERT policy for orders table
-- This allows users to create orders when they are the buyer

-- Add INSERT policy for orders table
CREATE POLICY "Users can create orders as buyers" ON orders
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Also need to update the existing policies to use service_provider_id instead of seller_id
-- since the schema uses service_provider_id but the policies reference seller_id

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view orders they're involved in" ON orders;
DROP POLICY IF EXISTS "Users can update orders they're involved in" ON orders;

-- Recreate with correct column names
CREATE POLICY "Users can view orders they're involved in" ON orders
    FOR SELECT USING (
        auth.uid() = buyer_id OR 
        auth.uid() = service_provider_id OR 
        auth.uid() = seller_id  -- Keep for backward compatibility
    );

CREATE POLICY "Users can update orders they're involved in" ON orders
    FOR UPDATE USING (
        auth.uid() = buyer_id OR 
        auth.uid() = service_provider_id OR 
        auth.uid() = seller_id  -- Keep for backward compatibility
    );

-- Update order_timeline policies to use correct column names
DROP POLICY IF EXISTS "Users can view timeline for their orders" ON order_timeline;

CREATE POLICY "Users can view timeline for their orders" ON order_timeline
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = order_timeline.order_id 
            AND (
                o.buyer_id = auth.uid() OR 
                o.service_provider_id = auth.uid() OR 
                o.seller_id = auth.uid()
            )
        )
    );

-- Update dispute_communications policies
DROP POLICY IF EXISTS "Users can view dispute communications for their orders" ON dispute_communications;
DROP POLICY IF EXISTS "Users can insert dispute communications for their orders" ON dispute_communications;

CREATE POLICY "Users can view dispute communications for their orders" ON dispute_communications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = dispute_communications.order_id 
            AND (
                o.buyer_id = auth.uid() OR 
                o.service_provider_id = auth.uid() OR 
                o.seller_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert dispute communications for their orders" ON dispute_communications
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = dispute_communications.order_id 
            AND (
                o.buyer_id = auth.uid() OR 
                o.service_provider_id = auth.uid() OR 
                o.seller_id = auth.uid()
            )
        )
    );

-- Update temporary_payouts policies to use correct column names
DROP POLICY IF EXISTS "Sellers can view their payouts" ON temporary_payouts;

CREATE POLICY "Service providers can view their payouts" ON temporary_payouts
    FOR SELECT USING (
        auth.uid() = service_provider_id OR 
        auth.uid() = seller_id  -- Keep for backward compatibility
    );