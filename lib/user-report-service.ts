import { supabase } from './supabase';

export interface UserReport {
  id?: string;
  reported_user_id: string;
  reporter_user_id: string;
  reason: string;
  chat_id?: string;
  profile_context?: string;
  status?: 'pending' | 'reviewed' | 'resolved';
  created_at?: string;
}

export class UserReportService {
  /**
   * Report a user for inappropriate behavior
   */
  static async reportUser(
    reportedUserId: string,
    reporterId: string,
    reason: string,
    context?: {
      chatId?: string;
      profileContext?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_reports')
        .insert({
          reported_user_id: reportedUserId,
          reporter_user_id: reporterId,
          reason: reason,
          chat_id: context?.chatId || null,
          profile_context: context?.profileContext || null,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error reporting user:', error);
        return false;
      }

      console.log('✅ User reported successfully');
      return true;
    } catch (error) {
      console.error('Error reporting user:', error);
      return false;
    }
  }

  /**
   * Get all reports made by a user
   */
  static async getUserReports(reporterId: string): Promise<UserReport[]> {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .eq('reporter_user_id', reporterId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user reports:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user reports:', error);
      return [];
    }
  }

  /**
   * Check if a user has already reported another user
   */
  static async hasUserReported(
    reporterId: string,
    reportedUserId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select('id')
        .eq('reporter_user_id', reporterId)
        .eq('reported_user_id', reportedUserId)
        .limit(1);

      if (error) {
        console.error('Error checking if user has reported:', error);
        return false;
      }

      return (data && data.length > 0) || false;
    } catch (error) {
      console.error('Error checking if user has reported:', error);
      return false;
    }
  }
}
