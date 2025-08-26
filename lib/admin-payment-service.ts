import { supabase } from './supabase';
import { WalletService } from './wallet-service';
import { PaymentService } from './payment-service';

export interface AdminPaymentReleaseResult {
  success: boolean;
  error?: string;
  serviceProviderPayout?: number;
  platformRevenue?: number;
}

export class AdminPaymentService {
  /**
   * Get all jobs ready for admin payment release
   */
  static async getJobsReadyForPaymentRelease(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('active_jobs')
        .select(`
          *,
          buyer:profiles!active_jobs_buyer_id_fkey(full_name, avatar_url),
          service_provider:profiles!active_jobs_service_provider_id_fkey(full_name, avatar_url)
        `)
        .eq('status', 'payment_release_in_progress')
        .eq('payment_status', 'ready_for_admin_release')
        .eq('escrow_ready_for_release', true)
        .order('buyer_confirmation_at', { ascending: true });

      if (error) {
        console.error('Error fetching jobs ready for payment release:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getJobsReadyForPaymentRelease:', error);
      return [];
    }
  }

  /**
   * Release payment to service provider manually (admin action)
   * Formula: Order Price - 2.2% - 11% = Order Price - 13.2%
   */
  static async releasePaymentToServiceProvider(
    jobId: string,
    adminUserId: string
  ): Promise<AdminPaymentReleaseResult> {
    try {
      console.log('💰 Admin releasing payment for job:', jobId);

      // Get job details
      const { data: job, error: jobError } = await supabase
        .from('active_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('status', 'payment_release_in_progress')
        .eq('payment_status', 'ready_for_admin_release')
        .eq('escrow_ready_for_release', true)
        .single();

      if (jobError || !job) {
        return {
          success: false,
          error: 'Job not found or not ready for payment release'
        };
      }

      // Calculate service provider payout using the formula
      const payoutCalculation = PaymentService.calculateServiceProviderPayout(job.payment_amount);
      const serviceProviderPayout = payoutCalculation.serviceProviderPayout;
      const platformRevenue = job.payment_amount - serviceProviderPayout; // Total platform revenue

      console.log('💰 Payment calculation:', {
        orderPrice: job.payment_amount,
        buyerFee: payoutCalculation.buyerFee,
        platformFee: payoutCalculation.platformFee,
        serviceProviderPayout,
        platformRevenue
      });

      // Release payment to service provider
      const releaseResult = await WalletService.recordServicePaymentReceived(
        job.service_provider_id,
        serviceProviderPayout,
        `${job.title} (after platform fees: ${payoutCalculation.platformFee} RM)`,
        job.id
      );

      if (!releaseResult.success) {
        return {
          success: false,
          error: releaseResult.error || 'Failed to release payment to service provider'
        };
      }

      // Update job status to completed and payment released
      const { error: updateError } = await supabase
        .from('active_jobs')
        .update({
          status: 'completed',
          payment_status: 'released',
          escrow_ready_for_release: false,
          payment_released_at: new Date().toISOString(),
          admin_release_by: adminUserId,
          service_provider_payout: serviceProviderPayout,
          platform_revenue: platformRevenue,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error updating job after payment release:', updateError);
        return {
          success: false,
          error: 'Failed to update job status after payment release'
        };
      }

      // Send notification to service provider about payment release
      try {
        const { notificationService } = await import('./notification-service');
        await notificationService.addNotification({
          type: 'system',
          title: 'Payment Released!',
          message: `Your payment of RM ${serviceProviderPayout.toFixed(2)} has been released for "${job.title}".`,
          data: {
            orderId: jobId,
            serviceTitle: job.title,
            payoutAmount: serviceProviderPayout,
            actionType: 'payment_released'
          }
        }, job.service_provider_id);
      } catch (notificationError) {
        console.error('Error sending payment release notification:', notificationError);
        // Don't fail the payment release if notification fails
      }

      console.log('✅ Payment released successfully to service provider:', {
        jobId,
        serviceProviderId: job.service_provider_id,
        payoutAmount: serviceProviderPayout,
        platformRevenue
      });

      return {
        success: true,
        serviceProviderPayout,
        platformRevenue
      };

    } catch (error) {
      console.error('Error in releasePaymentToServiceProvider:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during payment release'
      };
    }
  }

  /**
   * Get payment release statistics
   */
  static async getPaymentReleaseStats(): Promise<{
    pendingReleases: number;
    totalRevenue: number;
    averagePayout: number;
  }> {
    try {
      // Get pending releases
      const { data: pendingJobs, error: pendingError } = await supabase
        .from('active_jobs')
        .select('payment_amount, platform_fee')
        .eq('status', 'payment_release_in_progress')
        .eq('payment_status', 'ready_for_admin_release')
        .eq('escrow_ready_for_release', true);

      if (pendingError) {
        console.error('Error fetching pending releases:', pendingError);
        return { pendingReleases: 0, totalRevenue: 0, averagePayout: 0 };
      }

      const pendingReleases = pendingJobs?.length || 0;
      let totalRevenue = 0;
      let totalPayout = 0;

      pendingJobs?.forEach(job => {
        const payoutCalculation = PaymentService.calculateServiceProviderPayout(job.payment_amount);
        totalRevenue += job.payment_amount;
        totalPayout += payoutCalculation.serviceProviderPayout;
      });

      const averagePayout = pendingReleases > 0 ? totalPayout / pendingReleases : 0;

      return {
        pendingReleases,
        totalRevenue,
        averagePayout
      };

    } catch (error) {
      console.error('Error in getPaymentReleaseStats:', error);
      return { pendingReleases: 0, totalRevenue: 0, averagePayout: 0 };
    }
  }

  /**
   * Get recent payment releases
   */
  static async getRecentPaymentReleases(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('active_jobs')
        .select(`
          *,
          buyer:profiles!active_jobs_buyer_id_fkey(full_name),
          service_provider:profiles!active_jobs_service_provider_id_fkey(full_name)
        `)
        .eq('payment_status', 'released')
        .not('payment_released_at', 'is', null)
        .order('payment_released_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent payment releases:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecentPaymentReleases:', error);
      return [];
    }
  }
}
