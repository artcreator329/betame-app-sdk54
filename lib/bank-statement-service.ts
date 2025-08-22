import { supabase } from './supabase';
import { BankStatement, BankStatementFormData } from '@/types/bank-statement';

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
   * Upload a bank statement
   */
  async uploadBankStatement(
    userId: string,
    formData: BankStatementFormData,
    imageUri: string
  ): Promise<{ success: boolean; error?: string; data?: BankStatement }> {
    try {
      // Upload image to Supabase Storage
      const fileName = `bank-statements/${userId}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'bank-statement.jpg',
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Save to database
      const { data, error: dbError } = await supabase
        .from('bank_statements')
        .insert({
          user_id: userId,
          name: formData.name.trim(),
          ic_number: formData.ic_number.trim(),
          bank_name: formData.bank_name.trim(),
          bank_account_number: formData.bank_account_number.trim(),
          statement_file_url: urlData.publicUrl,
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
