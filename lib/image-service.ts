import * as ImagePicker from 'expo-image-picker';
import { supabase, supabaseWithRetry } from './supabase';
import { decode } from 'base64-arraybuffer';
import NetInfo from '@react-native-community/netinfo';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  retryCount?: number;
}

interface UploadOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}



export class ImageService {
  /**
   * Request camera and media library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return cameraStatus === 'granted' && mediaStatus === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Check network connectivity - simple and fast
   */
  static async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected === true && netInfo.isInternetReachable === true;
    } catch (error) {
      console.error('Error checking network connectivity:', error);
      return false;
    }
  }

  /**
   * Wait for a specified amount of time
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Check network connectivity before retrying
        const isConnected = await this.checkNetworkConnectivity();
        if (!isConnected) {
          console.log(`Network not available, waiting before retry ${attempt + 1}/${maxRetries}`);
          await this.delay(baseDelay * Math.pow(2, attempt));
          continue;
        }
        
        console.log(`Upload attempt ${attempt + 1} failed, retrying in ${baseDelay * Math.pow(2, attempt)}ms...`);
        await this.delay(baseDelay * Math.pow(2, attempt));
      }
    }
    
    throw lastError!;
  }

  /**
   * Show image picker options (camera or gallery)
   */
  static async pickImage(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Camera and media library permissions are required');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile photos
        quality: 0.8,
        base64: true,
      });

      return result;
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  }

  /**
   * Take photo with camera
   */
  static async takePhoto(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Camera and media library permissions are required');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile photos
        quality: 0.8,
        base64: true,
      });

      return result;
    } catch (error) {
      console.error('Error taking photo:', error);
      return null;
    }
  }

  /**
   * Upload image to Supabase storage with minimal retry logic
   */
  static async uploadImage(
    imageUri: string,
    base64: string,
    userId: string,
    bucket: string = 'profile-images',
    options: UploadOptions = {}
  ): Promise<ImageUploadResult> {
    const {
      maxRetries = 3,
      retryDelay = 2000,
      timeout = 60000
    } = options;

    let retryCount = 0;

    const uploadWithRetry = async (): Promise<ImageUploadResult> => {
      try {
        // Simple connectivity check
        console.log(`🔍 Upload attempt ${retryCount + 1}/${maxRetries}`);
        
        const isConnected = await this.checkNetworkConnectivity();
        if (!isConnected) {
          throw new Error('No internet connection available');
        }

        // Check authentication (simplified for public buckets)
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Current session during upload:', session ? 'Authenticated' : 'Not authenticated');
        
        if (!session) {
          console.log('No session found, attempting to refresh...');
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshedSession) {
            console.error('Failed to refresh session:', refreshError);
            throw new Error('Authentication required. Please sign in again.');
          }
        }
        
        // Generate unique filename
        const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        console.log('Upload filename:', fileName);

        // Map file extensions to proper MIME types
        const getMimeType = (extension: string): string => {
          const mimeTypes: { [key: string]: string } = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff',
            'tif': 'image/tiff'
          };
          return mimeTypes[extension] || 'image/jpeg';
        };

        // Convert base64 to array buffer
        const arrayBuffer = decode(base64);
        
        console.log(`🔄 Storage upload attempt ${retryCount + 1}/${maxRetries} for path: ${fileName}`);
        console.log(`📝 Upload details: bucket=${bucket}, size=${arrayBuffer.byteLength} bytes, type=${getMimeType(fileExt)}`);

        // Simple timeout - no complex calculations
        const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024);
        console.log(`📊 File size: ${fileSizeMB.toFixed(2)}MB, timeout: ${timeout}ms`);

        // Direct upload with simple timeout
        const uploadPromise = supabase.storage
          .from(bucket)
          .upload(fileName, arrayBuffer, {
            contentType: getMimeType(fileExt),
            upsert: true,
          });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Upload timeout - connection too slow')), timeout);
        });

        const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;

        if (error) {
          console.error(`❌ Upload attempt ${retryCount + 1} failed:`, error);
          
          // Handle specific error types with more detailed logging
          if (error.message.includes('Network request failed')) {
            console.error('Network request failed - possible connectivity issue');
            throw new Error('Network connection failed. Please check your internet connection.');
          }
          
          if (error.message.includes('timeout')) {
            console.error('Upload timeout - network too slow');
            throw new Error('Upload timed out. Please try again with a better connection.');
          }
          
          if (error.message.includes('permission') || error.message.includes('Unauthorized')) {
            console.error('Permission denied - authentication issue');
            throw new Error('Permission denied. Please sign in again.');
          }
          
          if (error.message.includes('Not found') || error.message.includes('bucket')) {
            console.error('Storage bucket not found');
            throw new Error('Storage configuration error. Please contact support.');
          }
          
          console.error('Unknown upload error:', error.message);
          throw new Error(`Upload failed: ${error.message}`);
        } else {
          console.log(`✅ Upload attempt ${retryCount + 1} successful`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        return {
          success: true,
          url: urlData.publicUrl,
          retryCount,
        };
      } catch (error) {
        retryCount++;
        console.error(`Upload attempt ${retryCount} failed:`, error);
        
        // Don't retry for certain errors
        if (error instanceof Error) {
          if (error.message.includes('Authentication required') ||
              error.message.includes('Permission denied') ||
              error.message.includes('Storage configuration error') ||
              error.message.includes('invalid')) {
            console.log('🚫 Non-retryable error, stopping attempts');
            throw error;
          }
          
          // Only retry once for network errors - fail fast
          if (error.message.includes('Network connection failed') ||
              error.message.includes('Upload timeout') ||
              error.message.includes('network') ||
              error.message.includes('timeout')) {
            
            if (retryCount < maxRetries) {
              console.log(`⏳ Quick retry in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
              await this.delay(retryDelay);
              return uploadWithRetry();
            } else {
              console.log('🚫 Max retries reached - failing fast');
            }
          }
        }
        
        throw error;
      }
    };

    try {
      return await uploadWithRetry();
    } catch (error) {
      console.error('Upload failed after 2 attempts:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        if (error.message.includes('Network request failed') || 
            error.message.includes('timeout') ||
            error.message.includes('network')) {
          errorMessage = 'Network connection issue. Please check your internet connection and try again.';
        } else if (error.message.includes('Authentication required')) {
          errorMessage = 'Please sign in again to upload images.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please check your account permissions.';
        } else if (error.message.includes('Supabase storage unreachable')) {
          errorMessage = 'Storage service temporarily unavailable. Please try again in a few minutes.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        retryCount,
      };
    }
  }

  /**
   * Upload profile photo and update user profile
   */
  static async uploadProfilePhoto(userId: string): Promise<ImageUploadResult> {
    try {
      // Pick image from gallery
      const result = await this.pickImage();
      
      if (!result || result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          error: 'No image selected',
        };
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        return {
          success: false,
          error: 'Failed to process image',
        };
      }

      // Upload image with fast-fail logic - use documents bucket that exists
      const uploadResult = await this.uploadImage(
        asset.uri,
        asset.base64,
        userId,
        'profile-images',
        { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
      );

      return uploadResult;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Take profile photo with camera and upload
   */
  static async takeProfilePhoto(userId: string): Promise<ImageUploadResult> {
    try {
      // Take photo with camera
      const result = await this.takePhoto();
      
      if (!result || result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          error: 'No photo taken',
        };
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        return {
          success: false,
          error: 'Failed to process photo',
        };
      }

      // Upload image with retry logic
      const uploadResult = await this.uploadImage(
        asset.uri,
        asset.base64,
        userId,
        'profile-images',
        { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
      );

      return uploadResult;
    } catch (error) {
      console.error('Error taking profile photo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Upload cover photo with optimized settings for larger files
   */
  static async uploadCoverPhoto(userId: string): Promise<ImageUploadResult> {
    try {
      // Pick image from gallery with cover photo specific settings
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9], // Wider aspect ratio for cover photos
        quality: 0.8,
        base64: true,
      });
      
      if (!result || result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          error: 'No image selected',
        };
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        return {
          success: false,
          error: 'Failed to process image',
        };
      }

      // Upload image with retry logic
      const uploadResult = await this.uploadImage(
        asset.uri,
        asset.base64,
        userId,
        'profile-images',
        { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
      );

      return uploadResult;
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Take cover photo with camera and upload
   */
  static async takeCoverPhoto(userId: string): Promise<ImageUploadResult> {
    try {
      // Take photo with camera with cover photo specific settings
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9], // Wider aspect ratio for cover photos
        quality: 0.8,
        base64: true,
      });
      
      if (!result || result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          error: 'No photo taken',
        };
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        return {
          success: false,
          error: 'Failed to process photo',
        };
      }

      // Upload image with retry logic
      const uploadResult = await this.uploadImage(
        asset.uri,
        asset.base64,
        userId,
        'profile-images',
        { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
      );

      return uploadResult;
    } catch (error) {
      console.error('Error taking cover photo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Upload service image with enhanced error handling
   */
  static async uploadServiceImage(
    imageUri: string,
    base64: string,
    userId: string
  ): Promise<ImageUploadResult> {
    return this.uploadImage(
      imageUri,
      base64,
      userId,
      'service-images',
      { maxRetries: 3, retryDelay: 1500, timeout: 45000 }
    );
  }

  /**
   * Run comprehensive network diagnostics for upload issues
   */
  static async runNetworkDiagnostics(userId: string): Promise<string> {
    let report = '🔍 Network Diagnostics Report\n\n';
    
    try {
      // 1. Check basic network connectivity
      report += '1️⃣ Basic Network Connectivity\n';
      const netInfo = await NetInfo.fetch();
      report += `   Connection Type: ${netInfo.type}\n`;
      report += `   Is Connected: ${netInfo.isConnected}\n`;
      report += `   Is Internet Reachable: ${netInfo.isInternetReachable}\n`;
      
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        report += '   ❌ Network connectivity issue detected\n\n';
        return report;
      }
      report += '   ✅ Network connectivity OK\n\n';
      
      // 2. Test Supabase connectivity
      report += '2️⃣ Supabase Connectivity\n';
      const startTime = Date.now();
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        });
        const latency = Date.now() - startTime;
        report += `   Response Time: ${latency}ms\n`;
        report += `   Status: ${response.status}\n`;
        
        if (latency > 5000) {
          report += '   ⚠️ High latency detected (>5s)\n';
        } else if (latency > 2000) {
          report += '   ⚠️ Moderate latency detected (>2s)\n';
        } else {
          report += '   ✅ Good response time\n';
        }
      } catch (error) {
        report += `   ❌ Supabase connectivity failed: ${error}\n`;
      }
      report += '\n';
      
      // 3. Test authentication
      report += '3️⃣ Authentication Status\n';
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        report += '   ✅ User authenticated\n';
        report += `   User ID: ${session.user.id}\n`;
      } else {
        report += '   ❌ User not authenticated\n';
      }
      report += '\n';
      
      // 4. Test storage bucket access
      report += '4️⃣ Storage Bucket Access\n';
      try {
        const { data: bucketList, error: bucketError } = await supabase.storage.listBuckets();
        if (bucketError) {
          report += `   ❌ Bucket access failed: ${bucketError.message}\n`;
        } else {
          report += '   ✅ Bucket access OK\n';
          report += `   Available buckets: ${bucketList?.map(b => b.name).join(', ')}\n`;
        }
      } catch (error) {
        report += `   ❌ Bucket access error: ${error}\n`;
      }
      report += '\n';
      
      // 5. Test small file upload
      report += '5️⃣ Small File Upload Test\n';
      try {
        const testData = new TextEncoder().encode('network-test');
        const testFileName = `${userId}/network-test-${Date.now()}.txt`;
        
        const uploadStart = Date.now();
        const { data, error } = await supabase.storage
          .from('profile-images')
          .upload(testFileName, testData, {
            contentType: 'text/plain',
            upsert: true,
          });
        const uploadTime = Date.now() - uploadStart;
        
        if (error) {
          report += `   ❌ Small file upload failed: ${error.message}\n`;
        } else {
          report += '   ✅ Small file upload successful\n';
          report += `   Upload time: ${uploadTime}ms\n`;
          
          // Clean up test file
          await supabase.storage.from('profile-images').remove([testFileName]);
          report += '   🗑️ Test file cleaned up\n';
        }
      } catch (error) {
        report += `   ❌ Small file upload error: ${error}\n`;
      }
      report += '\n';
      
      // 6. Recommendations
      report += '💡 Recommendations\n';
      if (netInfo.type === 'cellular') {
        report += '   • You\'re on cellular data - try WiFi for better stability\n';
      }
      if (!netInfo.isInternetReachable) {
        report += '   • Check your internet connection\n';
      }
      report += '   • Ensure you have a stable connection before uploading\n';
      report += '   • Try uploading smaller images if issues persist\n';
      report += '   • Contact support if problems continue\n';
      
    } catch (error) {
      report += `\n❌ Diagnostics failed: ${error}\n`;
    }
    
    return report;
  }



  /**
   * Test upload function to diagnose issues
   */
  static async testUpload(userId: string): Promise<void> {
    try {
      console.log('🧪 Starting upload diagnostics...');
      
      const diagnosticsReport = await this.runNetworkDiagnostics(userId);
      console.log(diagnosticsReport);
      
    } catch (error) {
      console.error('🧪 Upload diagnostics failed:', error);
    }
  }
}

export default ImageService;