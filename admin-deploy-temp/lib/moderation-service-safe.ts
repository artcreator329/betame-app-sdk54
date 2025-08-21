/**
 * Safe version of moderation service that works without database
 * This is a fallback for when the database functions are not available
 */

export interface ModerationResult {
  isBlocked: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  violationType?: 'contact_info_sharing' | 'spam' | 'inappropriate_content' | 'harassment' | 'other';
}

class SafeModerationService {
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
  ];

  /**
   * Moderate a message for policy violations (safe version - no database calls)
   */
  moderateMessage(message: string): ModerationResult {
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

    return {
      isBlocked: false,
      severity: 'low'
    };
  }

  /**
   * Safe version - always returns false (no database calls)
   */
  async isUserBanned(userId: string): Promise<boolean> {
    console.log('Safe moderation: User ban check disabled');
    return false;
  }

  /**
   * Safe version - returns empty array (no database calls)
   */
  async getUserWarnings(userId: string, limit: number = 10): Promise<any[]> {
    console.log('Safe moderation: User warnings check disabled');
    return [];
  }

  /**
   * Safe version - returns null (no database calls)
   */
  async getUserModerationStatus(userId: string): Promise<any> {
    console.log('Safe moderation: User moderation status check disabled');
    return null;
  }

  /**
   * Safe version - returns null (no database calls)
   */
  async recordViolation(
    userId: string,
    violationType: string,
    messageContent: string,
    chatId?: string,
    violationDetails?: string,
    severity: string = 'medium'
  ): Promise<any> {
    console.log('Safe moderation: Violation recording disabled', {
      userId,
      violationType,
      messageContent: messageContent.substring(0, 50) + '...',
      severity
    });
    return null;
  }
}

export const safeModerationService = new SafeModerationService();