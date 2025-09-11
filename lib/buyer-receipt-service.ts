import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { supabase, supabaseAdmin } from './supabase';

export interface BuyerInvoiceData {
  jobId: string;
  jobTableSource: string;
  buyerId: string;
  jobTitle: string;
  serviceProviderName: string;
  buyerName: string;
  serviceAmount: number;
  buyerFee: number;
  totalPaid: number;
  currency: string;
  paymentDate: string;
  completionDate: string;
}

export class BuyerInvoiceService {
  /**
   * Generate buyer invoice PDF content as HTML
   */
  static generateBuyerInvoiceHTML(data: BuyerInvoiceData): string {
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const paymentDate = new Date(data.paymentDate).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const completionDate = new Date(data.completionDate).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${data.jobTitle}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
            page-break-inside: avoid;
          }
          .header {
            background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
            color: white;
            padding: 25px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .content {
            padding: 30px;
          }
          .invoice-number {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            border-left: 4px solid #3B82F6;
          }
          .invoice-number h3 {
            margin: 0;
            color: #3B82F6;
            font-size: 18px;
          }
          .invoice-number p {
            margin: 5px 0 0 0;
            font-family: monospace;
            font-size: 16px;
            font-weight: 600;
          }
          .job-details {
            margin-bottom: 20px;
          }
          .job-details h3 {
            color: #333;
            border-bottom: 2px solid #3B82F6;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 6px 0;
            border-bottom: 1px solid #eee;
          }
          .detail-label {
            font-weight: 600;
            color: #555;
          }
          .detail-value {
            color: #333;
          }
          .payment-breakdown {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .payment-breakdown h3 {
            color: #3B82F6;
            margin-bottom: 12px;
            text-align: center;
          }
          .breakdown-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 4px 0;
          }
          .breakdown-row.total {
            border-top: 2px solid #3B82F6;
            padding-top: 12px;
            margin-top: 12px;
            font-weight: 600;
            font-size: 18px;
            color: #3B82F6;
          }
          .footer {
            text-align: center;
            margin-top: 25px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 12px;
          }
          .logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            font-size: 28px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
          }
          
