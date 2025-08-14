import { supabase } from './supabase';

export interface Order {
  id: string;
  service_offer_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  platform_fee: number;
  total_amount: number;
  status: OrderStatus;
  dispute_status: DisputeStatus;
  service_title: string;
  service_description?: string;
  payment_received_at: string;
  work_started_at?: string;
  work_completed_at?: string;
  buyer_review_started_at?: string;
  completion_confirmed_at?: string;
  payment_released_at?: string;
  auto_release_at?: string;
  dispute_raised_at?: string;
  dispute_reason?: string;
  dispute_resolved_at?: string;
  refund_requested_at?: string;
  refund_preference?: RefundPreference;
  refund_amount?: number;
  refund_processed_at?: string;
  requires_admin_intervention: boolean;
  admin_notes?: string;
  admin_resolved_at?: string;
  admin_resolved_by?: string;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 
  | 'payment_received'
  | 'work_in_progress'
  | 'work_completed'
  | 'buyer_reviewing'
  | 'completed'
  | 'disputed'
  | 'cancelled'
  | 'refund_requested'
  | 'partial_refund';

export type DisputeStatus = 
  | 'none'
  | 'raised'
  | 'under_review'
  | 'resolved_seller_favor'
  | 'resolved_buyer_favor'
  | 'resolved_partial';

export type RefundPreference = 'store_as_credit' | 'request_refund';

export interface OrderTimeline {
  id: string;
  order_id: string;
  event_type: string;
  event_description: string;
  triggered_by?: string;
  metadata: any;
  created_at: string;
}

export interface TemporaryPayout {
  id: string;
  order_id: string;
  seller_id: string;
  amount: number;
  payout_method: 'betacoin_credit' | 'manual_transfer' | 'bank_transfer' | 'digital_wallet';
  payout_status: 'pending' | 'processing' | 'completed' | 'failed';
  payout_reference?: string;
  payout_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

class OrderManagementService {
  // Create a new order when payment is received
  async createOrder(orderData: {
    service_offer_id: string;
    buyer_id: string;
    seller_id: string;
    amount: number;
    platform_fee?: number;
    service_title: string;
    service_description?: string;
  }): Promise<Order | null> {
    try {
      const total_amount = orderData.amount + (orderData.platform_fee || 0);
      
      const { data, error } = await supabase
        .from('orders')
        .insert({
          ...orderData,
          total_amount,
          platform_fee: orderData.platform_fee || 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Add initial timeline event
      await this.addTimelineEvent(
        data.id,
        'order_created',
        'Order created and payment received',
        orderData.buyer_id
      );

      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      return null;
    }
  }

  // Start work on an order
  async startWork(orderId: string, sellerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'work_in_progress',
          work_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('seller_id', sellerId)
        .eq('status', 'payment_received');

      if (error) throw error;

      await this.addTimelineEvent(
        orderId,
        'work_started',
        'Seller started working on the order',
        sellerId
      );

      return true;
    } catch (error) {
      console.error('Error starting work:', error);
      return false;
    }
  }

  // Mark work as completed (triggers 24-hour review period)
  async markWorkCompleted(orderId: string, sellerId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('mark_work_completed', {
        p_order_id: orderId,
        p_seller_id: sellerId,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking work completed:', error);
      return false;
    }
  }

  // Buyer confirms work completion
  async confirmWorkCompletion(orderId: string, buyerId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('confirm_work_completion', {
        p_order_id: orderId,
        p_buyer_id: buyerId,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error confirming work completion:', error);
      return false;
    }
  }

  // Raise a dispute (within 24 hours of work completion)
  async raiseDispute(
    orderId: string, 
    buyerId: string, 
    disputeReason: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('raise_dispute', {
        p_order_id: orderId,
        p_buyer_id: buyerId,
        p_dispute_reason: disputeReason,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error raising dispute:', error);
      return false;
    }
  }

  // Request refund
  async requestRefund(
    orderId: string,
    buyerId: string,
    refundPreference: RefundPreference,
    refundAmount?: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('request_refund', {
        p_order_id: orderId,
        p_buyer_id: buyerId,
        p_refund_preference: refundPreference,
        p_refund_amount: refundAmount,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error requesting refund:', error);
      return false;
    }
  }

  // Get order details
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting order:', error);
      return null;
    }
  }

  // Get orders for a user (buyer or seller)
  async getUserOrders(userId: string, role: 'buyer' | 'seller' | 'both' = 'both'): Promise<Order[]> {
    try {
      let query = supabase.from('orders').select('*');

      if (role === 'buyer') {
        query = query.eq('buyer_id', userId);
      } else if (role === 'seller') {
        query = query.eq('seller_id', userId);
      } else {
        query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user orders:', error);
      return [];
    }
  }

  // Get order timeline
  async getOrderTimeline(orderId: string): Promise<OrderTimeline[]> {
    try {
      const { data, error } = await supabase
        .from('order_timeline')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting order timeline:', error);
      return [];
    }
  }

  // Get orders requiring admin intervention
  async getOrdersRequiringAdminIntervention(): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('requires_admin_intervention', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting orders requiring admin intervention:', error);
      return [];
    }
  }

  // Get orders ready for auto-release
  async getOrdersReadyForAutoRelease(): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'buyer_reviewing')
        .eq('dispute_status', 'none')
        .lte('auto_release_at', new Date().toISOString())
        .order('auto_release_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting orders ready for auto-release:', error);
      return [];
    }
  }

