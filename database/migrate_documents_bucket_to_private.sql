-- Migration: Keep Documents Bucket Public but Add Selective RLS Policies
-- AI-generated images remain publicly accessible, other documents are private

-- Step 1: Keep the documents bucket public (no change needed)
-- UPDATE storage.buckets SET public = false WHERE id = 'documents';
-- The bucket stays public, but we'll use RLS policies for selective access control

-- Step 2: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload AI generated images" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can upload AI generated images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to AI generated images" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous read access to AI generated images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own AI generated images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own AI generated images" ON storage.objects;

-- Step 3: Create comprehensive RLS policies for private bucket

-- Policy 1: Allow public access to AI-generated images (keep them public)
CREATE POLICY "Public access to AI generated images" ON storage.objects
FOR SELECT TO public
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
);

-- Policy 2: Allow anyone to upload AI-generated images
CREATE POLICY "Anyone can upload AI generated images" ON storage.objects
FOR INSERT TO public
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
);

-- Policy 3: Allow authenticated users to upload private documents to their own folder
CREATE POLICY "Authenticated users can upload private documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] != 'ai-generated-images'
  AND (
    -- Bank statements: bank-statements/{userId}/...
    ((storage.foldername(name))[1] = 'bank-statements' AND auth.uid()::text = (storage.foldername(name))[2])
    OR
    -- eKYC documents: ekyc-documents/{userId}/...
    ((storage.foldername(name))[1] = 'ekyc-documents' AND auth.uid()::text = (storage.foldername(name))[2])
    OR
    -- Nomad visas: nomad-visas/{userId}/...
    ((storage.foldername(name))[1] = 'nomad-visas' AND auth.uid()::text = (storage.foldername(name))[2])
    OR
    -- PDPA consent: pdpa-consent/{userId}/...
    ((storage.foldername(name))[1] = 'pdpa-consent' AND auth.uid()::text = (storage.foldername(name))[2])
  )
);

-- Policy 4: Allow authenticated users to read their own private documents (NOT ai-generated-images)
CREATE POLICY "Authenticated users can read their private documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] != 'ai-generated-images'
  AND (
    -- Bank statements they uploaded
    ((storage.foldername(name))[1] = 'bank-statements' AND auth.uid()::text = (storage.foldername(name))[2])
    OR
    -- eKYC documents they uploaded
    ((storage.foldername(name))[1] = 'ekyc-documents' AND auth.uid()::text = (storage.foldername(name))[2])
    OR
    -- Nomad visas they uploaded
    ((storage.foldername(name))[1] = 'nomad-visas' AND auth.uid()::text = (storage.foldername(name))[2])
    OR
    -- PDPA consent they have
    ((storage.foldername(name))[1] = 'pdpa-consent' AND auth.uid()::text = (storage.foldername(name))[2])
  )
);

-- Policy 5: Allow job participants to access payment receipts
CREATE POLICY "Job participants can access payment receipts" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'payment-release-pdfs'
  AND EXISTS (
    SELECT 1 FROM service_offers so
    JOIN jobs j ON j.id = so.job_id
    WHERE j.id::text = (storage.foldername(name))[2]
    AND (so.service_provider_id = auth.uid() OR j.user_id = auth.uid())
  )
);

-- Policy 6: Allow transaction participants to access buyer receipts
CREATE POLICY "Transaction participants can access buyer receipts" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'buyer-receipts'
  AND EXISTS (
    SELECT 1 FROM service_offers so
    JOIN jobs j ON j.id = so.job_id
    WHERE so.id::text = (storage.foldername(name))[2]
    AND (so.service_provider_id = auth.uid() OR j.user_id = auth.uid())
  )
);

-- Policy 7: Allow users to update AI-generated images
CREATE POLICY "Users can update AI generated images" ON storage.objects
FOR UPDATE TO public
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
)
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
);

-- Policy 8: Allow authenticated users to update their own private documents
CREATE POLICY "Authenticated users can update their private documents" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] != 'ai-generated-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] != 'ai-generated-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy 9: Allow users to delete AI-generated images
CREATE POLICY "Users can delete AI generated images" ON storage.objects
FOR DELETE TO public
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
);

-- Policy 10: Allow authenticated users to delete their own private documents
CREATE POLICY "Authenticated users can delete their private documents" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] != 'ai-generated-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy 11: Allow service role full access for system operations (admin, PDF generation, etc.)
CREATE POLICY "Service role full access to documents" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Policy 12: Allow anon users to upload AI generated images (for testing/demo purposes)
CREATE POLICY "Anonymous users can upload AI generated images" ON storage.objects
FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
);

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_objects_bucket_folder_user 
ON storage.objects (bucket_id, (storage.foldername(name))[1], (storage.foldername(name))[2]);

-- Step 5: Verify the setup
SELECT 
  'Migration Complete - Documents bucket with selective privacy' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'documents';

-- Step 6: Show all policies for the documents bucket
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
ORDER BY policyname;