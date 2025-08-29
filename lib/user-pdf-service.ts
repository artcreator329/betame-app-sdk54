import { supabase } from './supabase';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export interface UserPDFData {
  jobId: string;
  jobTableSource: string;
  jobTitle: string;
  serviceProviderName: string;
  buyerName: string;
  serviceProviderEmail: string;
  buyerEmail: string;
  serviceAmount: number;
  platformFee: number;
  serviceFee: number;
  netPayout: number;
  currency: string;
  paymentDate: string;
  completionDate: string;
  jobCreatedAt: string;
  workCompletedAt: string;
  buyerConfirmedAt: string;
  paymentReleasedAt: string;
  description: string;
  status: string;
  adminEmail?: string;
  adminName?: string;
}

export class UserPDFService {
  /**
   * Generate user PDF content
   */
  static generateUserPDF(data: UserPDFData): string {
    const releaseDate = new Date().toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const receiptNumber = `PR-${Date.now().toString(36).substr(2, 8).toUpperCase()}`;

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
            line-height: 1.6;
          }
          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
            page-break-inside: avoid;
          }
          .header {
            background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%);
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
            padding: 30px;
          }

          .section {
            margin-bottom: 25px;
            border: 1px solid #e1e5e9;
            border-radius: 8px;
            overflow: hidden;
            page-break-inside: avoid;
            page-break-before: auto;
          }
          .section-header {
            background: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #e1e5e9;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .section-header h3 {
            margin: 0;
            color: #333;
            font-size: 18px;
            font-weight: 600;
          }
          .section-icon {
            width: 20px;
            height: 20px;
            background: #007AFF;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
          }
          .section-content {
            padding: 20px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 6px 0;
            border-bottom: 1px solid #f0f0f0;
            page-break-inside: avoid;
          }
          .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
          }
          .detail-label {
            font-weight: 600;
            color: #555;
            min-width: 150px;
          }
          .detail-value {
            color: #333;
            text-align: right;
            flex: 1;
          }
          .payment-breakdown {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .payment-breakdown h3 {
            color: #333;
            margin-top: 0;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .breakdown-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 4px 0;
            page-break-inside: avoid;
          }
          .breakdown-row.fee {
            color: #DC2626;
          }
          .breakdown-row.total {
            border-top: 2px solid #007AFF;
            padding-top: 15px;
            margin-top: 15px;
            font-weight: 600;
            font-size: 18px;
            color: #059669;
          }
          .timeline {
            margin-bottom: 20px;
          }
          .timeline-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            padding: 8px;
            border-radius: 6px;
            background: #f8f9fa;
            page-break-inside: avoid;
          }
          .timeline-item.completed {
            background: #e8f5e8;
            border-left: 4px solid #059669;
          }
          .timeline-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #007AFF;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-size: 12px;
            font-weight: bold;
          }
          .timeline-item.completed .timeline-icon {
            background: #059669;
          }
          .timeline-content {
            flex: 1;
          }
          .timeline-title {
            font-weight: 600;
            color: #333;
            margin-bottom: 2px;
          }
          .timeline-date {
            font-size: 14px;
            color: #666;
          }
          .banking-alert {
            background: #FFF3CD;
            border: 1px solid #FFEAA7;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          .banking-alert h4 {
            margin: 0 0 10px 0;
            color: #856404;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .banking-alert p {
            margin: 0;
            color: #856404;
            font-size: 14px;
          }
          .admin-approval {
            background: #e8f5e8;
            border: 1px solid #c3e6cb;
            border-radius: 6px;
            padding: 18px;
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          .admin-approval h4 {
            margin: 0 0 15px 0;
            color: #155724;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .admin-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .admin-item {
            margin-bottom: 10px;
          }
          .admin-label {
            font-weight: 600;
            color: #155724;
            font-size: 14px;
          }
          .admin-value {
            color: #333;
            font-size: 14px;
          }
          .digital-signature {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #c3e6cb;
            font-size: 14px;
            color: #155724;
            font-style: italic;
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
          .official-statement {
            background: #f8f9fa;
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            padding: 18px;
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          .official-statement h4 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 16px;
          }
          .official-statement p {
            margin: 5px 0;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div class="logo">BetaMe</div>
            <h1>Payment Release Receipt</h1>
            <p>Official Transaction Record</p>
            <p style="margin-top: 10px; font-family: monospace; font-size: 16px; font-weight: 600; opacity: 0.9;">${receiptNumber}</p>
          </div>
          
          <div class="content">
            
            <div class="section">
              <div class="section-header">
                <div class="section-icon">📁</div>
                <h3>Job Information</h3>
              </div>
              <div class="section-content">
                <div class="detail-row">
                  <span class="detail-label">JOB ID:</span>
                  <span class="detail-value">${data.jobId}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">STATUS:</span>
                  <span class="detail-value">${data.status}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">DESCRIPTION:</span>
                  <span class="detail-value">${data.description}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-header">
                <div class="section-icon">👥</div>
                <h3>Participants</h3>
              </div>
              <div class="section-content">
                <div class="detail-row">
                  <span class="detail-label">BUYER:</span>
                  <span class="detail-value">${data.buyerName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">SERVICE PROVIDER:</span>
                  <span class="detail-value">${data.serviceProviderName}</span>
                </div>
              </div>
            </div>

            <div class="banking-alert">
              <h4>⚠️ Banking Information Not Available</h4>
              <p>Service provider needs to update banking details for future transactions.</p>
            </div>

            <div class="section">
              <div class="section-header">
                <div class="section-icon">📅</div>
                <h3>Transaction Timeline</h3>
              </div>
              <div class="section-content">
                <div class="timeline">
                  <div class="timeline-item completed">
                    <div class="timeline-icon">✓</div>
                    <div class="timeline-content">
                      <div class="timeline-title">Job Created</div>
                      <div class="timeline-date">${new Date(data.jobCreatedAt).toLocaleString('en-MY')}</div>
                    </div>
                  </div>
                  <div class="timeline-item completed">
                    <div class="timeline-icon">✓</div>
                    <div class="timeline-content">
                      <div class="timeline-title">Work Completed</div>
                      <div class="timeline-date">${new Date(data.workCompletedAt).toLocaleString('en-MY')}</div>
                    </div>
                  </div>
                  <div class="timeline-item completed">
                    <div class="timeline-icon">✓</div>
                    <div class="timeline-content">
                      <div class="timeline-title">Buyer Confirmed</div>
                      <div class="timeline-date">${new Date(data.buyerConfirmedAt).toLocaleString('en-MY')}</div>
                    </div>
                  </div>
                  <div class="timeline-item completed">
                    <div class="timeline-icon">✓</div>
                    <div class="timeline-content">
                      <div class="timeline-title">Payment Released</div>
                      <div class="timeline-date">${new Date(data.paymentReleasedAt).toLocaleString('en-MY')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="admin-approval">
              <h4>✔ Administrative Approval</h4>
              <div class="admin-grid">
                <div class="admin-item">
                  <div class="admin-label">APPROVED BY:</div>
                  <div class="admin-value">${data.adminEmail || 'developer@betame.com.my'}</div>
                </div>
                <div class="admin-item">
                  <div class="admin-label">ADMIN EMAIL:</div>
                  <div class="admin-value">${data.adminEmail || 'developer@betame.com.my'}</div>
                </div>
                <div class="admin-item">
                  <div class="admin-label">RELEASE DATE:</div>
                  <div class="admin-value">${new Date(data.paymentReleasedAt).toLocaleString('en-MY')}</div>
                </div>
                <div class="admin-item">
                  <div class="admin-label">AUTHORIZATION:</div>
                  <div class="admin-value">Manual Admin Release</div>
                </div>
              </div>
              <div class="digital-signature">
                Digital Signature - ${data.adminEmail || 'developer@betame.com.my'}
              </div>
            </div>

            <div class="section">
              <div class="section-header">
                <div class="section-icon">💰</div>
                <h3>Payment Breakdown</h3>
              </div>
              <div class="section-content">
                <div class="breakdown-row">
                  <span>Original Amount:</span>
                  <span>${data.currency} ${data.serviceAmount.toFixed(2)}</span>
                </div>
                <div class="breakdown-row fee">
                  <span>Platform Fee (2.2%):</span>
                  <span>- ${data.currency} ${data.platformFee.toFixed(2)}</span>
                </div>
                <div class="breakdown-row fee">
                  <span>Service Fee (RM4.90 or 11%):</span>
                  <span>- ${data.currency} ${data.serviceFee.toFixed(2)}</span>
                </div>
                <div class="breakdown-row total">
                  <span>Final Payout:</span>
                  <span>${data.currency} ${data.netPayout.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div class="official-statement">
              <h4>BetaMe Platform - Official Payment Release Receipt</h4>
              <p>This document serves as official proof of payment release authorization.</p>
              <p>Receipt ID: ${receiptNumber}</p>
              <p>This is a computer-generated document. No physical signature is required.</p>
              <p>For inquiries, please contact support with the receipt ID above.</p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>BetaMe Platform</strong></p>
            <p>This is an official payment release receipt generated by the BetaMe platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate and store PDF to user-pdfs bucket
   */
  static async generateAndStorePDF(data: UserPDFData): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      console.log('📄 Generating user PDF...');

      // Generate PDF content
      const htmlContent = this.generateUserPDF(data);

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
      const sanitizedTitle = data.jobTitle.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
      const fileName = `payment-release-${sanitizedTitle}-${timestamp}.pdf`;
      const filePath = `transaction-slips/${data.jobId}/${fileName}`;

      console.log('📄 Uploading PDF to path:', filePath);

      // Upload to user-pdfs bucket (no admin privileges needed)
      const { data: uploadData, error } = await supabase.storage
        .from('user-pdfs')
        .upload(filePath, arrayBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (error) {
        console.error('❌ PDF upload error:', error);
        throw new Error(`Failed to upload user PDF: ${error.message}`);
      }

      console.log('✅ User PDF uploaded successfully:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-pdfs')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log('✅ User PDF public URL:', publicUrl);

      // Store PDF record in database (using regular supabase client)
      const receiptNumber = `PR-${Date.now().toString(36).substr(2, 8).toUpperCase()}`;

      const { error: dbError } = await supabase
        .from('user_pdfs')
        .insert({
          job_id: data.jobId,
          job_table_source: data.jobTableSource,
          pdf_file_url: publicUrl,
          pdf_filename: fileName,
          receipt_number: receiptNumber,
          job_title: data.jobTitle,
          service_provider_name: data.serviceProviderName,
          buyer_name: data.buyerName,
          service_amount: data.serviceAmount,
          platform_fee: data.platformFee,
          net_payout: data.netPayout,
          currency: data.currency,
          generated_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('❌ Database insert error:', dbError);
        throw new Error(`Failed to store PDF record: ${dbError.message}`);
      }

      console.log('✅ User PDF record stored in database');

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
        error: error instanceof Error ? error.message : 'Failed to generate and store PDF'
      };
    }
  }

  /**
   * Get PDF receipt for a specific job
   */
  static async getPDFReceipt(jobId: string): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      console.log('🔍 Searching for user PDF receipt with job ID:', jobId);
      
      const { data, error } = await supabase
        .from('user_pdfs')
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

      console.log('✅ User PDF receipt found:', {
        jobId: data.job_id,
        jobTitle: data.job_title,
        generatedAt: data.generated_at,
        pdfUrl: data.pdf_file_url
      });

      return {
        success: true,
        pdfUrl: data.pdf_file_url
      };

    } catch (error) {
      console.error('❌ Error getting user PDF receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get PDF receipt'
      };
    }
  }

  /**
   * Delete PDF receipt for a specific job
   */
  static async deletePDFReceipt(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Deleting user PDF receipt for job ID:', jobId);
      
      // First, try to find the PDF record in the database
      const { data: pdfRecord, error: fetchError } = await supabase
        .from('user_pdfs')
        .select('pdf_filename, job_id')
        .eq('job_id', jobId)
        .single();

      if (fetchError || !pdfRecord) {
        console.log('❌ No PDF record found for deletion');
        return {
          success: false,
          error: 'No PDF record found to delete'
        };
      }

      // Delete from Supabase storage
      const filePath = `transaction-slips/${jobId}/${pdfRecord.pdf_filename}`;
      const { error: storageError } = await supabase.storage
        .from('user-pdfs')
        .remove([filePath]);

      if (storageError) {
        console.error('❌ Storage deletion error:', storageError);
        return {
          success: false,
          error: 'Failed to delete PDF from storage'
        };
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_pdfs')
        .delete()
        .eq('job_id', jobId);

      if (dbError) {
        console.error('❌ Database deletion error:', dbError);
        return {
          success: false,
          error: 'Failed to delete PDF record from database'
        };
      }

      console.log('✅ User PDF receipt deleted successfully');
      return {
        success: true
      };
      
    } catch (error) {
      console.error('Error deleting user PDF receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete PDF receipt'
      };
    }
  }
}
