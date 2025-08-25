import { supabase } from './supabase';
import { WalletService } from './wallet-service';

export interface PaymentStatusUpdate {
  transaction_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  payment_id?: string;
  error_message?: string;
}

export class PaymentStatusService {
  private static instance: PaymentStatusService;
  private subscriptions: Map<string, any> = new Map();

  public static getInstance(): PaymentStatusService {
    if (!PaymentStatusService.instance) {
      PaymentStatusService.instance = new PaymentStatusService();
    }
    return PaymentStatusService.instance;
  }

  /**
   * Subscribe to payment status updates for a specific transaction
   */
  subscribeToPaymentStatus(
    transactionId: string,
    onUpdate: (update: PaymentStatusUpdate) => void
  ): () => void {
    // Unsubscribe from existing subscription if any
    this.unsubscribeFromPaymentStatus(transactionId);

    const subscription = supabase
      .channel(`payment_status_${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_transactions',
          filter: `id=eq.${transactionId}`,
        },
        async (payload) => {
          const transaction = payload.new as any;
          
          const update: PaymentStatusUpdate = {
            transaction_id: transaction.id,
            status: transaction.status,
            payment_id: transaction.curlec_payment_id,
            error_message: transaction.error_message,
          };

          // If payment is completed, process it
          if (transaction.status === 'completed' && transaction.payment_type === 'betacoin_purchase') {
            await this.processCompletedPayment(transaction);
          }

          onUpdate(update);
        }
      )
      .subscribe();

    this.subscriptions.set(transactionId, subscription);

    // Return unsubscribe function
    return () => this.unsubscribeFromPaymentStatus(transactionId);
  }

  /**
   * Unsubscribe from payment status updates
   */
  unsubscribeFromPaymentStatus(transactionId: string): void {
    const subscription = this.subscriptions.get(transactionId);
    if (subscription) {
      supabase.removeChannel(subscription);
      this.subscriptions.delete(transactionId);
    }
  }

  /**
   * Process a completed payment
   */
  private async processCompletedPayment(transaction: any): Promise<void> {
    try {
      const betacoinAmount = transaction.metadata?.betacoin_amount || 0;
      
      if (betacoinAmount > 0) {
        const result = await WalletService.addBetaCoins(transaction.user_id, betacoinAmount);
        
        if (!result.success) {
          console.error('Failed to add BetaCoins after payment:', result.error);
        } else {
          console.log(`Successfully added ${betacoinAmount} BetaCoins to user ${transaction.user_id}`);
        }
      }
    } catch (error) {
      console.error('Error processing completed payment:', error);
    }
  }

  /**
   * Get current payment status
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentStatusUpdate | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        transaction_id: data.id,
        status: data.status,
        payment_id: data.curlec_payment_id,
        error_message: data.error_message,
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      return null;
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach((subscription, transactionId) => {
      this.unsubscribeFromPaymentStatus(transactionId);
    });
  }
}
