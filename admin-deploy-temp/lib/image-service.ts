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
   * Check network connectivity
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
   * Upload image to Supabase storage with retry logic
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
      retryDelay = 1000,
      timeout = 30000
    } = options;

    let retryCount = 0;

    const uploadWithRetry = async (): Promise<ImageUploadResult> => {
      try {
        // Check network connectivity first
        const isConnected = await this.checkNetworkConnectivity();
        if (!isConnected) {
          throw new Error('No internet connection available');
        }

        // Debug: Check current session
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Current session during upload:', session ? 'Authenticated' : 'Not authenticated');
        console.log('Session user ID:', session?.user?.id);
        console.log('Provided user ID:', userId);
        
        // If no session, try to refresh it
        if (!session) {
          console.log('No session found, attempting to refresh...');
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('Failed to refresh session:', refreshError);
            throw new Error('Authentication required. Please sign in again.');
          }
          console.log('Refreshed session:', refreshedSession ? 'Success' : 'Failed');
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

        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Upload timeout')), timeout);
        });

        // Upload to Supabase storage with enhanced retry logic
        const uploadPromise = supabaseWithRetry.storage
          .from(bucket)
          .upload(fileName, arrayBuffer, {
            contentType: getMimeType(fileExt),
            upsert: true,
          });

        const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

        if (error) {
          console.error('Upload error:', error);
          
          // Handle specific error types
          if (error.message.includes('Network request failed') || 
              error.message.includes('timeout') ||
              error.message.includes('network')) {
            throw new Error(`Network error: ${error.message}`);
          }
          
          throw new Error(error.message);
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
              error.message.includes('permission') ||
              error.message.includes('invalid')) {
            throw error;
          }
        }
        
        throw error;
      }
    };

    try {
      return await this.retryWithBackoff(uploadWithRetry, maxRetries, retryDelay);
    } catch (error) {
      console.error('All upload attempts failed:', error);
      
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
}

export default ImageService;