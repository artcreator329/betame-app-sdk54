import { WalletService } from './wallet-service';

export interface FeeCalculation {
  baseAmount: number;
  buyerFee: number;
  buyerTotal: number;
  sellerReceives: number;
  platformFee: number;
  currency: string;
}

export interface PaymentBreakdown {
  originalAmount: number;
  buyerProcessingFee: number;
  buyerTotal: number;
  sellerPlatformFee: number;
  sellerReceives: number;
  platformRevenue: number;
  currency: string;
}

export class FeeService {
  // Buyer processing fee rate (2.2%)
  private static readonly BUYER_FEE_RATE = 0.022;
  
  // Minimum buyer processing fee (RM 4.90)
  private static readonly MINIMUM_BUYER_FEE = 4.90;
  
  // Seller platform fee rate (11%)
  private static readonly SELLER_FEE_RATE = 0.11;
  
  // Minimum seller platform fee (RM 4.90)
  private static readonly MINIMUM_SELLER_FEE = 4.90;

  /**
   * Calculate comprehensive fee breakdown for a transaction
   */
  static calculateFees(amount: number, currency: string = 'RM'): FeeCalculation {
    const baseAmount = amount;
    
    // Buyer pays 2.2% processing fee or RM4.90, whichever is higher
    const calculatedBuyerFee = Math.round((baseAmount * this.BUYER_FEE_RATE) * 100) / 100;
    const buyerFee = Math.max(calculatedBuyerFee, this.MINIMUM_BUYER_FEE);
    const buyerTotal = baseAmount + buyerFee;
    
    // Seller platform fee: 11% or RM4.90, whichever is higher
    const calculatedSellerFee = Math.round((baseAmount * this.SELLER_FEE_RATE) * 100) / 100;
    const platformFee = Math.max(calculatedSellerFee, this.MINIMUM_SELLER_FEE);
    const sellerReceives = baseAmount - platformFee;

    return {
      baseAmount,
      buyerFee,
      buyerTotal,
      sellerReceives,
      platformFee,
      currency
    };
  }

  /**
   * Calculate payment breakdown for display purposes
   */
  static getPaymentBreakdown(amount: number, currency: string = 'RM'): PaymentBreakdown {
    const fees = this.calculateFees(amount, currency);
    
    return {
      originalAmount: fees.baseAmount,
      buyerProcessingFee: fees.buyerFee,
      buyerTotal: fees.buyerTotal,
      sellerPlatformFee: fees.platformFee,
      sellerReceives: fees.sellerReceives,
      platformRevenue: fees.buyerFee + fees.platformFee,
      currency
    };
  }

  /**
   * Calculate BetaCoin purchase fees (no processing fee)
   */
  static calculateBetaCoinPurchaseFees(amount: number): {
    baseAmount: number;
    processingFee: number;
    totalAmount: number;
  } {
    const baseAmount = amount;
    const processingFee = 0; // No processing fee for BetaCoin purchases
    const totalAmount = baseAmount; // User pays exactly the bundle price

    return {
      baseAmount,
      processingFee,
      totalAmount
    };
  }

  /**
   * Check if buyer has sufficient BetaCoins including fees
   */
  static async checkBuyerSufficientFunds(
    buyerId: string, 
    amount: number
  ): Promise<{ 
    sufficient: boolean; 
    required: number; 
    available: number; 
    shortfall?: number;
    fees: FeeCalculation;
  }> {
    const fees = this.calculateFees(amount);
    const required = fees.buyerTotal;
    
    const wallet = await WalletService.getWallet(buyerId);
    const available = wallet?.betame_betacoins || 0;
    
    const sufficient = available >= required;
    const shortfall = sufficient ? undefined : required - available;

    return {
      sufficient,
      required,
      available,
      shortfall,
      fees
    };
  }

  /**
   * Format currency amount for display
   */
  static formatAmount(amount: number, currency: string = 'RM'): string {
    return `${currency}${amount.toFixed(2)}`;
  }

