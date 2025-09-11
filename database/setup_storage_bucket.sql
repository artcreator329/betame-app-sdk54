-- Setup storage bucket for AI generated images
-- This script ensures the 'documents' bucket exists with proper policies

-- Create the documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to upload to ai-generated-images folder
CREATE POLICY "Authenticated users can upload AI generated images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
);

-- Policy for anonymous users to upload AI generated images (for testing)
CREATE POLICY "Anonymous users can upload AI generated images" ON storage.objects
FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
);

-- Policy for public read access to ai-generated-images
CREATE POLICY "Public read access to AI generated images" ON storage.objects
FOR SELECT TO public
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
);

-- Policy for anonymous read access to ai-generated-images
CREATE POLICY "Anonymous read access to AI generated images" ON storage.objects
FOR SELECT TO anon
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
);

-- Policy for authenticated users to delete their own AI generated images
CREATE POLICY "Users can delete their own AI generated images" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy for authenticated users to update their own AI generated images
CREATE POLICY "Users can update their own AI generated images" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'ai-generated-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO public;

-- Create index for better performance on bucket queries
CREATE INDEX IF NOT EXISTS idx_objects_bucket_id_folder 
ON storage.objects (bucket_id, (storage.foldername(name))[1]);

-- Verify the setup
SELECT 
  'Bucket Setup Complete' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'documents';