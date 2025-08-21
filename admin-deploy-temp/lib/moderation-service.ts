import { supabase } from './supabase';

export interface ModerationResult {
  isBlocked: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  violationType?: 'contact_info_sharing' | 'spam' | 'inappropriate_content' | 'harassment' | 'other';
}

export interface UserViolation {
  id: string;
  user_id: string;
  violation_type: string;
  violation_details?: string;
  message_content: string;
  chat_id?: string;
  severity: string;
  created_at: string;
}

export interface UserModerationStatus {
  user_id: string;
  total_violations: number;
  contact_info_violations: number;
  spam_violations: number;
  warning_count: number;
  is_banned: boolean;
  banned_until?: string;
  ban_reason?: string;
}

export interface UserWarning {
  id: string;
  user_id: string;
  warning_type: string;
  warning_message: string;
  sent_at: string;
  acknowledged_at?: string;
}

class ModerationService {
  // Enhanced contact information patterns
  private contactPatterns = [
    // Phone numbers (various formats)
    {
      pattern: /\b(?:\+?6?01[0-9][-.\s]?[0-9]{3,4}[-.\s]?[0-9]{4})\b/gi,
      description: 'Malaysian mobile number',
      severity: 'high' as const
    },
    {
      pattern: /\b(?:\+?60[3-9][0-9][-.\s]?[0-9]{3,4}[-.\s]?[0-9]{4})\b/gi,
      description: 'Malaysian landline number',
      severity: 'high' as const
    },
    {
      pattern: /\b(?:\+?[1-9][0-9]{0,3}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4})\b/gi,
      description: 'International phone number',
      severity: 'high' as const
    },
    {
      pattern: /\b[0-9]{3}[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/gi,
      description: 'Generic phone number',
      severity: 'medium' as const
    },
    
    // Email addresses
    {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
      description: 'Email address',
      severity: 'high' as const
    },
    
    // Social media platforms and messaging apps
    {
      pattern: /\b(?:whatsapp|wa|wechat|telegram|tele|line|viber|signal|discord|skype)\b/gi,
      description: 'Messaging app reference',
      severity: 'high' as const
    },
    {
      pattern: /\b(?:instagram|insta|ig|facebook|fb|twitter|tiktok|snapchat|snap)\b/gi,
      description: 'Social media platform',
      severity: 'medium' as const
    },
    
    // Contact requests and personal info sharing
    {
      pattern: /\b(?:call me|text me|dm me|contact me|reach me|message me|ping me)\b/gi,
      description: 'Contact request',
      severity: 'medium' as const
    },
    {
      pattern: /\b(?:my number|my phone|my email|my contact|my whatsapp|my telegram|my ig|my insta)\b/gi,
      description: 'Personal contact sharing',
      severity: 'high' as const
    },
    {
      pattern: /\b(?:add me on|find me on|follow me on|contact me on)\b/gi,
      description: 'Platform contact request',
      severity: 'medium' as const
    },
    
    // Attempts to bypass detection
    {
      pattern: /\b(?:zero|one|two|three|four|five|six|seven|eight|nine)\s*(?:zero|one|two|three|four|five|six|seven|eight|nine)/gi,
      description: 'Number spelled out (potential bypass)',
      severity: 'medium' as const
    },
    {
      pattern: /[0-9]\s*[a-z]\s*[0-9]|[0-9]\s*\*\s*[0-9]|[0-9]\s*-\s*[0-9]/gi,
      description: 'Obfuscated number',
      severity: 'medium' as const
    },
    {
      pattern: /@\s*[a-z]|[a-z]\s*@|email\s*:|contact\s*:/gi,
      description: 'Obfuscated contact info',
      severity: 'medium' as const
    }
  ];

