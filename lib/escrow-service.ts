import { supabase, supabaseAdmin } from './supabase';
import { WalletService } from './wallet-service';

export interface EscrowTransaction {
  id?: string;
  service_offer_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  platform_fee: number;
  total_amount: number;
  status: 'held' | 'released' | 'refunded' | 'disputed';
  service_title: string;
  service_description?: string;
  work_start_date?: string;
  work_end_date?: string;
  buyer_confirmation_date?: string;
  seller_completion_date?: string;
  payment_release_date?: string;
  dispute_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobStatus {
  id?: string;
  service_offer_id: string;
  escrow_transaction_id?: string;
  buyer_id: string;
  seller_id: string;
  current_status: 'payment_received' | 'work_in_progress' | 'work_completed' | 'buyer_reviewing' | 'completed' | 'disputed' | 'cancelled';
  work_started_at?: string;
  work_completed_at?: string;
  buyer_review_started_at?: string;
  completion_confirmed_at?: string;
  auto_release_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobMilestone {
  id?: string;
  job_status_id: string;
  milestone_title: string;
  milestone_description?: string;
  is_completed: boolean;
  completed_at?: string;
  completed_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobCommunication {
  id?: string;
  job_status_id: string;
  sender_id: string;
  message_type: 'message' | 'work_update' | 'completion_notice' | 'dispute_raised' | 'system_notification';
  message: string;
  attachments?: any[];
  is_read: boolean;
  created_at?: string;
}

export class EscrowService {
  
  /**
   * Process payment into escrow (buyer pays, platform holds funds)
   */
  static async processPaymentToEscrow(
    serviceOfferId: string,
    buyerId: string,
    sellerId: string,
    amount: number,
    serviceTitle: string,
    serviceDescription?: string,
    workStartDate?: string,
    workEndDate?: string
  ): Promise<{ success: boolean; escrowTransaction?: EscrowTransaction; jobStatus?: JobStatus; error?: string }> {
    try {
      console.log('💰 Processing payment to escrow:', { serviceOfferId, buyerId, sellerId, amount });

      // Calculate platform fee (5% of service amount)
      const platformFee = Math.floor(amount * 0.05);
      const totalAmount = amount + platformFee;

      // Check if buyer has sufficient credits
      const buyerWallet = await WalletService.getWallet(buyerId);
      if (!buyerWallet || buyerWallet.betame_credits < totalAmount) {
        return { 
          success: false, 
          error: `Insufficient credits. Need ${totalAmount} credits (${amount} + ${platformFee} platform fee), have ${buyerWallet?.betame_credits || 0}` 
        };
      }

      // Deduct credits from buyer's wallet
      const paymentResult = await WalletService.processServicePayment(buyerId, totalAmount, serviceTitle, serviceOfferId);
      if (!paymentResult.success) {
        return { success: false, error: paymentResult.error };
      }

      // Create escrow transaction using admin client
      const escrowTransaction: EscrowTransaction = {
        service_offer_id: serviceOfferId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount: amount,
        platform_fee: platformFee,
        total_amount: totalAmount,
        status: 'held',
        service_title: serviceTitle,
        service_description: serviceDescription,
        work_start_date: workStartDate,
        work_end_date: workEndDate,
      };

      const { data: escrowData, error: escrowError } = await supabaseAdmin
        .from('escrow_transactions')
        .insert([escrowTransaction])
        .select()
        .single();

      if (escrowError) {
        console.error('Error creating escrow transaction:', escrowError);
        // Refund buyer if escrow creation fails
        await WalletService.recordServicePaymentReceived(buyerId, totalAmount, `Refund for failed escrow: ${serviceTitle}`);
        return { success: false, error: 'Failed to create escrow transaction' };
      }

      // Check if job status already exists for this service offer
      const { data: existingJobStatus } = await supabaseAdmin
        .from('job_status')
        .select('*')
        .eq('service_offer_id', serviceOfferId)
        .single();

      let jobStatusData;

      if (existingJobStatus) {
        // Update existing job status
        console.log('📝 Updating existing job status for service offer:', serviceOfferId);
        const { data: updatedJobStatus, error: updateError } = await supabaseAdmin
          .from('job_status')
          .update({
            escrow_transaction_id: escrowData.id,
            current_status: 'payment_received',
            auto_release_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            updated_at: new Date().toISOString()
          })
          .eq('service_offer_id', serviceOfferId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating job status:', updateError);
          return { success: false, error: 'Failed to update job status' };
        }
        jobStatusData = updatedJobStatus;
      } else {
        // Create new job status tracking
        console.log('🆕 Creating new job status for service offer:', serviceOfferId);
        const jobStatus: JobStatus = {
          service_offer_id: serviceOfferId,
          escrow_transaction_id: escrowData.id,
          buyer_id: buyerId,
          seller_id: sellerId,
          current_status: 'payment_received',
          auto_release_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        };

        const { data: newJobStatus, error: jobStatusError } = await supabaseAdmin
          .from('job_status')
          .insert([jobStatus])
          .select()
          .single();

        if (jobStatusError) {
          console.error('Error creating job status:', jobStatusError);
          return { success: false, error: 'Failed to create job status' };
        }
        jobStatusData = newJobStatus;
      }

      // Update platform wallet
      await this.updatePlatformWallet(totalAmount, platformFee);

      // Send notification to seller
      await this.sendJobNotification(
        jobStatusData.id,
        'system_notification',
        `New job received! Payment of ${amount} credits is held in escrow. Start working to begin earning.`,
        buyerId
      );

      console.log('✅ Payment processed to escrow successfully');
      return { 
        success: true, 
        escrowTransaction: escrowData, 
        jobStatus: jobStatusData 
      };

    } catch (error) {
      console.error('Error in processPaymentToEscrow:', error);
      return { success: false, error: 'Payment processing failed' };
    }
  }

  /**
   * Seller marks work as started
   */
  static async startWork(jobStatusId: string, sellerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('job_status')
        .update({
          current_status: 'work_in_progress',
          work_started_at: new Date().toISOString(),
        })
        .eq('id', jobStatusId)
        .eq('seller_id', sellerId)
        .select()
        .single();

      if (error) {
        console.error('Error starting work:', error);
        return { success: false, error: 'Failed to update job status' };
      }

      // Notify buyer
      await this.sendJobNotification(
        jobStatusId,
        'work_update',
        'Work has started on your service request!',
        sellerId
      );

      return { success: true };
    } catch (error) {
      console.error('Error in startWork:', error);
      return { success: false, error: 'Failed to start work' };
    }
  }

  /**
   * Seller marks work as completed
   */
  static async completeWork(jobStatusId: string, sellerId: string, completionNotes?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('job_status')
        .update({
          current_status: 'work_completed',
          work_completed_at: new Date().toISOString(),
          notes: completionNotes,
        })
        .eq('id', jobStatusId)
        .eq('seller_id', sellerId)
        .select()
        .single();

      if (error) {
        console.error('Error completing work:', error);
        return { success: false, error: 'Failed to update job status' };
      }

      // Update to buyer reviewing status
      await supabase
        .from('job_status')
        .update({
          current_status: 'buyer_reviewing',
          buyer_review_started_at: new Date().toISOString(),
        })
        .eq('id', jobStatusId);

      // Notify buyer
      await this.sendJobNotification(
        jobStatusId,
        'completion_notice',
        'Work has been completed! Please review and confirm to release payment.',
        sellerId
      );

      return { success: true };
    } catch (error) {
      console.error('Error in completeWork:', error);
      return { success: false, error: 'Failed to complete work' };
    }
  }

  /**
   * Buyer confirms completion and releases payment
   */
  static async confirmCompletionAndReleasePayment(
    jobStatusId: string, 
    buyerId: string, 
    rating?: number,
    feedback?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💰 Releasing payment for job:', jobStatusId);

      // Get job status and escrow transaction
      const { data: jobStatus, error: jobError } = await supabase
        .from('job_status')
        .select(`
          *,
          escrow_transactions!inner(*)
        `)
        .eq('id', jobStatusId)
        .eq('buyer_id', buyerId)
        .single();

      if (jobError || !jobStatus) {
        return { success: false, error: 'Job not found' };
      }

      const escrowTransaction = (jobStatus as any).escrow_transactions;

      // Update job status to completed
      await supabaseAdmin
        .from('job_status')
        .update({
          current_status: 'completed',
          completion_confirmed_at: new Date().toISOString(),
        })
        .eq('id', jobStatusId);

      // Update escrow transaction to released
      await supabaseAdmin
        .from('escrow_transactions')
        .update({
          status: 'released',
          payment_release_date: new Date().toISOString(),
          buyer_confirmation_date: new Date().toISOString(),
        })
        .eq('id', escrowTransaction.id);

      // Release payment to seller
      const releaseResult = await WalletService.recordServicePaymentReceived(
        escrowTransaction.seller_id,
        escrowTransaction.amount,
        escrowTransaction.service_title,
        escrowTransaction.service_offer_id
      );

      if (!releaseResult.success) {
        return { success: false, error: 'Failed to release payment to seller' };
      }

      // Update platform wallet (remove from escrow)
      await this.updatePlatformWalletRelease(escrowTransaction.total_amount);

      // Notify seller
      await this.sendJobNotification(
        jobStatusId,
        'system_notification',
        `Payment of ${escrowTransaction.amount} credits has been released to your wallet!`,
        buyerId
      );

      console.log('✅ Payment released to seller successfully');
      return { success: true };

    } catch (error) {
      console.error('Error in confirmCompletionAndReleasePayment:', error);
      return { success: false, error: 'Failed to release payment' };
    }
  }

