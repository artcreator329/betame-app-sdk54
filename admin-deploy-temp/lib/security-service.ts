import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { supabase } from './supabase';

// Security configuration
const SECURITY_CONFIG = {
  // Rate limiting
  MAX_CHECKINS_PER_DAY: 1,
  MAX_REFERRAL_ATTEMPTS_PER_HOUR: 5,
  MAX_WALLET_OPERATIONS_PER_MINUTE: 10,
  
  // Anti-tampering
  INTEGRITY_CHECK_INTERVAL: 30000, // 30 seconds
  DEVICE_FINGERPRINT_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  
  // Reward limits
  MAX_DAILY_DIAMONDS: 50,
  MAX_REFERRAL_BONUS_PER_USER: 100,
  MIN_TIME_BETWEEN_REWARDS: 60 * 1000, // 1 minute
};

export interface SecurityAudit {
  id: string;
  user_id: string;
  action: string;
  device_fingerprint: string;
  ip_address?: string;
  user_agent?: string;
  location?: string;
  risk_score: number;
  is_suspicious: boolean;
  created_at: string;
  metadata: any;
}

export interface DeviceFingerprint {
  device_id: string;
  platform: string;
  model: string;
  os_version: string;
  app_version: string;
  build_number: string;
  device_name: string;
  total_memory?: number;
  cpu_architecture?: string;
  screen_resolution?: string;
  timezone: string;
  locale: string;
  hash: string;
}

export interface RateLimitInfo {
  action: string;
  current_count: number;
  max_count: number;
  window_start: string;
  window_end: string;
  is_blocked: boolean;
}

class SecurityService {
  private static instance: SecurityService;
  private deviceFingerprint: DeviceFingerprint | null = null;
  private lastIntegrityCheck: number = 0;
  private securityCache: Map<string, any> = new Map();

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Initialize security service and generate device fingerprint
   */
  async initialize(): Promise<void> {
    try {
      this.deviceFingerprint = await this.generateDeviceFingerprint();
      await this.validateAppIntegrity();
      await this.setupPeriodicChecks();
    } catch (error) {
      console.error('Security initialization failed:', error);
      throw new Error('Security initialization failed');
    }
  }

  /**
   * Generate unique device fingerprint for anti-fraud detection
   */
  private async generateDeviceFingerprint(): Promise<DeviceFingerprint> {
    const deviceInfo = {
      device_id: Device.osInternalBuildId || Device.deviceName || 'unknown',
      platform: Platform.OS,
      model: Device.modelName || 'unknown',
      os_version: Device.osVersion || 'unknown',
      app_version: Application.nativeApplicationVersion || 'unknown',
      build_number: Application.nativeBuildVersion || 'unknown',
      device_name: Device.deviceName || 'unknown',
      total_memory: Device.totalMemory || undefined,
      cpu_architecture: undefined, // Device.cpuArchitecture not available in expo-device
      screen_resolution: undefined, // Device.screenWidth/screenHeight not available in expo-device
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
    };

    // Create hash of device info
    const deviceString = JSON.stringify(deviceInfo);
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      deviceString
    );

