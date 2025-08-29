import { supabase, supabaseAdmin } from './supabase';
import { PaymentReleasePDFService } from './payment-release-pdf-service';

export interface OrderData {
  id: string;
  service_title: string;
  amount: number;
  platform_fee?: number;
  payment_released_at: string;
  status: string;
  service_provider_id?: string;
  seller_id?: string;
  buyer_id: string;
  service_provider_name?: string;
  buyer_name?: string;
}

export class OnDemandPDFService {
  /**
   * Get or generate PDF receipt for an order
   * This is the main method that implements the on-demand approach
   */
  static async getOrGeneratePDFReceipt(orderId: string, orderData?: OrderData): Promise<{
    success: boolean;
    pdfUrl?: string;
    error?: string;
    generated?: boolean;
  }> {
    try {
      console.log('📄 Getting or generating PDF receipt for order:', orderId);

      // Step 1: Try to get existing PDF receipt
      const existingPdf = await PaymentReleasePDFService.getPDFReceipt(orderId);
      
      if (existingPdf.success && existingPdf.pdfUrl) {
        console.log('✅ Found existing PDF receipt');
        
        // Verify the PDF is accessible
        try {
          const response = await fetch(existingPdf.pdfUrl, { method: 'HEAD' });
          if (response.ok) {
            return {
              success: true,
              pdfUrl: existingPdf.pdfUrl,
              generated: false
            };
          }
        } catch (fetchError) {
          console.log('⚠️ Existing PDF not accessible, will regenerate');
        }
      }

      // Step 2: If no existing PDF or not accessible, generate new one
      console.log('🔄 No accessible PDF found, generating new receipt...');

      if (!orderData) {
        // Try to fetch order data from database
        const fetchedOrderData = await this.fetchOrderData(orderId);
        if (!fetchedOrderData) {
          return {
            success: false,
            error: 'Order data not found'
          };
        }
        orderData = fetchedOrderData;
      }

      // Validate order is eligible for PDF receipt
      if (orderData.status !== 'completed' || !orderData.payment_released_at) {
        return {
          success: false,
          error: 'PDF receipt is only available for completed orders with released payments'
        };
      }

      // Generate new PDF receipt
      const generateResult = await PaymentReleasePDFService.generateAndStorePDF(
        {
          id: orderData.id,
          title: orderData.service_title,
          service_title: orderData.service_title,
          service_provider_id: orderData.service_provider_id || orderData.seller_id,
          seller_id: orderData.seller_id,
          buyer_id: orderData.buyer_id,
          price: orderData.amount,
          amount: orderData.amount,
          platform_fee: orderData.platform_fee || 0,
          payment_released_at: orderData.payment_released_at,
          status: orderData.status,
          service_provider_name: orderData.service_provider_name || 'Service Provider',
          buyer_name: orderData.buyer_name || 'Customer'
        },
        'orders',
        {
          id: '00000000-0000-0000-0000-000000000000',
          name: 'BetaMe System',
          email: 'system@betame.com.my'
        }
      );

      if (generateResult.success && generateResult.pdfUrl) {
        console.log('✅ PDF receipt generated successfully');
        return {
          success: true,
          pdfUrl: generateResult.pdfUrl,
          generated: true
        };
      } else {
        return {
          success: false,
          error: generateResult.error || 'Failed to generate PDF receipt'
        };
      }

    } catch (error) {
      console.error('❌ Error in getOrGeneratePDFReceipt:', error);
      return {
        success: false,
        error: error.message || 'Failed to get or generate PDF receipt'
      };
    }
  }

