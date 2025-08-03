import { supabase } from './supabase';

export interface JobListing {
  id?: string;
  user_id: string;
  title: string;
  description: string;
  cover_photo?: string;
  payment_type: 'fixed' | 'hourly' | 'daily' | 'negotiable';
  budget_amount?: string;
  currency: string;
  location_address?: string;
  location_latitude?: number;
  location_longitude?: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export class JobService {
  /**
   * Create a new job listing
   */
  static async createJob(jobData: Omit<JobListing, 'id' | 'created_at' | 'updated_at'>): Promise<JobListing | null> {
    try {
      const { data, error } = await supabase
        .from('job_listings')
        .insert({
          ...jobData,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating job:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createJob:', error);
      return null;
    }
  }

  /**
   * Get all job listings for a user
   */
  static async getUserJobs(userId: string): Promise<JobListing[]> {
    try {
      const { data, error } = await supabase
        .from('job_listings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user jobs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserJobs:', error);
      return [];
    }
  }

  /**
   * Get a specific job listing
   */
  static async getJob(jobId: string): Promise<JobListing | null> {
    try {
      const { data, error } = await supabase
        .from('job_listings')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error fetching job:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getJob:', error);
      return null;
    }
  }

  /**
   * Update a job listing
   */
  static async updateJob(jobId: string, updates: Partial<JobListing>): Promise<JobListing | null> {
    try {
      const { data, error } = await supabase
        .from('job_listings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        console.error('Error updating job:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateJob:', error);
      return null;
    }
  }

  /**
   * Delete a job listing
   */
  static async deleteJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('job_listings')
        .delete()
        .eq('id', jobId);

      if (error) {
        console.error('Error deleting job:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteJob:', error);
      return false;
    }
  }

  /**
   * Get all active job listings (for browsing)
   */
  static async getAllActiveJobs(): Promise<JobListing[]> {
    try {
      const { data, error } = await supabase
        .from('job_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active jobs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllActiveJobs:', error);
      return [];
    }
  }

  /**
   * Update job status
   */
  static async updateJobStatus(jobId: string, status: JobListing['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('job_listings')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (error) {
        console.error('Error updating job status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateJobStatus:', error);
      return false;
    }
  }
}