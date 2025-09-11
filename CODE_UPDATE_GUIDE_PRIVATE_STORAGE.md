# Code Update Guide: Hybrid Storage Security

## Overview
This guide shows how to update your application code to work with the hybrid `documents` bucket:
- **AI-generated images**: Remain publicly accessible (no code changes needed)
- **Sensitive documents**: Require authentication and signed URLs

## Key Changes Required

### 1. Replace getPublicUrl() with createSignedUrl()

#### Before (Public Bucket):
```typescript
const { data: urlData } = supabase.storage
  .from('documents')
  .getPublicUrl(filePath);
const fileUrl = urlData.publicUrl;
```

#### After (Private Bucket):
```typescript
const { data: urlData, error } = await supabase.storage
  .from('documents')
  .createSignedUrl(filePath, 3600); // 1 hour expiry

if (error) {
  console.error('Error creating signed URL:', error);
  return null;
}
const fileUrl = urlData.signedUrl;
```

### 2. Update Service Files

#### lib/gemini-image-service.ts
```typescript
// Replace this:
const { data: urlData } = supabaseWithRetry.storage
  .from('documents')
  .getPublicUrl(filePath);

// With this:
const { data: urlData, error: urlError } = await supabaseWithRetry.storage
  .from('documents')
  .createSignedUrl(filePath, 3600);

if (urlError) {
  console.error('Error creating signed URL for AI image:', urlError);
  throw new Error(`Failed to create signed URL: ${urlError.message}`);
}
```

#### lib/bank-statement-service.ts
```typescript
// Replace this:
const { data: urlData } = supabase.storage
  .from('documents')
  .getPublicUrl(storageFileName);

// With this:
const { data: urlData, error: urlError } = await supabase.storage
  .from('documents')
  .createSignedUrl(storageFileName, 7200); // 2 hours for bank statements

if (urlError) {
  console.error('Error creating signed URL for bank statement:', urlError);
  throw new Error(`Failed to create signed URL: ${urlError.message}`);
}
```

#### lib/ekyc-service.ts
```typescript
// Replace this:
const { data: urlData } = supabase.storage
  .from('documents')
  .getPublicUrl(filePath);

// With this:
const { data: urlData, error: urlError } = await supabase.storage
  .from('documents')
  .createSignedUrl(filePath, 3600);

if (urlError) {
  console.error('Error creating signed URL for eKYC document:', urlError);
  throw new Error(`Failed to create signed URL: ${urlError.message}`);
}
```

#### lib/payment-release-pdf-service.ts
```typescript
// Replace this:
const { data: urlData } = supabase.storage
  .from('documents')
  .getPublicUrl(filePath);

// With this:
const { data: urlData, error: urlError } = await supabase.storage
  .from('documents')
  .createSignedUrl(filePath, 1800); // 30 minutes for PDF receipts

if (urlError) {
  console.error('Error creating signed URL for payment receipt:', urlError);
  throw new Error(`Failed to create signed URL: ${urlError.message}`);
}
```

#### lib/buyer-receipt-service.ts
```typescript
// Replace this:
const { data: urlData } = supabase.storage
  .from('documents')
  .getPublicUrl(filePath);

// With this:
const { data: urlData, error: urlError } = await supabase.storage
  .from('documents')
  .createSignedUrl(filePath, 1800); // 30 minutes for buyer receipts

if (urlError) {
  console.error('Error creating signed URL for buyer receipt:', urlError);
  throw new Error(`Failed to create signed URL: ${urlError.message}`);
}
```

### 3. Admin Dashboard Updates

For admin dashboard operations, use the service role client:

```typescript
// Create a service role client for admin operations
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Use for admin file access
const { data: urlData, error } = await supabaseAdmin.storage
  .from('documents')
  .createSignedUrl(filePath, 3600);
```

### 4. Edge Functions Updates

#### supabase/functions/generate-payment-release-pdf/index.ts
```typescript
// Replace getPublicUrl with createSignedUrl
const { data: urlData, error: urlError } = await supabase.storage
  .from('documents')
  .createSignedUrl(filePath, 1800);

if (urlError) {
  console.error('Error creating signed URL:', urlError);
  throw new Error(`Failed to create signed URL: ${urlError.message}`);
}
```

### 5. Helper Function for Consistent URL Generation

Create a utility function to standardize signed URL creation:

```typescript
// lib/storage-utils.ts
export async function createDocumentSignedUrl(
  supabaseClient: any,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient.storage
      .from('documents')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Exception creating signed URL:', err);
    return null;
  }
}

// Usage:
const fileUrl = await createDocumentSignedUrl(supabase, filePath, 3600);
```

### 6. Frontend Component Updates

Update any components that display file URLs:

```typescript
// Before:
const [imageUrl, setImageUrl] = useState<string>('');

useEffect(() => {
  if (filePath) {
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    setImageUrl(data.publicUrl);
  }
}, [filePath]);

// After:
const [imageUrl, setImageUrl] = useState<string>('');

useEffect(() => {
  const loadSignedUrl = async () => {
    if (filePath) {
      const signedUrl = await createDocumentSignedUrl(supabase, filePath);
      if (signedUrl) {
        setImageUrl(signedUrl);
      }
    }
  };
  
  loadSignedUrl();
}, [filePath]);
```

### 7. Caching Strategy

Since signed URLs expire, implement caching:

```typescript
// lib/url-cache.ts
const urlCache = new Map<string, { url: string; expires: number }>();

export async function getCachedSignedUrl(
  supabaseClient: any,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const now = Date.now();
  const cached = urlCache.get(filePath);
  
  // Return cached URL if still valid (with 5 minute buffer)
  if (cached && cached.expires > now + 300000) {
    return cached.url;
  }
  
  // Generate new signed URL
  const signedUrl = await createDocumentSignedUrl(supabaseClient, filePath, expiresIn);
  
  if (signedUrl) {
    urlCache.set(filePath, {
      url: signedUrl,
      expires: now + (expiresIn * 1000)
    });
  }
  
  return signedUrl;
}
```

## Testing Checklist

After making these changes, test:

- [ ] AI image generation and display
- [ ] Bank statement upload and download
- [ ] eKYC document upload and viewing
- [ ] Payment receipt generation and access
- [ ] Buyer receipt generation and access
- [ ] PDPA consent document access
- [ ] Admin dashboard file operations
- [ ] Mobile app file operations

## Recommended Expiry Times

- **AI Generated Images**: 1 hour (3600 seconds)
- **Bank Statements**: 2 hours (7200 seconds) 
- **eKYC Documents**: 1 hour (3600 seconds)
- **Payment Receipts**: 30 minutes (1800 seconds)
- **Buyer Receipts**: 30 minutes (1800 seconds)
- **PDPA Consent**: 1 hour (3600 seconds)
- **Admin Operations**: 4 hours (14400 seconds)

## Error Handling

Always handle signed URL creation errors:

```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .createSignedUrl(filePath, 3600);

if (error) {
  console.error('Storage error:', error);
  // Handle error appropriately:
  // - Show user-friendly message
  // - Retry with exponential backoff
  // - Fall back to alternative approach
  return null;
}
```

## Performance Considerations

1. **Cache signed URLs** to avoid regenerating them frequently
2. **Use appropriate expiry times** - longer for less sensitive content
3. **Batch URL generation** when possible
4. **Preload URLs** for content that will be accessed soon
5. **Clean up expired URLs** from cache periodically