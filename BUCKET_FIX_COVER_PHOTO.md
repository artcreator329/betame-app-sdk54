# BUCKET FIX: The Real Issue Found!

## The Problem
The `profile-images` bucket **DOESN'T EXIST** in your Supabase project!

## Evidence
1. **Profile photos seemed to work** - but they were probably failing silently or using a fallback
2. **Test script shows uploads go to `documents` bucket** - this is the bucket that actually exists
3. **Bucket list is empty** - no `profile-images` bucket found
4. **Cover photos failed** - because they were trying to upload to a non-existent bucket

## Root Cause
All photo uploads were trying to use the `'profile-images'` bucket, but this bucket doesn't exist in your Supabase project. The only working bucket is `'documents'`.

## Solution Applied
Changed all photo uploads to use the `'documents'` bucket that actually exists:

### Before (FAILED - Non-existent bucket)
```typescript
bucket: string = 'profile-images'  // ❌ This bucket doesn't exist!
```

### After (SHOULD WORK - Existing bucket)
```typescript
bucket: string = 'documents'  // ✅ This bucket exists and works
```

## Files Updated

### lib/image-service.ts
- Changed default bucket from `'profile-images'` to `'documents'`
- Updated `uploadProfilePhoto()` to use `'documents'` bucket
- Updated `takeProfilePhoto()` to use `'documents'` bucket  
- Updated diagnostics to test `'documents'` bucket

## Why This Should Work Now
1. **Existing Bucket**: `'documents'` bucket exists and is accessible
2. **Proven Working**: Test script shows successful uploads to `'documents'` bucket
3. **Same Code Path**: Both profile and cover photos now use identical working methods
4. **Same Storage Location**: All photos stored in the same bucket

## Expected Result
Both profile and cover photos should now:
- Upload successfully to the `'documents'` bucket
- Work with the same reliability as the test script
- Complete uploads quickly (under 20 seconds)
- Store files in paths like: `documents/{userId}/{timestamp}.jpg`

## Test Now
Try uploading both profile and cover photos - they should both work since they're now using the bucket that actually exists in your Supabase project!

## Note
If you want photos in a separate bucket, you'll need to create a `profile-images` bucket in your Supabase dashboard first. But for now, using the existing `documents` bucket should solve the immediate problem.