import { EKYCService } from './ekyc-service';
import { authService } from './auth-service';
import { supabase } from './supabase';

export interface VerificationStatus {
  isVerified: boolean;
  status: 'not_started' | 'in_progress' | 'verified' | 'rejected';
  canPlaceOrders: boolean;
  canBecomeServiceProvider: boolean;
  requiresVerification: boolean;
}

export class VerificationService {
  /**
   * Check if user can place orders
   * TEMPORARY: eKYC verification disabled - all users can place orders
   */
  static async canPlaceOrders(): Promise<{ allowed: boolean; reason?: string; status?: string }> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        return { allowed: false, reason: 'User not authenticated' };
      }

      // TEMPORARY: Allow all authenticated users to place orders
      // eKYC verification requirement temporarily disabled
      return { allowed: true };

      // Original eKYC verification logic (commented out temporarily)
      /*
      const verificationStatus = await EKYCService.getUserVerificationStatus();
      
      if (verificationStatus === 'verified') {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: 'eKYC verification required to place orders',
        status: verificationStatus
      };
      */
    } catch (error) {
      console.error('Error checking order placement permission:', error);
      return { allowed: false, reason: 'Error checking verification status' };
    }
  }

  /**
   * Check if user can become a service provider
   * UPDATED: eKYC verification disabled - only bank info required
   */
  static async canBecomeServiceProvider(): Promise<{ allowed: boolean; reason?: string; status?: string }> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        return { allowed: false, reason: 'User not authenticated' };
      }

      // UPDATED: Skip eKYC verification check - only check bank info
      // Check if user has submitted bank info (no longer requires approval)
      const { data: bankInfo, error: bankError } = await supabase
        .from('service_provider_bank_info')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (bankError && bankError.code !== 'PGRST116') {
        console.error('Error checking bank info:', bankError);
        return { allowed: false, reason: 'Error checking bank info status' };
      }

      if (!bankInfo) {
        return {
          allowed: false,
          reason: 'Bank information required to become a service provider',
          status: 'bank_info_required'
        };
      }

      return { allowed: true };

      // Original logic (commented out temporarily)
      /*
      const verificationStatus = await EKYCService.getUserVerificationStatus();
      
      if (verificationStatus !== 'verified') {
        return {
          allowed: false,
          reason: 'eKYC verification required to become a service provider',
          status: verificationStatus
        };
      }

      // Check if user has approved bank statement
      const { data: bankStatement, error: bankError } = await supabase
        .from('bank_statements')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .single();

      if (bankError && bankError.code !== 'PGRST116') {
        console.error('Error checking bank statement:', bankError);
        return { allowed: false, reason: 'Error checking bank statement status' };
      }

      if (!bankStatement) {
        return {
          allowed: false,
          reason: 'Approved bank statement required to become a service provider',
          status: 'bank_statement_required'
        };
      }

      return { allowed: true };
      */
    } catch (error) {
      console.error('Error checking service provider permission:', error);
      return { allowed: false, reason: 'Error checking verification status' };
    }
  }

  /**
   * Get comprehensive verification status
   * UPDATED: eKYC verification disabled - all users can place orders
   */
  static async getVerificationStatus(): Promise<VerificationStatus> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        return {
          isVerified: false,
          status: 'not_started',
          canPlaceOrders: false,
          canBecomeServiceProvider: false,
          requiresVerification: true
        };
      }

      // TEMPORARY: All authenticated users can place orders
      const canPlaceOrdersResult = await this.canPlaceOrders();
      const canBecomeServiceProviderResult = await this.canBecomeServiceProvider();

      // For backward compatibility, still get eKYC status but don't use it for restrictions
      const status = await EKYCService.getUserVerificationStatus();
      const isVerified = status === 'verified';

      return {
        isVerified,
        status: status as any,
        canPlaceOrders: canPlaceOrdersResult.allowed,
        canBecomeServiceProvider: canBecomeServiceProviderResult.allowed,
        requiresVerification: false // TEMPORARY: No verification required for orders
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return {
        isVerified: false,
        status: 'not_started',
        canPlaceOrders: true, // TEMPORARY: Allow orders even on error
        canBecomeServiceProvider: false,
        requiresVerification: false
      };
    }
  }

  /**
   * Show verification required modal/alert
   * UPDATED: Only for service provider registration now
   */
  static showVerificationRequiredAlert(
    action: 'place_order' | 'become_service_provider',
    onVerifyPress: () => void
  ) {
    const { Alert } = require('react-native');
    
    if (action === 'place_order') {
      // TEMPORARY: No verification required for placing orders
      return;
    }

    const title = 'Bank Information Required';
    const message = 'You need to provide your bank information to become a service provider. This helps us process payments securely.';

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Provide Bank Info',
          onPress: onVerifyPress
        }
      ]
    );
  }

  /**
   * Check verification and show alert if needed
   */
  static async checkVerificationForAction(
    action: 'place_order' | 'become_service_provider',
    onVerifyPress: () => void
  ): Promise<boolean> {
    const canPerformAction = action === 'place_order' 
      ? await this.canPlaceOrders()
      : await this.canBecomeServiceProvider();

    if (!canPerformAction.allowed) {
      this.showVerificationRequiredAlert(action, onVerifyPress);
      return false;
    }

    return true;
  }

  /**
   * Get user-friendly status message
   */
  static getStatusMessage(status: string): string {
    switch (status) {
      case 'not_started':
        return 'Verification not started';
      case 'in_progress':
        return 'Verification in progress';
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Verification rejected';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Get status color for UI
   */
  static getStatusColor(status: string): string {
    switch (status) {
      case 'verified':
        return '#34C759';
      case 'in_progress':
        return '#FF9500';
      case 'rejected':
        return '#FF3B30';
      case 'not_started':
      default:
        return '#8E8E93';
    }
  }
}