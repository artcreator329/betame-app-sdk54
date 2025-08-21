import { supabase, supabaseAdmin } from './supabase';
import { WalletService } from './wallet-service';
import { notificationService } from './notification-service';
import { FeeService } from './fee-service';

export interface EscrowTransaction {
  id?: string;
  service_offer_id: string;
  buyer_id: string;
  service_provider_id: string;
  seller_id?: string; // Keep for backward compatibility
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
  service_provider_id: string;
  seller_id?: string; // Keep for backward compatibility
  current_status: 'payment_received' | 'acknowledgment_pending' | 'work_in_progress' | 'work_completed' | 'buyer_reviewing' | 'revision_requested' | 'revision_in_progress' | 'revision_completed' | 'completed' | 'disputed' | 'cancelled';
  work_started_at?: string;
  work_completed_at?: string;
  buyer_review_started_at?: string;
  completion_confirmed_at?: string;
  acknowledgment_date?: string;
  scheduled_start_date?: string;
  auto_release_date?: string;
  notes?: string;
  revision_requested_at?: string;
  revision_request_reason?: string;
  revision_deadline?: string;
  revision_acknowledged_at?: string;
  revision_completed_at?: string;
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
  message_type: 'message' | 'work_update' | 'completion_notice' | 'dispute_raised' | 'system_notification' | 'revision_request' | 'revision_acknowledged' | 'revision_disputed' | 'revision_completed';
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

      // Use new fee calculation service
      const feeCalculation = FeeService.calculateFees(amount);
      const buyerTotal = feeCalculation.buyerTotal;
      const sellerPlatformFee = feeCalculation.platformFee;

      // Check if buyer has sufficient BetaCoins (including buyer processing fee)
      const buyerWallet = await WalletService.getWallet(buyerId);
      if (!buyerWallet || buyerWallet.betame_betacoins < buyerTotal) {
        return { 
          success: false, 
          error: `Insufficient BetaCoins. Need ${buyerTotal} BetaCoins (${amount} service + ${feeCalculation.buyerFee} processing fee), have ${buyerWallet?.betame_betacoins || 0}` 
        };
      }

      // Deduct total amount (service + buyer processing fee) from buyer's wallet
      const paymentResult = await WalletService.processServicePayment(buyerId, buyerTotal, serviceTitle, serviceOfferId);
      if (!paymentResult.success) {
        return { success: false, error: paymentResult.error };
      }

