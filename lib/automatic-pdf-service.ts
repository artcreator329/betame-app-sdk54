import { supabase, supabaseAdmin } from './supabase';
import { ServerPDFService } from './server-pdf-service';

export interface AdminInfo {
  id: string;
  name: string;
  email: string;
}

export interface JobData {
  id: string;
  title?: string;
  service_title?: string;
  service_provider_id?: string;
  seller_id?: string;
  buyer_id?: string;
  customer_id?: string;
  service_provider_name?: string;
  seller_name?: string;
  buyer_name?: string;
  customer_name?: string;
  price?: number;
  amount?: number;
  payment_amount?: number;
  platform_fee?: number;
  buyer_fee?: number;
  final_payout?: number;
  service_provider_payout?: number;
  payment_released_at?: string;
  admin_release_by?: string;
  status?: string;
  payment_status?: string;
  table_source?: string;
}

export class AutomaticPDFService {
  /**
   * Generate PDF receipt for any payment release
   * This is the main entry point that should be called by all payment release methods
   */
  static async generatePaymentReleasePDF(
    jobData: JobData,
    tableSource: 'active_jobs' | 'orders' | 'escrow_transactions' | 'job_status',
    adminInfo?: AdminInfo
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      console.log('📄 Automatic PDF generation for job:', jobData.id);

      // Determine admin info if not provided
      let adminData: AdminInfo;
      if (adminInfo) {
        adminData = adminInfo;
      } else {
        // Get admin info from the admin_release_by field or use default
        if (jobData.admin_release_by) {
          const { data: adminUser } = await supabaseAdmin
            .from('admin_users')
            .select('id, name, email')
            .eq('id', jobData.admin_release_by)
            .single();
          
          adminData = adminUser || {
            id: jobData.admin_release_by,
            name: 'System Admin',
            email: 'admin@betame.com.my'
          };
        } else {
          // Default admin info for automatic releases
          adminData = {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'BetaMe System',
            email: 'system@betame.com.my'
          };
        }
      }

      // Generate and store PDF
      const result = await ServerPDFService.generateAndStorePDF(
        jobData,
        tableSource,
        adminData
      );

      if (result.success) {
        console.log('✅ Automatic PDF generation successful for job:', jobData.id);
      } else {
        console.error('❌ Automatic PDF generation failed for job:', jobData.id, result.error);
      }

      return result;

    } catch (error) {
      console.error('❌ Error in automatic PDF generation:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate PDF automatically'
      };
    }
  }

  /**
   * Generate PDF for admin payment release
   */
  static async generateAdminPaymentReleasePDF(
    jobId: string,
    adminUserId: string
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      console.log('📄 Generating admin payment release PDF for job:', jobId);

      // Get job data
      const { data: job, error } = await supabase
        .from('active_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !job) {
        return {
          success: false,
          error: 'Job not found'
        };
      }

      // Get admin info
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id, name, email')
        .eq('id', adminUserId)
        .single();

      const adminInfo: AdminInfo = adminUser || {
        id: adminUserId,
        name: 'Admin User',
        email: 'admin@betame.com.my'
      };

      return await this.generatePaymentReleasePDF(job, 'active_jobs', adminInfo);

    } catch (error) {
      console.error('❌ Error generating admin payment release PDF:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate admin payment release PDF'
      };
    }
  }

  /**
   * Generate PDF for escrow payment release
   */
  static async generateEscrowPaymentReleasePDF(
    jobStatusId: string,
    buyerId: string
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      console.log('📄 Generating escrow payment release PDF for job:', jobStatusId);

      // Get job status and escrow transaction
      const { data: jobStatus, error: jobError } = await supabase
        .from('job_status')
        .select(`
          *,
          escrow_transactions!inner(*)
        `)
        .eq('id', jobStatusId)
        .eq('buyer_id', buyerId)
        .single();

      if (jobError || !jobStatus) {
        return {
          success: false,
          error: 'Job not found'
        };
      }

      const escrowTransaction = (jobStatus as any).escrow_transactions;

      // Combine job status and escrow data
      const jobData: JobData = {
        id: jobStatus.id,
        title: escrowTransaction.service_title,
        service_title: escrowTransaction.service_title,
        service_provider_id: escrowTransaction.seller_id,
        seller_id: escrowTransaction.seller_id,
        buyer_id: escrowTransaction.buyer_id,
        customer_id: escrowTransaction.buyer_id,
        price: escrowTransaction.amount,
        amount: escrowTransaction.amount,
        platform_fee: escrowTransaction.platform_fee,
        final_payout: escrowTransaction.amount - escrowTransaction.platform_fee,
        payment_released_at: escrowTransaction.payment_release_date,
        status: jobStatus.current_status,
        table_source: 'escrow_transactions'
      };

      return await this.generatePaymentReleasePDF(jobData, 'escrow_transactions');

    } catch (error) {
      console.error('❌ Error generating escrow payment release PDF:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate escrow payment release PDF'
      };
    }
  }

  /**
   * Generate PDF for order payment release
   */
  static async generateOrderPaymentReleasePDF(
    orderId: string
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      console.log('📄 Generating order payment release PDF for order:', orderId);

      // Get order data using supabaseAdmin to bypass RLS policies
      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !order) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      const jobData: JobData = {
        id: order.id,
        title: order.service_title,
        service_title: order.service_title,
        service_provider_id: order.service_provider_id || order.seller_id,
        seller_id: order.seller_id,
        buyer_id: order.buyer_id,
        customer_id: order.buyer_id,
        price: order.amount,
        amount: order.amount,
        platform_fee: order.platform_fee || 0,
        final_payout: order.amount - (order.platform_fee || 0),
        payment_released_at: order.payment_released_at,
        status: order.status,
        table_source: 'orders'
      };

      return await this.generatePaymentReleasePDF(jobData, 'orders');

    } catch (error) {
      console.error('❌ Error generating order payment release PDF:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate order payment release PDF'
      };
    }
  }

  /**
   * Generate PDF for auto-release payments
   */
  static async generateAutoReleasePDF(
    jobId: string,
    tableSource: 'active_jobs' | 'orders' | 'escrow_transactions'
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      console.log('📄 Generating auto-release PDF for job:', jobId);

      // Get job data based on table source
      let jobData: JobData;
      
      switch (tableSource) {
        case 'active_jobs':
          const { data: activeJob, error: activeJobError } = await supabase
            .from('active_jobs')
            .select('*')
            .eq('id', jobId)
            .single();
          
          if (activeJobError || !activeJob) {
            return { success: false, error: 'Active job not found' };
          }
          jobData = activeJob;
          break;

        case 'orders':
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', jobId)
            .single();
          
          if (orderError || !order) {
            return { success: false, error: 'Order not found' };
          }
          jobData = order;
          break;

        case 'escrow_transactions':
          const { data: escrow, error: escrowError } = await supabase
            .from('escrow_transactions')
            .select('*')
            .eq('id', jobId)
            .single();
          
          if (escrowError || !escrow) {
            return { success: false, error: 'Escrow transaction not found' };
          }
          jobData = escrow;
          break;

        default:
          return { success: false, error: 'Invalid table source' };
      }

      return await this.generatePaymentReleasePDF(jobData, tableSource);

    } catch (error) {
      console.error('❌ Error generating auto-release PDF:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate auto-release PDF'
      };
    }
  }

  /**
   * Check if PDF already exists for a job
   */
  static async checkPDFExists(jobId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('payment_release_pdfs')
        .select('id')
        .eq('job_id', jobId)
        .limit(1);

      if (error) {
        console.error('❌ Error checking PDF existence:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('❌ Error checking PDF existence:', error);
      return false;
    }
  }

  /**
   * Generate PDF if it doesn't exist
   */
  static async generatePDFIfNotExists(
    jobData: JobData,
    tableSource: 'active_jobs' | 'orders' | 'escrow_transactions' | 'job_status',
    adminInfo?: AdminInfo
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      // Check if PDF already exists
      const pdfExists = await this.checkPDFExists(jobData.id);
      
      if (pdfExists) {
        console.log('📄 PDF already exists for job:', jobData.id);
        // Return existing PDF URL
        const { data } = await supabase
          .from('payment_release_pdfs')
          .select('pdf_file_url')
          .eq('job_id', jobData.id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .single();

        return {
          success: true,
          pdfUrl: data?.pdf_file_url
        };
      }

      // Generate new PDF
      return await this.generatePaymentReleasePDF(jobData, tableSource, adminInfo);

    } catch (error) {
      console.error('❌ Error in generatePDFIfNotExists:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate PDF'
      };
    }
  }
}
