import { supabase } from './supabase';
import { ImageService } from './image-service';
import { referralService } from './referral-service';
import { notificationService } from './notification-service';

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
   * Upload completion photos for an active job
   */
  static async uploadActiveJobCompletionPhotos(
    activeJobId: string,
    serviceProviderId: string,
    photos: Array<{ photo_url: string; photo_description?: string }>
  ): Promise<JobCompletionPhoto[] | null> {
    try {
      const photoData = photos.map(photo => ({
        active_job_id: activeJobId,
        service_provider_id: serviceProviderId,
        photo_url: photo.photo_url,
        photo_description: photo.photo_description || null,
      }));

      const { data, error } = await supabase
        .from('active_job_completion_photos')
        .insert(photoData)
        .select();

      if (error) {
        console.error('Error uploading active job completion photos:', error);
        return null;
      }

      // Map the response to match JobCompletionPhoto interface
      return data?.map(photo => ({
        id: photo.id,
        job_status_id: '', // Not applicable for active job photos
        service_provider_id: photo.service_provider_id,
        photo_url: photo.photo_url,
        photo_description: photo.photo_description,
        uploaded_at: photo.uploaded_at,
        created_at: photo.created_at,
        updated_at: photo.updated_at
      })) || null;
    } catch (error) {
      console.error('Error in uploadActiveJobCompletionPhotos:', error);
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
   * Get completion photos for an active job by active job ID
   */
  static async getCompletionPhotosByActiveJobId(activeJobId: string): Promise<JobCompletionPhoto[]> {
    try {
      // First, try to get photos directly from active_job_completion_photos table
      const { data: activeJobPhotos, error: activeJobPhotosError } = await supabase
        .from('active_job_completion_photos')
        .select('*')
        .eq('active_job_id', activeJobId)
        .order('created_at', { ascending: true });

      if (!activeJobPhotosError && activeJobPhotos && activeJobPhotos.length > 0) {
        console.log('Found completion photos in active_job_completion_photos table:', activeJobPhotos.length);
        return activeJobPhotos.map(photo => ({
          id: photo.id,
          job_status_id: '', // Not applicable for active job photos, but required by interface
          service_provider_id: photo.service_provider_id,
          photo_url: photo.photo_url,
          photo_description: photo.photo_description,
          uploaded_at: photo.uploaded_at,
          created_at: photo.created_at,
          updated_at: photo.updated_at
        }));
      }

      // If no active job photos found, try the old approach with job_status
      console.log('No active job photos found, trying job_status approach...');
      
      // Get the active job to find the service_offer_id
      const { data: activeJob, error: activeJobError } = await supabase
        .from('active_jobs')
        .select('service_offer_id')
        .eq('id', activeJobId)
        .single();

      if (activeJobError || !activeJob) {
        console.error('Error fetching active job:', activeJobError);
        return [];
      }

      // If service_offer_id is null, there's no corresponding job_status
      if (!activeJob.service_offer_id) {
        console.log('Active job has no service_offer_id, no job_status photos available');
        return [];
      }

      // Then, get the job_status_id using the service_offer_id
      const { data: jobStatus, error: jobStatusError } = await supabase
        .from('job_status')
        .select('id')
        .eq('service_offer_id', activeJob.service_offer_id)
        .single();

      if (jobStatusError || !jobStatus) {
        console.error('Error fetching job status:', jobStatusError);
        return [];
      }

      // Finally, get the completion photos using the job_status_id
      return await this.getCompletionPhotos(jobStatus.id);
    } catch (error) {
      console.error('Error in getCompletionPhotosByActiveJobId:', error);
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
      // Get the job status to find the service offer ID
      const { data: jobStatus, error: jobStatusError } = await supabase
        .from('job_status')
        .select('service_offer_id')
        .eq('id', jobStatusId)
        .single();

      if (jobStatusError || !jobStatus) {
        console.error('Error fetching job status:', jobStatusError);
        return false;
      }

      // Update job status to work completed first
      const { error: jobError } = await supabase
        .from('job_status')
        .update({
          current_status: 'work_completed',
          work_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobStatusId);

      if (jobError) {
        console.error('Error updating job status:', jobError);
        return false;
      }

      // Update to buyer reviewing status to await confirmation
      const { error: reviewError } = await supabase
        .from('job_status')
        .update({
          current_status: 'buyer_reviewing',
          buyer_review_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobStatusId);

      if (reviewError) {
        console.error('Error updating to buyer reviewing status:', reviewError);
        return false;
      }

      // Update the corresponding order status to buyer reviewing
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'buyer_reviewing',
          work_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('service_offer_id', jobStatus.service_offer_id);

      if (orderError) {
        console.error('Error updating order status:', orderError);
        // Don't fail the entire operation if order update fails
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

      // Send notification to buyer about job completion
      try {
        // Get buyer and service provider information
        const { data: jobDetails, error: detailsError } = await supabase
          .from('job_status')
          .select(`
            buyer_id,
            service_provider_id,
            service_offers(
              services(
                title
              )
            )
          `)
          .eq('id', jobStatusId)
          .single();

        if (!detailsError && jobDetails) {
          const serviceOffer = Array.isArray(jobDetails.service_offers) ? jobDetails.service_offers[0] : jobDetails.service_offers;
          const services = Array.isArray(serviceOffer?.services) ? serviceOffer.services[0] : serviceOffer?.services;
          const serviceTitle = services?.title || 'Service';
          
          // Get service provider profile
          const { data: providerProfile } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', serviceProviderId)
            .single();

          const providerName = providerProfile?.full_name || 'Service Provider';
          const providerImage = providerProfile?.avatar_url;

          // Send notification to buyer
          await notificationService.addJobCompletionNotification({
            buyerId: jobDetails.buyer_id,
            serviceProviderName: providerName,
            serviceProviderImage: providerImage,
            serviceTitle,
            jobId: jobStatusId,
            hasPhotos: photos.length > 0,
            completionMessage: completionMessage || undefined,
          });

          console.log('✅ Job completion notification sent to buyer:', jobDetails.buyer_id);
        }
      } catch (error) {
        console.error('Error sending job completion notification:', error);
        // Don't fail the entire operation if notification fails
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
