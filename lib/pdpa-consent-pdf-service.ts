import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

export interface PDPAConsentData {
  userName: string;
  userEmail: string;
  consentGivenAt: string;
  consentIpAddress?: string;
  consentUserAgent?: string;
}

export class PDPAConsentPDFService {
  /**
   * Generate PDPA consent PDF content
   */
  static generatePDPAConsentPDF(data: PDPAConsentData): string {
    const consentDate = new Date(data.consentGivenAt).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const consentTime = new Date(data.consentGivenAt).toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>PDPA Consent Form - ${data.userName}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #007AFF;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #007AFF;
            margin-bottom: 10px;
          }
          .subtitle {
            font-size: 16px;
            color: #666;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #007AFF;
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
          }
          .consent-box {
            border: 2px solid #007AFF;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background-color: #f8f9fa;
          }
          .signature-section {
            margin-top: 40px;
            border-top: 2px solid #007AFF;
            padding-top: 20px;
          }
          .signature-line {
            border-bottom: 1px solid #333;
            width: 300px;
            margin: 10px 0;
            display: inline-block;
          }
          .footer {
            margin-top: 40px;
            font-size: 12px;
            color: #666;
            text-align: center;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          .highlight {
            background-color: #fff3cd;
            padding: 2px 4px;
            border-radius: 3px;
          }
          ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          li {
            margin-bottom: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Personal Data Protection Act (PDPA) Consent Form</div>
          <div class="subtitle">Malaysia's Personal Data Protection Act 2010</div>
        </div>

        <div class="section">
          <div class="section-title">Consent Details</div>
          <p><strong>Name:</strong> <span class="highlight">${data.userName}</span></p>
          <p><strong>Email:</strong> ${data.userEmail}</p>
          <p><strong>Date of Consent:</strong> ${consentDate}</p>
          <p><strong>Time of Consent:</strong> ${consentTime}</p>
          ${data.consentIpAddress ? `<p><strong>IP Address:</strong> ${data.consentIpAddress}</p>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Consent Statement</div>
          <div class="consent-box">
            <p><strong>I, ${data.userName}, hereby provide my explicit consent for BetaMe to process my personal data for eKYC (Electronic Know Your Customer) verification purposes in accordance with Malaysia's Personal Data Protection Act 2010.</strong></p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Personal Data to be Collected</div>
          <ul>
            <li><strong>Identity Documents:</strong> Malaysian IC (MyKad) or Passport</li>
            <li><strong>Liveness Verification:</strong> Photo of myself holding my identity document</li>
            <li><strong>Personal Information:</strong> Full name, date of birth, address, phone number, email</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-title">Purpose of Data Processing</div>
          <ul>
            <li>To verify my identity for eKYC compliance</li>
            <li>To comply with Malaysian regulatory requirements</li>
            <li>To prevent fraud and ensure platform security</li>
            <li>To provide me with verified service provider status</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-title">Data Retention and Security</div>
          <ul>
            <li><strong>Secure Processing:</strong> All data is encrypted and processed securely</li>
            <li><strong>Temporary Storage:</strong> Data is only stored during verification process</li>
            <li><strong>Automatic Deletion:</strong> All documents are automatically deleted after verification</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-title">My Rights Under PDPA</div>
          <ul>
            <li>Right to access my personal data</li>
            <li>Right to correct inaccurate data</li>
            <li>Right to withdraw consent at any time</li>
            <li>Right to lodge a complaint with the Personal Data Protection Commissioner</li>
          </ul>
        </div>

        <div class="signature-section">
          <div class="section-title">Digital Signature</div>
          <p>By providing this consent, I acknowledge that I have read and understood the above information and agree to the processing of my personal data for the purposes stated above.</p>
          
          <p><strong>Digital Signature:</strong></p>
          <div class="signature-line"></div>
          <p><em>${data.userName}</em></p>
          
          <p><strong>Date:</strong></p>
          <div class="signature-line"></div>
          <p><em>${consentDate}</em></p>
          
          <p><strong>Time:</strong></p>
          <div class="signature-line"></div>
          <p><em>${consentTime}</em></p>
        </div>

        <div class="footer">
          <p><strong>BetaMe eKYC Verification System</strong></p>
          <p>This document was automatically generated on ${new Date().toLocaleDateString('en-MY')} at ${new Date().toLocaleTimeString('en-MY')}</p>
          <p>For questions about this consent, contact: privacy@betame.com</p>
          <p>Document ID: PDPA-${Date.now()}-${data.userName.replace(/\s+/g, '-')}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate and save PDPA consent PDF to Supabase storage
   */
  static async generateAndSavePDPAConsentPDF(
    data: PDPAConsentData,
    userId: string
  ): Promise<string> {
    try {
      console.log('📄 Generating PDPA consent PDF for user:', userId);
      
      // Generate PDF content
      const htmlContent = this.generatePDPAConsentPDF(data);
      
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
      const sanitizedName = data.userName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
      const fileName = `pdpa-consent-${sanitizedName}-${timestamp}.pdf`;
      const filePath = `pdpa-consents/${userId}/${fileName}`;

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
        throw new Error(`Failed to upload PDPA consent PDF: ${error.message}`);
      }

      console.log('✅ PDPA consent PDF uploaded successfully:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log('✅ PDPA consent PDF public URL:', publicUrl);

      // Clean up temporary file
      try {
        await FileSystem.deleteAsync(uri);
        console.log('✅ Temporary PDF file cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary PDF file:', cleanupError);
      }

      return publicUrl;
    } catch (error) {
      console.error('❌ Error generating and saving PDPA consent PDF:', error);
      throw error;
    }
  }

  /**
   * Save PDPA consent record to database
   */
  static async savePDPAConsentRecord(
    userId: string,
    consentData: PDPAConsentData,
    pdfUrl: string
  ): Promise<void> {
    try {
      console.log('💾 Saving PDPA consent record for user:', userId);

      const consentRecord = {
        user_id: userId,
        user_name: consentData.userName,
        user_email: consentData.userEmail,
        consent_given_at: consentData.consentGivenAt,
        consent_ip_address: consentData.consentIpAddress,
        consent_user_agent: consentData.consentUserAgent,
        pdf_url: pdfUrl,
        document_id: `PDPA-${Date.now()}-${consentData.userName.replace(/\s+/g, '-')}`,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('pdpa_consents')
        .insert(consentRecord);

      if (error) {
        console.error('❌ Error saving PDPA consent record:', error);
        throw new Error(`Failed to save PDPA consent record: ${error.message}`);
      }

      console.log('✅ PDPA consent record saved successfully');
    } catch (error) {
      console.error('❌ Error saving PDPA consent record:', error);
      throw error;
    }
  }

  /**
   * Complete PDPA consent process - generate PDF and save record
   */
  static async processPDPAConsent(
    userId: string,
    consentData: PDPAConsentData
  ): Promise<{ pdfUrl: string; documentId: string }> {
    try {
      console.log('🔄 Processing complete PDPA consent for user:', userId);

      // Generate and save PDF
      const pdfUrl = await this.generateAndSavePDPAConsentPDF(consentData, userId);

      // Save consent record to database
      await this.savePDPAConsentRecord(userId, consentData, pdfUrl);

      const documentId = `PDPA-${Date.now()}-${consentData.userName.replace(/\s+/g, '-')}`;

      console.log('✅ PDPA consent process completed successfully');
      
      return {
        pdfUrl,
        documentId
      };
    } catch (error) {
      console.error('❌ Error processing PDPA consent:', error);
      throw error;
    }
  }
}
