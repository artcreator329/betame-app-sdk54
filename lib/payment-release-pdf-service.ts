import { supabase, supabaseAdmin } from './supabase';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export interface AdminInfo {
  id: string;
  name: string;
  email: string;
}

export class PaymentReleasePDFService {
  /**
   * Generate payment release PDF content
   */
  static generatePaymentReleasePDF(
    jobData: any,
    tableSource: string,
    adminInfo: AdminInfo
  ): string {
    const releaseDate = new Date().toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const jobTitle = jobData.title || jobData.service_title || 'Service';
    const originalAmount = jobData.price || jobData.amount || 0;
    // Platform fee is paid by buyer, not deducted from service provider
    const platformFee = 0;
    // Service provider gets original amount minus only service fee (11% or RM4.90)
    const serviceFeePercentage = originalAmount * 0.11;
    const serviceFeeFixed = 4.90;
    const serviceFee = Math.max(serviceFeePercentage, serviceFeeFixed);
    const finalPayout = originalAmount - serviceFee;
    const receiptNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Release Receipt</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
          }
          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .content {
            padding: 40px;
          }
          .receipt-number {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
            border-left: 4px solid #667eea;
          }
          .receipt-number h3 {
            margin: 0;
            color: #667eea;
            font-size: 18px;
          }
          .receipt-number p {
            margin: 5px 0 0 0;
            font-family: monospace;
            font-size: 16px;
            font-weight: 600;
          }
          .job-details {
            margin-bottom: 30px;
          }
          .job-details h3 {
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .detail-label {
            font-weight: 600;
            color: #555;
          }
          .detail-value {
            color: #333;
            text-align: right;
          }
          .payment-breakdown {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .payment-breakdown h3 {
            color: #333;
            margin-top: 0;
            margin-bottom: 20px;
          }
          .breakdown-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
          }
          .breakdown-row.total {
            border-top: 2px solid #667eea;
            padding-top: 15px;
            margin-top: 15px;
            font-weight: 600;
            font-size: 18px;
            color: #667eea;
          }
          .admin-info {
            background: #e8f4fd;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #2196f3;
          }
          .admin-info h3 {
            color: #1976d2;
            margin-top: 0;
            margin-bottom: 15px;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
            border-top: 1px solid #eee;
          }
          .footer p {
            margin: 5px 0;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div class="logo">💰 BetaMe</div>
            <h1>Payment Release Receipt</h1>
            <p>Official payment release confirmation</p>
          </div>
          
          <div class="content">
            <div class="receipt-number">
              <h3>Receipt Number</h3>
              <p>${receiptNumber}</p>
            </div>
            
            <div class="job-details">
              <h3>Job Details</h3>
              <div class="detail-row">
                <span class="detail-label">Job Title:</span>
                <span class="detail-value">${jobTitle}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Job ID:</span>
                <span class="detail-value">${jobData.id}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Table Source:</span>
                <span class="detail-value">${tableSource}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Release Date:</span>
                <span class="detail-value">${releaseDate}</span>
              </div>
            </div>
            
            <div class="payment-breakdown">
              <h3>Payment Breakdown</h3>
              <div class="breakdown-row">
                <span>Original Amount:</span>
                <span>RM ${originalAmount.toFixed(2)}</span>
              </div>
              <div class="breakdown-row">
                <span>Service Fee (RM4.90 or 11%):</span>
                <span>- RM ${serviceFee.toFixed(2)}</span>
              </div>
              <div class="breakdown-row total">
                <span>Final Payout:</span>
                <span>RM ${finalPayout.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="admin-info">
              <h3>Released By</h3>
              <div class="detail-row">
                <span class="detail-label">Admin Name:</span>
                <span class="detail-value">${adminInfo.name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Admin Email:</span>
                <span class="detail-value">${adminInfo.email}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Admin ID:</span>
                <span class="detail-value">${adminInfo.id}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>BetaMe Platform</strong></p>
            <p>This is an official payment release receipt generated by the BetaMe platform.</p>
            <p>Generated on ${releaseDate}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate and store PDF to Supabase storage and database
   */
  static async generateAndStorePDF(
    jobData: any,
    tableSource: string,
    adminInfo: AdminInfo
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      console.log('📄 Generating payment release PDF...');

      // Generate PDF content
      const htmlContent = this.generatePaymentReleasePDF(jobData, tableSource, adminInfo);

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
      const arrayBuffer = decode(base64Data);

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedTitle = (jobData.title || jobData.service_title || 'service').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
      const fileName = `payment-release-${sanitizedTitle}-${timestamp}.pdf`;
      const filePath = `payment-release-pdfs/${jobData.id}/${fileName}`;

      console.log('📄 Uploading PDF to path:', filePath);

      // Upload to Supabase storage
      const { data: uploadData, error } = await supabase.storage
        .from('documents')
        .upload(filePath, arrayBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (error) {
        console.error('❌ PDF upload error:', error);
        throw new Error(`Failed to upload payment release PDF: ${error.message}`);
      }

      console.log('✅ Payment release PDF uploaded successfully:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log('✅ Payment release PDF public URL:', publicUrl);

      // Store PDF record in database
      const receiptNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const originalAmount = jobData.price || jobData.amount || 0;
      const platformFee = jobData.platform_fee || 0;
      const finalPayout = originalAmount - platformFee;
      const jobTitle = jobData.title || jobData.service_title || 'Service';

      const { error: dbError } = await supabaseAdmin
        .from('payment_release_pdfs')
        .insert({
          job_id: jobData.id,
          job_table_source: tableSource,
          admin_user_id: adminInfo.id,
          pdf_file_url: publicUrl,
          pdf_filename: fileName,
          receipt_number: receiptNumber,
          job_title: jobTitle,
          service_provider_name: jobData.service_provider_name || 'Unknown',
          buyer_name: jobData.buyer_name || 'Unknown',
          original_amount: originalAmount,
          final_payout: finalPayout,
          currency: 'RM',
          generated_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('❌ Database insert error:', dbError);
        throw new Error(`Failed to store PDF record: ${dbError.message}`);
      }

      console.log('✅ Payment release PDF record stored in database');

      // Clean up temporary file
      try {
        await FileSystem.deleteAsync(uri);
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up temporary PDF file:', cleanupError);
      }

      return {
        success: true,
        pdfUrl: publicUrl
      };

    } catch (error) {
      console.error('❌ Error in generateAndStorePDF:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate and store PDF'
      };
    }
  }

  /**
   * Print payment release receipt (for admin use)
   */
  static async printPaymentRelease(
    jobData: any,
    adminInfo: AdminInfo
  ): Promise<void> {
    try {
      console.log('🖨️ Printing payment release receipt...');

      const htmlContent = this.generatePaymentReleasePDF(jobData, 'active_jobs', adminInfo);

      await Print.printAsync({
        html: htmlContent,
        printerUrl: undefined, // Use default printer
      });

      console.log('✅ Payment release receipt printed successfully');

    } catch (error) {
      console.error('❌ Error printing payment release receipt:', error);
      throw error;
    }
  }

  /**
   * Save payment release as PDF file (for admin use)
   */
  static async savePaymentReleaseAsPDF(
    jobData: any,
    adminInfo: AdminInfo
  ): Promise<void> {
    try {
      console.log('💾 Saving payment release as PDF...');

      const htmlContent = this.generatePaymentReleasePDF(jobData, 'active_jobs', adminInfo);

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      console.log('✅ Payment release PDF saved at:', uri);

      // Note: In a real app, you might want to share this file or save it to device storage
      // For now, we just log the location

    } catch (error) {
      console.error('❌ Error saving payment release PDF:', error);
      throw error;
    }
  }

  /**
   * Get PDF receipt for a specific job
   */
  static async getPDFReceipt(jobId: string): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      console.log('🔍 Searching for PDF receipt with job ID:', jobId);
      
      // Use supabaseAdmin to bypass RLS policies for PDF retrieval
      const { data, error } = await supabaseAdmin
        .from('payment_release_pdfs')
        .select('pdf_file_url, job_id, job_title, generated_at')
        .eq('job_id', jobId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.log('❌ Database error:', error);
        return {
          success: false,
          error: 'PDF receipt not found'
        };
      }

      if (!data) {
        console.log('❌ No PDF record found for job ID:', jobId);
        return {
          success: false,
          error: 'PDF receipt not found'
        };
      }

      console.log('✅ PDF receipt found:', {
        jobId: data.job_id,
        jobTitle: data.job_title,
        generatedAt: data.generated_at,
        pdfUrl: data.pdf_file_url
      });

      // Verify the PDF URL is accessible
      try {
        const response = await fetch(data.pdf_file_url, { method: 'HEAD' });
        if (!response.ok) {
          console.log('⚠️ PDF URL not accessible, trying to reconstruct from storage...');
          
          // Try to reconstruct the URL from storage
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(`payment-release-pdfs/${jobId}/`);
          
          // Since we can't list files directly, we'll return the original URL
          // The issue might be with the specific filename
          console.log('🔍 Reconstructed storage URL:', urlData.publicUrl);
        }
      } catch (fetchError) {
        console.log('⚠️ Could not verify PDF URL accessibility:', fetchError);
      }

      return {
        success: true,
        pdfUrl: data.pdf_file_url
      };

    } catch (error) {
      console.error('❌ Error getting PDF receipt:', error);
      return {
        success: false,
        error: error.message || 'Failed to get PDF receipt'
      };
    }
  }

  /**
   * List all PDF receipts for debugging
   */
  static async listAllPDFReceipts(): Promise<{ success: boolean; receipts?: any[]; error?: string }> {
    try {
      // Use supabaseAdmin to bypass RLS policies
      const { data, error } = await supabaseAdmin
        .from('payment_release_pdfs')
        .select('*')
        .order('generated_at', { ascending: false });

      if (error) {
        console.error('❌ Error listing PDF receipts:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('📋 All PDF receipts:', data);
      return {
        success: true,
        receipts: data
      };

    } catch (error) {
      console.error('❌ Error listing PDF receipts:', error);
      return {
        success: false,
        error: error.message || 'Failed to list PDF receipts'
      };
    }
  }
}
