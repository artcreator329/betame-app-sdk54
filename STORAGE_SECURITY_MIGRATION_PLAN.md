# Storage Security Migration Plan: Making Documents Bucket Private

## Current Security Issue
The `documents` storage bucket is currently set as **public**, which means anyone with a file URL can access sensitive documents including:
- Bank statements
- eKYC documents
- Payment receipts
- PDPA consent forms
- Nomad visas
- AI-generated images

## Migration Strategy

### Phase 1: Update Bucket Configuration
```sql
-- Make the documents bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'documents';
```

### Phase 2: Create Comprehensive RLS Policies

#### For Authenticated Users (General Access)
```sql
-- Allow authenticated users to upload their own documents
CREATE POLICY "Authenticated users can upload their own documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own documents
CREATE POLICY "Authenticated users can read their own documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own documents
CREATE POLICY "Authenticated users can update their own documents" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own documents
CREATE POLICY "Authenticated users can delete their own documents" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### For Service Role (Admin/System Operations)
```sql
-- Allow service role full access for system operations
CREATE POLICY "Service role full access to documents" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
```

#### For Specific Document Types
```sql
-- Allow access to payment receipts for job participants
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

-- Allow access to buyer receipts for transaction participants
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
```

### Phase 3: Update Application Code

#### Replace getPublicUrl() with createSignedUrl()
```typescript
// OLD (public bucket):
const { data: urlData } = supabase.storage
  .from('documents')
  .getPublicUrl(filePath);

// NEW (private bucket):
const { data: urlData, error } = await supabase.storage
  .from('documents')
  .createSignedUrl(filePath, 3600); // 1 hour expiry
```

#### For Admin Dashboard Access
```typescript
// Use service role client for admin operations
const { data: urlData, error } = await supabaseAdmin.storage
  .from('documents')
  .createSignedUrl(filePath, 3600);
```

### Phase 4: File Path Structure
Ensure all file paths follow the pattern: `{folder}/{userId}/{filename}`
- `bank-statements/{userId}/statement.pdf`
- `ekyc-documents/{userId}/id-card.jpg`
- `payment-release-pdfs/{jobId}/receipt.pdf`
- `ai-generated-images/{userId}/image.png`

## Implementation Steps

### Step 1: Test in Development
1. Create a test migration script
2. Verify all existing functionality works with signed URLs
3. Test admin dashboard access

### Step 2: Update All File Access Code
1. Update all `getPublicUrl()` calls to `createSignedUrl()`
2. Add proper error handling
3. Update admin dashboard to use service role

### Step 3: Deploy Migration
1. Run the bucket update and RLS policies
2. Deploy updated application code
3. Monitor for any access issues

## Benefits of Private Bucket

1. **Enhanced Security**: Files require authentication to access
2. **Fine-grained Control**: RLS policies control who can access what
3. **Audit Trail**: All access is logged and traceable
4. **Compliance**: Better meets data protection requirements
5. **Temporary Access**: Signed URLs can have expiration times

## Potential Issues and Solutions

### Issue: Existing Public URLs Will Break
**Solution**: Implement a grace period with both public and signed URL support

### Issue: Admin Dashboard Access
**Solution**: Use service role client for admin operations

### Issue: Performance Impact
**Solution**: Cache signed URLs and use appropriate expiry times

### Issue: Mobile App Offline Access
**Solution**: Download and cache files locally when needed

## Testing Checklist

- [ ] Bank statement uploads and downloads
- [ ] eKYC document access
- [ ] Payment receipt generation and access
- [ ] AI image generation and display
- [ ] Admin dashboard file access
- [ ] Mobile app file operations
- [ ] PDF generation services
- [ ] File deletion operations

## Rollback Plan

If issues arise, we can temporarily revert:
```sql
UPDATE storage.buckets SET public = true WHERE id = 'documents';
```

Then address issues and re-attempt the migration.