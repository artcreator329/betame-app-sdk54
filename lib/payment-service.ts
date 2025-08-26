import { WalletService } from './wallet-service';
import { ActiveJobService } from './active-job-service';
import { ServiceOffer, ServiceOfferData } from '../types/chat';
import { supabase } from './supabase';
import { FeeService } from './fee-service';

export interface DirectOrderData {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  customDeliveryTime?: number;
}

export interface PaymentResult {
  success: boolean;
  activeJobId?: string;
  error?: string;
}

export class PaymentService {
  /**
   * Process payment for a direct order from service listing
   * New flow: User pays Order Price + 2.2%, payment held in escrow
   */
  static async processDirectOrderPayment(
    orderData: DirectOrderData,
    buyerId: string,
    serviceProviderId: string
  ): Promise<PaymentResult> {
    try {
      // Calculate fees using FeeService
      const feeCalculation = FeeService.calculateFees(orderData.price, orderData.currency);
      const buyerTotal = feeCalculation.buyerTotal; // Order Price + 2.2%
      
      console.log('💰 Processing direct order payment:', {
        orderPrice: orderData.price,
        buyerFee: feeCalculation.buyerFee,
        buyerTotal,
        serviceProviderId
      });

      // Get buyer's wallet
      const buyerWallet = await WalletService.getWallet(buyerId);
      if (!buyerWallet) {
        return {
          success: false,
          error: 'Unable to access buyer wallet'
        };
      }

      // Check if buyer has sufficient BetaCoins (including 2.2% fee)
      if (buyerWallet.betame_betacoins < buyerTotal) {
        return {
          success: false,
          error: `Insufficient BetaCoins. You need ${buyerTotal} BetaCoins (${orderData.price} service + ${feeCalculation.buyerFee} processing fee) but only have ${buyerWallet.betame_betacoins} BetaCoins.`
        };
      }

      // Deduct total amount (Order Price + 2.2%) from buyer
      const updatedBuyerWallet = {
        ...buyerWallet,
        betame_betacoins: buyerWallet.betame_betacoins - buyerTotal
      };

      const buyerUpdateResult = await WalletService.updateWallet(updatedBuyerWallet);
      if (!buyerUpdateResult) {
        return {
          success: false,
          error: 'Failed to process payment from buyer wallet'
        };
      }

      // Record transaction for buyer (payment with fee)
      await WalletService.recordTransaction({
        user_id: buyerId,
        type: 'service_payment',
        amount: -Math.round(buyerTotal * 100), // Convert to cents (integer)
        description: `Payment for service: ${orderData.title} (including ${feeCalculation.buyerFee} processing fee)`
      });

      // Create active job after successful payment
      const activeJob = await ActiveJobService.createJobFromDirectOrder(
        orderData,
        buyerId,
        serviceProviderId
      );

      if (!activeJob) {
        // Rollback buyer transaction if job creation fails
        await WalletService.updateWallet(buyerWallet);
        return {
          success: false,
          error: 'Failed to create job after payment. Payment has been refunded.'
        };
      }

      // Update job with payment details for admin release
      await supabase
        .from('active_jobs')
        .update({
          payment_amount: orderData.price, // Original order price
          buyer_fee: feeCalculation.buyerFee, // 2.2% fee
          platform_fee: feeCalculation.platformFee, // 11% or RM4.90, whichever higher
          total_paid: buyerTotal, // Total amount buyer paid
          payment_status: 'paid_escrow', // New status: paid and held in escrow
          escrow_ready_for_release: false // Will be set to true when admin confirms
        })
        .eq('id', activeJob.id);

      // Fallback: Ensure notification is created even if ActiveJobService fails
      try {
        const { notificationService } = await import('./notification-service');
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', buyerId)
          .single();

        if (buyerProfile) {
          await notificationService.addOrderNotification({
            serviceProviderId,
            buyerName: buyerProfile.full_name,
            buyerImage: buyerProfile.avatar_url || '',
            serviceTitle: orderData.title,
            price: orderData.price,
            currency: orderData.currency,
            orderId: activeJob.id,
            orderType: 'direct'
          });
          console.log('✅ PaymentService: Fallback notification created for order:', activeJob.id);
        }
      } catch (notificationError) {
        console.error('❌ PaymentService: Fallback notification failed:', notificationError);
        // Don't fail the payment if notification fails
      }

      return {
        success: true,
        activeJobId: activeJob.id
      };

    } catch (error) {
      console.error('Error processing direct order payment:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during payment processing'
      };
    }
  }

