import { supabase, supabaseAdmin } from './supabase';
import { securityService } from './security-service';
import { secureWalletService } from './secure-wallet-service';
import * as Crypto from 'expo-crypto';

export interface SecureReferralCode {
  id: string;
  user_id: string;
  referral_code: string;
  total_referrals: number;
  total_credits_earned: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  integrity_hash?: string;
}

export interface SecureReferral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  status: 'pending' | 'signup_completed' | 'first_job_completed' | 'completed';
  referral_code: string;
  signup_credits_awarded: number;
  first_job_credits_awarded: number;
  total_credits_earned: number;
  diamonds_awarded: number;
  created_at: string;
  updated_at: string;
  first_job_completed_at?: string;
  integrity_hash?: string;
}

export interface ReferralValidationResult {
  isValid: boolean;
  reason?: string;
  riskScore: number;
  auditId?: string;
}

class SecureReferralService {
  private static instance: SecureReferralService;

  static getInstance(): SecureReferralService {
    if (!SecureReferralService.instance) {
      SecureReferralService.instance = new SecureReferralService();
    }
    return SecureReferralService.instance;
  }

  /**
   * Generate secure referral code for user
   */
  async generateReferralCode(userId: string): Promise<SecureReferralCode | null> {
    try {
      // Check if user already has a referral code
      const existingCode = await this.getReferralCode(userId);
      if (existingCode) {
        return existingCode;
      }

      // Generate unique referral code
      const referralCode = await this.generateUniqueReferralCode();

      // Create referral code record
      const referralCodeData = {
        user_id: userId,
        referral_code: referralCode,
        total_referrals: 0,
        total_credits_earned: 0,
        is_active: true,
      };

      // Generate integrity hash
      const integrityHash = await this.generateReferralCodeIntegrityHash(referralCodeData);

      const { data, error } = await supabaseAdmin
        .from('referral_codes')
        .insert({
          ...referralCodeData,
          integrity_hash: integrityHash,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating referral code:', error);
        return null;
      }

      // Log security audit
      await securityService.logSecurityAudit(
        userId,
        'referral_code_generated',
        5,
        { referral_code: referralCode }
      );

      console.log('✅ Generated secure referral code for user:', userId);
      return data;
    } catch (error) {
      console.error('Error generating referral code:', error);
      return null;
    }
  }

  /**
   * Get referral code for user
   */
  async getReferralCode(userId: string): Promise<SecureReferralCode | null> {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No referral code found
        }
        console.error('Error fetching referral code:', error);
        return null;
      }

