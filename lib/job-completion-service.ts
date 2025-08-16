import { supabase } from './supabase';
import { ImageService } from './image-service';
import { referralService } from './referral-service';

export interface JobCompletionPhoto {
  id?: string;
  job_status_id: string;
  service_provider_id: string;
  photo_url: string;
  photo_description?: string;
  uploaded_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobCompletionData {
  job_status_id: string;
  service_provider_id: string;
  photos: Array<{
    photo_url: string;
    photo_description?: string;
  }>;
  completion_message?: string;
}

export class JobCompletionService {
  /**
   * Upload completion photos for a job
   */
  static async uploadCompletionPhotos(
    jobStatusId: string,
    serviceProviderId: string,
    photos: Array<{ photo_url: string; photo_description?: string }>
  ): Promise<JobCompletionPhoto[] | null> {
    try {
      const photoData = photos.map(photo => ({
        job_status_id: jobStatusId,
        service_provider_id: serviceProviderId,
        photo_url: photo.photo_url,
        photo_description: photo.photo_description || null,
      }));

      const { data, error } = await supabase
        .from('job_completion_photos')
        .insert(photoData)
        .select();

      if (error) {
        console.error('Error uploading completion photos:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in uploadCompletionPhotos:', error);
      return null;
    }
  }

  /**
   * Get completion photos for a job
   */
  static async getCompletionPhotos(jobStatusId: string): Promise<JobCompletionPhoto[]> {
    try {
      const { data, error } = await supabase
        .from('job_completion_photos')
        .select('*')
        .eq('job_status_id', jobStatusId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching completion photos:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCompletionPhotos:', error);
      return [];
    }
  }

  /**
   * Complete a job with photos
   */
  static async completeJobWithPhotos(
    jobStatusId: string,
    serviceProviderId: string,
    photos: Array<{ photo_url: string; photo_description?: string }>,
    completionMessage?: string
  ): Promise<boolean> {
    try {
      // Start a transaction
      const { data: jobStatus, error: jobError } = await supabase
        .from('job_status')
        .update({
          current_status: 'work_completed',
          work_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobStatusId)
        .select()
        .single();

      if (jobError) {
        console.error('Error updating job status:', jobError);
        return false;
      }

      // Upload completion photos
      if (photos.length > 0) {
        const photoResult = await this.uploadCompletionPhotos(jobStatusId, serviceProviderId, photos);
        if (!photoResult) {
          console.error('Failed to upload completion photos');
          return false;
        }
      }

      // Add completion communication
      if (completionMessage) {
        const { error: commError } = await supabase
          .from('job_communications')
          .insert({
            job_status_id: jobStatusId,
            sender_id: serviceProviderId,
            message_type: 'completion_notice',
            message: completionMessage,
            attachments: photos.length > 0 ? { photos: photos.map(p => p.photo_url) } : null,
          });

        if (commError) {
          console.error('Error adding completion communication:', commError);
          // Don't fail the entire operation if communication fails
        }
      }

      // Track job completion for referral system
      try {
        await referralService.trackJobCompletion(serviceProviderId);
      } catch (error) {
        console.error('Error tracking job completion for referrals:', error);
        // Don't fail the entire operation if referral tracking fails
      }

      return true;
    } catch (error) {
      console.error('Error in completeJobWithPhotos:', error);
      return false;
    }
  }

  /**
   * Upload photo from device
   */
  static async uploadPhotoFromDevice(
    userId: string,
    bucket: string = 'job-completion-photos'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const result = await ImageService.pickImage();
      
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
      const uploadResult = await ImageService.uploadImage(
        asset.uri,
        asset.base64,
        userId,
        bucket
      );

      return uploadResult;
    } catch (error) {
      console.error('Error uploading photo from device:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Take photo with camera
   */
  static async takePhotoWithCamera(
    userId: string,
    bucket: string = 'job-completion-photos'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const result = await ImageService.takePhoto();
      
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
      const uploadResult = await ImageService.uploadImage(
        asset.uri,
        asset.base64,
        userId,
        bucket
      );

      return uploadResult;
    } catch (error) {
      console.error('Error taking photo with camera:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
