import { supabase } from './supabase';
import { notificationService } from './notification-service';

export interface JobCompletionReminder {
  jobId: string;
  buyerId: string;
  serviceProviderName: string;
  serviceTitle: string;
  completionTime: string;
  reminderSent: boolean;
}

export class JobNotificationScheduler {
  private static instance: JobNotificationScheduler;
  private reminderInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  static getInstance(): JobNotificationScheduler {
    if (!JobNotificationScheduler.instance) {
      JobNotificationScheduler.instance = new JobNotificationScheduler();
    }
    return JobNotificationScheduler.instance;
  }

  /**
   * Start the notification scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🔔 JobNotificationScheduler: Starting notification scheduler');

    // Check for pending reminders every 30 minutes
    this.reminderInterval = setInterval(async () => {
      await this.checkPendingReminders();
    }, 30 * 60 * 1000); // 30 minutes

    // Initial check
    await this.checkPendingReminders();
  }

  /**
   * Stop the notification scheduler
   */
  stop(): void {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
    this.isRunning = false;
    console.log('🔔 JobNotificationScheduler: Stopped notification scheduler');
  }

  /**
   * Check for pending job completion reminders
   */
  private async checkPendingReminders(): Promise<void> {
    try {
      console.log('🔔 JobNotificationScheduler: Checking for pending reminders');

      // Find jobs that were completed more than 12 hours ago but less than 24 hours ago
      // and haven't been confirmed by the buyer
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Check escrow jobs (job_status table) - completed status
      const { data: escrowJobs, error: escrowError } = await supabase
        .from('job_status')
        .select(`
          id,
          buyer_id,
          service_provider_id,
          work_completed_at,
          current_status,
          service_offers(
            services(
              title
            )
          )
        `)
        .eq('current_status', 'completed')
        .gte('work_completed_at', twentyFourHoursAgo)
        .lte('work_completed_at', twelveHoursAgo);

      if (escrowError) {
        console.error('Error fetching escrow jobs for reminders:', escrowError);
      }

      // Check direct jobs (active_jobs table)
      const { data: directJobs, error: directError } = await supabase
        .from('active_jobs')
        .select(`
          id,
          buyer_id,
          service_provider_id,
          completed_at,
          status,
          title
        `)
        .eq('status', 'completed')
        .gte('completed_at', twentyFourHoursAgo)
        .lte('completed_at', twelveHoursAgo);

      if (directError) {
        console.error('Error fetching direct jobs for reminders:', directError);
      }

      // Process escrow job reminders
      if (escrowJobs) {
        for (const job of escrowJobs) {
          await this.sendReminderForEscrowJob(job);
        }
      }

      // Process direct job reminders
      if (directJobs) {
        for (const job of directJobs) {
          await this.sendReminderForDirectJob(job);
        }
      }

      console.log('🔔 JobNotificationScheduler: Reminder check completed');
    } catch (error) {
      console.error('Error in checkPendingReminders:', error);
    }
  }

  /**
   * Send reminder for escrow job completion
   */
  private async sendReminderForEscrowJob(job: any): Promise<void> {
    try {
      // Use work completion time
      const completionTime = new Date(job.work_completed_at);

      const hoursSinceCompletion = (Date.now() - completionTime.getTime()) / (1000 * 60 * 60);
      const hoursRemaining = Math.max(0, 24 - hoursSinceCompletion);

      if (hoursRemaining <= 0) return; // Already past deadline

      // Get service provider name
      const { data: providerProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', job.service_provider_id)
        .single();

      const providerName = providerProfile?.full_name || 'Service Provider';
      const serviceTitle = job.service_offers?.services?.title || 'Service';

      // Send reminder notification
      await notificationService.addJobCompletionReminderNotification({
        buyerId: job.buyer_id,
        serviceProviderName: providerName,
        serviceTitle,
        jobId: job.id,
        hoursRemaining: Math.ceil(hoursRemaining),
      });

      console.log(`🔔 Sent reminder for escrow job ${job.id} to buyer ${job.buyer_id}`);
    } catch (error) {
      console.error('Error sending escrow job reminder:', error);
    }
  }

  /**
   * Send reminder for direct job completion
   */
  private async sendReminderForDirectJob(job: any): Promise<void> {
    try {
      const completionTime = new Date(job.completed_at);
      const hoursSinceCompletion = (Date.now() - completionTime.getTime()) / (1000 * 60 * 60);
      const hoursRemaining = Math.max(0, 24 - hoursSinceCompletion);

      if (hoursRemaining <= 0) return; // Already past deadline

      // Get service provider name
      const { data: providerProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', job.service_provider_id)
        .single();

      const providerName = providerProfile?.full_name || 'Service Provider';

      // Send reminder notification
      await notificationService.addJobCompletionReminderNotification({
        buyerId: job.buyer_id,
        serviceProviderName: providerName,
        serviceTitle: job.title,
        jobId: job.id,
        hoursRemaining: Math.ceil(hoursRemaining),
      });

      console.log(`🔔 Sent reminder for direct job ${job.id} to buyer ${job.buyer_id}`);
    } catch (error) {
      console.error('Error sending direct job reminder:', error);
    }
  }

  /**
   * Schedule a reminder for a specific job
   */
  async scheduleReminder(jobId: string, buyerId: string, serviceProviderName: string, serviceTitle: string): Promise<void> {
    try {
      // Store reminder data (you could use a database table for this in production)
      console.log(`🔔 Scheduled reminder for job ${jobId} to buyer ${buyerId}`);
    } catch (error) {
      console.error('Error scheduling reminder:', error);
    }
  }
}

export const jobNotificationScheduler = JobNotificationScheduler.getInstance();
