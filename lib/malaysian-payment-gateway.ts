import { Alert } from 'react-native';

export interface MalaysianPaymentGateway {
  id: string;
  name: string;
  icon: string;
  description: string;
  processingFee: number;
  minAmount: number;
  maxAmount: number;
  supportedBanks?: string[];
  isAvailable: boolean;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  description: string;
  buyerId: string;
  sellerId: string;
  serviceId: string;
  paymentMethod: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  error?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export interface PaymentStatus {
  transactionId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  completedAt?: string;
  errorMessage?: string;
}

export class MalaysianPaymentGatewayService {
  private static readonly GATEWAYS: MalaysianPaymentGateway[] = [
    {
      id: 'fpx',
      name: 'FPX Online Banking',
      icon: '🏦',
      description: 'Direct bank transfer via FPX',
      processingFee: 1.50,
      minAmount: 1.00,
      maxAmount: 10000.00,
      supportedBanks: [
        'Maybank',
        'CIMB Bank',
        'Public Bank',
        'RHB Bank',
        'Hong Leong Bank',
        'AmBank',
        'Affin Bank',
        'Alliance Bank',
        'Bank Islam',
        'Bank Rakyat',
        'BSN',
        'CIMB Islamic',
        'Hong Leong Islamic Bank',
        'Kuwait Finance House',
        'OCBC Bank',
        'Standard Chartered',
        'UOB Bank'
      ],
      isAvailable: true,
    },
    {
      id: 'tng',
      name: 'Touch \'n Go eWallet',
      icon: '📱',
      description: 'Pay with TnG eWallet',
      processingFee: 0.50,
      minAmount: 1.00,
      maxAmount: 5000.00,
      isAvailable: true,
    },
    {
      id: 'grabpay',
      name: 'GrabPay',
      icon: '🚗',
      description: 'Pay with GrabPay wallet',
      processingFee: 0.50,
      minAmount: 1.00,
      maxAmount: 5000.00,
      isAvailable: true,
    },
    {
      id: 'boost',
      name: 'Boost',
      icon: '🚀',
      description: 'Pay with Boost wallet',
      processingFee: 0.50,
      minAmount: 1.00,
      maxAmount: 5000.00,
      isAvailable: true,
    },
    {
      id: 'shopee',
      name: 'ShopeePay',
      icon: '🛍️',
      description: 'Pay with ShopeePay wallet',
      processingFee: 0.50,
      minAmount: 1.00,
      maxAmount: 5000.00,
      isAvailable: true,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: '💳',
      description: 'Pay with PayPal',
      processingFee: 2.90,
      minAmount: 1.00,
      maxAmount: 10000.00,
      isAvailable: true,
    },
  ];

  /**
   * Get all available payment gateways
   */
  static getAvailableGateways(): MalaysianPaymentGateway[] {
    return this.GATEWAYS.filter(gateway => gateway.isAvailable);
  }

  /**
   * Get a specific gateway by ID
   */
  static getGatewayById(id: string): MalaysianPaymentGateway | undefined {
    return this.GATEWAYS.find(gateway => gateway.id === id);
  }

  /**
   * Validate payment amount for a specific gateway
   */
  static validateAmount(gatewayId: string, amount: number): { valid: boolean; error?: string } {
    const gateway = this.getGatewayById(gatewayId);
    if (!gateway) {
      return { valid: false, error: 'Payment gateway not found' };
    }

    if (amount < gateway.minAmount) {
      return { 
        valid: false, 
        error: `Minimum amount for ${gateway.name} is RM ${gateway.minAmount.toFixed(2)}` 
      };
    }

    if (amount > gateway.maxAmount) {
      return { 
        valid: false, 
        error: `Maximum amount for ${gateway.name} is RM ${gateway.maxAmount.toFixed(2)}` 
      };
    }

    return { valid: true };
  }

  /**
   * Calculate total amount with processing fee
   */
  static calculateTotalAmount(gatewayId: string, baseAmount: number): number {
    const gateway = this.getGatewayById(gatewayId);
    if (!gateway) return baseAmount;
    
    return baseAmount + gateway.processingFee;
  }