  // Process auto-release (should be called by cron job)
  async processAutoRelease(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('auto_release_payments');

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error processing auto-release:', error);
      return 0;
    }
  }

  // Get temporary payouts for a seller
  async getSellerPayouts(sellerId: string): Promise<TemporaryPayout[]> {
    try {
      const { data, error } = await supabase
        .from('temporary_payouts')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting seller payouts:', error);
      return [];
    }
  }

  // Get all pending payouts (for admin)
  async getPendingPayouts(): Promise<TemporaryPayout[]> {
    try {
      const { data, error } = await supabase
        .from('temporary_payouts')
        .select('*')
        .eq('payout_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting pending payouts:', error);
      return [];
    }
  }

  // Add timeline event
  private async addTimelineEvent(
    orderId: string,
    eventType: string,
    eventDescription: string,
    triggeredBy?: string,
    metadata: any = {}
  ): Promise<void> {
    try {
      await supabase.rpc('add_order_timeline_event', {
        p_order_id: orderId,
        p_event_type: eventType,
        p_event_description: eventDescription,
        p_triggered_by: triggeredBy,
        p_metadata: metadata,
      });
    } catch (error) {
      console.error('Error adding timeline event:', error);
    }
  }

  // Check if dispute can be raised (within 24 hours)
  async canRaiseDispute(orderId: string): Promise<boolean> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) return false;

      // Can only dispute if in buyer_reviewing status
      if (order.status !== 'buyer_reviewing') return false;

      // Check if within 24-hour window
      if (order.work_completed_at) {
        const completedAt = new Date(order.work_completed_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 24;
      }

      return false;
    } catch (error) {
      console.error('Error checking dispute eligibility:', error);
      return false;
    }
  }

  // Get time remaining for buyer review
  async getReviewTimeRemaining(orderId: string): Promise<number | null> {
    try {
      const order = await this.getOrder(orderId);
      if (!order || order.status !== 'buyer_reviewing' || !order.auto_release_at) {
        return null;
      }

      const autoReleaseAt = new Date(order.auto_release_at);
      const now = new Date();
      const msRemaining = autoReleaseAt.getTime() - now.getTime();
      
      return Math.max(0, msRemaining);
    } catch (error) {
      console.error('Error getting review time remaining:', error);
      return null;
    }
  }

  // Format time remaining for display
  formatTimeRemaining(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

export const orderManagementService = new OrderManagementService();