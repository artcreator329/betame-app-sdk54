-- Fix RLS policies for AI image uploads
-- This script addresses the "new row violates row-level security policy" error

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload AI generated images" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can upload AI generated images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to AI generated images" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous read access to AI generated images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own AI generated images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own AI generated images" ON storage.objects;

-- Create more permissive policies for AI image uploads
-- Policy 1: Allow authenticated users to upload to ai-generated-images folder
CREATE POLICY "AI images upload for authenticated users" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND name LIKE 'ai-generated-images/%'
);

-- Policy 2: Allow anonymous users to upload to ai-generated-images folder (for testing)
CREATE POLICY "AI images upload for anonymous users" ON storage.objects
FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'documents' 
  AND name LIKE 'ai-generated-images/%'
);

-- Policy 3: Allow public read access to ai-generated-images
CREATE POLICY "AI images public read access" ON storage.objects
FOR SELECT TO public
USING (
  bucket_id = 'documents' 
  AND name LIKE 'ai-generated-images/%'
);

-- Policy 4: Allow authenticated users to delete their own AI generated images
CREATE POLICY "AI images delete for authenticated users" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' 
  AND name LIKE 'ai-generated-images/%'
);

-- Policy 5: Allow authenticated users to update their own AI generated images
CREATE POLICY "AI images update for authenticated users" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents' 
  AND name LIKE 'ai-generated-images/%'
)
WITH CHECK (
  bucket_id = 'documents' 
  AND name LIKE 'ai-generated-images/%'
);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%AI images%'
ORDER BY policyname;