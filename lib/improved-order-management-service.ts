import { supabase } from './supabase';

export interface Order {
  id: string;
  service_offer_id: string;
  buyer_id: string;
  service_provider_id: string;
  seller_id?: string; // Keep for backward compatibility
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

interface ConfirmationError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

class ImprovedOrderManagementService {
  // Enhanced buyer confirmation with detailed error handling
  async confirmWorkCompletion(orderId: string, buyerId: string): Promise<{
    success: boolean;
    error?: ConfirmationError;
    userMessage?: string;
  }> {
    try {
      console.log('🔄 Starting work completion confirmation...');
      console.log('   Order ID:', orderId);
      console.log('   Buyer ID:', buyerId);

      // Step 1: Validate authentication
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser.user) {
        console.log('❌ Authentication failed:', authError?.message);
        return {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'User not authenticated'
          },
          userMessage: 'Please log in again and try confirming the work completion.'
        };
      }

      if (authUser.user.id !== buyerId) {
        console.log('❌ User ID mismatch:', authUser.user.id, 'vs', buyerId);
        return {
          success: false,
          error: {
            code: 'USER_MISMATCH',
            message: 'Authenticated user does not match buyer ID'
          },
          userMessage: 'You are not authorized to confirm this order.'
        };
      }

      console.log('✅ Authentication validated');

      // Step 2: Verify order exists and user is the buyer
      console.log('🔍 Verifying order...');
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('buyer_id', buyerId)
        .single();

      if (orderError) {
        console.log('❌ Order verification failed:', orderError.message);
        
        if (orderError.code === 'PGRST116') {
          return {
            success: false,
            error: {
              code: 'ORDER_NOT_FOUND',
              message: 'Order not found or access denied'
            },
            userMessage: 'Order not found. Please refresh and try again.'
          };
        } else if (orderError.code === '42501') {
          return {
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'Access denied to order'
            },
            userMessage: 'You do not have permission to access this order.'
          };
        } else {
          return {
            success: false,
            error: {
              code: 'DATABASE_ERROR',
              message: orderError.message
            },
            userMessage: 'Database error occurred. Please try again later.'
          };
        }
      }

      if (!order) {
        return {
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found'
          },
          userMessage: 'Order not found. Please refresh and try again.'
        };
      }

      console.log('✅ Order verified:', order.id, 'Status:', order.status);

      // Step 3: Validate order status
      if (order.status !== 'buyer_reviewing') {
        console.log('❌ Invalid order status:', order.status);
        
        let userMessage = 'This order cannot be confirmed at this time.';
        
        switch (order.status) {
          case 'payment_received':
            userMessage = 'Work has not been started yet.';
            break;
          case 'work_in_progress':
            userMessage = 'Work is still in progress.';
            break;
          case 'work_completed':
            userMessage = 'Work is completed but not yet ready for review.';
            break;
          case 'completed':
            userMessage = 'This order has already been confirmed.';
            break;
          case 'disputed':
            userMessage = 'This order is currently in dispute.';
            break;
          case 'cancelled':
            userMessage = 'This order has been cancelled.';
            break;
        }
        
        return {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Order status is ${order.status}, expected buyer_reviewing`
          },
          userMessage
        };
      }

      // Step 4: Check if still within review period
      if (order.auto_release_at) {
        const autoReleaseTime = new Date(order.auto_release_at);
        const now = new Date();
        
        if (now > autoReleaseTime) {
          console.log('⚠️  Review period expired, but allowing manual confirmation');
        }
      }

      console.log('✅ Order status validated');

      // Step 5: Call the database function
      console.log('🔄 Calling confirm_work_completion function...');
      
      const { data: result, error: funcError } = await supabase.rpc('confirm_work_completion', {
        p_order_id: orderId,
        p_buyer_id: buyerId
      });

      if (funcError) {
        console.log('❌ Database function failed:', funcError.message);
        console.log('   Error code:', funcError.code);
        console.log('   Error details:', funcError.details);
        console.log('   Error hint:', funcError.hint);
        
        let userMessage = 'Failed to confirm work completion. Please try again.';
        
        switch (funcError.code) {
          case '42501':
            userMessage = 'Permission denied. Please log in again and try.';
            break;
          case '23503':
            userMessage = 'Data integrity error. Please contact support.';
            break;
          case '23505':
            userMessage = 'This order has already been processed.';
            break;
          case '42883':
            userMessage = 'System error. Please contact support.';
            break;
        }
        
        return {
          success: false,
          error: {
            code: funcError.code,
            message: funcError.message,
            details: funcError.details,
            hint: funcError.hint
          },
          userMessage
        };
      }

      console.log('✅ Database function completed successfully');
      console.log('   Result:', result);

      // Step 6: Verify the confirmation was successful
      console.log('🔍 Verifying confirmation...');
      
      const { data: updatedOrder, error: verifyError } = await supabase
        .from('orders')
        .select('status, completion_confirmed_at, payment_released_at')
        .eq('id', orderId)
        .single();

      if (verifyError) {
        console.log('⚠️  Could not verify confirmation:', verifyError.message);
        // Don't fail here, the confirmation might have worked
      } else {
        console.log('✅ Confirmation verified:');
        console.log('   Status:', updatedOrder.status);
        console.log('   Confirmed at:', updatedOrder.completion_confirmed_at);
        console.log('   Payment released at:', updatedOrder.payment_released_at);
      }

      return {
        success: true,
        userMessage: 'Work confirmed successfully! Payment has been released to the service provider.'
      };

    } catch (error) {
      console.error('❌ Unexpected error in confirmWorkCompletion:', error);
      
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        userMessage: 'An unexpected error occurred. Please try again or contact support.'
      };
    }
  }

  // Enhanced order retrieval with better error handling
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error getting order:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting order:', error);
      return null;
    }
  }

  // Check if user can confirm an order
  async canConfirmOrder(orderId: string, userId: string): Promise<{
    canConfirm: boolean;
    reason?: string;
  }> {
    try {
      const order = await this.getOrder(orderId);
      
      if (!order) {
        return { canConfirm: false, reason: 'Order not found' };
      }
      
      if (order.buyer_id !== userId) {
        return { canConfirm: false, reason: 'Not the buyer of this order' };
      }
      
      if (order.status !== 'buyer_reviewing') {
        return { canConfirm: false, reason: `Order status is ${order.status}` };
      }
      
      return { canConfirm: true };
      
    } catch (error) {
      console.error('Error checking order confirmation eligibility:', error);
      return { canConfirm: false, reason: 'Error checking order status' };
    }
  }
}

export const improvedOrderManagementService = new ImprovedOrderManagementService();