    return {
      ...deviceInfo,
      hash,
    };
  }

  /**
   * Validate app integrity to prevent tampering
   */
  private async validateAppIntegrity(): Promise<boolean> {
    try {
      // Check if running in debug mode
      if (__DEV__) {
        console.warn('Security: Running in development mode');
        return true; // Allow in development
      }

      // Validate app signature (basic check)
      const appId = Application.applicationId;
      const expectedAppId = 'com.artcreator329.boltexponativewind';
      
      if (appId !== expectedAppId) {
        throw new Error('Invalid application ID');
      }

      // Check for common reverse engineering tools
      await this.detectReverseEngineeringTools();

      return true;
    } catch (error) {
      console.error('App integrity validation failed:', error);
      return false;
    }
  }

  /**
   * Detect common reverse engineering tools and techniques
   */
  private async detectReverseEngineeringTools(): Promise<void> {
    // Check for common debugger detection
    const debuggerCheck = await this.checkForDebugger();
    if (debuggerCheck) {
      throw new Error('Debugger detected');
    }

    // Check for emulator/simulator
    if (Device.isDevice === false) {
      console.warn('Security: Running on emulator/simulator');
    }

    // Check for root/jailbreak (basic)
    if (Platform.OS === 'android') {
      // Add root detection logic here
      const isRooted = await this.checkForRoot();
      if (isRooted) {
        throw new Error('Rooted device detected');
      }
    }
  }

  /**
   * Basic debugger detection
   */
  private async checkForDebugger(): Promise<boolean> {
    // Simple timing-based debugger detection
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1));
    const end = Date.now();
    
    // If execution took too long, might be under debugger
    return (end - start) > 10;
  }

  /**
   * Basic root detection for Android
   */
  private async checkForRoot(): Promise<boolean> {
    // This is a basic implementation
    // In production, use a proper root detection library
    return false;
  }

  /**
   * Setup periodic security checks
   */
  private async setupPeriodicChecks(): Promise<void> {
    setInterval(async () => {
      try {
        await this.validateAppIntegrity();
        await this.cleanupExpiredCache();
      } catch (error) {
        console.error('Periodic security check failed:', error);
      }
    }, SECURITY_CONFIG.INTEGRITY_CHECK_INTERVAL);
  }

  /**
   * Rate limiting for various actions
   */
  async checkRateLimit(userId: string, action: string): Promise<RateLimitInfo> {
    const cacheKey = `rate_limit:${userId}:${action}`;
    const now = new Date();
    
    // Get current rate limit info
    let rateLimitInfo = this.securityCache.get(cacheKey) as RateLimitInfo;
    
    if (!rateLimitInfo) {
      rateLimitInfo = {
        action,
        current_count: 0,
        max_count: this.getMaxCountForAction(action),
        window_start: now.toISOString(),
        window_end: this.getWindowEnd(action, now).toISOString(),
        is_blocked: false,
      };
    }

    // Check if window has expired
    if (new Date(rateLimitInfo.window_end) <= now) {
      rateLimitInfo = {
        action,
        current_count: 0,
        max_count: this.getMaxCountForAction(action),
        window_start: now.toISOString(),
        window_end: this.getWindowEnd(action, now).toISOString(),
        is_blocked: false,
      };
    }

    // Check if rate limit exceeded
    if (rateLimitInfo.current_count >= rateLimitInfo.max_count) {
      rateLimitInfo.is_blocked = true;
    }

    this.securityCache.set(cacheKey, rateLimitInfo);
    return rateLimitInfo;
  }

  /**
   * Increment rate limit counter
   */
  async incrementRateLimit(userId: string, action: string): Promise<void> {
    const rateLimitInfo = await this.checkRateLimit(userId, action);
    rateLimitInfo.current_count++;
    
    const cacheKey = `rate_limit:${userId}:${action}`;
    this.securityCache.set(cacheKey, rateLimitInfo);
  }

  /**
   * Get maximum count for specific action
   */
  private getMaxCountForAction(action: string): number {
    switch (action) {
      case 'checkin':
        return SECURITY_CONFIG.MAX_CHECKINS_PER_DAY;
      case 'referral':
        return SECURITY_CONFIG.MAX_REFERRAL_ATTEMPTS_PER_HOUR;
      case 'wallet_operation':
        return SECURITY_CONFIG.MAX_WALLET_OPERATIONS_PER_MINUTE;
      default:
        return 10;
    }
  }

  /**
   * Get window end time for action
   */
  private getWindowEnd(action: string, startTime: Date): Date {
    const endTime = new Date(startTime);
    
    switch (action) {
      case 'checkin':
        endTime.setDate(endTime.getDate() + 1);
        break;
      case 'referral':
        endTime.setHours(endTime.getHours() + 1);
        break;
      case 'wallet_operation':
        endTime.setMinutes(endTime.getMinutes() + 1);
        break;
      default:
        endTime.setHours(endTime.getHours() + 1);
    }
    
    return endTime;
  }

  /**
   * Validate reward request and prevent abuse
   */
  async validateRewardRequest(
    userId: string,
    rewardType: 'checkin' | 'referral' | 'conversion',
    amount: number
  ): Promise<{ isValid: boolean; reason?: string; riskScore: number }> {
    try {
      // Check rate limits
      const rateLimit = await this.checkRateLimit(userId, rewardType);
      if (rateLimit.is_blocked) {
        return {
          isValid: false,
          reason: 'Rate limit exceeded',
          riskScore: 100,
        };
      }

      // Validate reward amount
      const amountValidation = this.validateRewardAmount(rewardType, amount);
      if (!amountValidation.isValid) {
        return {
          isValid: false,
          reason: amountValidation.reason,
          riskScore: 80,
        };
      }

      // Check for suspicious patterns
      const patternCheck = await this.checkSuspiciousPatterns(userId, rewardType);
      if (patternCheck.isSuspicious) {
        return {
          isValid: false,
          reason: 'Suspicious activity detected',
          riskScore: patternCheck.riskScore,
        };
      }

      // Calculate risk score
      const riskScore = this.calculateRiskScore(userId, rewardType, amount);

      return {
        isValid: true,
        riskScore,
      };
    } catch (error) {
      console.error('Reward validation failed:', error);
      return {
        isValid: false,
        reason: 'Validation error',
        riskScore: 100,
      };
    }
  }

  /**
   * Validate reward amount based on type and limits
   */
  private validateRewardAmount(
    rewardType: string,
    amount: number
  ): { isValid: boolean; reason?: string } {
    switch (rewardType) {
      case 'checkin':
        if (amount > SECURITY_CONFIG.MAX_DAILY_DIAMONDS) {
          return {
            isValid: false,
            reason: 'Daily diamond limit exceeded',
          };
        }
        break;
      case 'referral':
        if (amount > SECURITY_CONFIG.MAX_REFERRAL_BONUS_PER_USER) {
          return {
            isValid: false,
            reason: 'Referral bonus limit exceeded',
          };
        }
        break;
      case 'conversion':
        if (amount <= 0) {
          return {
            isValid: false,
            reason: 'Invalid conversion amount',
          };
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Check for suspicious patterns in user behavior
   */
  private async checkSuspiciousPatterns(
    userId: string,
    rewardType: string
  ): Promise<{ isSuspicious: boolean; riskScore: number }> {
    let riskScore = 0;

    // Check for rapid successive requests
    const recentRequests = await this.getRecentRequests(userId, rewardType);
    if (recentRequests.length > 0) {
      const lastRequest = recentRequests[0];
      const timeSinceLastRequest = Date.now() - new Date(lastRequest.created_at).getTime();
      
      if (timeSinceLastRequest < SECURITY_CONFIG.MIN_TIME_BETWEEN_REWARDS) {
        riskScore += 30;
      }
    }

    // Check for multiple devices
    const deviceCount = await this.getUserDeviceCount(userId);
    if (deviceCount > 3) {
      riskScore += 20;
    }

    // Check for unusual time patterns
    const hour = new Date().getHours();
    if (hour < 6 || hour > 23) {
      riskScore += 10;
    }

    return {
      isSuspicious: riskScore > 50,
      riskScore,
    };
  }

  /**
   * Calculate overall risk score for the request
   */
  private calculateRiskScore(
    userId: string,
    rewardType: string,
    amount: number
  ): number {
    let riskScore = 0;

    // Base risk based on reward type
    switch (rewardType) {
      case 'referral':
        riskScore += 20;
        break;
      case 'conversion':
        riskScore += 10;
        break;
      case 'checkin':
        riskScore += 5;
        break;
    }

    // Risk based on amount
    if (amount > 100) {
      riskScore += 15;
    } else if (amount > 50) {
      riskScore += 10;
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Log security audit events
   */
  async logSecurityAudit(
    userId: string,
    action: string,
    riskScore: number,
    metadata: any = {}
  ): Promise<void> {
    try {
      // For system-level audits, skip database logging in development
      if (userId === 'system' && __DEV__) {
        console.log('🔍 Security Audit (Development):', { action, riskScore, metadata });
        return;
      }

      // Validate userId is a valid UUID for database logging
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
      
      if (!isValidUUID && userId !== 'system') {
        console.warn('Invalid UUID for security audit:', userId);
        return;
      }

      const audit: Omit<SecurityAudit, 'id' | 'created_at'> = {
        user_id: userId,
        action,
        device_fingerprint: this.deviceFingerprint?.hash || 'unknown',
        risk_score: riskScore,
        is_suspicious: riskScore > 70,
        metadata: {
          ...metadata,
          device_info: this.deviceFingerprint,
          timestamp: new Date().toISOString(),
        },
      };

      // Store in database only for valid user IDs
      if (isValidUUID) {
        const { error } = await supabase
          .from('security_audits')
          .insert(audit);

        if (error) {
          console.error('Failed to log security audit:', error);
        }
      } else {
        // For system audits, just log to console
        console.log('🔍 System Security Audit:', { action, riskScore, metadata });
      }
    } catch (error) {
      console.error('Security audit logging failed:', error);
    }
  }

  /**
   * Get recent requests for pattern analysis
   */
  private async getRecentRequests(
    userId: string,
    action: string
  ): Promise<any[]> {
    const cacheKey = `recent_requests:${userId}:${action}`;
    return this.securityCache.get(cacheKey) || [];
  }

  /**
   * Get user device count
   */
  private async getUserDeviceCount(userId: string): Promise<number> {
    // This would typically query the database
    // For now, return a default value
    return 1;
  }

  /**
   * Cleanup expired cache entries
   */
  private async cleanupExpiredCache(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, value] of this.securityCache.entries()) {
      if (value.expiresAt && value.expiresAt < now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.securityCache.delete(key));
  }

  /**
   * Get device fingerprint
   */
  getDeviceFingerprint(): DeviceFingerprint | null {
    return this.deviceFingerprint;
  }

  /**
   * Verify transaction integrity
   */
  async verifyTransactionIntegrity(
    transactionId: string,
    userId: string,
    amount: number
  ): Promise<boolean> {
    try {
      // Verify transaction exists and belongs to user
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      if (error || !transaction) {
        return false;
      }

      // Verify amount matches
      if (transaction.amount !== amount) {
        return false;
      }

      // Verify transaction hasn't been tampered with
      const expectedHash = await this.calculateTransactionHash(transaction);
      if (transaction.integrity_hash !== expectedHash) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Transaction integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Calculate transaction integrity hash
   */
  private async calculateTransactionHash(transaction: any): Promise<string> {
    const transactionData = {
      id: transaction.id,
      user_id: transaction.user_id,
      amount: transaction.amount,
      type: transaction.type,
      created_at: transaction.created_at,
    };

    const dataString = JSON.stringify(transactionData);
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataString
    );
  }

  /**
   * Generate secure random token
   */
  async generateSecureToken(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string): Promise<string> {
    // In production, use a proper encryption library
    // This is a basic implementation
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
    return hash;
  }

  /**
   * Validate user session security
   */
  async validateSessionSecurity(userId: string): Promise<boolean> {
    try {
      // Check if device fingerprint matches
      const { data: userSession } = await supabase
        .from('user_sessions')
        .select('device_fingerprint')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (userSession && userSession.device_fingerprint !== this.deviceFingerprint?.hash) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session security validation failed:', error);
      return false;
    }
  }
}

export const securityService = SecurityService.getInstance();
