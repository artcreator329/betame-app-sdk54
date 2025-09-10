import { WalletService } from './wallet-service';

export interface AIPaymentResult {
  success: boolean;
  wallet?: any;
  error?: string;
}

export class AIPaymentService {
  // Cost for AI image generation
  static readonly AI_IMAGE_GENERATION_COST = 1; // 1 BetaCoin

  /**
   * Check if user has enough BetaCoins for AI image generation
   */
  static async checkBalance(userId: string): Promise<{ hasEnough: boolean; currentBalance: number; required: number }> {
    try {
      const wallet = await WalletService.getWallet(userId);
      if (!wallet) {
        return {
          hasEnough: false,
          currentBalance: 0,
          required: this.AI_IMAGE_GENERATION_COST
        };
      }

      return {
        hasEnough: wallet.betame_betacoins >= this.AI_IMAGE_GENERATION_COST,
        currentBalance: wallet.betame_betacoins,
        required: this.AI_IMAGE_GENERATION_COST
      };
    } catch (error) {
      console.error('Error checking AI payment balance:', error);
      return {
        hasEnough: false,
        currentBalance: 0,
        required: this.AI_IMAGE_GENERATION_COST
      };
    }
  }

  /**
   * Process payment for AI image generation
   */
  static async processAIImagePayment(
    userId: string,
    serviceTitle: string,
    serviceDescription: string
  ): Promise<AIPaymentResult> {
    try {
      // Get user's wallet
      const wallet = await WalletService.getWallet(userId);
      if (!wallet) {
        return { 
          success: false, 
          error: 'Unable to access wallet' 
        };
      }

      // Check if user has enough BetaCoins
      if (wallet.betame_betacoins < this.AI_IMAGE_GENERATION_COST) {
        return { 
          success: false, 
          error: `Insufficient BetaCoins. You need ${this.AI_IMAGE_GENERATION_COST} BetaCoin but only have ${wallet.betame_betacoins} BetaCoins.` 
        };
      }

      // Update wallet - deduct BetaCoins
      const updatedWallet = await WalletService.updateWallet({
        ...wallet,
        betame_betacoins: wallet.betame_betacoins - this.AI_IMAGE_GENERATION_COST,
      });

      if (!updatedWallet) {
        return { 
          success: false, 
          error: 'Failed to process payment' 
        };
      }

      // Record transaction in wallet history
      await WalletService.recordTransaction({
        user_id: userId,
        type: 'feature_purchase',
        amount: -this.AI_IMAGE_GENERATION_COST, // Negative amount for payment
        description: `AI Image Generation - "${serviceTitle.length > 30 ? serviceTitle.substring(0, 30) + '...' : serviceTitle}"`,
      });

      console.log(`✅ AI Image Generation payment processed: ${this.AI_IMAGE_GENERATION_COST} BetaCoin deducted for "${serviceTitle}"`);
      return { 
        success: true, 
        wallet: updatedWallet 
      };

    } catch (error) {
      console.error('Error processing AI image generation payment:', error);
      return { 
        success: false, 
        error: 'Payment processing failed' 
      };
    }
  }

  /**
   * Refund BetaCoin payment if image generation fails
   */
  static async refundAIImagePayment(
    userId: string,
    serviceTitle: string,
    serviceDescription: string
  ): Promise<AIPaymentResult> {
    try {
      // Get user's wallet
      const wallet = await WalletService.getWallet(userId);
      if (!wallet) {
        return { 
          success: false, 
          error: 'Unable to access wallet for refund' 
        };
      }

      // Add BetaCoins back to wallet
      const updatedWallet = await WalletService.updateWallet({
        ...wallet,
        betame_betacoins: wallet.betame_betacoins + this.AI_IMAGE_GENERATION_COST,
      });

      if (!updatedWallet) {
        return { 
          success: false, 
          error: 'Failed to process refund' 
        };
      }

      // Record refund transaction in wallet history
      await WalletService.recordTransaction({
        user_id: userId,
        type: 'feature_purchase',
        amount: this.AI_IMAGE_GENERATION_COST, // Positive amount for refund
        description: `AI Image Generation Refund - "${serviceTitle.length > 30 ? serviceTitle.substring(0, 30) + '...' : serviceTitle}" (Generation Failed)`,
      });

      console.log(`✅ AI Image Generation refund processed: ${this.AI_IMAGE_GENERATION_COST} BetaCoin refunded for "${serviceTitle}"`);
      return { 
        success: true, 
        wallet: updatedWallet 
      };

    } catch (error) {
      console.error('Error processing AI image generation refund:', error);
      return { 
        success: false, 
        error: 'Refund processing failed' 
      };
    }
  }

  /**
   * Get AI service pricing info
   */
  static getAIPricing() {
    return {
      imageGeneration: {
        cost: this.AI_IMAGE_GENERATION_COST,
        currency: 'BetaCoin',
        description: 'Generate custom AI image for your service'
      }
    };
  }
}

export default AIPaymentService;
