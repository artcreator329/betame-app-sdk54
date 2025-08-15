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
  // Stats from job_listing_stats table
  total_proposals?: number;
  pending_proposals?: number;
  accepted_proposals?: number;
  rejected_proposals?: number;
  unique_sellers?: number;
  last_proposal_date?: string;
  last_activity_date?: string;
}

export interface JobProposal {
  id?: string;
  job_listing_id: string;
  seller_id: string;
  buyer_id: string;
  
  // Proposal details
  proposed_price?: number;
  proposal_description: string;
  proposed_timeline?: string;
  estimated_hours?: number;
  start_date?: string;
  completion_date?: string;
  work_type?: 'remote' | 'on_site' | 'hybrid';
  experience?: string;
  qualifications?: string;
  
  // Proposal status
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  
  // Response details
  buyer_response?: string;
  buyer_response_date?: string;
  rejection_reason?: string;
  
  // Tracking
  is_read_by_buyer?: boolean;
  is_read_by_seller?: boolean;
  proposal_count?: number;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  
  // Populated data
  seller_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  
  job_listing?: JobListing;
}

export interface JobProposalActivity {
  id?: string;
  job_proposal_id: string;
  job_listing_id: string;
  activity_type: 'proposal_submitted' | 'proposal_updated' | 'proposal_accepted' | 'proposal_rejected' | 'proposal_withdrawn' | 'buyer_message' | 'seller_message' | 'work_started' | 'work_completed' | 'payment_released';
  actor_id: string;
  target_user_id: string;
  activity_description: string;
  metadata?: any;
  is_read?: boolean;
  created_at?: string;
  
  // Populated data
  actor_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
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
   * Get all job listings for a user with proposal stats
   */
  static async getUserJobs(userId: string): Promise<JobListing[]> {
    try {
      // First, get the job listings
      const { data: jobs, error: jobError } = await supabase
        .from('job_listings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (jobError) {
        console.error('Error fetching user jobs:', jobError);
        return [];
      }

      if (!jobs || jobs.length === 0) {
        return [];
      }

      // Get job IDs for stats lookup
      const jobIds = jobs.map(job => job.id);

      // Try to get stats for all jobs in one query
      let stats: any[] = [];
      try {
        const { data: statsData, error: statsError } = await supabase
          .from('job_listing_stats')
          .select('*')
          .in('job_listing_id', jobIds);

        if (statsError) {
          console.error('Job stats table not found or accessible:', statsError.message);
          console.log('ℹ️  This is normal if the job proposals migration hasn\'t been applied yet');
          // Continue without stats rather than failing completely
        } else {
          stats = statsData || [];
        }
      } catch (error) {
        console.error('Error fetching job stats:', error);
        // Continue without stats rather than failing completely
      }

      // Merge jobs with their stats
      return jobs.map(job => {
        const jobStats = stats?.find(stat => stat.job_listing_id === job.id);
        return {
          ...job,
          total_proposals: jobStats?.total_proposals || 0,
          pending_proposals: jobStats?.pending_proposals || 0,
          accepted_proposals: jobStats?.accepted_proposals || 0,
          rejected_proposals: jobStats?.rejected_proposals || 0,
          unique_sellers: jobStats?.unique_sellers || 0,
          last_proposal_date: jobStats?.last_proposal_date,
          last_activity_date: jobStats?.last_activity_date,
        };
      });
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

  /**
   * Submit a job proposal
   */
  static async submitJobProposal(proposalData: Omit<JobProposal, 'id' | 'created_at' | 'updated_at'>): Promise<JobProposal | null> {
    try {
      const { data, error } = await supabase
        .from('job_proposals')
        .insert(proposalData)
        .select()
        .single();

      if (error) {
        console.error('Error submitting job proposal:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in submitJobProposal:', error);
      return null;
    }
  }

  /**
   * Get job proposals for a specific job listing
   */
  static async getJobProposals(jobListingId: string): Promise<JobProposal[]> {
    try {
      const { data, error } = await supabase
        .from('job_proposals')
        .select(`
          *,
          seller_profile:profiles!job_proposals_seller_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('job_listing_id', jobListingId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching job proposals:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getJobProposals:', error);
      return [];
    }
  }

  /**
   * Get proposals submitted by a seller
   */
  static async getSellerProposals(sellerId: string): Promise<JobProposal[]> {
    try {
      const { data, error } = await supabase
        .from('job_proposals')
        .select(`
          *,
          job_listing:job_listings!job_proposals_job_listing_id_fkey (
            id,
            title,
            description,
            cover_photo,
            payment_type,
            budget_amount,
            currency,
            status
          )
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching seller proposals:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSellerProposals:', error);
      return [];
    }
  }

  /**
   * Update proposal status (accept/reject/withdraw)
   */
  static async updateProposalStatus(
    proposalId: string, 
    status: JobProposal['status'], 
    response?: string,
    rejectionReason?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'accepted' || status === 'rejected') {
        updateData.buyer_response = response;
        updateData.buyer_response_date = new Date().toISOString();
        if (status === 'rejected' && rejectionReason) {
          updateData.rejection_reason = rejectionReason;
        }
      }

      const { error } = await supabase
        .from('job_proposals')
        .update(updateData)
        .eq('id', proposalId);

      if (error) {
        console.error('Error updating proposal status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateProposalStatus:', error);
      return false;
    }
  }

  /**
   * Mark proposal as read
   */
  static async markProposalAsRead(proposalId: string, isReadByBuyer: boolean): Promise<boolean> {
    try {
      const updateField = isReadByBuyer ? 'is_read_by_buyer' : 'is_read_by_seller';
      
      const { error } = await supabase
        .from('job_proposals')
        .update({ 
          [updateField]: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId);

      if (error) {
        console.error('Error marking proposal as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markProposalAsRead:', error);
      return false;
    }
  }

  /**
   * Get job activities for a user (buyer notifications)
   */
  static async getJobActivities(userId: string, limit: number = 50): Promise<JobProposalActivity[]> {
    try {
      // First get the activities
      const { data: activities, error: activitiesError } = await supabase
        .from('job_proposal_activities')
        .select('*')
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (activitiesError) {
        console.error('Error fetching job activities:', activitiesError);
        return [];
      }

      if (!activities || activities.length === 0) {
        return [];
      }

      // Get unique actor IDs
      const actorIds = [...new Set(activities.map(a => a.actor_id))];

      // Fetch profiles for all actors
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', actorIds);

      if (profilesError) {
        console.error('Error fetching actor profiles:', profilesError);
        return activities.map(activity => ({ ...activity, actor_profile: null }));
      }

      // Combine activities with profiles
      const activitiesWithProfiles = activities.map(activity => {
        const actorProfile = profiles?.find(p => p.id === activity.actor_id) || null;
        return { ...activity, actor_profile: actorProfile };
      });

      return activitiesWithProfiles;
    } catch (error) {
      console.error('Error in getJobActivities:', error);
      return [];
    }
  }

  /**
   * Mark job activities as read
   */
  static async markActivitiesAsRead(activityIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('job_proposal_activities')
        .update({ is_read: true })
        .in('id', activityIds);

      if (error) {
        console.error('Error marking activities as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markActivitiesAsRead:', error);
      return false;
    }
  }

  /**
   * Get unread activity count for a user
   */
  static async getUnreadActivityCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('job_proposal_activities')
        .select('*', { count: 'exact', head: true })
        .eq('target_user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Job proposal activities table not found or accessible:', error.message);
        console.log('ℹ️  This is normal if the job proposals migration hasn\'t been applied yet');
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadActivityCount:', error);
      return 0;
    }
  }
}