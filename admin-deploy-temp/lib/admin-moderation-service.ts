import { supabase } from './supabase';
import { moderationService } from './moderation-service';

export interface AdminModerationStats {
  totalViolations: number;
  totalBannedUsers: number;
  violationsByType: Record<string, number>;
  recentViolations: any[];
}

export interface AdminUserInfo {
  user_id: string;
  email?: string;
  full_name?: string;
  total_violations: number;
  contact_info_violations: number;
  spam_violations: number;
  warning_count: number;
  is_banned: boolean;
  banned_until?: string;
  ban_reason?: string;
  last_violation_at?: string;
}

class AdminModerationService {
  /**
   * Get overall moderation statistics
   */
  async getModerationStats(): Promise<AdminModerationStats> {
    try {
      // Get total violations
      const { count: totalViolations } = await supabase
        .from('user_violations')
        .select('*', { count: 'exact', head: true });

      // Get total banned users
      const { count: totalBannedUsers } = await supabase
        .from('user_moderation_status')
        .select('*', { count: 'exact', head: true })
        .eq('is_banned', true);

      // Get violations by type
      const { data: violationTypes } = await supabase
        .from('user_violations')
        .select('violation_type')
        .order('created_at', { ascending: false });

      const violationsByType: Record<string, number> = {};
      violationTypes?.forEach(v => {
        violationsByType[v.violation_type] = (violationsByType[v.violation_type] || 0) + 1;
      });

      // Get recent violations
      const { data: recentViolations } = await supabase
        .from('user_violations')
        .select(`
          *,
          user_moderation_status!inner(*)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      return {
        totalViolations: totalViolations || 0,
        totalBannedUsers: totalBannedUsers || 0,
        violationsByType,
        recentViolations: recentViolations || []
      };
    } catch (error) {
      console.error('Error fetching moderation stats:', error);
      throw error;
    }
  }

  /**
   * Get users with violations (for admin review)
   */
  async getUsersWithViolations(limit: number = 50): Promise<AdminUserInfo[]> {
    try {
      const { data, error } = await supabase
        .from('user_moderation_status')
        .select(`
          *,
          profiles!inner(email, full_name)
        `)
        .gt('total_violations', 0)
        .order('total_violations', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(item => ({
        user_id: item.user_id,
        email: item.profiles?.email,
        full_name: item.profiles?.full_name,
        total_violations: item.total_violations,
        contact_info_violations: item.contact_info_violations,
        spam_violations: item.spam_violations,
        warning_count: item.warning_count,
        is_banned: item.is_banned,
        banned_until: item.banned_until,
        ban_reason: item.ban_reason,
        last_violation_at: item.last_violation_at
      })) || [];
    } catch (error) {
      console.error('Error fetching users with violations:', error);
      throw error;
    }
  }

  /**
   * Get detailed user moderation info
   */
  async getUserModerationDetails(userId: string) {
    try {
      const [status, violations, warnings] = await Promise.all([
        moderationService.getUserModerationStatus(userId),
        moderationService.getUserViolations(userId, 50),
        moderationService.getUserWarnings(userId, 20)
      ]);

      return {
        status,
        violations,
        warnings
      };
    } catch (error) {
      console.error('Error fetching user moderation details:', error);
      throw error;
    }
  }

  /**
   * Manually ban a user (admin action)
   */
  async banUser(
    userId: string,
    banReason: string,
    adminId: string,
    durationHours?: number
  ): Promise<boolean> {
    return moderationService.banUser(userId, banReason, adminId, durationHours);
  }

  /**
   * Unban a user (admin action)
   */
  async unbanUser(userId: string, adminId: string): Promise<boolean> {
    return moderationService.unbanUser(userId, adminId);
  }

  /**
   * Resolve a violation (mark as reviewed)
   */
  async resolveViolation(
    violationId: string,
    adminId: string,
    resolutionNotes?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_violations')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: adminId,
          resolution_notes: resolutionNotes
        })
        .eq('id', violationId);

      if (error) {
        console.error('Error resolving violation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error resolving violation:', error);
      return false;
    }
  }

  /**
   * Get violation details for review
   */
  async getViolationDetails(violationId: string) {
    try {
      const { data, error } = await supabase
        .from('user_violations')
        .select(`
          *,
          user_moderation_status!inner(*),
          profiles!inner(email, full_name)
        `)
        .eq('id', violationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching violation details:', error);
      throw error;
    }
  }

  /**
   * Search for violations by message content
   */
  async searchViolations(searchTerm: string, limit: number = 20) {
    try {
      const { data, error } = await supabase
        .from('user_violations')
        .select(`
          *,
          user_moderation_status!inner(*),
          profiles!inner(email, full_name)
        `)
        .ilike('message_content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching violations:', error);
      throw error;
    }
  }

  /**
   * Get moderation activity summary for a date range
   */
  async getModerationActivity(startDate: string, endDate: string) {
    try {
      const { data: violations, error: violationsError } = await supabase
        .from('user_violations')
        .select('violation_type, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (violationsError) throw violationsError;

      const { data: bans, error: bansError } = await supabase
        .from('user_moderation_status')
        .select('banned_at, ban_reason')
        .gte('banned_at', startDate)
        .lte('banned_at', endDate)
        .not('banned_at', 'is', null);

      if (bansError) throw bansError;

      return {
        violations: violations || [],
        bans: bans || []
      };
    } catch (error) {
      console.error('Error fetching moderation activity:', error);
      throw error;
    }
  }

  /**
   * Test the moderation system with sample messages
   */
  testModerationPatterns() {
    const testMessages = [
      "Call me at 012-345-6789",
      "My email is test@example.com",
      "Add me on WhatsApp",
      "Find me on Instagram @username",
      "Contact me at zero-one-two-three-four-five",
      "My number is 1*2*3*4*5*6*7*8*9*0",
      "This is a normal message",
      "Let's meet at the coffee shop",
      "Great service, highly recommended!"
    ];

    console.log('🧪 Testing Moderation Patterns:');
    console.log('================================');

    testMessages.forEach((message, index) => {
      const result = moderationService.moderateMessage(message);
      console.log(`${index + 1}. "${message}"`);
      console.log(`   Result: ${result.isBlocked ? '🚫 BLOCKED' : '✅ ALLOWED'}`);
      if (result.isBlocked) {
        console.log(`   Reason: ${result.reason}`);
        console.log(`   Type: ${result.violationType}`);
        console.log(`   Severity: ${result.severity}`);
      }
      console.log('');
    });
  }
}

export const adminModerationService = new AdminModerationService();