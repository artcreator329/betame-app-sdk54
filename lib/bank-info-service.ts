import { supabase } from './supabase';

export interface BankInfoData {
  name: string;
  ic_number: string;
  bank_name: string;
  bank_account_number: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class BankInfoService {
  private static instance: BankInfoService;

  public static getInstance(): BankInfoService {
    if (!BankInfoService.instance) {
      BankInfoService.instance = new BankInfoService();
    }
    return BankInfoService.instance;
  }

  /**
   * Get current bank information for a user
   */
  async getBankInfo(userId: string): Promise<{ success: boolean; error?: string; data?: BankInfoData }> {
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
      console.error('Error fetching bank information:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update bank information for a service provider
   * Only allows updating bank_name and bank_account_number for approved statements
   */
  async updateBankInfo(
    userId: string,
    updates: { bank_name: string; bank_account_number: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate input
      if (!updates.bank_name?.trim()) {
        return { success: false, error: 'Bank name is required' };
      }

      if (!updates.bank_account_number?.trim()) {
        return { success: false, error: 'Bank account number is required' };
      }

      // Check if user has an approved bank statement
      const { data: existingStatement, error: checkError } = await supabase
        .from('bank_statements')
        .select('id, status')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (!existingStatement) {
        return { 
          success: false, 
          error: 'No approved bank statement found. You need to have a verified bank statement to update bank information.' 
        };
      }

      // Update the bank information
      // Note: The database trigger will automatically reset status to 'pending'
      const { error: updateError } = await supabase
        .from('bank_statements')
        .update({
          bank_name: updates.bank_name.trim(),
          bank_account_number: updates.bank_account_number.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingStatement.id)
        .eq('status', 'approved');

      if (updateError) {
        throw updateError;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating bank information:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is eligible to update bank information
   * User must be a service provider with an approved bank statement
   */
  async isEligibleForUpdate(userId: string): Promise<{ success: boolean; error?: string; eligible: boolean }> {
    try {
      const { data, error } = await supabase
        .from('bank_statements')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return { 
        success: true, 
        eligible: !!data 
      };
    } catch (error: any) {
      console.error('Error checking eligibility:', error);
      return { success: false, error: error.message, eligible: false };
    }
  }

  /**
   * Get bank information update history for a user
   */
  async getUpdateHistory(userId: string): Promise<{ success: boolean; error?: string; data?: BankInfoData[] }> {
    try {
      const { data, error } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Error fetching update history:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const bankInfoService = BankInfoService.getInstance();