  /**
   * Get jobs for seller (their active work)
   */
  static async getSellerJobs(sellerId: string): Promise<JobStatus[]> {
    try {
      const { data, error } = await supabase
        .from('job_status')
        .select(`
          *,
          escrow_transactions!inner(*)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching seller jobs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSellerJobs:', error);
      return [];
    }
  }

  /**
   * Get jobs for buyer (their purchases)
   */
  static async getBuyerJobs(buyerId: string): Promise<JobStatus[]> {
    try {
      const { data, error } = await supabase
        .from('job_status')
        .select(`
          *,
          escrow_transactions!inner(*)
        `)
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching buyer jobs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBuyerJobs:', error);
      return [];
    }
  }

  /**
   * Send job-related notification/message
   */
  static async sendJobNotification(
    jobStatusId: string,
    messageType: JobCommunication['message_type'],
    message: string,
    senderId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('job_communications')
        .insert([{
          job_status_id: jobStatusId,
          sender_id: senderId,
          message_type: messageType,
          message: message,
          is_read: false,
        }]);

      if (error) {
        console.error('Error sending job notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in sendJobNotification:', error);
      return false;
    }
  }

  /**
   * Update platform wallet when payment is escrowed
   */
  private static async updatePlatformWallet(totalAmount: number, platformFee: number): Promise<void> {
    try {
      // Get current platform wallet data
      const { data: platformWallet } = await supabaseAdmin
        .from('platform_wallet')
        .select('*')
        .limit(1)
        .single();

      if (platformWallet) {
        // Update with calculated values
        await supabaseAdmin
          .from('platform_wallet')
          .update({
            total_escrowed_credits: (platformWallet.total_escrowed_credits || 0) + totalAmount,
            total_platform_fees: (platformWallet.total_platform_fees || 0) + platformFee,
            updated_at: new Date().toISOString()
          })
          .eq('id', platformWallet.id);
      } else {
        // Create initial platform wallet if it doesn't exist
        await supabaseAdmin
          .from('platform_wallet')
          .insert({
            total_escrowed_credits: totalAmount,
            total_platform_fees: platformFee,
          });
      }
    } catch (error) {
      console.error('Error updating platform wallet:', error);
    }
  }

  /**
   * Update platform wallet when payment is released
   */
  private static async updatePlatformWalletRelease(totalAmount: number): Promise<void> {
    try {
      // Get current platform wallet data
      const { data: platformWallet } = await supabaseAdmin
        .from('platform_wallet')
        .select('*')
        .limit(1)
        .single();

      if (platformWallet) {
        // Update with calculated values
        await supabaseAdmin
          .from('platform_wallet')
          .update({
            total_escrowed_credits: Math.max(0, (platformWallet.total_escrowed_credits || 0) - totalAmount),
            total_released_today: (platformWallet.total_released_today || 0) + totalAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', platformWallet.id);
      }
    } catch (error) {
      console.error('Error updating platform wallet release:', error);
    }
  }
}