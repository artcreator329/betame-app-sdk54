import { supabase, supabaseAdmin } from './supabase';
import { securityService } from './security-service';
import * as Crypto from 'expo-crypto';

export interface SecureWalletData {
  id?: string;
  user_id: string;
  betame_diamonds: number;
  betame_betacoins: number;
  created_at?: string;
  updated_at?: string;
  last_security_check?: string;
  integrity_hash?: string;
}

export interface SecureTransaction {
  id?: string;
  user_id: string;
  type: 'conversion' | 'feature_purchase' | 'betacoin_purchase' | 'daily_checkin' | 'referral_bonus' | 'service_payment' | 'service_payment_received';
  amount: number;
  description: string;
  created_at?: string;
  integrity_hash?: string;
  security_audit_id?: string;
  device_fingerprint?: string;
  risk_score?: number;
}

export interface RewardValidationResult {
  isValid: boolean;
  reason?: string;
  riskScore: number;
  auditId?: string;
}

class SecureWalletService {
  private static instance: SecureWalletService;

  static getInstance(): SecureWalletService {
    if (!SecureWalletService.instance) {
      SecureWalletService.instance = new SecureWalletService();
    }
    return SecureWalletService.instance;
  }

  /**
   * Get wallet with security validation
   */
  async getWallet(userId: string): Promise<SecureWalletData | null> {
    try {
      // Validate session security
      const isSessionValid = await securityService.validateSessionSecurity(userId);
      if (!isSessionValid) {
        console.error('Session security validation failed for user:', userId);
        return null;
      }

      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - wallet doesn't exist
          console.log('📝 No wallet found, creating new wallet for user:', userId);
          return await this.createWallet(userId);
        } else {
          console.error('❌ Error fetching wallet:', error);
          return null;
        }
      }

