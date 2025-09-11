import { supabase } from './supabase';
import { BankStatement, BankStatementFormData } from '@/types/bank-statement';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

export class BankStatementService {
  private static instance: BankStatementService;

  private constructor() {}

  public static getInstance(): BankStatementService {
    if (!BankStatementService.instance) {
      BankStatementService.instance = new BankStatementService();
    }
    return BankStatementService.instance;
  }

  /**
   * Helper function to detect file type from URI
   */
  private detectFileType(uri: string): { fileType: string; fileExtension: string; fileName: string } {
    let fileType = 'image/jpeg'; // default
    let fileExtension = 'jpg';
    let fileName = 'bank-statement.jpg';

    // Check for data URLs first
    if (uri.startsWith('data:')) {
      if (uri.includes('data:image/png')) {
        fileType = 'image/png';
        fileExtension = 'png';
        fileName = 'bank-statement.png';
      } else if (uri.includes('data:image/jpeg') || uri.includes('data:image/jpg')) {
        fileType = 'image/jpeg';
        fileExtension = 'jpg';
        fileName = 'bank-statement.jpg';
      } else if (uri.includes('data:application/pdf')) {
        fileType = 'application/pdf';
        fileExtension = 'pdf';
        fileName = 'bank-statement.pdf';
      }
      return { fileType, fileExtension, fileName };
    }

    // Extract file extension from URI
    const uriParts = uri.split('.');
    if (uriParts.length > 1) {
      const extension = uriParts[uriParts.length - 1].toLowerCase();
      
      // Map extensions to MIME types
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          fileType = 'image/jpeg';
          fileExtension = 'jpg';
          fileName = 'bank-statement.jpg';
          break;
        case 'png':
          fileType = 'image/png';
          fileExtension = 'png';
          fileName = 'bank-statement.png';
          break;
        case 'pdf':
          fileType = 'application/pdf';
          fileExtension = 'pdf';
          fileName = 'bank-statement.pdf';
          break;
        default:
          // Default to JPEG if unknown extension
          fileType = 'image/jpeg';
          fileExtension = 'jpg';
          fileName = 'bank-statement.jpg';
      }
    }

    // Additional check for PDF files by looking at the URI path
    if (uri.toLowerCase().includes('.pdf') || uri.toLowerCase().includes('pdf')) {
      fileType = 'application/pdf';
      fileExtension = 'pdf';
      fileName = 'bank-statement.pdf';
    }

