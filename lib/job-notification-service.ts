import { supabase } from './supabase';
import { JobService, JobProposal, JobProposalActivity } from './job-service';

export interface JobNotificationPayload {
  userId: string;
  type: 'job_proposal_received' | 'proposal_status_changed' | 'job_activity_update';
  title: string;
  body: string;
  data: {
    jobId?: string;
    proposalId?: string;
    activityId?: string;
    activityType?: string;
  };
}

export class JobNotificationService {
  private static instance: JobNotificationService;

  public static getInstance(): JobNotificationService {
    if (!JobNotificationService.instance) {
      JobNotificationService.instance = new JobNotificationService();
    }
    return JobNotificationService.instance;
  }

  /**
   * Subscribe to job proposal notifications for a user
   */
  async subscribeToJobProposalUpdates(
    userId: string,
    onUpdate: (activity: JobProposalActivity) => void
  ): Promise<() => void> {
    const subscription = supabase
      .channel(`job_proposals_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_proposal_activities',
          filter: `target_user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('Job proposal activity received:', payload);
          
          // Fetch the complete activity data with related information
          try {
            const { data, error } = await supabase
              .from('job_proposal_activities')
              .select(`
                *,
                actor_profile:profiles!job_proposal_activities_actor_id_fkey (
                  id,
                  full_name,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (!error && data) {
              onUpdate(data);
            }
          } catch (error) {
            console.error('Error fetching activity details:', error);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Subscribe to job proposal status changes for sellers
   */
  async subscribeToProposalStatusUpdates(
    sellerId: string,
    onUpdate: (proposal: JobProposal) => void
  ): Promise<() => void> {
    const subscription = supabase
      .channel(`proposal_status_${sellerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'job_proposals',
          filter: `seller_id=eq.${sellerId}`
        },
        async (payload) => {
          console.log('Proposal status updated:', payload);
          
          // Fetch the complete proposal data
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
              .eq('id', payload.new.id)
              .single();

            if (!error && data) {
              onUpdate(data);
            }
          } catch (error) {
            console.error('Error fetching proposal details:', error);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Subscribe to job listing stats updates for buyers
   */
  async subscribeToJobListingUpdates(
    buyerId: string,
    onUpdate: (jobId: string, stats: any) => void
  ): Promise<() => void> {
    const subscription = supabase
      .channel(`job_stats_${buyerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_listing_stats'
        },
        async (payload) => {
          console.log('Job listing stats updated:', payload);
          
          // Check if this job belongs to the buyer
          try {
            const { data: jobData, error } = await supabase
              .from('job_listings')
              .select('id, user_id')
              .eq('id', payload.new.job_listing_id)
              .eq('user_id', buyerId)
              .single();

            if (!error && jobData) {
              onUpdate(jobData.id, payload.new);
            }
          } catch (error) {
            console.error('Error checking job ownership:', error);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Send push notification for job proposal
   */
  async sendJobProposalNotification(payload: JobNotificationPayload): Promise<boolean> {
    try {
      // Here you would integrate with your push notification service
      // For example, Expo notifications, Firebase, etc.
      console.log('Would send notification:', payload);
      
      // For now, we'll just log the notification
      // In a real implementation, you would call your notification service
      return true;
    } catch (error) {
      console.error('Error sending job proposal notification:', error);
      return false;
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getNotificationPreferences(userId: string): Promise<{
    jobProposals: boolean;
    proposalStatusUpdates: boolean;
    jobMessages: boolean;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // Return default preferences
        return {
          jobProposals: true,
          proposalStatusUpdates: true,
          jobMessages: true,
        };
      }

      return {
        jobProposals: data.job_proposals ?? true,
        proposalStatusUpdates: data.proposal_status_updates ?? true,
        jobMessages: data.job_messages ?? true,
      };
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return {
        jobProposals: true,
        proposalStatusUpdates: true,
        jobMessages: true,
      };
    }
  }

  /**
   * Update notification preferences for a user
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: {
      jobProposals?: boolean;
      proposalStatusUpdates?: boolean;
      jobMessages?: boolean;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          job_proposals: preferences.jobProposals,
          proposal_status_updates: preferences.proposalStatusUpdates,
          job_messages: preferences.jobMessages,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error updating notification preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateNotificationPreferences:', error);
      return false;
    }
  }

  /**
   * Helper method to create activity descriptions
   */
  createActivityDescription(
    activityType: string,
    actorName: string,
    jobTitle?: string,
    proposedPrice?: number,
    currency?: string
  ): string {
    switch (activityType) {
      case 'proposal_submitted':
        return `${actorName} submitted a proposal${proposedPrice ? ` for ${currency}${proposedPrice}` : ''} for "${jobTitle}"`;
      case 'proposal_updated':
        return `${actorName} updated their proposal for "${jobTitle}"`;
      case 'proposal_accepted':
        return `Your proposal for "${jobTitle}" has been accepted!`;
      case 'proposal_rejected':
        return `Your proposal for "${jobTitle}" was not selected`;
      case 'proposal_withdrawn':
        return `${actorName} withdrew their proposal for "${jobTitle}"`;
      case 'buyer_message':
        return `${actorName} sent you a message about "${jobTitle}"`;
      case 'seller_message':
        return `${actorName} sent you a message about their proposal`;
      case 'work_started':
        return `Work has started on "${jobTitle}"`;
      case 'work_completed':
        return `${actorName} completed work for "${jobTitle}"`;
      case 'payment_released':
        return `Payment has been released for "${jobTitle}"`;
      default:
        return `New activity from ${actorName}`;
    }
  }
}
