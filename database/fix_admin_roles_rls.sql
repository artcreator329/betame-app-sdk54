-- Fix RLS policies for admin_roles table
-- This allows users to check their own admin status

-- First, check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'admin_roles';

-- Enable RLS if not already enabled
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own admin status" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can view all admin roles" ON public.admin_roles;

-- Create policy to allow users to check their own admin status
CREATE POLICY "Users can view their own admin status" 
ON public.admin_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy to allow admins to view all admin roles (for admin dashboard)
CREATE POLICY "Admins can view all admin roles" 
ON public.admin_roles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT SELECT ON public.admin_roles TO authenticated;
GRANT SELECT ON public.admin_roles TO anon;

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'admin_roles';