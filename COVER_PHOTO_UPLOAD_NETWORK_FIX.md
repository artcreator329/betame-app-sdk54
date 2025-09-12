# Cover Photo Upload Network Issue Fix

## Problem Summary
Users were experiencing network connectivity issues specifically when uploading cover photos, while profile photo uploads worked fine. The error logs showed:
- "Network request failed" errors
- Multiple retry attempts failing
- Timeouts during upload process

## Root Cause Analysis
The issue was identified as:
1. **Insufficient timeout settings** - Cover photos are typically larger than profile photos
2. **Inadequate retry logic** - Network instability required more robust retry mechanisms
3. **Same upload settings for different photo types** - Cover photos need different handling than profile photos
4. **Poor error messaging** - Users weren't getting actionable feedback

## Solution Implemented

### 1. Enhanced ImageService Upload Logic
- **Increased retry attempts**: From 3 to 5-6 retries for better reliability
- **Dynamic timeout calculation**: Timeout now scales with file size (30 seconds per MB)
- **Improved retry backoff**: Progressive delays with network connectivity checks
- **Better error categorization**: Specific handling for network vs authentication errors

### 2. Dedicated Cover Photo Methods
Created specialized methods for cover photos:
- `uploadCoverPhoto()` - Optimized for larger files with 16:9 aspect ratio
- `takeCoverPhoto()` - Camera capture with cover photo settings
- Enhanced timeout (3 minutes) and retry settings (6 attempts)
- Reduced quality (0.7) to minimize file size

### 3. Network Diagnostics System
- **Comprehensive diagnostics**: Tests connectivity, latency, authentication, and storage access
- **Progressive file size testing**: Tests uploads from 1KB to 4MB to identify size limits
- **Concurrent upload testing**: Simulates retry scenarios
- **Actionable recommendations**: Provides specific troubleshooting steps

### 4. Improved Error Handling
- **Context-aware error messages**: Different messages for network vs auth issues
- **Diagnostic integration**: Option to run network diagnostics when uploads fail
- **User-friendly guidance**: Specific steps based on error type

## Files Modified

### Core Service Files
- `lib/image-service.ts` - Enhanced upload logic and diagnostics
- `app/(tabs)/profile.tsx` - Updated to use new cover photo methods

### Testing Scripts
- `scripts/test-cover-photo-upload.js` - Comprehensive upload testing
- `scripts/test-storage-upload.js` - Existing storage test (enhanced)

## Key Improvements

### Upload Reliability
```typescript
// Before: Fixed 3 retries, 30s timeout
{ maxRetries: 3, retryDelay: 1000, timeout: 30000 }

// After: Adaptive settings based on photo type
// Cover photos: 6 retries, 3 minutes timeout, progressive backoff
{ maxRetries: 6, retryDelay: 3000, timeout: 180000 }
```

### Network Resilience
- Dynamic timeout based on file size
- Network connectivity checks before retries
- Exponential backoff with network recovery delays
- Timeout race conditions to prevent hanging uploads

### User Experience
- Specific error messages for different failure types
- Built-in network diagnostics accessible from error dialogs
- Progress indication during upload attempts
- Actionable troubleshooting recommendations

## Testing Instructions

### 1. Run Network Diagnostics
```bash
node scripts/test-cover-photo-upload.js
```

### 2. Test in App
1. Go to Profile page
2. Try uploading a cover photo
3. If it fails, tap "Run Diagnostics" in the error dialog
4. Check console logs for detailed network analysis

### 3. Monitor Upload Progress
Watch console logs for:
- Upload attempt progress (1/6, 2/6, etc.)
- File size and timeout calculations
- Network connectivity status
- Retry delay information

## Expected Results

### For Users with Good Connectivity
- Cover photos should upload successfully on first attempt
- Upload time should be reasonable (under 30 seconds for typical photos)

### For Users with Poor Connectivity
- System will retry up to 6 times with progressive delays
- Clear error messages explaining the issue
- Option to run diagnostics for troubleshooting
- Recommendations for improving connectivity

### For Network Issues
- Automatic detection of network problems
- Appropriate delays for network recovery
- Fallback to smaller file sizes when possible
- Clear guidance on next steps

## Monitoring and Maintenance

### Key Metrics to Watch
- Upload success rate for cover photos vs profile photos
- Average retry count before success
- Common error types and frequencies
- Network diagnostic results patterns

### Future Enhancements
- Automatic image compression based on network speed
- Progressive upload with resumable transfers
- Offline queue for failed uploads
- Real-time network quality assessment

## Troubleshooting Guide

### If Cover Photos Still Fail
1. Run the diagnostic script: `node scripts/test-cover-photo-upload.js`
2. Check network latency (should be < 2 seconds)
3. Verify file size (recommend < 5MB)
4. Test with different network connections (WiFi vs cellular)
5. Check Supabase project status and quotas

### Common Issues and Solutions
- **High latency**: Recommend WiFi over cellular
- **Large files**: Automatic quality reduction to 0.7
- **Authentication errors**: Clear session and re-login
- **Storage errors**: Check bucket permissions and RLS policies

This fix addresses the core networking issues while providing better user experience and diagnostic capabilities for ongoing troubleshooting.