      // Create escrow transaction using admin client
      const escrowTransaction: EscrowTransaction = {
        service_offer_id: serviceOfferId,
        buyer_id: buyerId,
        service_provider_id: sellerId,
        seller_id: sellerId, // Keep for backward compatibility
        amount: amount,
        platform_fee: sellerPlatformFee,
        total_amount: buyerTotal,
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
        await WalletService.recordServicePaymentReceived(buyerId, buyerTotal, `Refund for failed escrow: ${serviceTitle}`);
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
            current_status: 'acknowledgment_pending',
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
          service_provider_id: sellerId,
          seller_id: sellerId, // Keep for backward compatibility
          current_status: 'acknowledgment_pending',
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
      await this.updatePlatformWallet(buyerTotal, sellerPlatformFee);

      // Send notification to seller
      await this.sendJobNotification(
        jobStatusData.id,
        'system_notification',
        `New job received! Payment of ${amount} BetaCoins is held in escrow. Please acknowledge the order to begin.`,
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
   * Seller acknowledges the offer acceptance and chooses to start now or later
   */
  static async acknowledgeOfferAcceptance(
    jobStatusId: string, 
    sellerId: string, 
    startNow: boolean,
    scheduledStartDate?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('✅ Seller acknowledging offer acceptance:', { jobStatusId, sellerId, startNow, scheduledStartDate });

      const updateData: any = {
        current_status: startNow ? 'work_in_progress' : 'acknowledgment_pending',
        acknowledgment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (startNow) {
        updateData.work_started_at = new Date().toISOString();
      } else if (scheduledStartDate) {
        updateData.scheduled_start_date = scheduledStartDate;
      }

      const { data, error } = await supabase
        .from('job_status')
        .update(updateData)
        .eq('id', jobStatusId)
        .eq('service_provider_id', sellerId)
        .select()
        .single();

      if (error) {
        console.error('Error acknowledging offer acceptance:', error);
        return { success: false, error: 'Failed to acknowledge offer acceptance' };
      }

      // Notify buyer
      const message = startNow 
        ? 'Seller has acknowledged and started working on your service request!'
        : `Seller has acknowledged your order and scheduled to start on ${new Date(scheduledStartDate!).toLocaleDateString()}`;

      await this.sendJobNotification(
        jobStatusId,
        'system_notification',
        message,
        sellerId
      );

      return { success: true };
    } catch (error) {
      console.error('Error in acknowledgeOfferAcceptance:', error);
      return { success: false, error: 'Failed to acknowledge offer acceptance' };
    }
  }

  /**
   * Seller starts work on a scheduled job
   */
  static async startScheduledWork(jobStatusId: string, sellerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('job_status')
        .update({
          current_status: 'work_in_progress',
          work_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobStatusId)
        .eq('service_provider_id', sellerId)
        .select()
        .single();

      if (error) {
        console.error('Error starting scheduled work:', error);
        return { success: false, error: 'Failed to start scheduled work' };
      }

      // Notify buyer
      await this.sendJobNotification(
        jobStatusId,
        'work_update',
        'Scheduled work has started on your service request!',
        sellerId
      );

      return { success: true };
    } catch (error) {
      console.error('Error in startScheduledWork:', error);
      return { success: false, error: 'Failed to start scheduled work' };
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
        .eq('service_provider_id', sellerId)
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
        .eq('service_provider_id', sellerId)
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

      // Notify buyer with enhanced notification
      try {
        // Get buyer and service provider information
        const { data: jobDetails, error: detailsError } = await supabase
          .from('job_status')
          .select(`
            buyer_id,
            service_provider_id,
            service_offers!inner(
              service_title,
              services!inner(
                title
              )
            )
          `)
          .eq('id', jobStatusId)
          .single();

        if (!detailsError && jobDetails) {
          const serviceOffer = Array.isArray(jobDetails.service_offers) ? jobDetails.service_offers[0] : jobDetails.service_offers;
          const services = Array.isArray(serviceOffer?.services) ? serviceOffer.services[0] : serviceOffer?.services;
          const serviceTitle = serviceOffer?.service_title || services?.title || 'Service';
          
          // Get service provider profile
          const { data: providerProfile } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', sellerId)
            .single();

          const providerName = providerProfile?.full_name || 'Service Provider';
          const providerImage = providerProfile?.avatar_url;

          // Send enhanced notification to buyer
          await notificationService.addJobCompletionNotification({
            buyerId: jobDetails.buyer_id,
            serviceProviderName: providerName,
            serviceProviderImage: providerImage,
            serviceTitle,
            jobId: jobStatusId,
            hasPhotos: false, // Escrow service doesn't handle photos directly
            completionMessage: completionNotes || undefined,
          });

          console.log('✅ Enhanced job completion notification sent to buyer:', jobDetails.buyer_id);
        }
      } catch (error) {
        console.error('Error sending enhanced job completion notification:', error);
        // Fallback to original notification method
        await this.sendJobNotification(
          jobStatusId,
          'completion_notice',
          'Work has been completed! Please review and confirm to release payment.',
          sellerId
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error in completeWork:', error);
      return { success: false, error: 'Failed to complete work' };
    }
  }

  /**
   * Buyer requests revision/improvement for completed work
   */
  static async requestRevision(
    jobStatusId: string,
    buyerId: string,
    revisionReason: string,
    revisionDeadline?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔧 Requesting revision for job:', jobStatusId);

      // Get job status
      const { data: jobStatus, error: jobError } = await supabase
        .from('job_status')
        .select('*')
        .eq('id', jobStatusId)
        .eq('buyer_id', buyerId)
        .single();

      if (jobError || !jobStatus) {
        return { success: false, error: 'Job not found' };
      }

      // Check if job is in reviewable state
      if (jobStatus.current_status !== 'buyer_reviewing') {
        return { success: false, error: 'Job is not in reviewable state' };
      }

      // Set default deadline to 7 days if not provided
      const deadline = revisionDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Update job status to revision requested
      await supabaseAdmin
        .from('job_status')
        .update({
          current_status: 'revision_requested',
          revision_requested_at: new Date().toISOString(),
          revision_request_reason: revisionReason,
          revision_deadline: deadline,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobStatusId);

      // Send enhanced notification to service provider
      try {
        // Get buyer and service provider information
        const { data: jobDetails, error: detailsError } = await supabase
          .from('job_status')
          .select(`
            buyer_id,
            service_provider_id,
            service_offers!inner(
              service_title,
              services!inner(
                title
              )
            )
          `)
          .eq('id', jobStatusId)
          .single();

        if (!detailsError && jobDetails) {
          const serviceOffer = Array.isArray(jobDetails.service_offers) ? jobDetails.service_offers[0] : jobDetails.service_offers;
          const services = Array.isArray(serviceOffer?.services) ? serviceOffer.services[0] : serviceOffer?.services;
          const serviceTitle = serviceOffer?.service_title || services?.title || 'Service';
          
          // Get buyer profile
          const { data: buyerProfile } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', buyerId)
            .single();

          const buyerName = buyerProfile?.full_name || 'Buyer';
          const buyerImage = buyerProfile?.avatar_url;

          // Send enhanced notification to service provider
          await notificationService.addRevisionRequestNotification({
            serviceProviderId: jobDetails.service_provider_id,
            buyerName,
            buyerImage,
            serviceTitle,
            jobId: jobStatusId,
            revisionReason,
            revisionDeadline: deadline,
          });

          console.log('✅ Enhanced revision request notification sent to service provider:', jobDetails.service_provider_id);
        }
      } catch (error) {
        console.error('Error sending enhanced revision request notification:', error);
        // Fallback to original notification method
        await this.sendJobNotification(
          jobStatusId,
          'revision_request',
          `Revision requested: ${revisionReason}`,
          buyerId
        );
      }

      console.log('✅ Revision requested successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in requestRevision:', error);
      return { success: false, error: 'Failed to request revision' };
    }
  }

  /**
   * Service provider acknowledges revision request
   */
  static async acknowledgeRevision(
    jobStatusId: string,
    serviceProviderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('✅ Acknowledging revision for job:', jobStatusId);

      // Get job status
      const { data: jobStatus, error: jobError } = await supabase
        .from('job_status')
        .select('*')
        .eq('id', jobStatusId)
        .eq('service_provider_id', serviceProviderId)
        .single();

      if (jobError || !jobStatus) {
        return { success: false, error: 'Job not found' };
      }

      // Check if job is in revision requested state
      if (jobStatus.current_status !== 'revision_requested') {
        return { success: false, error: 'Job is not in revision requested state' };
      }

      // Update job status to revision in progress
      await supabaseAdmin
        .from('job_status')
        .update({
          current_status: 'revision_in_progress',
          revision_acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobStatusId);

      // Send enhanced notification to buyer
      try {
        // Get buyer and service provider information
        const { data: jobDetails, error: detailsError } = await supabase
          .from('job_status')
          .select(`
            buyer_id,
            service_provider_id,
            service_offers!inner(
              service_title,
              services!inner(
                title
              )
            )
          `)
          .eq('id', jobStatusId)
          .single();

        if (!detailsError && jobDetails) {
          const serviceOffer = Array.isArray(jobDetails.service_offers) ? jobDetails.service_offers[0] : jobDetails.service_offers;
          const services = Array.isArray(serviceOffer?.services) ? serviceOffer.services[0] : serviceOffer?.services;
          const serviceTitle = serviceOffer?.service_title || services?.title || 'Service';
          
          // Get service provider profile
          const { data: providerProfile } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', serviceProviderId)
            .single();

          const providerName = providerProfile?.full_name || 'Service Provider';
          const providerImage = providerProfile?.avatar_url;

          // Send enhanced notification to buyer
          await notificationService.addRevisionAcknowledgmentNotification({
            buyerId: jobDetails.buyer_id,
            serviceProviderName: providerName,
            serviceProviderImage: providerImage,
            serviceTitle,
            jobId: jobStatusId,
          });

          console.log('✅ Enhanced revision acknowledgment notification sent to buyer:', jobDetails.buyer_id);
        }
      } catch (error) {
        console.error('Error sending enhanced revision acknowledgment notification:', error);
        // Fallback to original notification method
        await this.sendJobNotification(
          jobStatusId,
          'revision_acknowledged',
          'Service provider has acknowledged the revision request and will work on improvements.',
          serviceProviderId
        );
      }

      console.log('✅ Revision acknowledged successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in acknowledgeRevision:', error);
      return { success: false, error: 'Failed to acknowledge revision' };
    }
  }

  /**
   * Service provider disputes revision request
   */
  static async disputeRevision(
    jobStatusId: string,
    serviceProviderId: string,
    disputeReason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('⚠️ Disputing revision for job:', jobStatusId);

      // Get job status
      const { data: jobStatus, error: jobError } = await supabase
        .from('job_status')
        .select('*')
        .eq('id', jobStatusId)
        .eq('service_provider_id', serviceProviderId)
        .single();

      if (jobError || !jobStatus) {
        return { success: false, error: 'Job not found' };
      }

      // Check if job is in revision requested state
      if (jobStatus.current_status !== 'revision_requested') {
        return { success: false, error: 'Job is not in revision requested state' };
      }

      // Update job status to disputed
      await supabaseAdmin
        .from('job_status')
        .update({
          current_status: 'disputed',
          notes: `Revision dispute: ${disputeReason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobStatusId);

      // Send enhanced notification to buyer
      try {
        // Get buyer and service provider information
        const { data: jobDetails, error: detailsError } = await supabase
          .from('job_status')
          .select(`
            buyer_id,
            service_provider_id,
            service_offers!inner(
              service_title,
              services!inner(
                title
              )
            )
          `)
          .eq('id', jobStatusId)
          .single();

        if (!detailsError && jobDetails) {
          const serviceOffer = Array.isArray(jobDetails.service_offers) ? jobDetails.service_offers[0] : jobDetails.service_offers;
          const services = Array.isArray(serviceOffer?.services) ? serviceOffer.services[0] : serviceOffer?.services;
          const serviceTitle = serviceOffer?.service_title || services?.title || 'Service';
          
          // Get service provider profile
          const { data: providerProfile } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', serviceProviderId)
            .single();

          const providerName = providerProfile?.full_name || 'Service Provider';
          const providerImage = providerProfile?.avatar_url;

          // Send enhanced notification to buyer
          await notificationService.addRevisionDisputeNotification({
            buyerId: jobDetails.buyer_id,
            serviceProviderName: providerName,
            serviceProviderImage: providerImage,
            serviceTitle,
            jobId: jobStatusId,
            disputeReason,
          });

          console.log('✅ Enhanced revision dispute notification sent to buyer:', jobDetails.buyer_id);
        }
      } catch (error) {
        console.error('Error sending enhanced revision dispute notification:', error);
        // Fallback to original notification method
        await this.sendJobNotification(
          jobStatusId,
          'revision_disputed',
          `Revision request disputed: ${disputeReason}`,
          serviceProviderId
        );
      }

      console.log('✅ Revision dispute filed successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in disputeRevision:', error);
      return { success: false, error: 'Failed to dispute revision' };
    }
  }

  /**
   * Service provider completes revision
   */
  static async completeRevision(
    jobStatusId: string,
    serviceProviderId: string,
    completionNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('✅ Completing revision for job:', jobStatusId);

      // Get job status
      const { data: jobStatus, error: jobError } = await supabase
        .from('job_status')
        .select('*')
        .eq('id', jobStatusId)
        .eq('service_provider_id', serviceProviderId)
        .single();

      if (jobError || !jobStatus) {
        return { success: false, error: 'Job not found' };
      }

      // Check if job is in revision in progress state
      if (jobStatus.current_status !== 'revision_in_progress') {
        return { success: false, error: 'Job is not in revision in progress state' };
      }

      // Update job status to revision completed
      await supabaseAdmin
        .from('job_status')
        .update({
          current_status: 'revision_completed',
          revision_completed_at: new Date().toISOString(),
          notes: completionNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobStatusId);

      // Send enhanced notification to buyer
      try {
        // Get buyer and service provider information
        const { data: jobDetails, error: detailsError } = await supabase
          .from('job_status')
          .select(`
            buyer_id,
            service_provider_id,
            service_offers!inner(
              service_title,
              services!inner(
                title
              )
            )
          `)
          .eq('id', jobStatusId)
          .single();

        if (!detailsError && jobDetails) {
          const serviceOffer = Array.isArray(jobDetails.service_offers) ? jobDetails.service_offers[0] : jobDetails.service_offers;
          const services = Array.isArray(serviceOffer?.services) ? serviceOffer.services[0] : serviceOffer?.services;
          const serviceTitle = serviceOffer?.service_title || services?.title || 'Service';
          
          // Get service provider profile
          const { data: providerProfile } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', serviceProviderId)
            .single();

          const providerName = providerProfile?.full_name || 'Service Provider';
          const providerImage = providerProfile?.avatar_url;

          // Send enhanced notification to buyer
          await notificationService.addRevisionCompletionNotification({
            buyerId: jobDetails.buyer_id,
            serviceProviderName: providerName,
            serviceProviderImage: providerImage,
            serviceTitle,
            jobId: jobStatusId,
            completionNotes,
          });

          console.log('✅ Enhanced revision completion notification sent to buyer:', jobDetails.buyer_id);
        }
      } catch (error) {
        console.error('Error sending enhanced revision completion notification:', error);
        // Fallback to original notification method
        await this.sendJobNotification(
          jobStatusId,
          'revision_completed',
          `Revision completed${completionNotes ? `: ${completionNotes}` : ''}`,
          serviceProviderId
        );
      }

      console.log('✅ Revision completed successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in completeRevision:', error);
      return { success: false, error: 'Failed to complete revision' };
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

      // Calculate seller payout after platform fees
      const sellerPayout = escrowTransaction.amount - escrowTransaction.platform_fee;
      
      // Release payment to seller (after deducting platform fee)
      const releaseResult = await WalletService.recordServicePaymentReceived(
        escrowTransaction.seller_id,
        sellerPayout,
        `${escrowTransaction.service_title} (after ${FeeService.formatAmount(escrowTransaction.platform_fee)} platform fee)`,
        escrowTransaction.service_offer_id
      );

      if (!releaseResult.success) {
        return { success: false, error: 'Failed to release payment to seller' };
      }

      // Update platform wallet (remove from escrow)
      await this.updatePlatformWalletRelease(escrowTransaction.total_amount);

      // Create a review record if rating and feedback are provided
      if (rating && rating > 0) {
        try {
          // Get service_id from the service offer if available
          const { data: serviceOfferData } = await supabase
            .from('service_offers')
            .select('service_id')
            .eq('id', escrowTransaction.service_offer_id)
            .single();

          const { error: reviewError } = await supabase
            .from('reviews')
            .insert({
              reviewer_id: buyerId,
              reviewee_id: escrowTransaction.service_provider_id || escrowTransaction.seller_id,
              service_id: serviceOfferData?.service_id || null,
              order_id: jobStatusId,
              rating: rating,
              comment: feedback || null,
            });

          if (reviewError) {
            console.error('Error creating escrow review:', reviewError);
            // Don't fail the entire operation if review creation fails
          } else {
            console.log('✅ Escrow review created successfully for job:', jobStatusId);
            
            // Update service provider's overall rating
            await this.updateServiceProviderRating(escrowTransaction.service_provider_id || escrowTransaction.seller_id);
          }
        } catch (error) {
          console.error('Error in escrow review creation process:', error);
        }
      }

      // Send enhanced notification to service provider
      try {
        // Get buyer and service provider information
        const { data: buyerProfile } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('user_id', buyerId)
          .single();

        const buyerName = buyerProfile?.full_name || 'Buyer';
        const buyerImage = buyerProfile?.avatar_url;

        // Send enhanced notification to service provider
        await notificationService.addJobCompletionConfirmationNotification({
          serviceProviderId: escrowTransaction.seller_id,
          buyerName,
          buyerImage,
          serviceTitle: escrowTransaction.service_title,
          jobId: jobStatusId,
          rating,
          feedback,
        });

        console.log('✅ Enhanced payment release notification sent to service provider:', escrowTransaction.seller_id);
      } catch (error) {
        console.error('Error sending enhanced payment release notification:', error);
        // Fallback to original notification method
        await this.sendJobNotification(
          jobStatusId,
          'system_notification',
          `Payment of ${sellerPayout} BetaCoins has been released to your wallet! (${escrowTransaction.amount} service fee - ${escrowTransaction.platform_fee} platform fee)`,
          buyerId
        );
      }

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
        .eq('service_provider_id', sellerId)
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

      // Create local in-app notification for the recipient
      const { data: jobStatus } = await supabase
        .from('job_status')
        .select('buyer_id, service_provider_id')
        .eq('id', jobStatusId)
        .single();

      if (jobStatus) {
        const recipientId = jobStatus.buyer_id === senderId ? jobStatus.service_provider_id : jobStatus.buyer_id;
        if (recipientId) {
          await notificationService.addNotification(
            {
              type: 'order',
              title: 'Job update',
              message,
              data: {
                orderId: jobStatusId,
              },
            },
            recipientId
          );
        }
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
            total_escrowed_betacoins: (platformWallet.total_escrowed_betacoins || 0) + totalAmount,
            total_platform_fees: (platformWallet.total_platform_fees || 0) + platformFee,
            updated_at: new Date().toISOString()
          })
          .eq('id', platformWallet.id);
      } else {
        // Create initial platform wallet if it doesn't exist
        await supabaseAdmin
          .from('platform_wallet')
          .insert({
            total_escrowed_betacoins: totalAmount,
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
            total_escrowed_betacoins: Math.max(0, (platformWallet.total_escrowed_betacoins || 0) - totalAmount),
            total_released_today: (platformWallet.total_released_today || 0) + totalAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', platformWallet.id);
      }
    } catch (error) {
      console.error('Error updating platform wallet release:', error);
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