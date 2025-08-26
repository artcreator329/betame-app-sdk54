import { WalletService } from './wallet-service';
import { ActiveJobService } from './active-job-service';
import { ServiceOffer, ServiceOfferData } from '../types/chat';
import { supabase } from './supabase';

export interface PaymentResult {
  success: boolean;
  error?: string;
  activeJobId?: string;
}

export interface DirectOrderData {
  serviceId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  category_name?: string;
  customDescription?: string;
  customDeliveryTime?: number;
}

export class PaymentService {
  /**
   * Process payment for a direct order from service listing
   */
  static async processDirectOrderPayment(
    orderData: DirectOrderData,
    buyerId: string,
    serviceProviderId: string
  ): Promise<PaymentResult> {
    try {
      // Calculate the final price
      const finalPrice = orderData.price;
      
      // Get buyer's wallet
      const buyerWallet = await WalletService.getWallet(buyerId);
      if (!buyerWallet) {
        return {
          success: false,
          error: 'Unable to access buyer wallet'
        };
      }

      // Check if buyer has sufficient BetaCoins
      if (buyerWallet.betame_betacoins < finalPrice) {
        return {
          success: false,
          error: `Insufficient BetaCoins. You need ${finalPrice} BetaCoins but only have ${buyerWallet.betame_betacoins} BetaCoins.`
        };
      }

      // Deduct BetaCoins from buyer
      const updatedBuyerWallet = {
        ...buyerWallet,
        betame_betacoins: buyerWallet.betame_betacoins - finalPrice
      };

      const buyerUpdateResult = await WalletService.updateWallet(updatedBuyerWallet);
      if (!buyerUpdateResult) {
        return {
          success: false,
          error: 'Failed to process payment from buyer wallet'
        };
      }

      // Record transaction for buyer (payment)
      await WalletService.recordTransaction({
        user_id: buyerId,
        type: 'service_payment',
        amount: -Math.round(finalPrice * 100), // Convert to cents (integer)
        description: `Payment for service: ${orderData.title}`
      });

      // Get service provider's wallet
      const serviceProviderWallet = await WalletService.getWallet(serviceProviderId);
      if (!serviceProviderWallet) {
        // Rollback buyer transaction if service provider wallet fails
        await WalletService.updateWallet(buyerWallet);
        return {
          success: false,
          error: 'Unable to access service provider wallet'
        };
      }

      // Add BetaCoins to service provider (escrow - will be released when job is completed)
      const updatedServiceProviderWallet = {
        ...serviceProviderWallet,
        betame_betacoins: serviceProviderWallet.betame_betacoins + finalPrice
      };

      const serviceProviderUpdateResult = await WalletService.updateWallet(updatedServiceProviderWallet);
      if (!serviceProviderUpdateResult) {
        // Rollback buyer transaction if service provider update fails
        await WalletService.updateWallet(buyerWallet);
        return {
          success: false,
          error: 'Failed to process payment to service provider wallet'
        };
      }

      // Record transaction for service provider (payment received)
      await WalletService.recordTransaction({
        user_id: serviceProviderId,
        type: 'service_payment_received',
        amount: Math.round(finalPrice * 100), // Convert to cents (integer)
        description: `Payment received for service: ${orderData.title}`
      });

      // Create active job after successful payment
      const activeJob = await ActiveJobService.createJobFromDirectOrder(
        orderData,
        buyerId,
        serviceProviderId
      );

      if (!activeJob) {
        // Rollback both transactions if job creation fails
        await WalletService.updateWallet(buyerWallet);
        await WalletService.updateWallet(serviceProviderWallet);
        return {
          success: false,
          error: 'Failed to create job after payment. Payment has been refunded.'
        };
      }

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
            price: finalPrice,
            currency: orderData.currency || 'RM',
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
   */
  static async processOfferPayment(
    offer: ServiceOffer,
    serviceData: ServiceOfferData,
    buyerId: string,
    serviceProviderId: string
  ): Promise<PaymentResult> {
    try {
      // Calculate the final price
      const finalPrice = offer.customPrice || serviceData.customPrice || serviceData.price;
      
      // Get buyer's wallet
      const buyerWallet = await WalletService.getWallet(buyerId);
      if (!buyerWallet) {
        return {
          success: false,
          error: 'Unable to access buyer wallet'
        };
      }

      // Check if buyer has sufficient BetaCoins
      if (buyerWallet.betame_betacoins < finalPrice) {
        return {
          success: false,
          error: `Insufficient BetaCoins. You need ${finalPrice} BetaCoins but only have ${buyerWallet.betame_betacoins} BetaCoins.`
        };
      }

      // Deduct BetaCoins from buyer
      const updatedBuyerWallet = {
        ...buyerWallet,
        betame_betacoins: buyerWallet.betame_betacoins - finalPrice
      };

      const buyerUpdateResult = await WalletService.updateWallet(updatedBuyerWallet);
      if (!buyerUpdateResult) {
        return {
          success: false,
          error: 'Failed to process payment from buyer wallet'
        };
      }

      // Record transaction for buyer (payment)
      await WalletService.recordTransaction({
        user_id: buyerId,
        type: 'service_payment',
        amount: -Math.round(finalPrice * 100), // Convert to cents (integer)
        description: `Payment for service: ${serviceData.title}`
      });

      // Get service provider's wallet
      const serviceProviderWallet = await WalletService.getWallet(serviceProviderId);
      if (!serviceProviderWallet) {
        // Rollback buyer transaction if service provider wallet fails
        await WalletService.updateWallet(buyerWallet);
        return {
          success: false,
          error: 'Unable to access service provider wallet'
        };
      }

      // Add BetaCoins to service provider (escrow - will be released when job is completed)
      const updatedServiceProviderWallet = {
        ...serviceProviderWallet,
        betame_betacoins: serviceProviderWallet.betame_betacoins + finalPrice
      };

      const serviceProviderUpdateResult = await WalletService.updateWallet(updatedServiceProviderWallet);
      if (!serviceProviderUpdateResult) {
        // Rollback buyer transaction if service provider update fails
        await WalletService.updateWallet(buyerWallet);
        return {
          success: false,
          error: 'Failed to process payment to service provider wallet'
        };
      }

      // Record transaction for service provider (payment received)
      await WalletService.recordTransaction({
        user_id: serviceProviderId,
        type: 'service_payment_received',
        amount: Math.round(finalPrice * 100), // Convert to cents (integer)
        description: `Payment received for service: ${serviceData.title}`
      });

      // Create active job after successful payment
      const activeJob = await ActiveJobService.createJobFromOffer(
        offer,
        serviceData,
        buyerId,
        serviceProviderId
      );

      if (!activeJob) {
        // Rollback both transactions if job creation fails
        await WalletService.updateWallet(buyerWallet);
        await WalletService.updateWallet(serviceProviderWallet);
        return {
          success: false,
          error: 'Failed to create job after payment. Payment has been refunded.'
        };
      }

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
   */
  static getPaymentSummaryForDirectOrder(
    orderData: DirectOrderData
  ): {
    finalPrice: number;
    currency: string;
    serviceFee: number;
    totalAmount: number;
  } {
    const finalPrice = orderData.price;
    const buyerFee = Math.round((finalPrice * 0.022) * 100) / 100; // 2.2% processing fee
    const totalAmount = finalPrice + buyerFee;

    return {
      finalPrice,
      currency: orderData.currency || 'RM',
      serviceFee: buyerFee,
      totalAmount
    };
  }

  /**
   * Get payment summary for an offer
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
    const buyerFee = Math.round((finalPrice * 0.022) * 100) / 100; // 2.2% processing fee
    const totalAmount = finalPrice + buyerFee;

    return {
      finalPrice,
      currency: serviceData.currency || 'RM',
      serviceFee: buyerFee,
      totalAmount
    };
  }
}