  // Spam patterns
  private spamPatterns = [
    {
      pattern: /\b(?:click here|visit now|limited time|act now|urgent|hurry|don't miss)\b/gi,
      description: 'Spam keywords',
      severity: 'low' as const
    },
    {
      pattern: /\b(?:free money|easy money|work from home|make money fast)\b/gi,
      description: 'Scam keywords',
      severity: 'medium' as const
    }
  ];

  // Inappropriate content patterns
  private inappropriatePatterns = [
    {
      pattern: /\b(?:fuck|shit|damn|bitch|asshole|bastard|cunt)\b/gi,
      description: 'Profanity',
      severity: 'low' as const
    }
  ];

  /**
   * Moderate a message for policy violations
   */
  moderateMessage(message: string): ModerationResult {
    const lowerMessage = message.toLowerCase();
    
    // Check contact information patterns
    for (const { pattern, description, severity } of this.contactPatterns) {
      if (pattern.test(message)) {
        return {
          isBlocked: true,
          reason: `Message contains ${description}. Please use the platform's messaging system for communication.`,
          severity,
          violationType: 'contact_info_sharing'
        };
      }
    }

    // Check spam patterns
    for (const { pattern, description, severity } of this.spamPatterns) {
      if (pattern.test(message)) {
        return {
          isBlocked: true,
          reason: `Message flagged as potential spam: ${description}`,
          severity,
          violationType: 'spam'
        };
      }
    }

    // Check inappropriate content
    for (const { pattern, description, severity } of this.inappropriatePatterns) {
      if (pattern.test(message)) {
        return {
          isBlocked: true,
          reason: `Message contains inappropriate content: ${description}`,
          severity,
          violationType: 'inappropriate_content'
        };
      }
    }

    return {
      isBlocked: false,
      severity: 'low'
    };
  }

  /**
   * Record a violation for a user
   */
  async recordViolation(
    userId: string,
    violationType: 'contact_info_sharing' | 'spam' | 'inappropriate_content' | 'harassment' | 'other',
    messageContent: string,
    chatId?: string,
    violationDetails?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<UserViolation | null> {
    try {
      const { data, error } = await supabase
        .from('user_violations')
        .insert({
          user_id: userId,
          violation_type: violationType,
          violation_details: violationDetails,
          message_content: messageContent,
          chat_id: chatId,
          severity
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording violation:', error);
        return null;
      }

      console.log(`📋 Violation recorded for user ${userId}: ${violationType}`);
      return data;
    } catch (error) {
      console.error('Error recording violation:', error);
      return null;
    }
  }

  /**
   * Check if a user is currently banned
   */
  async isUserBanned(userId: string): Promise<boolean> {
    try {
      // First try the RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('is_user_banned', { check_user_id: userId });

      if (!rpcError && rpcData !== null) {
        return rpcData || false;
      }

      // Fallback: Check directly from the table
      console.log('RPC function not available, using direct table query');
      const { data, error } = await supabase
        .from('user_moderation_status')
        .select('is_banned, banned_until')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If user not found in moderation table, they're not banned
        if (error.code === 'PGRST116') {
          return false;
        }
        console.error('Error checking ban status:', error);
        return false;
      }

      if (!data || !data.is_banned) {
        return false;
      }

      // If permanently banned (banned_until is null), return true
      if (!data.banned_until) {
        return true;
      }

      // Check if temporary ban has expired
      const bannedUntil = new Date(data.banned_until);
      const now = new Date();
      
      if (bannedUntil <= now) {
        // Ban has expired, update the status
        await supabase
          .from('user_moderation_status')
          .update({
            is_banned: false,
            banned_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        
        return false;
      }

      // User is still banned
      return true;
    } catch (error) {
      console.error('Error checking ban status:', error);
      return false;
    }
  }

  /**
   * Get user's moderation status
   */
  async getUserModerationStatus(userId: string): Promise<UserModerationStatus | null> {
    try {
      const { data, error } = await supabase
        .from('user_moderation_status')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching moderation status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching moderation status:', error);
      return null;
    }
  }

  /**
   * Get user's recent warnings
   */
  async getUserWarnings(userId: string, limit: number = 10): Promise<UserWarning[]> {
    try {
      const { data, error } = await supabase
        .from('user_warnings')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user warnings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user warnings:', error);
      return [];
    }
  }

  /**
   * Acknowledge a warning (mark as read)
   */
  async acknowledgeWarning(warningId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_warnings')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', warningId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error acknowledging warning:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error acknowledging warning:', error);
      return false;
    }
  }

  /**
   * Get user's violation history
   */
  async getUserViolations(userId: string, limit: number = 20): Promise<UserViolation[]> {
    try {
      const { data, error } = await supabase
        .from('user_violations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user violations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user violations:', error);
      return [];
    }
  }

  /**
   * Manually ban a user (admin function)
   */
  async banUser(
    userId: string,
    banReason: string,
    bannedBy: string,
    duration?: number // Duration in hours, null for permanent
  ): Promise<boolean> {
    try {
      const bannedUntil = duration ? new Date(Date.now() + duration * 60 * 60 * 1000).toISOString() : null;

      const { error } = await supabase
        .from('user_moderation_status')
        .upsert({
          user_id: userId,
          is_banned: true,
          banned_at: new Date().toISOString(),
          banned_until: bannedUntil,
          ban_reason: banReason,
          banned_by: bannedBy,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error banning user:', error);
        return false;
      }

      // Create ban notification
      await this.recordViolation(
        userId,
        'other',
        'Manual ban by administrator',
        undefined,
        banReason,
        'critical'
      );

      console.log(`🚫 User ${userId} banned by ${bannedBy}: ${banReason}`);
      return true;
    } catch (error) {
      console.error('Error banning user:', error);
      return false;
    }
  }

  /**
   * Unban a user (admin function)
   */
  async unbanUser(userId: string, unbannedBy: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_moderation_status')
        .update({
          is_banned: false,
          banned_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error unbanning user:', error);
        return false;
      }

      console.log(`✅ User ${userId} unbanned by ${unbannedBy}`);
      return true;
    } catch (error) {
      console.error('Error unbanning user:', error);
      return false;
    }
  }
}

export const moderationService = new ModerationService();