import { supabase, supabaseAdmin } from './supabase';
import { Buffer } from 'buffer';

export interface CurlecConfig {
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
}

export interface PaymentTransaction {
  id?: string;
  user_id: string;
  order_id?: string;
  payment_type: 'betacoin_purchase' | 'service_payment' | 'wallet_topup';
  amount: number; // Amount in cents (RM * 100)
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  curlec_payment_id?: string;
  curlec_checkout_id?: string;
  payment_method?: string;
  payment_gateway: string;
  gateway_response?: any;
  error_message?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export interface BetaCoinPackage {
  id: string;
  name: string;
  description?: string;
  betacoin_amount: number;
  price: number; // Price in cents (RM * 100)
  currency: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentMethod {
  id?: string;
  user_id: string;
  payment_method_type: 'card' | 'fpx' | 'ewallet';
  payment_method_name: string;
  payment_method_id?: string;
  is_default: boolean;
  is_active: boolean;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCheckoutSessionRequest {
  user_id: string;
  payment_type: 'betacoin_purchase' | 'service_payment' | 'wallet_topup';
  amount: number; // Amount in cents
  currency: string;
  order_id?: string;
  success_url: string;
  cancel_url: string;
  metadata?: any;
}

export interface CheckoutSessionResponse {
  success: boolean;
  checkout_url?: string;
  checkout_id?: string;
  error?: string;
}

export class CurlecPaymentService {
  private static instance: CurlecPaymentService;
  private config: CurlecConfig;

  private constructor() {
    this.config = {
      apiKey: <REDACTED> || '',
      secretKey: '', // Not needed on client side - handled by Edge Function
      webhookSecret: process.env.CURLEC_WEBHOOK_SECRET || '',
      environment: (process.env.EXPO_PUBLIC_CURLEC_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    };
  }

  public static getInstance(): CurlecPaymentService {
    if (!CurlecPaymentService.instance) {
      CurlecPaymentService.instance = new CurlecPaymentService();
    }
    return CurlecPaymentService.instance;
  }

  /**
   * Get Curlec API base URL based on environment
   */
  private getApiBaseUrl(): string {
    return this.config.environment === 'production' 
      ? 'https://api.razorpay.com' 
      : 'https://api.razorpay.com';
  }

  /**
   * Get authorization header for Curlec API
   */
  private getAuthHeader(): string {
    const credentials = `${this.config.apiKey}:${this.config.secretKey}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  /**
   * Create a checkout session with Curlec using Edge Function
   */
  async createCheckoutSession(request: CreateCheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    try {
      const checkoutData = {
        user_id: request.user_id,
        payment_type: request.payment_type,
        amount: request.amount,
        currency: request.currency,
        success_url: request.success_url,
        cancel_url: request.cancel_url,
        metadata: request.metadata,
      };

      console.log('Creating Curlec checkout session with data:', checkoutData);

      // Call Supabase Edge Function to create payment session
      const { data, error } = await supabase.functions.invoke('curlec-payment', {
        body: {
          action: 'create_checkout_session',
          data: checkoutData,
        },
      });

      if (error) {
        console.error('Edge Function error:', error);
        return { success: false, error: error.message || 'Failed to create checkout session' };
      }

      if (!data.success) {
        console.error('Payment creation failed:', data.error);
        return { success: false, error: data.error || 'Failed to create checkout session' };
      }

      console.log('Payment session created successfully:', data);

      return {
        success: true,
        checkout_url: data.checkout_url,
        checkout_id: data.checkout_id,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return { success: false, error: 'Failed to create checkout session' };
    }
  }

  /**
   * Verify webhook signature and process payment
   */
  async processWebhook(payload: any, signature: string): Promise<boolean> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        console.error('Invalid webhook signature');
        return false;
      }

      const { event_type, data } = payload;

      switch (event_type) {
        case 'payment.captured':
          return await this.handlePaymentCompleted(data);
        case 'payment.failed':
          return await this.handlePaymentFailed(data);
        case 'order.paid':
          return await this.handlePaymentCompleted(data);
        default:
          console.log('Unhandled webhook event:', event_type);
          return true;
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      return false;
    }
  }

  /**
   * Handle completed payment
   */
  private async handlePaymentCompleted(data: any): Promise<boolean> {
    try {
      const { id: payment_id, order_id, amount, currency, receipt } = data.payload.payment.entity;

      // Find the payment transaction
      const { data: transaction, error } = await supabaseAdmin
        .from('payment_transactions')
        .select('*')
        .eq('id', receipt)
        .single();

      if (error || !transaction) {
        console.error('Transaction not found:', receipt);
        return false;
      }

      // Verify amount matches (Razorpay amount is in paise, we store in cents)
      if (transaction.amount !== amount || transaction.currency !== currency) {
        console.error('Amount/currency mismatch:', { expected: transaction, received: data });
        return false;
      }

      // Update transaction status
      await this.updatePaymentTransaction(transaction.id, {
        status: 'completed',
        curlec_payment_id: payment_id,
        gateway_response: data,
      });

      // Process the payment based on type
      await this.processCompletedPayment(transaction);

      return true;
    } catch (error) {
      console.error('Error handling payment completed:', error);
      return false;
    }
  }

  /**
   * Process completed payment based on payment type
   */
  private async processCompletedPayment(transaction: PaymentTransaction): Promise<void> {
    try {
      switch (transaction.payment_type) {
        case 'betacoin_purchase':
          await this.processBetaCoinPurchase(transaction);
          break;
        case 'service_payment':
          await this.processServicePayment(transaction);
          break;
        case 'wallet_topup':
          await this.processWalletTopup(transaction);
          break;
        default:
          console.error('Unknown payment type:', transaction.payment_type);
      }
    } catch (error) {
      console.error('Error processing completed payment:', error);
    }
  }

  /**
   * Process BetaCoin purchase
   */
  private async processBetaCoinPurchase(transaction: PaymentTransaction): Promise<void> {
    try {
      const { amount, metadata } = transaction;
      const betacoinAmount = metadata?.betacoin_amount || Math.floor(amount / 100); // Default conversion

      // Add BetaCoins to user's wallet
      const { WalletService } = await import('./wallet-service');
      const result = await WalletService.addBetaCoins(
        transaction.user_id,
        betacoinAmount,
        {
          transactionAmount: amount / 100,
          processingFee: 0,
          baseAmount: betacoinAmount,
        }
      );

      if (!result.success) {
        console.error('Failed to add BetaCoins:', result.error);
        throw new Error('Failed to add BetaCoins to wallet');
      }

      console.log(`✅ BetaCoin purchase completed: ${betacoinAmount} BetaCoins added for user ${transaction.user_id}`);
    } catch (error) {
      console.error('Error processing BetaCoin purchase:', error);
      throw error;
    }
  }

  /**
   * Process service payment
   */
  private async processServicePayment(transaction: PaymentTransaction): Promise<void> {
    try {
      console.log('💰 Processing service payment:', transaction.id);
      
      // Parse order data from metadata
      const orderData = transaction.metadata?.order_data ? 
        JSON.parse(transaction.metadata.order_data) : null;
      
      if (!orderData) {
        console.error('No order data found in transaction metadata');
        throw new Error('Missing order data');
      }

      const { service_provider_id, service_name } = transaction.metadata;
      const buyerId = transaction.user_id;
      const amount = transaction.amount / 100; // Convert cents to RM

      console.log('💰 Service payment details:', {
        buyerId,
        serviceProviderId: service_provider_id,
        serviceName: service_name,
        amount,
        orderData
      });

      // Import required services
      const { PaymentService } = await import('./payment-service');
      const { ActiveJobService } = await import('./active-job-service');
      const { WalletService } = await import('./wallet-service');

      // Calculate fees using the new payment flow
      const feeCalculation = await import('./fee-service').then(m => m.FeeService.calculateFees(amount));
      const buyerTotal = feeCalculation.buyerTotal; // Order Price + 2.2%

      console.log('💰 Fee calculation:', {
        orderPrice: amount,
        buyerFee: feeCalculation.buyerFee,
        buyerTotal,
        platformFee: feeCalculation.platformFee
      });

      // Deduct total amount (Order Price + 2.2%) from buyer's wallet
      const buyerWallet = await WalletService.getWallet(buyerId);
      if (!buyerWallet) {
        throw new Error('Buyer wallet not found');
      }

      const updatedBuyerWallet = {
        ...buyerWallet,
        betame_betacoins: buyerWallet.betame_betacoins - buyerTotal
      };

      const buyerUpdateResult = await WalletService.updateWallet(updatedBuyerWallet);
      if (!buyerUpdateResult) {
        throw new Error('Failed to update buyer wallet');
      }

      // Record transaction for buyer (payment with fee)
      await WalletService.recordTransaction({
        user_id: buyerId,
        type: 'service_payment',
        amount: -Math.round(buyerTotal * 100), // Convert to cents (integer)
        description: `Payment for service: ${service_name} (including ${feeCalculation.buyerFee} processing fee)`
      });

      // Create active job after successful payment
      const activeJob = await ActiveJobService.createJobFromDirectOrder(
        {
          id: transaction.id, // Use transaction ID as order ID
          title: service_name,
          description: orderData.description || '',
          price: amount,
          currency: 'RM',
          customDeliveryTime: orderData.customDeliveryTime
        },
        buyerId,
        service_provider_id
      );

      if (!activeJob) {
        // Rollback buyer transaction if job creation fails
        await WalletService.updateWallet(buyerWallet);
        throw new Error('Failed to create active job');
      }

      // Update job with payment details for admin release
      const { supabase } = await import('./supabase');
      await supabase
        .from('active_jobs')
        .update({
          payment_amount: amount, // Original order price
          buyer_fee: feeCalculation.buyerFee, // 2.2% fee
          platform_fee: feeCalculation.platformFee, // 11% or RM4.90, whichever higher
          total_paid: buyerTotal, // Total amount buyer paid
          payment_status: 'paid_escrow', // New status: paid and held in escrow
          escrow_ready_for_release: false // Will be set to true when admin confirms
        })
        .eq('id', activeJob.id);

      console.log(`✅ Service payment completed: Job ${activeJob.id} created for user ${buyerId}`);
    } catch (error) {
      console.error('Error processing service payment:', error);
      throw error;
    }
  }

  /**
   * Process wallet topup
   */
  private async processWalletTopup(transaction: PaymentTransaction): Promise<void> {
    try {
      const { amount } = transaction;
      const cashAmount = amount / 100; // Convert cents to RM

      // Add cash to user's wallet
      const { WalletService } = await import('./wallet-service');
      const result = await WalletService.addCash(
        transaction.user_id,
        cashAmount,
        'Wallet topup via Curlec'
      );

      if (!result.success) {
        console.error('Failed to add cash:', result.error);
        throw new Error('Failed to add cash to wallet');
      }

      console.log(`✅ Wallet topup completed: RM${cashAmount} added for user ${transaction.user_id}`);
    } catch (error) {
      console.error('Error processing wallet topup:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(data: any): Promise<boolean> {
    try {
      const { reference, failure_reason } = data;

      await this.updatePaymentTransaction(reference, {
        status: 'failed',
        error_message: failure_reason,
        gateway_response: data,
      });

      return true;
    } catch (error) {
      console.error('Error handling payment failed:', error);
      return false;
    }
  }

  /**
   * Handle cancelled payment
   */
  private async handlePaymentCancelled(data: any): Promise<boolean> {
    try {
      const { reference } = data;

      await this.updatePaymentTransaction(reference, {
        status: 'cancelled',
        gateway_response: data,
      });

      return true;
    } catch (error) {
      console.error('Error handling payment cancelled:', error);
      return false;
    }
  }

  /**
   * Create a payment transaction record
   */
  async createPaymentTransaction(transaction: Partial<PaymentTransaction>): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('payment_transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) {
        console.error('Error creating payment transaction:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createPaymentTransaction:', error);
      return null;
    }
  }

  /**
   * Update a payment transaction
   */
  async updatePaymentTransaction(id: string, updates: Partial<PaymentTransaction>): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('payment_transactions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating payment transaction:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updatePaymentTransaction:', error);
      return false;
    }
  }

  /**
   * Get payment transaction by ID
   */
  async getPaymentTransaction(id: string): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching payment transaction:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getPaymentTransaction:', error);
      return null;
    }
  }

  /**
   * Get user's payment transactions
   */
  async getUserPaymentTransactions(userId: string, limit: number = 50): Promise<PaymentTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user payment transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserPaymentTransactions:', error);
      return [];
    }
  }

  /**
   * Get BetaCoin packages
   */
  async getBetaCoinPackages(): Promise<BetaCoinPackage[]> {
    try {
      const { data, error } = await supabase
        .from('betacoin_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching BetaCoin packages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBetaCoinPackages:', error);
      return [];
    }
  }

  /**
   * Get user's payment methods
   */
  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user payment methods:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserPaymentMethods:', error);
      return [];
    }
  }

  /**
   * Save a payment method
   */
  async savePaymentMethod(paymentMethod: Partial<PaymentMethod>): Promise<PaymentMethod | null> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert(paymentMethod)
        .select()
        .single();

      if (error) {
        console.error('Error saving payment method:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in savePaymentMethod:', error);
      return null;
    }
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(id: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting payment method:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deletePaymentMethod:', error);
      return false;
    }
  }

  /**
   * Get payment description based on type
   */
  private getPaymentDescription(paymentType: string, amount: number): string {
    const amountRM = (amount / 100).toFixed(2);
    
    switch (paymentType) {
      case 'betacoin_purchase':
        return `BetaCoin Purchase - RM${amountRM}`;
      case 'service_payment':
        return `Service Payment - RM${amountRM}`;
      case 'wallet_topup':
        return `Wallet Topup - RM${amountRM}`;
      default:
        return `Payment - RM${amountRM}`;
    }
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(payload: any, signature: string): boolean {
    // In a real implementation, you would verify the signature
    // using the webhook secret. For now, we'll return true
    // but you should implement proper signature verification
    return true;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(checkoutId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('status')
        .eq('curlec_checkout_id', checkoutId)
        .single();

      if (error) {
        console.error('Error fetching payment status:', error);
        return null;
      }

      return data?.status || null;
    } catch (error) {
      console.error('Error in getPaymentStatus:', error);
      return null;
    }
  }
}

export default CurlecPaymentService;
