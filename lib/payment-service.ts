import { WalletService } from './wallet-service';
import { ActiveJobService } from './active-job-service';
import { ServiceOffer, ServiceOfferData } from '../types/chat';

export interface PaymentResult {
  success: boolean;
  error?: string;
  activeJobId?: string;
}

export class PaymentService {
  /**
   * Process payment for an accepted service offer
   */
  static async processOfferPayment(
    offer: ServiceOffer,
    serviceData: ServiceOfferData,
    buyerId: string,
    sellerId: string
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

      // Check if buyer has sufficient credits
      if (buyerWallet.betame_credits < finalPrice) {
        return {
          success: false,
          error: `Insufficient credits. You need ${finalPrice} credits but only have ${buyerWallet.betame_credits} credits.`
        };
      }

      // Deduct credits from buyer
      const updatedBuyerWallet = {
        ...buyerWallet,
        betame_credits: buyerWallet.betame_credits - finalPrice
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
        amount: -finalPrice,
        description: `Payment for service: ${serviceData.title}`
      });

      // Get seller's wallet
      const sellerWallet = await WalletService.getWallet(sellerId);
      if (!sellerWallet) {
        // Rollback buyer transaction if seller wallet fails
        await WalletService.updateWallet(buyerWallet);
        return {
          success: false,
          error: 'Unable to access seller wallet'
        };
      }

      // Add credits to seller (escrow - will be released when job is completed)
      const updatedSellerWallet = {
        ...sellerWallet,
        betame_credits: sellerWallet.betame_credits + finalPrice
      };

      const sellerUpdateResult = await WalletService.updateWallet(updatedSellerWallet);
      if (!sellerUpdateResult) {
        // Rollback buyer transaction if seller update fails
        await WalletService.updateWallet(buyerWallet);
        return {
          success: false,
          error: 'Failed to process payment to seller wallet'
        };
      }

      // Record transaction for seller (payment received)
      await WalletService.recordTransaction({
        user_id: sellerId,
        type: 'service_payment_received',
        amount: finalPrice,
        description: `Payment received for service: ${serviceData.title}`
      });

      // Create active job after successful payment
      const activeJob = await ActiveJobService.createJobFromOffer(
        offer,
        serviceData,
        buyerId,
        sellerId
      );

      if (!activeJob) {
        // Rollback both transactions if job creation fails
        await WalletService.updateWallet(buyerWallet);
        await WalletService.updateWallet(sellerWallet);
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
    const serviceFee = Math.round(finalPrice * 0.05); // 5% service fee
    const totalAmount = finalPrice + serviceFee;

    return {
      finalPrice,
      currency: serviceData.currency || 'RM',
      serviceFee,
      totalAmount
    };
  }
}