    return { fileType, fileExtension, fileName };
  }

  /**
   * Upload a bank statement
   */
  async uploadBankStatement(
    userId: string,
    formData: BankStatementFormData,
    imageUri: string,
    nomadVisaUri?: string,
    spaAccepted?: boolean
  ): Promise<{ success: boolean; error?: string; data?: BankStatement }> {
    try {
      // Detect file type from URI
      const { fileType, fileExtension, fileName } = this.detectFileType(imageUri);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to array buffer
      const arrayBuffer = decode(base64);

      // Upload file to Supabase Storage
      const storageFileName = `bank-statements/${userId}/${Date.now()}.${fileExtension}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storageFileName, arrayBuffer, {
          contentType: fileType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      // Get signed URL for private document
      const { data: urlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(storageFileName, 7200); // 2 hours for bank statements

      if (urlError) {
        console.error('Error creating signed URL for bank statement:', urlError);
        throw new Error(`Failed to create signed URL: ${urlError.message}`);
      }

      // Handle nomad visa upload if provided
      let nomadVisaUrl: string | undefined;
      let nomadVisaUploaded = false;
      
      if (nomadVisaUri && formData.nomad_visa_required) {
        try {
          // Detect nomad visa file type
          const nomadVisaFileType = this.detectFileType(nomadVisaUri);
          
          // Read nomad visa file as base64
          const nomadVisaBase64 = await FileSystem.readAsStringAsync(nomadVisaUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Convert base64 to array buffer
          const nomadVisaArrayBuffer = decode(nomadVisaBase64);

          // Upload nomad visa file to Supabase Storage
          const nomadVisaStorageFileName = `nomad-visas/${userId}/${Date.now()}.${nomadVisaFileType.fileExtension}`;
          const { data: nomadVisaUploadData, error: nomadVisaUploadError } = await supabase.storage
            .from('documents')
            .upload(nomadVisaStorageFileName, nomadVisaArrayBuffer, {
              contentType: nomadVisaFileType.fileType,
              upsert: true,
            });

          if (nomadVisaUploadError) {
            console.error('Nomad visa upload error details:', nomadVisaUploadError);
            throw nomadVisaUploadError;
          }

          // Get nomad visa signed URL for private document
          const { data: nomadVisaUrlData, error: nomadVisaUrlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(nomadVisaStorageFileName, 7200); // 2 hours for nomad visas

          if (nomadVisaUrlError) {
            console.error('Error creating signed URL for nomad visa:', nomadVisaUrlError);
            throw new Error(`Failed to create signed URL for nomad visa: ${nomadVisaUrlError.message}`);
          }

          nomadVisaUrl = nomadVisaUrlData.signedUrl;
          nomadVisaUploaded = true;
        } catch (error) {
          console.error('Error uploading nomad visa:', error);
          throw new Error('Failed to upload nomad visa document');
        }
      }

      // Save to database
      const { data, error: dbError } = await supabase
        .from('bank_statements')
        .insert({
          user_id: userId,
          name: formData.name.trim(),
          ic_number: formData.ic_number.trim(),
          bank_name: formData.bank_name.trim(),
          bank_account_number: formData.bank_account_number.trim(),
          statement_file_url: urlData.signedUrl,
          nomad_visa_file_url: nomadVisaUrl,
          nomad_visa_required: formData.nomad_visa_required || false,
          nomad_visa_uploaded: nomadVisaUploaded,
          spa_accepted: spaAccepted || false,
          spa_accepted_at: spaAccepted ? new Date().toISOString() : null,
          status: 'pending', // Set status to pending for review
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error uploading bank statement:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get bank statement for a user
   */
  async getUserBankStatement(userId: string): Promise<{ success: boolean; error?: string; data?: BankStatement }> {
    try {
      const { data, error } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw error;
      }

      return { success: true, data: data || undefined };
    } catch (error: any) {
      console.error('Error fetching bank statement:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all bank statements (admin only)
   */
  async getAllBankStatements(): Promise<{ success: boolean; error?: string; data?: BankStatement[] }> {
    try {
      const { data, error } = await supabase
        .from('bank_statements')
        .select(`
          *,
          user_profiles!bank_statements_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching all bank statements:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update bank statement status (admin only)
   */
  async updateBankStatementStatus(
    statementId: string,
    status: 'approved' | 'rejected',
    adminNotes?: string,
    reviewedBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        status,
        reviewed_at: new Date().toISOString(),
      };

      if (adminNotes) {
        updateData.admin_notes = adminNotes;
      }

      if (reviewedBy) {
        updateData.reviewed_by = reviewedBy;
      }

      const { error } = await supabase
        .from('bank_statements')
        .update(updateData)
        .eq('id', statementId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating bank statement status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has a pending bank statement
   */
  async hasPendingBankStatement(userId: string): Promise<{ success: boolean; error?: string; hasPending: boolean }> {
    try {
      const { data, error } = await supabase
        .from('bank_statements')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .limit(1);

      if (error) {
        throw error;
      }

      return { success: true, hasPending: data.length > 0 };
    } catch (error: any) {
      console.error('Error checking pending bank statement:', error);
      return { success: false, error: error.message, hasPending: false };
    }
  }

  /**
   * Delete bank statement (admin only)
   */
  async deleteBankStatement(statementId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('bank_statements')
        .delete()
        .eq('id', statementId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting bank statement:', error);
      return { success: false, error: error.message };
    }
  }
}

export const bankStatementService = BankStatementService.getInstance();