          .logo svg {
            flex-shrink: 0;
          }
          .status-badge {
            display: inline-block;
            background: #3B82F6;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="logo">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="white" stroke="white" stroke-width="2"/>
                <path d="M12 20C12 15.5817 15.5817 12 20 12C24.4183 12 28 15.5817 28 20C28 24.4183 24.4183 28 20 28C15.5817 28 12 24.4183 12 20Z" fill="#3B82F6"/>
                <path d="M16 20L18.5 22.5L24 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <text x="20" y="32" text-anchor="middle" fill="white" font-size="8" font-weight="bold">β</text>
              </svg>
              BetaMe
            </div>
            <h1>Invoice</h1>
            <p>Official payment confirmation for completed service</p>
          </div>
          
          <div class="content">
            <div class="invoice-number">
              <h3>Invoice Number</h3>
              <p>${invoiceNumber}</p>
            </div>
            
            <div class="job-details">
              <h3>Service Details</h3>
              <div class="detail-row">
                <span class="detail-label">Service Title:</span>
                <span class="detail-value">${data.jobTitle}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Job ID:</span>
                <span class="detail-value">${data.jobId}</span>
              </div>

              <div class="detail-row">
                <span class="detail-label">Buyer:</span>
                <span class="detail-value">${data.buyerName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment Date:</span>
                <span class="detail-value">${paymentDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Completion Date:</span>
                <span class="detail-value">${completionDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <span class="status-badge">Completed</span>
                </span>
              </div>
            </div>
            
            <div class="payment-breakdown">
              <h3>Payment Breakdown</h3>
              <div class="breakdown-row">
                <span>Service Amount:</span>
                <span>${data.currency} ${data.serviceAmount.toFixed(2)}</span>
              </div>
              <div class="breakdown-row">
                <span>Processing Fee (2.2%):</span>
                <span>+ ${data.currency} ${data.buyerFee.toFixed(2)}</span>
              </div>
              <div class="breakdown-row total">
                <span>Total Paid:</span>
                <span>${data.currency} ${data.totalPaid.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an official invoice from BetaMe Platform</p>
            <p>Generated on ${new Date().toLocaleString('en-MY')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Check if a buyer invoice already exists for a job
   */
  static async checkBuyerInvoiceExists(jobId: string): Promise<{ exists: boolean; invoice?: any }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('buyer_receipts')
        .select('*')
        .eq('job_id', jobId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking buyer invoice:', error);
        return { exists: false };
      }

      return {
        exists: !!data,
        invoice: data
      };
    } catch (error) {
      console.error('Error checking buyer invoice:', error);
      return { exists: false };
    }
  }

  /**
   * Generate and store buyer invoice
   */
  static async generateAndStoreBuyerInvoice(data: BuyerInvoiceData): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      console.log('📄 Generating buyer invoice for job:', data.jobId);

      // Check if invoice already exists
      const existingInvoice = await this.checkBuyerInvoiceExists(data.jobId);
      if (existingInvoice.exists && existingInvoice.invoice) {
        console.log('✅ Buyer invoice already exists, returning existing URL');
        return {
          success: true,
          pdfUrl: existingInvoice.invoice.pdf_file_url
        };
      }

      // Generate HTML content
      const htmlContent = this.generateBuyerInvoiceHTML(data);

      // Generate PDF file
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      console.log('📄 PDF generated at:', uri);

      // Read the PDF file as base64
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Convert base64 to array buffer
      const { decode } = await import('base64-arraybuffer');
      const arrayBuffer = decode(base64Data);

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedTitle = data.jobTitle.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
      const fileName = `buyer-invoice-${sanitizedTitle}-${timestamp}.pdf`;
      const filePath = `buyer-invoices/${data.jobId}/${fileName}`;

      console.log('📄 Uploading buyer invoice to path:', filePath);

      // Upload to Supabase storage using admin client to bypass RLS
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('documents')
        .upload(filePath, arrayBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Buyer invoice upload error:', uploadError);
        throw new Error(`Failed to upload buyer invoice: ${uploadError.message}`);
      }

      console.log('✅ Buyer invoice uploaded successfully:', uploadData);

      // Get signed URL for private document
      const { data: urlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 1800); // 30 minutes for buyer receipts

      if (urlError) {
        console.error('Error creating signed URL for buyer receipt:', urlError);
        throw new Error(`Failed to create signed URL: ${urlError.message}`);
      }

      const publicUrl = urlData.signedUrl;
      console.log('✅ Buyer invoice signed URL:', publicUrl);

      // Clean up temporary file
      try {
        await FileSystem.deleteAsync(uri);
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up temporary PDF file:', cleanupError);
      }

      // Store invoice record in database
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const { error: dbError } = await supabaseAdmin
        .from('buyer_receipts')
        .insert({
          job_id: data.jobId,
          job_table_source: data.jobTableSource,
          buyer_id: data.buyerId,
          pdf_file_url: publicUrl,
          pdf_filename: fileName,
          receipt_number: invoiceNumber,
          job_title: data.jobTitle,
          service_provider_name: data.serviceProviderName,
          buyer_name: data.buyerName,
          service_amount: data.serviceAmount,
          buyer_fee: data.buyerFee,
          total_paid: data.totalPaid,
          currency: data.currency,
          generated_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('❌ Database insert error:', dbError);
        throw new Error(`Failed to store buyer invoice record: ${dbError.message}`);
      }

      console.log('✅ Buyer invoice record stored in database');

      return {
        success: true,
        pdfUrl: publicUrl
      };

    } catch (error) {
      console.error('❌ Error in generateAndStoreBuyerReceipt:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate and store buyer invoice'
      };
    }
  }

  /**
   * Get buyer receipt for a specific job
   */
  static async getBuyerReceipt(jobId: string): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      console.log('🔍 Getting buyer receipt for job ID:', jobId);

      const { data, error } = await supabaseAdmin
        .from('buyer_receipts')
        .select('pdf_file_url')
        .eq('job_id', jobId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (data && data.pdf_file_url) {
        console.log('✅ Buyer receipt found:', data.pdf_file_url);
        return {
          success: true,
          pdfUrl: data.pdf_file_url
        };
      }

      console.log('❌ No buyer receipt found for job ID:', jobId);
      return {
        success: false,
        error: 'Buyer receipt not found'
      };

    } catch (error) {
      console.error('❌ Error getting buyer receipt:', error);
      return {
        success: false,
        error: error.message || 'Failed to get buyer receipt'
      };
    }
  }

  /**
   * Delete buyer receipt for a specific job
   */
  static async deleteBuyerReceipt(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Deleting buyer receipt for job ID:', jobId);

      // First get the receipt details to delete the file from storage
      const { data: receipt, error: fetchError } = await supabaseAdmin
        .from('buyer_receipts')
        .select('pdf_file_url, pdf_filename')
        .eq('job_id', jobId)
        .single();

      if (receipt && receipt.pdf_file_url) {
        // Extract file path from URL
        const urlParts = receipt.pdf_file_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `buyer-receipts/${jobId}/${fileName}`;

        console.log('🗑️ Deleting file from storage:', filePath);

        // Delete file from storage
        const { error: storageError } = await supabaseAdmin.storage
          .from('documents')
          .remove([filePath]);

        if (storageError) {
          console.warn('⚠️ Could not delete file from storage:', storageError);
        } else {
          console.log('✅ File deleted from storage');
        }
      }

      // Delete record from database
      const { error: dbError } = await supabaseAdmin
        .from('buyer_receipts')
        .delete()
        .eq('job_id', jobId);

      if (dbError) {
        console.error('❌ Error deleting receipt from database:', dbError);
        return {
          success: false,
          error: dbError.message || 'Failed to delete receipt from database'
        };
      }

      console.log('✅ Buyer receipt deleted successfully');
      return {
        success: true
      };

    } catch (error) {
      console.error('❌ Error deleting buyer receipt:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete buyer receipt'
      };
    }
  }
}