      // Verify wallet integrity
      const isIntegrityValid = await this.verifyWalletIntegrity(data);
      if (!isIntegrityValid) {
        console.error('Wallet integrity check failed for user:', userId);
        await this.logSecurityViolation(userId, 'wallet_integrity_failure', 90);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Exception in getWallet:', error);
      return null;
    }
  }

  /**
   * Create new wallet with security measures
   */
  async createWallet(userId: string): Promise<SecureWalletData | null> {
    try {
      const defaultWallet: SecureWalletData = {
        user_id: userId,
        betame_diamonds: 0,
        betame_betacoins: 0,
      };

      // Generate integrity hash
      const integrityHash = await this.generateWalletIntegrityHash(defaultWallet);

      const { data, error } = await supabaseAdmin
        .from('wallets')
        .insert({
          ...defaultWallet,
          integrity_hash: integrityHash,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating wallet:', error);
        return null;
      }

      // Log security audit
      await securityService.logSecurityAudit(
        userId,
        'wallet_created',
        5,
        { wallet_id: data.id }
      );

      console.log('✅ Created new secure wallet for user:', userId);
      return data;
    } catch (error) {
      console.error('Error in createWallet:', error);
      return null;
    }
  }

  /**
   * Validate and process daily check-in reward
   */
  async processDailyCheckIn(userId: string, diamondsToAward: number): Promise<RewardValidationResult> {
    try {
      // Validate reward request
      const validation = await securityService.validateRewardRequest(
        userId,
        'checkin',
        diamondsToAward
      );

      if (!validation.isValid) {
        return {
          isValid: false,
          reason: validation.reason,
          riskScore: validation.riskScore,
        };
      }

      // Check rate limit
      const rateLimit = await securityService.checkRateLimit(userId, 'checkin');
      if (rateLimit.is_blocked) {
        return {
          isValid: false,
          reason: 'Daily check-in already completed',
          riskScore: 100,
        };
      }

      // Process the reward
      const result = await this.addDiamonds(userId, diamondsToAward, 'daily_checkin');
      
      if (result.success) {
        // Increment rate limit
        await securityService.incrementRateLimit(userId, 'checkin');
        
        // Log successful check-in
        await securityService.logSecurityAudit(
          userId,
          'daily_checkin_completed',
          validation.riskScore,
          { diamonds_awarded: diamondsToAward }
        );
      }

      return {
        isValid: result.success,
        reason: result.error,
        riskScore: validation.riskScore,
        auditId: result.auditId,
      };
    } catch (error) {
      console.error('Daily check-in processing failed:', error);
      return {
        isValid: false,
        reason: 'Processing error',
        riskScore: 100,
      };
    }
  }

  /**
   * Validate and process referral bonus
   */
  async processReferralBonus(
    referrerId: string,
    referredUserId: string,
    bonusAmount: number
  ): Promise<RewardValidationResult> {
    try {
      // Validate reward request
      const validation = await securityService.validateRewardRequest(
        referrerId,
        'referral',
        bonusAmount
      );

      if (!validation.isValid) {
        return {
          isValid: false,
          reason: validation.reason,
          riskScore: validation.riskScore,
        };
      }

      // Check if referral is valid (not self-referral)
      if (referrerId === referredUserId) {
        await this.logSecurityViolation(referrerId, 'self_referral_attempt', 95);
        return {
          isValid: false,
          reason: 'Self-referral not allowed',
          riskScore: 95,
        };
      }

      // Check if user was already referred
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_user_id', referredUserId)
        .single();

      if (existingReferral) {
        await this.logSecurityViolation(referrerId, 'duplicate_referral_attempt', 85);
        return {
          isValid: false,
          reason: 'User already referred',
          riskScore: 85,
        };
      }

      // Process the bonus
      const result = await this.addDiamonds(referrerId, bonusAmount, 'referral_bonus');
      
      if (result.success) {
        // Log successful referral
        await securityService.logSecurityAudit(
          referrerId,
          'referral_bonus_awarded',
          validation.riskScore,
          { 
            referred_user_id: referredUserId,
            bonus_amount: bonusAmount 
          }
        );
      }

      return {
        isValid: result.success,
        reason: result.error,
        riskScore: validation.riskScore,
        auditId: result.auditId,
      };
    } catch (error) {
      console.error('Referral bonus processing failed:', error);
      return {
        isValid: false,
        reason: 'Processing error',
        riskScore: 100,
      };
    }
  }

  /**
   * Secure diamond to BetaCoin conversion
   */
  async convertDiamondsToBetaCoins(
    userId: string,
    diamondsAmount: number
  ): Promise<{ success: boolean; error?: string; wallet?: SecureWalletData; auditId?: string }> {
    try {
      // Validate conversion request
      const validation = await securityService.validateRewardRequest(
        userId,
        'conversion',
        diamondsAmount
      );

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.reason,
        };
      }

      // Get current wallet
      const wallet = await this.getWallet(userId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      // Validate sufficient balance
      if (wallet.betame_diamonds < diamondsAmount) {
        await this.logSecurityViolation(userId, 'insufficient_balance_attempt', 75);
        return { success: false, error: 'Insufficient diamonds' };
      }

      // Calculate conversion (10 diamonds = 1 BetaCoin)
      const betaCoinsToAdd = Math.floor(diamondsAmount / 10);
      const diamondsToDeduct = betaCoinsToAdd * 10;

      // Update wallet
      const updatedWallet: SecureWalletData = {
        ...wallet,
        betame_diamonds: wallet.betame_diamonds - diamondsToDeduct,
        betame_betacoins: wallet.betame_betacoins + betaCoinsToAdd,
      };

      // Generate new integrity hash
      const integrityHash = await this.generateWalletIntegrityHash(updatedWallet);

      const { data: newWallet, error: updateError } = await supabase
        .from('wallets')
        .update({
          betame_diamonds: updatedWallet.betame_diamonds,
          betame_betacoins: updatedWallet.betame_betacoins,
          integrity_hash: integrityHash,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating wallet:', updateError);
        return { success: false, error: 'Update failed' };
      }

      // Record transaction
      const transactionResult = await this.recordTransaction({
        user_id: userId,
        type: 'conversion',
        amount: diamondsToDeduct,
        description: `Converted ${diamondsToDeduct} diamonds to ${betaCoinsToAdd} BetaCoins`,
      });

      // Log security audit
      const auditId = await securityService.logSecurityAudit(
        userId,
        'diamond_conversion',
        validation.riskScore,
        {
          diamonds_converted: diamondsToDeduct,
          betacoins_received: betaCoinsToAdd,
          transaction_id: transactionResult.transactionId,
        }
      );

      return {
        success: true,
        wallet: newWallet,
        auditId,
      };
    } catch (error) {
      console.error('Diamond conversion failed:', error);
      return { success: false, error: 'Conversion failed' };
    }
  }

  /**
   * Add diamonds with security validation
   */
  private async addDiamonds(
    userId: string,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; error?: string; auditId?: string }> {
    try {
      // Get current wallet
      const wallet = await this.getWallet(userId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      // Update wallet
      const updatedWallet: SecureWalletData = {
        ...wallet,
        betame_diamonds: wallet.betame_diamonds + amount,
      };

      // Generate new integrity hash
      const integrityHash = await this.generateWalletIntegrityHash(updatedWallet);

      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          betame_diamonds: updatedWallet.betame_diamonds,
          integrity_hash: integrityHash,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating wallet:', updateError);
        return { success: false, error: 'Update failed' };
      }

      // Record transaction
      const transactionResult = await this.recordTransaction({
        user_id: userId,
        type: 'daily_checkin',
        amount: amount,
        description: `Received ${amount} diamonds for ${reason}`,
      });

      // Log security audit
      const auditId = await securityService.logSecurityAudit(
        userId,
        'diamonds_awarded',
        10,
        {
          diamonds_awarded: amount,
          reason: reason,
          transaction_id: transactionResult.transactionId,
        }
      );

      return {
        success: true,
        auditId,
      };
    } catch (error) {
      console.error('Add diamonds failed:', error);
      return { success: false, error: 'Operation failed' };
    }
  }

  /**
   * Record transaction with security measures
   */
  private async recordTransaction(transaction: Omit<SecureTransaction, 'id' | 'created_at'>): Promise<{ transactionId: string }> {
    try {
      // Generate integrity hash for transaction
      const integrityHash = await this.generateTransactionIntegrityHash(transaction);

      // Get device fingerprint
      const deviceFingerprint = securityService.getDeviceFingerprint()?.hash || 'unknown';

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transaction,
          integrity_hash: integrityHash,
          device_fingerprint: deviceFingerprint,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error recording transaction:', error);
        throw error;
      }

      return { transactionId: data.id };
    } catch (error) {
      console.error('Transaction recording failed:', error);
      throw error;
    }
  }

  /**
   * Generate wallet integrity hash
   */
  private async generateWalletIntegrityHash(wallet: SecureWalletData): Promise<string> {
    const walletData = {
      user_id: wallet.user_id,
      betame_diamonds: wallet.betame_diamonds,
      betame_betacoins: wallet.betame_betacoins,
      updated_at: wallet.updated_at || new Date().toISOString(),
    };

    const dataString = JSON.stringify(walletData);
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataString
    );
  }

  /**
   * Generate transaction integrity hash
   */
  private async generateTransactionIntegrityHash(transaction: Omit<SecureTransaction, 'id' | 'created_at'>): Promise<string> {
    const transactionData = {
      user_id: transaction.user_id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      timestamp: new Date().toISOString(),
    };

    const dataString = JSON.stringify(transactionData);
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataString
    );
  }

  /**
   * Verify wallet integrity
   */
  private async verifyWalletIntegrity(wallet: SecureWalletData): Promise<boolean> {
    try {
      if (!wallet.integrity_hash) {
        return false;
      }

      const expectedHash = await this.generateWalletIntegrityHash(wallet);
      return wallet.integrity_hash === expectedHash;
    } catch (error) {
      console.error('Wallet integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Log security violation
   */
  private async logSecurityViolation(
    userId: string,
    violationType: string,
    riskScore: number
  ): Promise<void> {
    try {
      await securityService.logSecurityAudit(
        userId,
        violationType,
        riskScore,
        { violation_type: violationType }
      );

      // Create security alert for high-risk violations
      if (riskScore > 80) {
        const { error } = await supabase
          .from('security_alerts')
          .insert({
            user_id: userId,
            alert_type: violationType,
            severity: 'high',
            description: `Security violation detected: ${violationType}`,
            risk_score: riskScore,
          });

        if (error) {
          console.error('Failed to create security alert:', error);
        }
      }
    } catch (error) {
      console.error('Security violation logging failed:', error);
    }
  }

  /**
   * Get transaction history with security validation
   */
  async getTransactionHistory(userId: string, limit: number = 50): Promise<SecureTransaction[]> {
    try {
      // Validate session security
      const isSessionValid = await securityService.validateSessionSecurity(userId);
      if (!isSessionValid) {
        console.error('Session security validation failed for user:', userId);
        return [];
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching transaction history:', error);
        return [];
      }

      // Verify transaction integrity
      const validTransactions: SecureTransaction[] = [];
      for (const transaction of data || []) {
        const isValid = await this.verifyTransactionIntegrity(transaction);
        if (isValid) {
          validTransactions.push(transaction);
        } else {
          console.warn('Invalid transaction detected:', transaction.id);
          await this.logSecurityViolation(userId, 'transaction_integrity_failure', 85);
        }
      }

      return validTransactions;
    } catch (error) {
      console.error('Transaction history fetch failed:', error);
      return [];
    }
  }

  /**
   * Verify transaction integrity
   */
  private async verifyTransactionIntegrity(transaction: SecureTransaction): Promise<boolean> {
    try {
      if (!transaction.integrity_hash) {
        return false;
      }

      const expectedHash = await this.generateTransactionIntegrityHash({
        user_id: transaction.user_id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
      });

      return transaction.integrity_hash === expectedHash;
    } catch (error) {
      console.error('Transaction integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Get security audit log for user
   */
  async getSecurityAuditLog(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('security_audits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching security audit log:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Security audit log fetch failed:', error);
      return [];
    }
  }
}

export const secureWalletService = SecureWalletService.getInstance();
