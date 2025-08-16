import { supabase } from './supabase';
import { ServiceOffer, ServiceOfferData } from '../types/chat';

export interface ActiveJob {
  id?: string;
  buyer_id: string;
  service_provider_id: string;
  service_offer_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  delivery_time: string;
  status: 'in_progress' | 'completed' | 'cancelled' | 'disputed';
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
        status: 'in_progress' as const,
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
          .in('status', ['in_progress', 'completed'])
          .order('created_at', { ascending: false }),
        supabase
          .from('active_jobs')
          .select('*')
          .eq('service_provider_id', userId)
          .in('status', ['in_progress', 'completed'])
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

      return true;
    } catch (error) {
      console.error('Error in completeJob:', error);
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