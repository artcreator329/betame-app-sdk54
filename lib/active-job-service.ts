import { supabase } from './supabase';
import { ServiceOffer, ServiceOfferData } from '../types/chat';
import { DirectOrderData } from './payment-service';
import { notificationService } from './notification-service';
import { referralService } from './referral-service';

export interface ActiveJob {
  id?: string;
  buyer_id: string;
  service_provider_id: string;
  service_offer_id?: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  delivery_time: string;
  status: 'pending_confirmation' | 'in_progress' | 'completed' | 'completed_confirmed' | 'cancelled' | 'disputed' | 'revision_requested' | 'revision_in_progress' | 'revision_completed';
  progress_percentage: number;
  payment_status: 'pending' | 'paid' | 'released' | 'refunded';
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  revision_requested_at?: string;
  revision_request_reason?: string;
  revision_deadline?: string;
  revision_acknowledged_at?: string;
  revision_completed_at?: string;
}

export interface JobProgress {
  id?: string;
  active_job_id: string;
  message: string;
  progress_percentage: number;
  created_by: string;
  created_at?: string;
}

export class ActiveJobService {
  /**
   * Create an active job from a direct order (service listing purchase)
   */
  static async createJobFromDirectOrder(
    orderData: DirectOrderData,
    buyerId: string,
    serviceProviderId: string
  ): Promise<ActiveJob | null> {
    try {
      const jobData = {
        buyer_id: buyerId,
        service_provider_id: serviceProviderId,
        // service_offer_id: null, // Commented out - might be causing constraint issues
        title: orderData.title,
        description: orderData.customDescription || orderData.description,
        price: orderData.price,
        currency: orderData.currency,
        delivery_time: orderData.customDeliveryTime ? `${orderData.customDeliveryTime} days` : '7 days',
        status: 'pending_confirmation' as const,
        progress_percentage: 0,
        payment_status: 'paid' as const, // Payment is completed before job creation
        started_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('active_jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) {
        console.error('Error creating active job from direct order:', error);
        console.error('Job data that failed to insert:', jobData);
        return null;
      }

      // Send notification to service provider about the new order
      await this.notifyServiceProviderOfNewOrder(serviceProviderId, buyerId, orderData.title, orderData.price, orderData.currency, data.id, 'direct');

      return data;
    } catch (error) {
      console.error('Error in createJobFromDirectOrder:', error);
      return null;
    }
  }

  /**
   * Notify service provider about a new order
   */
  private static async notifyServiceProviderOfNewOrder(
    serviceProviderId: string,
    buyerId: string,
    serviceTitle: string,
    price: number,
    currency: string,
    jobId: string,
    orderType: 'direct' | 'offer'
  ): Promise<void> {
    try {
      console.log('🔔 ActiveJobService: Starting notification process for job:', jobId);
      
      // Get buyer profile for notification
      const { data: buyerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', buyerId)
        .single();

      if (profileError) {
        console.error('❌ ActiveJobService: Error fetching buyer profile:', profileError);
      }

      const buyerName = buyerProfile?.full_name || 'A customer';
      const buyerImage = buyerProfile?.avatar_url || '';

      console.log('🔔 ActiveJobService: Buyer details - Name:', buyerName, 'Image:', buyerImage ? 'Yes' : 'No');

      // Import notification service dynamically to avoid circular dependencies
      const { notificationService } = await import('./notification-service');
      
      console.log('🔔 ActiveJobService: Sending order notification to service provider:', serviceProviderId);
      
      // Send order notification using the proper notification service
      await notificationService.addOrderNotification({
        serviceProviderId,
        buyerName,
        buyerImage,
        serviceTitle,
        price,
        currency,
        orderId: jobId,
        orderType
      });

      console.log('✅ ActiveJobService: Order notification sent successfully to service provider:', serviceProviderId);
    } catch (error) {
      console.error('❌ ActiveJobService: Error notifying service provider:', error);
      console.error('❌ ActiveJobService: Error details:', {
        serviceProviderId,
        buyerId,
        serviceTitle,
        price,
        currency,
        jobId,
        orderType,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Don't throw the error to prevent job creation from failing
      // but log it for debugging
    }
  }

  /**
   * Create an active job from an accepted service offer
   */
  static async createJobFromOffer(
    offer: ServiceOffer,
    serviceData: ServiceOfferData,
    buyerId: string,
    serviceProviderId: string
  ): Promise<ActiveJob | null> {
    try {
      const jobData = {
        buyer_id: buyerId,
        service_provider_id: serviceProviderId,
        service_offer_id: offer.id,
        title: serviceData.title,
        description: offer.customDescription || serviceData.description,
        price: offer.customPrice || serviceData.customPrice || serviceData.price,
        currency: serviceData.currency || 'RM',
        delivery_time: offer.customDeliveryTime ? `${offer.customDeliveryTime} days` : '7 days',
        status: 'pending_confirmation' as const,
        progress_percentage: 0,
        payment_status: 'paid' as const, // Assuming payment is completed before job creation
        started_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('active_jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) {
        console.error('Error creating active job:', error);
        return null;
      }

      // Send notification to service provider about the new order from accepted offer
      await this.notifyServiceProviderOfNewOrder(
        serviceProviderId, 
        buyerId, 
        serviceData.title, 
        offer.customPrice || serviceData.customPrice || serviceData.price, 
        serviceData.currency || 'RM', 
        data.id, 
        'offer'
      );

      return data;
    } catch (error) {
      console.error('Error in createJobFromOffer:', error);
      return null;
    }
  }

  /**
   * Get active jobs for a user (both as buyer and seller)
   */
  static async getUserActiveJobs(userId: string): Promise<{
    asBuyer: ActiveJob[];
    asServiceProvider: ActiveJob[];
  }> {
    try {
      const [buyerJobs, serviceProviderJobs] = await Promise.all([
        supabase
          .from('active_jobs')
          .select('*')
          .eq('buyer_id', userId)
          .in('status', ['pending_confirmation', 'in_progress', 'completed', 'completed_confirmed', 'revision_requested', 'revision_in_progress', 'revision_completed'])
          .order('created_at', { ascending: false }),
        supabase
          .from('active_jobs')
          .select('*')
          .eq('service_provider_id', userId)
          .in('status', ['pending_confirmation', 'in_progress', 'completed', 'completed_confirmed', 'revision_requested', 'revision_in_progress', 'revision_completed'])
          .order('created_at', { ascending: false })
      ]);

      if (buyerJobs.error) {
        console.error('Error fetching buyer jobs:', buyerJobs.error);
      }
      if (serviceProviderJobs.error) {
        console.error('Error fetching service provider jobs:', serviceProviderJobs.error);
      }

      return {
        asBuyer: buyerJobs.data || [],
        asServiceProvider: serviceProviderJobs.data || []
      };
    } catch (error) {
      console.error('Error in getUserActiveJobs:', error);
      return { asBuyer: [], asServiceProvider: [] };
    }
  }

  /**
   * Get a specific active job
   */
  static async getActiveJob(jobId: string): Promise<ActiveJob | null> {
    try {
      const { data, error } = await supabase
        .from('active_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error fetching active job:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getActiveJob:', error);
      return null;
    }
  }

  /**
   * Update job progress
   */
  static async updateJobProgress(
    jobId: string,
    progressPercentage: number,
    message: string,
    createdBy: string
  ): Promise<boolean> {
    try {
      // Update the job progress percentage
      const { error: jobError } = await supabase
        .from('active_jobs')
        .update({ 
          progress_percentage: progressPercentage,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (jobError) {
        console.error('Error updating job progress:', jobError);
        return false;
      }

      // Add progress entry
      const { error: progressError } = await supabase
        .from('job_progress')
        .insert({
          active_job_id: jobId,
          message,
          progress_percentage: progressPercentage,
          created_by: createdBy
        });

      if (progressError) {
        console.error('Error adding progress entry:', progressError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateJobProgress:', error);
      return false;
    }
  }

  /**
   * Get job progress history
   */
  static async getJobProgress(jobId: string): Promise<JobProgress[]> {
    try {
      const { data, error } = await supabase
        .from('job_progress')
        .select('*')
        .eq('active_job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching job progress:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getJobProgress:', error);
      return [];
    }
  }

  /**
   * Complete a job (service provider marks as complete, buyer needs to confirm)
   */
  static async completeJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('active_jobs')
        .update({
          status: 'completed',
          progress_percentage: 100,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) {
        console.error('Error completing job:', error);
        return false;
      }

      // Track job completion for referral system
      try {
        const { data: jobDetails } = await supabase
          .from('active_jobs')
          .select('service_provider_id')
          .eq('id', jobId)
          .single();
        
        if (jobDetails?.service_provider_id) {
          await referralService.trackJobCompletion(jobDetails.service_provider_id);
        }
      } catch (error) {
        console.error('Error tracking job completion for referrals:', error);
        // Don't fail the entire operation if referral tracking fails
      }

      // Send notification to buyer about job completion
      try {
        // Get job details and user information
        const { data: jobDetails, error: detailsError } = await supabase
          .from('active_jobs')
          .select('buyer_id, service_provider_id, title')
          .eq('id', jobId)
          .single();

        if (!detailsError && jobDetails) {
          // Get service provider profile
          const { data: providerProfile } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', jobDetails.service_provider_id)
            .single();

          const providerName = providerProfile?.full_name || 'Service Provider';
          const providerImage = providerProfile?.avatar_url;

          // Send notification to buyer
          await notificationService.addJobCompletionNotification({
            buyerId: jobDetails.buyer_id,
            serviceProviderName: providerName,
            serviceProviderImage: providerImage,
            serviceTitle: jobDetails.title,
            jobId: jobId,
            hasPhotos: false, // Direct orders don't have photo upload in this flow
            completionMessage: undefined,
          });

          console.log('✅ Direct job completion notification sent to buyer:', jobDetails.buyer_id);
        }
      } catch (error) {
        console.error('Error sending direct job completion notification:', error);
        // Don't fail the entire operation if notification fails
      }

      return true;
    } catch (error) {
      console.error('Error in completeJob:', error);
      return false;
    }
  }

  /**
   * Request revision for a completed direct job
   */
  static async requestRevision(
    jobId: string,
    buyerId: string,
    revisionReason: string,
    revisionDeadline?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First verify this is a completed job that needs buyer confirmation
      const { data: job, error: fetchError } = await supabase
        .from('active_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('buyer_id', buyerId)
        .eq('status', 'completed') // Expecting 'completed' as the status after SP marks it done
        .single();

      if (fetchError || !job) {
        console.error('Error fetching job for revision request:', fetchError);
        return { success: false, error: 'Job not found or not eligible for revision' };
      }

      // Calculate deadline (default 7 days from now)
      const deadline = revisionDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Update job status to revision requested
      const { error: updateError } = await supabase
        .from('active_jobs')
        .update({
          status: 'revision_requested',
          revision_requested_at: new Date().toISOString(),
          revision_request_reason: revisionReason,
          revision_deadline: deadline,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error requesting revision:', updateError);
        return { success: false, error: 'Failed to request revision' };
      }

      // Send notification to service provider about revision request
      try {
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', buyerId)
          .single();

        const buyerName = buyerProfile?.full_name || 'Buyer';
        const buyerImage = buyerProfile?.avatar_url;

        await notificationService.addRevisionRequestNotification({
          serviceProviderId: job.service_provider_id,
          buyerName,
          buyerImage,
          serviceTitle: job.title,
          jobId: jobId,
          revisionReason,
          revisionDeadline: deadline,
        });

        console.log('✅ Direct job revision request notification sent to service provider:', job.service_provider_id);
      } catch (error) {
        console.error('Error sending revision request notification:', error);
      }

      return { success: true };
    } catch (error) {
      console.error('Error in requestRevision:', error);
      return { success: false, error: 'Failed to request revision' };
    }
  }

  /**
   * Confirm job completion (buyer confirms the job is complete)
   */
  static async confirmJobCompletion(
    jobId: string, 
    buyerId: string, 
    rating?: number, 
    feedback?: string
  ): Promise<boolean> {
    try {
      // First verify this is a completed job that needs buyer confirmation
      const { data: job, error: fetchError } = await supabase
        .from('active_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('buyer_id', buyerId)
        .eq('status', 'completed')
        .single();

      if (fetchError || !job) {
        console.error('Error fetching job for confirmation:', fetchError);
        return false;
      }

      // Update job status to confirmed completion
      const { error: updateError } = await supabase
        .from('active_jobs')
        .update({
          status: 'completed_confirmed',
          payment_status: 'released',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error confirming job completion:', updateError);
        return false;
      }

      // Create a review record if rating and feedback are provided
      if (rating && rating > 0) {
        try {
          const { error: reviewError } = await supabase
            .from('reviews')
            .insert({
              reviewer_id: buyerId,
              reviewee_id: job.service_provider_id,
              service_id: null, // For direct orders, there's no specific service_id
              order_id: jobId, // Using the active job id as the order reference
              rating: rating,
              comment: feedback || null,
            });

          if (reviewError) {
            console.error('Error creating review:', reviewError);
            // Don't fail the entire operation if review creation fails
          } else {
            console.log('✅ Review created successfully for job:', jobId);
            
            // Update service provider's overall rating
            await this.updateServiceProviderRating(job.service_provider_id);
          }
        } catch (error) {
          console.error('Error in review creation process:', error);
        }
      }

      // Send notification to service provider about payment release
      try {
        const { data: providerProfile } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('user_id', job.service_provider_id)
          .single();

        const providerName = providerProfile?.full_name || 'Service Provider';
        const providerImage = providerProfile?.avatar_url;

        // Get buyer profile for notification
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', buyerId)
          .single();

        const buyerName = buyerProfile?.full_name || 'Buyer';
        const buyerImage = buyerProfile?.avatar_url;

        await notificationService.addJobCompletionConfirmationNotification({
          serviceProviderId: job.service_provider_id,
          buyerName,
          buyerImage,
          serviceTitle: job.title,
          jobId: jobId,
          rating: rating || 5,
          feedback: feedback || 'Job completed successfully',
        });

        console.log('✅ Direct job completion confirmation notification sent to service provider:', job.service_provider_id);
      } catch (error) {
        console.error('Error sending completion confirmation notification:', error);
      }

      return true;
    } catch (error) {
      console.error('Error in confirmJobCompletion:', error);
      return false;
    }
  }

  /**
   * Service provider acknowledges revision request for direct job
   */
  static async acknowledgeRevision(
    jobId: string,
    serviceProviderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('✅ Acknowledging revision for direct job:', jobId);

      // Get job
      const { data: job, error: jobError } = await supabase
        .from('active_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('service_provider_id', serviceProviderId)
        .single();

      if (jobError || !job) {
        return { success: false, error: 'Job not found' };
      }

      // Check if job is in revision requested state
      if (job.status !== 'revision_requested') {
        return { success: false, error: 'Job is not in revision requested state' };
      }

      // Update job status to revision in progress
      const { error: updateError } = await supabase
        .from('active_jobs')
        .update({
          status: 'revision_in_progress',
          revision_acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error acknowledging revision:', updateError);
        return { success: false, error: 'Failed to acknowledge revision' };
      }

      // Send notification to buyer
      try {
        const { data: providerProfile } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('user_id', serviceProviderId)
          .single();

        const providerName = providerProfile?.full_name || 'Service Provider';
        const providerImage = providerProfile?.avatar_url;

        await notificationService.addRevisionAcknowledgmentNotification({
          buyerId: job.buyer_id,
          serviceProviderName: providerName,
          serviceProviderImage: providerImage,
          serviceTitle: job.title,
          jobId: jobId,
        });

        console.log('✅ Direct job revision acknowledgment notification sent to buyer:', job.buyer_id);
      } catch (error) {
        console.error('Error sending revision acknowledgment notification:', error);
      }

      console.log('✅ Direct job revision acknowledged successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in acknowledgeRevision:', error);
      return { success: false, error: 'Failed to acknowledge revision' };
    }
  }

  /**
   * Service provider disputes revision request for direct job
   */
  static async disputeRevision(
    jobId: string,
    serviceProviderId: string,
    disputeReason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('⚠️ Disputing revision for direct job:', jobId);

      // Get job
      const { data: job, error: jobError } = await supabase
        .from('active_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('service_provider_id', serviceProviderId)
        .single();

      if (jobError || !job) {
        return { success: false, error: 'Job not found' };
      }

      // Check if job is in revision requested state
      if (job.status !== 'revision_requested') {
        return { success: false, error: 'Job is not in revision requested state' };
      }

      // Update job status to disputed
      const { error: updateError } = await supabase
        .from('active_jobs')
        .update({
          status: 'disputed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error disputing revision:', updateError);
        return { success: false, error: 'Failed to dispute revision' };
      }

      // Send notification to buyer
      try {
        const { data: providerProfile } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('user_id', serviceProviderId)
          .single();

        const providerName = providerProfile?.full_name || 'Service Provider';
        const providerImage = providerProfile?.avatar_url;

        await notificationService.addRevisionDisputeNotification({
          buyerId: job.buyer_id,
          serviceProviderName: providerName,
          serviceProviderImage: providerImage,
          serviceTitle: job.title,
          jobId: jobId,
          disputeReason,
        });

        console.log('✅ Direct job revision dispute notification sent to buyer:', job.buyer_id);
      } catch (error) {
        console.error('Error sending revision dispute notification:', error);
      }

      console.log('✅ Direct job revision dispute filed successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in disputeRevision:', error);
      return { success: false, error: 'Failed to dispute revision' };
    }
  }

  /**
   * Confirm a job (service provider confirms they will start working)
   */
  static async confirmJob(jobId: string, serviceProviderId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('active_jobs')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('service_provider_id', serviceProviderId);

      if (error) {
        console.error('Error confirming job:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in confirmJob:', error);
      return false;
    }
  }

  /**
   * Cancel a job
   */
  static async cancelJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('active_jobs')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) {
        console.error('Error cancelling job:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in cancelJob:', error);
      return false;
    }
  }

  /**
   * Update job delivery time (extend job)
   */
  static async updateJobDeliveryTime(jobId: string, additionalDays: number): Promise<ActiveJob | null> {
    try {
      // Get current job
      const currentJob = await this.getActiveJob(jobId);
      if (!currentJob) {
        return null;
      }

      // Parse current delivery time and add additional days
      const currentDeliveryTime = currentJob.delivery_time;
      const currentDays = parseInt(currentDeliveryTime.replace(' days', ''));
      const newDays = currentDays + additionalDays;

      const { data, error } = await supabase
        .from('active_jobs')
        .update({
          delivery_time: `${newDays} days`,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        console.error('Error updating job delivery time:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateJobDeliveryTime:', error);
      return null;
    }
  }

  /**
   * Update service provider's overall rating based on all their reviews
   */
  static async updateServiceProviderRating(serviceProviderId: string): Promise<void> {
    try {
      // Get all reviews for this service provider
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', serviceProviderId);

      if (reviewsError) {
        console.error('Error fetching reviews for rating update:', reviewsError);
        return;
      }

      if (!reviews || reviews.length === 0) {
        console.log('No reviews found for service provider:', serviceProviderId);
        return;
      }

      // Calculate average rating
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      const reviewCount = reviews.length;

      // Update user profile with new rating and review count
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          rating: averageRating,
          review_count: reviewCount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', serviceProviderId);

      if (updateError) {
        console.error('Error updating service provider rating:', updateError);
      } else {
        console.log(`✅ Updated service provider rating: ${averageRating.toFixed(2)} (${reviewCount} reviews)`);
      }
    } catch (error) {
      console.error('Error in updateServiceProviderRating:', error);
    }
  }
}