  /**
   * Format fee percentage for display
   */
  static formatFeePercentage(rate: number): string {
    return `${(rate * 100).toFixed(1)}%`;
  }

  /**
   * Get buyer processing fee rate as string
   */
  static getBuyerFeeRateString(): string {
    return this.formatFeePercentage(this.BUYER_FEE_RATE);
  }

  /**
   * Get seller platform fee rate as string
   */
  static getSellerFeeRateString(): string {
    return this.formatFeePercentage(this.SELLER_FEE_RATE);
  }

  /**
   * Get minimum seller fee as formatted string
   */
  static getMinimumSellerFeeString(currency: string = 'RM'): string {
    return this.formatAmount(this.MINIMUM_SELLER_FEE, currency);
  }

  /**
   * Get minimum buyer fee as formatted string
   */
  static getMinimumBuyerFeeString(currency: string = 'RM'): string {
    return this.formatAmount(this.MINIMUM_BUYER_FEE, currency);
  }

  /**
   * Calculate seller payout after platform fees
   */
  static calculateSellerPayout(amount: number): {
    originalAmount: number;
    platformFee: number;
    sellerReceives: number;
    effectiveFeeRate: number;
  } {
    const originalAmount = amount;
    const calculatedFee = Math.round((amount * this.SELLER_FEE_RATE) * 100) / 100;
    const platformFee = Math.max(calculatedFee, this.MINIMUM_SELLER_FEE);
    const sellerReceives = amount - platformFee;
    const effectiveFeeRate = platformFee / amount;

    return {
      originalAmount,
      platformFee,
      sellerReceives,
      effectiveFeeRate
    };
  }

  /**
   * Validate amount meets minimum requirements
   */
  static validateAmount(amount: number): {
    valid: boolean;
    error?: string;
    minimumRequired?: number;
  } {
    if (amount <= 0) {
      return {
        valid: false,
        error: 'Amount must be greater than zero'
      };
    }

    // Ensure seller receives at least RM1 after platform fees
    const payout = this.calculateSellerPayout(amount);
    if (payout.sellerReceives < 1) {
      const minimumRequired = this.MINIMUM_SELLER_FEE + 1;
      return {
        valid: false,
        error: `Amount too low. Minimum required: ${this.formatAmount(minimumRequired)}`,
        minimumRequired
      };
    }

    return { valid: true };
  }

  /**
   * Calculate the minimum amount needed for a desired seller payout
   */
  static calculateMinimumAmountForPayout(desiredPayout: number): number {
    // If using minimum fee (RM 4.90)
    const amountWithMinFee = desiredPayout + this.MINIMUM_SELLER_FEE;
    
    // If using percentage fee (11%)
    const amountWithPercentageFee = desiredPayout / (1 - this.SELLER_FEE_RATE);
    
    // Use whichever results in higher amount (more conservative)
    return Math.max(amountWithMinFee, amountWithPercentageFee);
  }

  /**
   * Get fee disclosure text for UI
   */
  static getFeeDisclosureText(): {
    buyerFeeText: string;
    sellerFeeText: string;
    fullDisclosure: string;
  } {
    return {
      buyerFeeText: `All purchases include a ${this.getBuyerFeeRateString()} processing fee or ${this.formatAmount(this.MINIMUM_BUYER_FEE)}, whichever is higher`,
      sellerFeeText: `Platform fee: ${this.getSellerFeeRateString()} or ${this.getMinimumSellerFeeString()}, whichever is higher`,
      fullDisclosure: `Buyers pay a ${this.getBuyerFeeRateString()} processing fee or ${this.formatAmount(this.MINIMUM_BUYER_FEE)} (whichever is higher) on all transactions. Sellers pay a platform fee of ${this.getSellerFeeRateString()} or ${this.getMinimumSellerFeeString()} (whichever is higher) that is deducted from their earnings.`
    };
  }
}