  /**
   * Fetch order data from database
   */
  private static async fetchOrderData(orderId: string): Promise<OrderData | null> {
    try {
      console.log('🔍 Fetching order data for ID:', orderId);

      // Try to get from orders table first
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .select(`
          id,
          service_title,
          amount,
          platform_fee,
          payment_released_at,
          status,
          service_provider_id,
          buyer_id,
          profiles_service_provider:service_provider_id(full_name),
          profiles_buyer:buyer_id(full_name)
        `)
        .eq('id', orderId)
        .single();

      if (orderData) {
        console.log('✅ Found order data in orders table');
        return {
          id: orderData.id,
          service_title: orderData.service_title,
          amount: orderData.amount,
          platform_fee: orderData.platform_fee,
          payment_released_at: orderData.payment_released_at,
          status: orderData.status,
          service_provider_id: orderData.service_provider_id,
          buyer_id: orderData.buyer_id,
          service_provider_name: orderData.profiles_service_provider?.full_name,
          buyer_name: orderData.profiles_buyer?.full_name
        };
      }

      // If not found in orders, try active_jobs table
      const { data: jobData, error: jobError } = await supabaseAdmin
        .from('active_jobs')
        .select(`
          id,
          title,
          price,
          status,
          seller_id,
          buyer_id,
          payment_released_at,
          profiles_seller:seller_id(full_name),
          profiles_buyer:buyer_id(full_name)
        `)
        .eq('id', orderId)
        .single();

      if (jobData) {
        console.log('✅ Found order data in active_jobs table');
        return {
          id: jobData.id,
          service_title: jobData.title,
          amount: jobData.price,
          platform_fee: 0, // Default for active_jobs
          payment_released_at: jobData.payment_released_at,
          status: jobData.status,
          seller_id: jobData.seller_id,
          buyer_id: jobData.buyer_id,
          service_provider_name: jobData.profiles_seller?.full_name,
          buyer_name: jobData.profiles_buyer?.full_name
        };
      }

      console.log('❌ Order not found in any table');
      return null;

    } catch (error) {
      console.error('❌ Error fetching order data:', error);
      return null;
    }
  }

  /**
   * Check if order is eligible for PDF receipt
   */
  static isOrderEligibleForReceipt(orderData: OrderData): boolean {
    return orderData.status === 'completed' && !!orderData.payment_released_at;
  }

  /**
   * Get receipt status for an order
   */
  static async getReceiptStatus(orderId: string): Promise<{
    hasReceipt: boolean;
    isEligible: boolean;
    canGenerate: boolean;
    error?: string;
  }> {
    try {
      // Check if PDF already exists
      const existingPdf = await PaymentReleasePDFService.getPDFReceipt(orderId);
      const hasReceipt = existingPdf.success && !!existingPdf.pdfUrl;

      // Get order data to check eligibility
      const orderData = await this.fetchOrderData(orderId);
      if (!orderData) {
        return {
          hasReceipt: false,
          isEligible: false,
          canGenerate: false,
          error: 'Order not found'
        };
      }

      const isEligible = this.isOrderEligibleForReceipt(orderData);

      return {
        hasReceipt,
        isEligible,
        canGenerate: isEligible && !hasReceipt
      };

    } catch (error) {
      console.error('❌ Error checking receipt status:', error);
      return {
        hasReceipt: false,
        isEligible: false,
        canGenerate: false,
        error: error.message || 'Failed to check receipt status'
      };
    }
  }

  /**
   * Bulk generate receipts for multiple orders
   */
  static async bulkGenerateReceipts(orderIds: string[]): Promise<{
    success: number;
    failed: number;
    results: Array<{ orderId: string; success: boolean; pdfUrl?: string; error?: string }>;
  }> {
    const results = [];
    let success = 0;
    let failed = 0;

    for (const orderId of orderIds) {
      try {
        const result = await this.getOrGeneratePDFReceipt(orderId);
        if (result.success) {
          success++;
          results.push({
            orderId,
            success: true,
            pdfUrl: result.pdfUrl
          });
        } else {
          failed++;
          results.push({
            orderId,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        failed++;
        results.push({
          orderId,
          success: false,
          error: error.message || 'Unknown error'
        });
      }
    }

    return {
      success,
      failed,
      results
    };
  }
}