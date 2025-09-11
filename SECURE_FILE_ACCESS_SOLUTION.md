# Secure File Access Solution

## The Problem
Signed URLs can still be accessed in incognito mode because they're designed as bearer tokens - anyone with the URL can access the file until expiration.

## Solution: Authenticated File Proxy

Instead of giving users direct URLs (even signed ones), we'll create an authenticated endpoint that serves files only to authorized users.

### Implementation Plan

#### 1. Create Secure File Endpoint
```typescript
// pages/api/secure-file/[...path].ts
import { createClient } from '@supabase/supabase-js'
import { NextApiRequest, NextApiResponse } from 'next'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Verify user authentication
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  // 2. Verify token and get user
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // 3. Get file path from URL
  const { path } = req.query
  const filePath = Array.isArray(path) ? path.join('/') : path

  // 4. Check if user has permission to access this file
  const hasPermission = await checkFilePermission(user.id, filePath)
  if (!hasPermission) {
    return res.status(403).json({ error: 'Access denied' })
  }

  // 5. Download file from Supabase and stream to user
  const { data, error: downloadError } = await supabaseAdmin.storage
    .from('documents')
    .download(filePath)

  if (downloadError) {
    return res.status(404).json({ error: 'File not found' })
  }

  // 6. Set appropriate headers and stream file
  res.setHeader('Content-Type', getContentType(filePath))
  res.setHeader('Cache-Control', 'private, no-cache')
  
  const buffer = await data.arrayBuffer()
  res.send(Buffer.from(buffer))
}

async function checkFilePermission(userId: string, filePath: string): Promise<boolean> {
  const pathParts = filePath.split('/')
  const folder = pathParts[0]
  const userIdFromPath = pathParts[1]

  switch (folder) {
    case 'ai-generated-images':
      return true // AI images accessible to authenticated users
    
    case 'bank-statements':
    case 'ekyc-documents':
    case 'nomad-visas':
    case 'pdpa-consent':
      return userId === userIdFromPath
    
    case 'payment-release-pdfs':
      // Check if user is involved in the job
      const jobId = pathParts[1]
      const { data } = await supabaseAdmin
        .from('active_jobs')
        .select('buyer_id, service_provider_id')
        .eq('id', jobId)
        .single()
      
      return data && (data.buyer_id === userId || data.service_provider_id === userId)
    
    case 'buyer-receipts':
      // Check if user is involved in the offer
      const offerId = pathParts[1]
      const { data: offer } = await supabaseAdmin
        .from('service_offers')
        .select('buyer_id, seller_id')
        .eq('id', offerId)
        .single()
      
      return offer && (offer.buyer_id === userId || offer.seller_id === userId)
    
    default:
      return false
  }
}

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf': return 'application/pdf'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'webp': return 'image/webp'
    default: return 'application/octet-stream'
  }
}
```

#### 2. Update Services to Use Secure Endpoint

Instead of:
```typescript
const { data: urlData } = await supabase.storage
  .from('documents')
  .createSignedUrl(filePath, 3600)
```

Use:
```typescript
const secureUrl = `/api/secure-file/${filePath}`
```

#### 3. Frontend Usage

```typescript
// When displaying images/documents
const token = (await supabase.auth.getSession()).data.session?.access_token

<img 
  src={`/api/secure-file/${filePath}`}
  headers={{ Authorization: `Bearer ${token}` }}
/>

// Or for downloads
const downloadFile = async (filePath: string) => {
  const token = (await supabase.auth.getSession()).data.session?.access_token
  
  const response = await fetch(`/api/secure-file/${filePath}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  
  if (response.ok) {
    const blob = await response.blob()
    // Handle file download
  }
}
```

## Benefits

1. **True Authentication Required**: No way to access files without valid session
2. **No URL Sharing**: URLs only work with proper authentication headers
3. **Fine-grained Permissions**: Server-side permission checking
4. **No Expiry Issues**: Access controlled by session validity
5. **Audit Trail**: All file access goes through your API

## Trade-offs

1. **More Complex**: Requires backend endpoint
2. **Server Load**: Files go through your server
3. **Caching**: Need to implement proper caching strategy

## Implementation Priority

This is the **only way** to achieve true authentication-required file access. Signed URLs will always be accessible by anyone who has the URL until expiration.