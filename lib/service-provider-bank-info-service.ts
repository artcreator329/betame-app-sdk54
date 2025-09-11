import { supabase } from './supabase';
import { authService } from './auth-service';

export interface ServiceProviderBankInfo {
  id: string;
  user_id: string;
  bank_name: string;
  bank_account_number: string;
  account_holder_name: string;
  ic_passport_number: string;
  swift_code?: string;
  phone_number: string;
  registered_address: string;
  terms_accepted: boolean;
  terms_accepted_at: string;
  created_at: string;
  updated_at: string;
}

export interface BankInfoFormData {
  bank_name: string;
  bank_account_number: string;
  account_holder_name: string;
  ic_passport_number: string;
  swift_code?: string;
  phone_number: string;
  registered_address: string;
}

class ServiceProviderBankInfoService {
  /**
   * Submit bank information for service provider registration
   */
  static async submitBankInfo(
    formData: BankInfoFormData,
    termsAccepted: boolean
  ): Promise<{ success: boolean; error?: string; data?: ServiceProviderBankInfo }> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      if (!termsAccepted) {
        return { success: false, error: 'You must accept the terms and conditions' };
      }

      // Validate required fields
      const requiredFields = [
        'bank_name',
        'bank_account_number', 
        'account_holder_name',
        'ic_passport_number',
        'phone_number',
        'registered_address'
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof BankInfoFormData]?.trim()) {
          return { success: false, error: `${field.replace('_', ' ')} is required` };
        }
      }

      // Check if user already has bank info submitted
      const { data: existingInfo, error: checkError } = await supabase
        .from('service_provider_bank_info')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingInfo) {
        return { success: false, error: 'Bank information has already been submitted and cannot be changed' };
      }

      // Insert bank information
      const { data, error } = await supabase
        .from('service_provider_bank_info')
        .insert({
          user_id: user.id,
          ...formData,
          terms_accepted: termsAccepted,
          terms_accepted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting bank info:', error);
        return { success: false, error: 'Failed to submit bank information' };
      }

      // Update user profile to mark as service provider
      await supabase
        .from('user_profiles')
        .update({
          is_service_provider: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      console.log('✅ Bank information submitted successfully');
      return { success: true, data };

    } catch (error) {
      console.error('Error in submitBankInfo:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get user's bank information
   */
  static async getBankInfo(userId?: string): Promise<ServiceProviderBankInfo | null> {
    try {
      const user = userId ? { id: userId } : await authService.getCurrentUser();
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('service_provider_bank_info')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting bank info:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getBankInfo:', error);
      return null;
    }
  }

  /**
   * Check if user has submitted bank information
   */
  static async hasBankInfo(userId?: string): Promise<boolean> {
    try {
      const bankInfo = await this.getBankInfo(userId);
      return !!bankInfo;
    } catch (error) {
      console.error('Error checking bank info:', error);
      return false;
    }
  }

  /**
   * Get all bank info submissions (admin only)
   */
  static async getAllBankInfoSubmissions(): Promise<ServiceProviderBankInfo[]> {
    try {
      const { data, error } = await supabase
        .from('service_provider_bank_info')
        .select(`
          *,
          user_profiles!inner(
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting all bank info submissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllBankInfoSubmissions:', error);
      return [];
    }
  }
}

export { ServiceProviderBankInfoService };