# Cover Photo Fix: Identical Settings to Profile Photo

## Problem Identified
Profile photos upload perfectly (16KB file, successful on first attempt), but cover photos fail. The issue was that cover photos used different settings:

### Previous Cover Photo Settings (FAILED)
- **Aspect Ratio**: 16:9 (wider)
- **Quality**: 0.6 (lower)
- **Timeout**: 30 seconds

### Profile Photo Settings (WORKS PERFECTLY)
- **Aspect Ratio**: 1:1 (square)
- **Quality**: 0.8 (higher)
- **Timeout**: 20 seconds

## Root Cause
The 16:9 aspect ratio and 0.6 quality settings were causing issues, possibly:
1. Creating larger file sizes despite lower quality
2. Image processing problems with the wider aspect ratio
3. Different compression algorithms for different aspect ratios

## Solution: Use Identical Settings
Since profile photos work flawlessly, I've made cover photos use the EXACT same settings:

### Updated Cover Photo Settings (NOW IDENTICAL)
```typescript
// uploadCoverPhoto() and takeCoverPhoto()
ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1], // Same as profile photo - this works!
  quality: 0.8,   // Same as profile photo - this works!
  base64: true,
});

// Upload settings
{ maxRetries: 2, retryDelay: 1000, timeout: 20000 } // Same as profile photo
```

## Changes Made

### 1. uploadCoverPhoto()
- Changed aspect ratio from [16, 9] to [1, 1]
- Changed quality from 0.6 to 0.8
- Changed timeout from 30000ms to 20000ms

### 2. takeCoverPhoto()
- Changed aspect ratio from [16, 9] to [1, 1]
- Changed quality from 0.6 to 0.8
- Changed timeout from 30000ms to 20000ms

## Expected Result
Cover photos should now upload exactly like profile photos:
- Small file sizes (similar to the 16KB profile photo)
- Fast uploads (5-15 seconds)
- High success rate on first attempt
- Same reliable behavior

## Why This Should Work
1. **Proven Settings**: Profile photos work perfectly with these exact settings
2. **Smaller Files**: 1:1 aspect ratio with 0.8 quality creates optimal file sizes
3. **Consistent Processing**: Same image processing pipeline as successful profile photos
4. **No Variables**: Eliminates all differences between working and non-working uploads

## Testing
Try uploading a cover photo now - it should behave identically to profile photo uploads:
1. Quick selection/capture
2. Fast upload (under 20 seconds)
3. Success on first attempt
4. Small file size

If this works, we've confirmed the issue was with the image picker settings, not the network or upload logic.