      // Verify integrity
      const isIntegrityValid = await this.verifyReferralCodeIntegrity(data);
      if (!isIntegrityValid) {
        console.error('Referral code integrity check failed for user:', userId);
        await this.logSecurityViolation(userId, 'referral_code_integrity_failure', 90);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getReferralCode:', error);
      return null;
    }
  }

  /**
   * Validate and process referral signup
   */
  async processReferralSignup(
    referralCode: string,
    newUserId: string
  ): Promise<ReferralValidationResult> {
    try {
      // Validate referral code
      const referralCodeData = await this.validateReferralCode(referralCode);
      if (!referralCodeData) {
        return {
          isValid: false,
          reason: 'Invalid referral code',
          riskScore: 100,
        };
      }

      const referrerId = referralCodeData.user_id;

      // Validate referral request
      const validation = await securityService.validateRewardRequest(
        referrerId,
        'referral',
        10 // Signup bonus amount
      );

      if (!validation.isValid) {
        return {
          isValid: false,
          reason: validation.reason,
          riskScore: validation.riskScore,
        };
      }

      // Check for self-referral
      if (referrerId === newUserId) {
        await this.logSecurityViolation(referrerId, 'self_referral_attempt', 95);
        return {
          isValid: false,
          reason: 'Self-referral not allowed',
          riskScore: 95,
        };
      }

      // Check if user was already referred
      const existingReferral = await this.getReferralByReferredUser(newUserId);
      if (existingReferral) {
        await this.logSecurityViolation(referrerId, 'duplicate_referral_attempt', 85);
        return {
          isValid: false,
          reason: 'User already referred',
          riskScore: 85,
        };
      }

      // Check for suspicious referral patterns
      const patternCheck = await this.checkReferralPatterns(referrerId, newUserId);
      if (patternCheck.isSuspicious) {
        return {
          isValid: false,
          reason: 'Suspicious referral pattern detected',
          riskScore: patternCheck.riskScore,
        };
      }

      // Create referral record
      const referralData = {
        referrer_id: referrerId,
        referred_user_id: newUserId,
        status: 'signup_completed',
        referral_code: referralCode,
        signup_credits_awarded: 10,
        first_job_credits_awarded: 0,
        total_credits_earned: 10,
        diamonds_awarded: 10,
      };

      // Generate integrity hash
      const integrityHash = await this.generateReferralIntegrityHash(referralData);

      const { data: referral, error: referralError } = await supabaseAdmin
        .from('referrals')
        .insert({
          ...referralData,
          integrity_hash: integrityHash,
        })
        .select()
        .single();

      if (referralError) {
        console.error('Error creating referral:', referralError);
        return {
          isValid: false,
          reason: 'Failed to create referral',
          riskScore: 100,
        };
      }

      // Award diamonds to referrer
      const walletResult = await secureWalletService.processReferralBonus(
        referrerId,
        newUserId,
        10
      );

      if (!walletResult.isValid) {
        console.error('Failed to award referral bonus:', walletResult.reason);
        return {
          isValid: false,
          reason: 'Failed to award bonus',
          riskScore: walletResult.riskScore,
        };
      }

      // Update referral code stats
      await this.updateReferralCodeStats(referrerId, 10);

      // Log security audit
      const auditId = await securityService.logSecurityAudit(
        referrerId,
        'referral_signup_completed',
        validation.riskScore,
        {
          referred_user_id: newUserId,
          referral_code: referralCode,
          bonus_awarded: 10,
          referral_id: referral.id,
        }
      );

      return {
        isValid: true,
        riskScore: validation.riskScore,
        auditId,
      };
    } catch (error) {
      console.error('Referral signup processing failed:', error);
      return {
        isValid: false,
        reason: 'Processing error',
        riskScore: 100,
      };
    }
  }

  /**
   * Process first job completion for referral
   */
  async processFirstJobCompletion(referredUserId: string): Promise<ReferralValidationResult> {
    try {
      // Get referral record
      const referral = await this.getReferralByReferredUser(referredUserId);
      if (!referral) {
        return {
          isValid: false,
          reason: 'No referral found',
          riskScore: 100,
        };
      }

      // Check if already completed
      if (referral.status === 'completed') {
        return {
          isValid: false,
          reason: 'Referral already completed',
          riskScore: 100,
        };
      }

      const referrerId = referral.referrer_id;

      // Validate reward request
      const validation = await securityService.validateRewardRequest(
        referrerId,
        'referral',
        20 // First job bonus amount
      );

      if (!validation.isValid) {
        return {
          isValid: false,
          reason: validation.reason,
          riskScore: validation.riskScore,
        };
      }

      // Award additional bonus
      const walletResult = await secureWalletService.processReferralBonus(
        referrerId,
        referredUserId,
        20
      );

      if (!walletResult.isValid) {
        return {
          isValid: false,
          reason: 'Failed to award bonus',
          riskScore: walletResult.riskScore,
        };
      }

      // Update referral status
      const updatedReferral = {
        ...referral,
        status: 'completed',
        first_job_credits_awarded: 20,
        total_credits_earned: 30,
        diamonds_awarded: 30,
        first_job_completed_at: new Date().toISOString(),
      };

      // Generate new integrity hash
      const integrityHash = await this.generateReferralIntegrityHash(updatedReferral);

      const { error: updateError } = await supabase
        .from('referrals')
        .update({
          status: 'completed',
          first_job_credits_awarded: 20,
          total_credits_earned: 30,
          diamonds_awarded: 30,
          first_job_completed_at: new Date().toISOString(),
          integrity_hash: integrityHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', referral.id);

      if (updateError) {
        console.error('Error updating referral:', updateError);
        return {
          isValid: false,
          reason: 'Failed to update referral',
          riskScore: 100,
        };
      }

      // Update referral code stats
      await this.updateReferralCodeStats(referrerId, 20);

      // Log security audit
      const auditId = await securityService.logSecurityAudit(
        referrerId,
        'referral_first_job_completed',
        validation.riskScore,
        {
          referred_user_id: referredUserId,
          bonus_awarded: 20,
          referral_id: referral.id,
        }
      );

      return {
        isValid: true,
        riskScore: validation.riskScore,
        auditId,
      };
    } catch (error) {
      console.error('First job completion processing failed:', error);
      return {
        isValid: false,
        reason: 'Processing error',
        riskScore: 100,
      };
    }
  }

  /**
   * Validate referral code
   */
  private async validateReferralCode(referralCode: string): Promise<SecureReferralCode | null> {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('referral_code', referralCode)
        .eq('is_active', true)
        .single();

      if (error) {
        return null;
      }

      // Verify integrity
      const isIntegrityValid = await this.verifyReferralCodeIntegrity(data);
      if (!isIntegrityValid) {
        console.error('Referral code integrity check failed:', referralCode);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error validating referral code:', error);
      return null;
    }
  }

  /**
   * Get referral by referred user
   */
  private async getReferralByReferredUser(referredUserId: string): Promise<SecureReferral | null> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', referredUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching referral:', error);
        return null;
      }

      // Verify integrity
      const isIntegrityValid = await this.verifyReferralIntegrity(data);
      if (!isIntegrityValid) {
        console.error('Referral integrity check failed for user:', referredUserId);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getReferralByReferredUser:', error);
      return null;
    }
  }

  /**
   * Check for suspicious referral patterns
   */
  private async checkReferralPatterns(
    referrerId: string,
    referredUserId: string
  ): Promise<{ isSuspicious: boolean; riskScore: number }> {
    let riskScore = 0;

    try {
      // Check referrer's recent referral activity
      const { data: recentReferrals } = await supabase
        .from('referrals')
        .select('created_at')
        .eq('referrer_id', referrerId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false });

      if (recentReferrals && recentReferrals.length > 5) {
        riskScore += 30; // Too many referrals in short time
      }

      // Check for rapid successive referrals
      if (recentReferrals && recentReferrals.length > 0) {
        const lastReferral = recentReferrals[0];
        const timeSinceLastReferral = Date.now() - new Date(lastReferral.created_at).getTime();
        
        if (timeSinceLastReferral < 5 * 60 * 1000) { // Less than 5 minutes
          riskScore += 25;
        }
      }

      // Check for multiple referrals from same IP/device (basic check)
      const deviceFingerprint = securityService.getDeviceFingerprint()?.hash;
      if (deviceFingerprint) {
        const { data: sameDeviceReferrals } = await supabase
          .from('security_audits')
          .select('user_id')
          .eq('device_fingerprint', deviceFingerprint)
          .eq('action', 'referral_signup_completed')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (sameDeviceReferrals && sameDeviceReferrals.length > 2) {
          riskScore += 20;
        }
      }

      return {
        isSuspicious: riskScore > 50,
        riskScore,
      };
    } catch (error) {
      console.error('Error checking referral patterns:', error);
      return {
        isSuspicious: false,
        riskScore: 0,
      };
    }
  }

  /**
   * Update referral code statistics
   */
  private async updateReferralCodeStats(referrerId: string, bonusAmount: number): Promise<void> {
    try {
      const { data: referralCode } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', referrerId)
        .single();

      if (referralCode) {
        const updatedStats = {
          total_referrals: referralCode.total_referrals + 1,
          total_credits_earned: referralCode.total_credits_earned + bonusAmount,
        };

        // Generate new integrity hash
        const integrityHash = await this.generateReferralCodeIntegrityHash({
          ...referralCode,
          ...updatedStats,
        });

        await supabase
          .from('referral_codes')
          .update({
            ...updatedStats,
            integrity_hash: integrityHash,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', referrerId);
      }
    } catch (error) {
      console.error('Error updating referral code stats:', error);
    }
  }

  /**
   * Generate unique referral code
   */
  private async generateUniqueReferralCode(): Promise<string> {
    let referralCode: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generate 8-character alphanumeric code
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      referralCode = '';
      for (let i = 0; i < 8; i++) {
        referralCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Check if code already exists
      const { data } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('referral_code', referralCode)
        .single();

      if (!data) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique referral code');
    }

    return referralCode!;
  }

  /**
   * Generate referral code integrity hash
   */
  private async generateReferralCodeIntegrityHash(referralCode: any): Promise<string> {
    const referralCodeData = {
      user_id: referralCode.user_id,
      referral_code: referralCode.referral_code,
      total_referrals: referralCode.total_referrals,
      total_credits_earned: referralCode.total_credits_earned,
      is_active: referralCode.is_active,
      updated_at: referralCode.updated_at || new Date().toISOString(),
    };

    const dataString = JSON.stringify(referralCodeData);
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataString
    );
  }

  /**
   * Generate referral integrity hash
   */
  private async generateReferralIntegrityHash(referral: any): Promise<string> {
    const referralData = {
      referrer_id: referral.referrer_id,
      referred_user_id: referral.referred_user_id,
      status: referral.status,
      referral_code: referral.referral_code,
      signup_credits_awarded: referral.signup_credits_awarded,
      first_job_credits_awarded: referral.first_job_credits_awarded,
      total_credits_earned: referral.total_credits_earned,
      diamonds_awarded: referral.diamonds_awarded,
      updated_at: referral.updated_at || new Date().toISOString(),
    };

    const dataString = JSON.stringify(referralData);
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataString
    );
  }

  /**
   * Verify referral code integrity
   */
  private async verifyReferralCodeIntegrity(referralCode: SecureReferralCode): Promise<boolean> {
    try {
      if (!referralCode.integrity_hash) {
        return false;
      }

      const expectedHash = await this.generateReferralCodeIntegrityHash(referralCode);
      return referralCode.integrity_hash === expectedHash;
    } catch (error) {
      console.error('Referral code integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Verify referral integrity
   */
  private async verifyReferralIntegrity(referral: SecureReferral): Promise<boolean> {
    try {
      if (!referral.integrity_hash) {
        return false;
      }

      const expectedHash = await this.generateReferralIntegrityHash(referral);
      return referral.integrity_hash === expectedHash;
    } catch (error) {
      console.error('Referral integrity verification failed:', error);
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
            description: `Referral security violation: ${violationType}`,
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
   * Get referral statistics for user
   */
  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    totalEarnings: number;
    completedReferrals: number;
    pendingReferrals: number;
  }> {
    try {
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('status, total_credits_earned')
        .eq('referrer_id', userId);

      if (error) {
        console.error('Error fetching referral stats:', error);
        return {
          totalReferrals: 0,
          totalEarnings: 0,
          completedReferrals: 0,
          pendingReferrals: 0,
        };
      }

      const totalReferrals = referrals?.length || 0;
      const completedReferrals = referrals?.filter(r => r.status === 'completed').length || 0;
      const pendingReferrals = totalReferrals - completedReferrals;
      const totalEarnings = referrals?.reduce((sum, r) => sum + (r.total_credits_earned || 0), 0) || 0;

      return {
        totalReferrals,
        totalEarnings,
        completedReferrals,
        pendingReferrals,
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return {
        totalReferrals: 0,
        totalEarnings: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
      };
    }
  }

  /**
   * Get referral history for user
   */
  async getReferralHistory(userId: string, limit: number = 20): Promise<SecureReferral[]> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching referral history:', error);
        return [];
      }

      // Verify integrity for each referral
      const validReferrals: SecureReferral[] = [];
      for (const referral of data || []) {
        const isValid = await this.verifyReferralIntegrity(referral);
        if (isValid) {
          validReferrals.push(referral);
        } else {
          console.warn('Invalid referral detected:', referral.id);
          await this.logSecurityViolation(userId, 'referral_integrity_failure', 85);
        }
      }

      return validReferrals;
    } catch (error) {
      console.error('Error getting referral history:', error);
      return [];
    }
  }
}

export const secureReferralService = SecureReferralService.getInstance();