  /**
   * Process payment for an accepted service offer
   * New flow: User pays Order Price + 2.2%, payment held in escrow
   */
  static async processOfferPayment(
    offer: ServiceOffer,
    serviceData: ServiceOfferData,
    buyerId: string,
    serviceProviderId: string
  ): Promise<PaymentResult> {
    try {
      const finalPrice = offer.customPrice || serviceData.customPrice || serviceData.price;
      
      // Calculate fees using FeeService
      const feeCalculation = FeeService.calculateFees(finalPrice, serviceData.currency);
      const buyerTotal = feeCalculation.buyerTotal; // Order Price + 2.2%
      
      console.log('💰 Processing offer payment:', {
        offerPrice: finalPrice,
        buyerFee: feeCalculation.buyerFee,
        buyerTotal,
        serviceProviderId
      });

      // Get buyer's wallet
      const buyerWallet = await WalletService.getWallet(buyerId);
      if (!buyerWallet) {
        return {
          success: false,
          error: 'Unable to access buyer wallet'
        };
      }

      // Check if buyer has sufficient BetaCoins (including 2.2% fee)
      if (buyerWallet.betame_betacoins < buyerTotal) {
        return {
          success: false,
          error: `Insufficient BetaCoins. You need ${buyerTotal} BetaCoins (${finalPrice} service + ${feeCalculation.buyerFee} processing fee) but only have ${buyerWallet.betame_betacoins} BetaCoins.`
        };
      }

      // Deduct total amount (Order Price + 2.2%) from buyer
      const updatedBuyerWallet = {
        ...buyerWallet,
        betame_betacoins: buyerWallet.betame_betacoins - buyerTotal
      };

      const buyerUpdateResult = await WalletService.updateWallet(updatedBuyerWallet);
      if (!buyerUpdateResult) {
        return {
          success: false,
          error: 'Failed to process payment from buyer wallet'
        };
      }

      // Record transaction for buyer (payment with fee)
      await WalletService.recordTransaction({
        user_id: buyerId,
        type: 'service_payment',
        amount: -Math.round(buyerTotal * 100), // Convert to cents (integer)
        description: `Payment for service: ${serviceData.title} (including ${feeCalculation.buyerFee} processing fee)`
      });

      // Create active job after successful payment
      const activeJob = await ActiveJobService.createJobFromOffer(
        offer,
        serviceData,
        buyerId,
        serviceProviderId
      );

      if (!activeJob) {
        // Rollback buyer transaction if job creation fails
        await WalletService.updateWallet(buyerWallet);
        return {
          success: false,
          error: 'Failed to create job after payment. Payment has been refunded.'
        };
      }

      // Update job with payment details for admin release
      await supabase
        .from('active_jobs')
        .update({
          payment_amount: finalPrice, // Original offer price
          buyer_fee: feeCalculation.buyerFee, // 2.2% fee
          platform_fee: feeCalculation.platformFee, // 11% or RM4.90, whichever higher
          total_paid: buyerTotal, // Total amount buyer paid
          payment_status: 'paid_escrow', // New status: paid and held in escrow
          escrow_ready_for_release: false // Will be set to true when admin confirms
        })
        .eq('id', activeJob.id);

      return {
        success: true,
        activeJobId: activeJob.id
      };

    } catch (error) {
      console.error('Error processing offer payment:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during payment processing'
      };
    }
  }

  /**
   * Get payment summary for a direct order
   * Shows Order Price + 2.2% processing fee
   */
  static getPaymentSummaryForDirectOrder(
    orderData: DirectOrderData
  ): {
    finalPrice: number;
    currency: string;
    serviceFee: number;
    totalAmount: number;
  } {
    const feeCalculation = FeeService.calculateFees(orderData.price, orderData.currency);
    
    return {
      finalPrice: orderData.price,
      currency: orderData.currency,
      serviceFee: feeCalculation.buyerFee, // 2.2% processing fee
      totalAmount: feeCalculation.buyerTotal // Order Price + 2.2%
    };
  }

  /**
   * Get payment summary for an offer
   * Shows Order Price + 2.2% processing fee
   */
  static getPaymentSummary(
    offer: ServiceOffer,
    serviceData: ServiceOfferData
  ): {
    finalPrice: number;
    currency: string;
    serviceFee: number;
    totalAmount: number;
  } {
    const finalPrice = offer.customPrice || serviceData.customPrice || serviceData.price;
    const feeCalculation = FeeService.calculateFees(finalPrice, serviceData.currency);
    
    return {
      finalPrice,
      currency: serviceData.currency || 'RM',
      serviceFee: feeCalculation.buyerFee, // 2.2% processing fee
      totalAmount: feeCalculation.buyerTotal // Order Price + 2.2%
    };
  }

  /**
   * Calculate service provider payout after admin release
   * Formula: Order Price - 2.2% - 11% = Order Price - 13.2%
   */
  static calculateServiceProviderPayout(orderPrice: number): {
    orderPrice: number;
    buyerFee: number; // 2.2%
    platformFee: number; // 11% or RM4.90, whichever higher
    serviceProviderPayout: number;
  } {
    const feeCalculation = FeeService.calculateFees(orderPrice);
    
    return {
      orderPrice,
      buyerFee: feeCalculation.buyerFee, // 2.2%
      platformFee: feeCalculation.platformFee, // 11% or RM4.90, whichever higher
      serviceProviderPayout: feeCalculation.sellerReceives // Order Price - platform fee
    };
  }
}