  /**
   * Initiate payment through Malaysian payment gateway
   */
  static async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Validate amount
      const validation = this.validateAmount(request.paymentMethod, request.amount);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          status: 'failed'
        };
      }

      // Generate transaction ID
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock payment processing based on payment method
      switch (request.paymentMethod) {
        case 'fpx':
          return this.processFPXPayment(request, transactionId);
        case 'tng':
          return this.processTnGPayment(request, transactionId);
        case 'grabpay':
          return this.processGrabPayPayment(request, transactionId);
        case 'boost':
          return this.processBoostPayment(request, transactionId);
        case 'shopee':
          return this.processShopeePayment(request, transactionId);
        case 'paypal':
          return this.processPayPalPayment(request, transactionId);
        default:
          return {
            success: false,
            error: 'Unsupported payment method',
            status: 'failed'
          };
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      return {
        success: false,
        error: 'Payment initiation failed',
        status: 'failed'
      };
    }
  }

  /**
   * Check payment status
   */
  static async checkPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock status check - in real implementation, this would query the payment gateway
    const statuses: ('pending' | 'completed' | 'failed' | 'cancelled')[] = ['pending', 'completed', 'failed', 'cancelled'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      transactionId,
      status: randomStatus,
      amount: 0, // Would be actual amount from gateway
      currency: 'MYR',
      completedAt: randomStatus === 'completed' ? new Date().toISOString() : undefined,
      errorMessage: randomStatus === 'failed' ? 'Payment failed due to insufficient funds' : undefined,
    };
  }

  /**
   * Process FPX (Online Banking) payment
   */
  private static async processFPXPayment(request: PaymentRequest, transactionId: string): Promise<PaymentResponse> {
    // Simulate FPX payment flow
    const redirectUrl = `https://mock-fpx-gateway.com/pay?txn=${transactionId}&amount=${request.amount}&bank=maybank`;
    
    return {
      success: true,
      transactionId,
      redirectUrl,
      status: 'pending'
    };
  }

  /**
   * Process Touch 'n Go eWallet payment
   */
  private static async processTnGPayment(request: PaymentRequest, transactionId: string): Promise<PaymentResponse> {
    // Simulate TnG payment flow
    const redirectUrl = `https://mock-tng-gateway.com/pay?txn=${transactionId}&amount=${request.amount}`;
    
    return {
      success: true,
      transactionId,
      redirectUrl,
      status: 'pending'
    };
  }

  /**
   * Process GrabPay payment
   */
  private static async processGrabPayPayment(request: PaymentRequest, transactionId: string): Promise<PaymentResponse> {
    // Simulate GrabPay payment flow
    const redirectUrl = `https://mock-grabpay-gateway.com/pay?txn=${transactionId}&amount=${request.amount}`;
    
    return {
      success: true,
      transactionId,
      redirectUrl,
      status: 'pending'
    };
  }

  /**
   * Process Boost payment
   */
  private static async processBoostPayment(request: PaymentRequest, transactionId: string): Promise<PaymentResponse> {
    // Simulate Boost payment flow
    const redirectUrl = `https://mock-boost-gateway.com/pay?txn=${transactionId}&amount=${request.amount}`;
    
    return {
      success: true,
      transactionId,
      redirectUrl,
      status: 'pending'
    };
  }

  /**
   * Process ShopeePay payment
   */
  private static async processShopeePayment(request: PaymentRequest, transactionId: string): Promise<PaymentResponse> {
    // Simulate ShopeePay payment flow
    const redirectUrl = `https://mock-shopeepay-gateway.com/pay?txn=${transactionId}&amount=${request.amount}`;
    
    return {
      success: true,
      transactionId,
      redirectUrl,
      status: 'pending'
    };
  }

  /**
   * Process PayPal payment
   */
  private static async processPayPalPayment(request: PaymentRequest, transactionId: string): Promise<PaymentResponse> {
    // Simulate PayPal payment flow
    const redirectUrl = `https://mock-paypal-gateway.com/pay?txn=${transactionId}&amount=${request.amount}`;
    
    return {
      success: true,
      transactionId,
      redirectUrl,
      status: 'pending'
    };
  }

  /**
   * Simulate payment completion (for testing)
   */
  static async simulatePaymentCompletion(transactionId: string): Promise<PaymentStatus> {
    // Simulate successful payment completion
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      transactionId,
      status: 'completed',
      amount: 0, // Would be actual amount
      currency: 'MYR',
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Get supported banks for FPX
   */
  static getSupportedBanks(): string[] {
    const fpxGateway = this.getGatewayById('fpx');
    return fpxGateway?.supportedBanks || [];
  }
} 