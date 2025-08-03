import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
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
   * Upload image to Supabase storage
   */
  static async uploadImage(
    imageUri: string,
    base64: string,
    userId: string,
    bucket: string = 'profile-images'
  ): Promise<ImageUploadResult> {
    try {
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
          return {
            success: false,
            error: 'Authentication required. Please sign in again.',
          };
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

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, arrayBuffer, {
          contentType: getMimeType(fileExt),
          upsert: true,
        });

      if (error) {
        console.error('Upload error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
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

      // Upload image
      const uploadResult = await this.uploadImage(
        asset.uri,
        asset.base64,
        userId
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

      // Upload image
      const uploadResult = await this.uploadImage(
        asset.uri,
        asset.base64,
        userId
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
}

export default ImageService;