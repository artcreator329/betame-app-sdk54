import { EKYCService } from './ekyc-service';
import { authService } from './auth-service';

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
   */
  static async canPlaceOrders(): Promise<{ allowed: boolean; reason?: string; status?: string }> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        return { allowed: false, reason: 'User not authenticated' };
      }

      const verificationStatus = await EKYCService.getUserVerificationStatus();
      
      if (verificationStatus === 'verified') {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: 'eKYC verification required to place orders',
        status: verificationStatus
      };
    } catch (error) {
      console.error('Error checking order placement permission:', error);
      return { allowed: false, reason: 'Error checking verification status' };
    }
  }

  /**
   * Check if user can become a service provider
   */
  static async canBecomeServiceProvider(): Promise<{ allowed: boolean; reason?: string; status?: string }> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        return { allowed: false, reason: 'User not authenticated' };
      }

      const verificationStatus = await EKYCService.getUserVerificationStatus();
      
      if (verificationStatus === 'verified') {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: 'eKYC verification required to become a service provider',
        status: verificationStatus
      };
    } catch (error) {
      console.error('Error checking service provider permission:', error);
      return { allowed: false, reason: 'Error checking verification status' };
    }
  }

  /**
   * Get comprehensive verification status
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

      const status = await EKYCService.getUserVerificationStatus();
      const isVerified = status === 'verified';

      return {
        isVerified,
        status: status as any,
        canPlaceOrders: isVerified,
        canBecomeServiceProvider: isVerified,
        requiresVerification: !isVerified
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return {
        isVerified: false,
        status: 'not_started',
        canPlaceOrders: false,
        canBecomeServiceProvider: false,
        requiresVerification: true
      };
    }
  }

  /**
   * Show verification required modal/alert
   */
  static showVerificationRequiredAlert(
    action: 'place_order' | 'become_service_provider',
    onVerifyPress: () => void
  ) {
    const { Alert } = require('react-native');
    
    const actionText = action === 'place_order' ? 'place orders' : 'become a service provider';
    const title = 'Verification Required';
    const message = `You need to complete eKYC verification to ${actionText}. This helps us ensure a safe and secure platform for all users.`;

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Get Verified',
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