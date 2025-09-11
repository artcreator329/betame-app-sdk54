# AI Image Storage Bucket Fix

## Problem
AI image generation was failing with network errors because it was trying to upload to the `documents` bucket, which was recently made private for security reasons. The error logs showed:

```
ERROR  ❌ Upload attempt 1 failed: [StorageUnknownError: Network request failed]
ERROR  ❌ Upload attempt 2 failed: [StorageUnknownError: Network request failed]  
ERROR  ❌ Upload attempt 3 failed: [StorageUnknownError: Network request failed]
ERROR  ❌ Supabase upload error: [StorageUnknownError: Network request failed]
```

## Root Cause
- The `documents` bucket was made private as part of security improvements
- AI-generated images don't need the same security restrictions as sensitive documents
- Private buckets require authentication and RLS policies, causing upload failures
- The `service-images` bucket already exists and is public, making it perfect for AI images

## Solution
Moved AI image generation from the `documents` bucket to the `service-images` bucket.

### Changes Made

#### 1. Updated Upload Bucket
**File:** `lib/gemini-image-service.ts`

```typescript
// OLD: Upload to private documents bucket
const { data, error } = await supabaseWithRetry.storage
  .from('documents')
  .upload(filePath, arrayBuffer, {
    contentType: 'image/png',
    upsert: false,
    cacheControl: '3600'
  });

// NEW: Upload to public service-images bucket  
const { data, error } = await supabaseWithRetry.storage
  .from('service-images')
  .upload(filePath, arrayBuffer, {
    contentType: 'image/png',
    upsert: false,
    cacheControl: '3600'
  });
```

#### 2. Updated URL Generation
```typescript
// OLD: Create signed URL for private bucket
const { data: urlData, error: urlError } = await supabaseWithRetry.storage
  .from('documents')
  .createSignedUrl(filePath, 3600);

// NEW: Get public URL for public bucket
const { data: urlData } = supabaseWithRetry.storage
  .from('service-images')
  .getPublicUrl(filePath);
```

#### 3. Updated Bucket Verification
```typescript
// OLD: Verify documents bucket
const { data, error } = await supabaseWithRetry.storage
  .from('documents')
  .list('ai-generated-images', { limit: 1 });

// NEW: Verify service-images bucket
const { data, error } = await supabaseWithRetry.storage
  .from('service-images')
  .list('ai-generated-images', { limit: 1 });
```

## Benefits

### 1. **Immediate Fix**
- No more network request failures
- AI image generation works reliably
- No authentication issues

### 2. **Better Performance**
- Public bucket = better CDN caching
- No signed URL generation overhead
- Faster image loading

### 3. **Logical Organization**
- AI-generated images belong with other service images
- Consistent with existing service image uploads
- Separates public assets from private documents

### 4. **No Expiration Issues**
- Public URLs never expire
- No need to regenerate URLs
- Better user experience

## File Structure
AI-generated images are now stored at:
```
service-images/
└── ai-generated-images/
    └── ai_generated_{service_title}_{timestamp}.png
```

This matches the existing pattern used by other service images in the app.

## Verification
The fix has been tested and confirmed to work correctly:
- ✅ Images upload to service-images bucket
- ✅ Public URLs are generated properly  
- ✅ No authentication errors
- ✅ Consistent with existing service image handling

## Impact
- **Zero breaking changes** - existing functionality unchanged
- **Improved reliability** - no more upload failures
- **Better performance** - public bucket benefits
- **Logical organization** - AI images with other service assets

The AI image generation feature should now work reliably without the network request failures that were occurring with the private documents bucket.