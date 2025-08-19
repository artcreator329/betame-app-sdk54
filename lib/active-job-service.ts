import { supabase } from './supabase';
import { ServiceOffer, ServiceOfferData } from '../types/chat';
import { DirectOrderData } from './payment-service';
import { notificationService } from './notification-service';

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
  status: 'pending_confirmation' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  progress_percentage: number;
  payment_status: 'pending' | 'paid' | 'released' | 'refunded';
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
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
      // Get buyer profile for notification
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', buyerId)
        .single();

      const buyerName = buyerProfile?.full_name || 'A customer';
      const buyerImage = buyerProfile?.avatar_url || '';

      // Import notification service dynamically to avoid circular dependencies
      const { notificationService } = await import('./notification-service');
      
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

      console.log('✅ Order notification sent to service provider:', serviceProviderId);
    } catch (error) {
      console.error('Error notifying service provider:', error);
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
          .in('status', ['pending_confirmation', 'in_progress', 'completed'])
          .order('created_at', { ascending: false }),
        supabase
          .from('active_jobs')
          .select('*')
          .eq('service_provider_id', userId)
          .in('status', ['pending_confirmation', 'in_progress', 'completed'])
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
   * Complete a job
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
}