import { supabase, supabaseAdmin } from './supabase';
import { User } from '@supabase/supabase-js';

export interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  permissions: Record<string, boolean>;
  created_at: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalServices: number;
  totalJobs: number;
  totalTransactions: number;
  totalRevenue: number;
  activeChats: number;
  pendingReviews: number;
  activeServices: number;
  activeJobs: number;
  totalOrders: number;
  escrowHeld: number;
  pendingReports: number;
  criticalViolations: number;
  totalNotifications: number;
}

export interface UserManagement {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  last_sign_in_at?: string;
  is_verified?: boolean;
  status: 'active' | 'suspended' | 'banned';
  total_services: number;
  total_jobs: number;
  wallet_balance: number;
}

class AdminService {
  /**
   * Check if current user is admin
   */
  async isAdmin(userId?: string): Promise<boolean> {
    try {
      const user = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!user) {
        return false;
      }

      // Use the secure database function
      const { data, error } = await supabase
        .rpc('is_user_admin', { user_id: user });
      
      if (error) {
        console.error('AdminService: Error checking admin status:', error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('AdminService: Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Create admin user (only for initial setup)
   */
  async createAdminUser(email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Create user using admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      });

      if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'Failed to create user' };
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // Add admin role
      const { error: roleError } = await supabaseAdmin
        .from('admin_roles')
        .insert({
          user_id: authData.user.id,
          role: 'super_admin',
          permissions: {
            dashboard: true,
            users: true,
            services: true,
            jobs: true,
            wallet: true,
            chat: true,
            notifications: true,
            analytics: true
          }
        });

      if (roleError) {
        console.error('Admin role creation error:', roleError);
        return { success: false, error: 'Failed to assign admin role' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error creating admin user:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [
        usersResult, 
        servicesResult, 
        jobsResult, 
        transactionsResult, 
        chatsResult,
        ordersResult,
        escrowResult,
        reportsResult,
        violationsResult,
        notificationsResult
      ] = await Promise.all([
        supabaseAdmin.from('profiles').select('id, created_at', { count: 'exact' }),
        supabaseAdmin.from('services').select('id, status, created_at', { count: 'exact' }),
        supabaseAdmin.from('job_listings').select('id, status, created_at', { count: 'exact' }),
        supabaseAdmin.from('transactions').select('amount, type, created_at', { count: 'exact' }),
        supabaseAdmin.from('chats').select('id, is_active, created_at', { count: 'exact' }),
        supabaseAdmin.from('orders').select('id, status, total_amount, created_at', { count: 'exact' }),
        supabaseAdmin.from('escrow_transactions').select('id, status, total_amount', { count: 'exact' }),
        supabaseAdmin.from('user_reports').select('id, status', { count: 'exact' }),
        supabaseAdmin.from('user_violations').select('id, severity', { count: 'exact' }),
        supabaseAdmin.from('notifications').select('id, type, created_at', { count: 'exact' })
      ]);

      // Calculate revenue from multiple sources
      const transactionRevenue = transactionsResult.data?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0;
      const orderRevenue = ordersResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const escrowRevenue = escrowResult.data?.reduce((sum, escrow) => sum + (escrow.total_amount || 0), 0) || 0;
      
      const totalRevenue = transactionRevenue + orderRevenue + escrowRevenue;

      // Calculate active metrics
      const activeServices = servicesResult.data?.filter(s => s.status === 'active').length || 0;
      const activeJobs = jobsResult.data?.filter(j => j.status === 'active').length || 0;
      const activeChats = chatsResult.data?.filter(c => c.is_active).length || 0;
      const pendingReports = reportsResult.data?.filter(r => r.status === 'pending').length || 0;
      const criticalViolations = violationsResult.data?.filter(v => v.severity === 'critical').length || 0;

      return {
        totalUsers: usersResult.count || 0,
        totalServices: servicesResult.count || 0,
        totalJobs: jobsResult.count || 0,
        totalTransactions: transactionsResult.count || 0,
        totalRevenue,
        activeChats: activeChats,
        pendingReviews: pendingReports,
        activeServices,
        activeJobs,
        totalOrders: ordersResult.count || 0,
        escrowHeld: escrowResult.data?.filter(e => e.status === 'held').length || 0,
        pendingReports,
        criticalViolations,
        totalNotifications: notificationsResult.count || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalUsers: 0,
        totalServices: 0,
        totalJobs: 0,
        totalTransactions: 0,
        totalRevenue: 0,
        activeChats: 0,
        pendingReviews: 0,
        activeServices: 0,
        activeJobs: 0,
        totalOrders: 0,
        escrowHeld: 0,
        pendingReports: 0,
        criticalViolations: 0,
        totalNotifications: 0
      };
    }
  }

  /**
   * Get user growth analytics for the last 6 months
   */
  async getUserGrowthAnalytics() {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString());

      if (error) {
        console.error('Error fetching user growth:', error);
        return [];
      }

      // Group by month
      const monthlyData = new Map();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      data?.forEach(user => {
        const date = new Date(user.created_at);
        const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1);
      });

      // Convert to array format
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
        const users = monthlyData.get(monthKey) || 0;
        
        result.push({
          month: months[date.getMonth()],
          users,
          change: 0 // TODO: Implement real change calculation
        });
      }

      return result;
    } catch (error) {
      console.error('Error in getUserGrowthAnalytics:', error);
      return [];
    }
  }

  /**
   * Get revenue analytics for the last 6 months
   */
  async getRevenueAnalytics() {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('amount, created_at')
        .gte('created_at', sixMonthsAgo.toISOString());

      if (error) {
        console.error('Error fetching revenue analytics:', error);
        return [];
      }

      // Group by month
      const monthlyData = new Map();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      data?.forEach(transaction => {
        const date = new Date(transaction.created_at);
        const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + (transaction.amount || 0));
      });

      // Convert to array format
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
        const revenue = monthlyData.get(monthKey) || 0;
        
        result.push({
          month: months[date.getMonth()],
          revenue,
          change: 0 // TODO: Implement real change calculation
        });
      }

      return result;
    } catch (error) {
      console.error('Error in getRevenueAnalytics:', error);
      return [];
    }
  }

  /**
   * Get service category breakdown
   */
  async getCategoryBreakdown() {
    try {
      const { data, error } = await supabaseAdmin
        .from('services')
        .select('category_name');

      if (error) {
        console.error('Error fetching category breakdown:', error);
        return [];
      }

      // Count categories
      const categoryCount = new Map();
      data?.forEach(service => {
        const category = service.category_name || 'Other';
        categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
      });

      const total = data?.length || 0;
      const result = Array.from(categoryCount.entries()).map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }));

      return result.sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error in getCategoryBreakdown:', error);
      return [];
    }
  }

  /**
   * Get top performers (users and services)
   */
  async getTopPerformers(): Promise<Array<{ type: 'user' | 'service'; name: string; value: number; metric: string }>> {
    try {
      const [topUsers, topServices] = await Promise.all([
        // Top users by rating
        supabaseAdmin
          .from('profiles')
          .select('full_name')
          .order('created_at', { ascending: false })
          .limit(2),
        // Top services by rating
        supabaseAdmin
          .from('services')
          .select('title, rating')
          .order('rating', { ascending: false })
          .limit(2)
      ]);

      const performers: Array<{ type: 'user' | 'service'; name: string; value: number; metric: string }> = [];
      
      // Add top users
      topUsers.data?.forEach(user => {
        performers.push({
          type: 'user' as const,
          name: user.full_name || 'Unknown User',
          value: Math.round((Math.random() * 2 + 4) * 10) / 10, // Random rating 4.0-5.0
          metric: 'Rating'
        });
      });

      // Add top services
      topServices.data?.forEach(service => {
        performers.push({
          type: 'service' as const,
          name: service.title,
          value: Math.floor(Math.random() * 100 + 50), // Random bookings 50-150
          metric: 'Bookings'
        });
      });

      return performers;
    } catch (error) {
      console.error('Error in getTopPerformers:', error);
      return [];
    }
  }

  /**
   * Get comprehensive analytics data
   */
  async getAnalyticsData() {
    try {
      const [
        stats, 
        userGrowth, 
        revenueData, 
        categoryBreakdown, 
        topPerformers,
        platformHealth,
        userEngagement,
        orderAnalytics,
        moderationStats
      ] = await Promise.all([
        this.getDashboardStats(),
        this.getUserGrowthAnalytics(),
        this.getRevenueAnalytics(),
        this.getCategoryBreakdown(),
        this.getTopPerformers(),
        this.getPlatformHealthMetrics(),
        this.getUserEngagementMetrics(),
        this.getOrderAnalytics(),
        this.getModerationAnalytics()
      ]);

      return {
        overview: {
          totalUsers: stats.totalUsers,
          totalServices: stats.totalServices,
          totalJobs: stats.totalJobs,
          totalRevenue: stats.totalRevenue,
          growthRate: userGrowth.length > 1 ? userGrowth[userGrowth.length - 1].change : 0
        },
        userGrowth,
        revenueData,
        categoryBreakdown,
        topPerformers,
        platformHealth,
        userEngagement,
        orderAnalytics,
        moderationStats
      };
    } catch (error) {
      console.error('Error in getAnalyticsData:', error);
      throw error;
    }
  }

  /**
   * Get platform health metrics
   */
  async getPlatformHealthMetrics() {
    try {
      const [
        activeUsers,
        completedOrders,
        disputedOrders,
        averageRating,
        systemUptime
      ] = await Promise.all([
        // Active users in last 30 days
        supabaseAdmin.from('profiles')
          .select('id')
          .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Completed orders
        supabaseAdmin.from('orders')
          .select('id')
          .eq('status', 'completed'),
        
        // Dispute rate
        supabaseAdmin.from('orders')
          .select('id, dispute_status')
          .neq('dispute_status', 'none'),
        
        // Average service rating
        supabaseAdmin.from('services')
          .select('rating')
          .gt('rating', 0),
        
        // Mock system uptime (in real app, this would come from monitoring)
        Promise.resolve({ uptime: 99.8 })
      ]);

      const totalOrders = await supabaseAdmin.from('orders').select('id', { count: 'exact', head: true });
      const disputeRateCalc = totalOrders.count ? (disputedOrders.data?.length || 0) / totalOrders.count * 100 : 0;
      const avgRating = averageRating.data?.reduce((sum, s) => sum + (s.rating || 0), 0) / (averageRating.data?.length || 1) || 0;

      return {
        activeUsers: activeUsers.data?.length || 0,
        completedOrders: completedOrders.data?.length || 0,
        disputeRate: Math.round(disputeRateCalc * 100) / 100,
        averageRating: Math.round(avgRating * 10) / 10,
        systemUptime: systemUptime.uptime,
        healthScore: Math.round((100 - disputeRateCalc + (avgRating * 20) + systemUptime.uptime) / 3)
      };
    } catch (error) {
      console.error('Error in getPlatformHealthMetrics:', error);
      return {
        activeUsers: 0,
        completedOrders: 0,
        disputeRate: 0,
        averageRating: 0,
        systemUptime: 0,
        healthScore: 0
      };
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics() {
    try {
      const [
        dailyActiveUsers,
        messagesSent,
        servicesCreated,
        jobsPosted,
        checkIns
      ] = await Promise.all([
        // Daily active users (last 7 days)
        supabaseAdmin.from('profiles')
          .select('id, updated_at')
          .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Messages sent in last 7 days
        supabaseAdmin.from('chat_messages')
          .select('id, created_at')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Services created in last 7 days
        supabaseAdmin.from('services')
          .select('id, created_at')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Jobs posted in last 7 days
        supabaseAdmin.from('job_listings')
          .select('id, created_at')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Check-ins in last 7 days
        supabaseAdmin.from('checkins')
          .select('id, last_checkin_date')
          .gte('last_checkin_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      ]);

      return {
        dailyActiveUsers: dailyActiveUsers.data?.length || 0,
        messagesSent: messagesSent.data?.length || 0,
        servicesCreated: servicesCreated.data?.length || 0,
        jobsPosted: jobsPosted.data?.length || 0,
        checkIns: checkIns.data?.length || 0,
        engagementScore: Math.round(
          ((dailyActiveUsers.data?.length || 0) * 0.3 +
           (messagesSent.data?.length || 0) * 0.2 +
           (servicesCreated.data?.length || 0) * 0.25 +
           (jobsPosted.data?.length || 0) * 0.25) / 10
        )
      };
    } catch (error) {
      console.error('Error in getUserEngagementMetrics:', error);
      return {
        dailyActiveUsers: 0,
        messagesSent: 0,
        servicesCreated: 0,
        jobsPosted: 0,
        checkIns: 0,
        engagementScore: 0
      };
    }
  }

  /**
   * Get order analytics
   */
  async getOrderAnalytics() {
    try {
      const [
        ordersByStatus,
        averageOrderValue,
        completionRate,
        timeToCompletion
      ] = await Promise.all([
        supabaseAdmin.from('orders').select('status, total_amount'),
        supabaseAdmin.from('orders').select('total_amount'),
        supabaseAdmin.from('orders').select('status'),
        supabaseAdmin.from('orders')
          .select('created_at, completion_confirmed_at')
          .not('completion_confirmed_at', 'is', null)
      ]);

      const statusBreakdown = ordersByStatus.data?.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const avgOrderValue = averageOrderValue.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) / (averageOrderValue.data?.length || 1) || 0;
      
      const completedOrders = completionRate.data?.filter(o => o.status === 'completed').length || 0;
      const totalOrders = completionRate.data?.length || 0;
      const completionRatePercent = totalOrders ? (completedOrders / totalOrders) * 100 : 0;

      const avgCompletionTime = timeToCompletion.data?.reduce((sum, order) => {
        const start = new Date(order.created_at).getTime();
        const end = new Date(order.completion_confirmed_at).getTime();
        return sum + (end - start);
      }, 0) / (timeToCompletion.data?.length || 1) || 0;

      return {
        statusBreakdown,
        averageOrderValue: Math.round(avgOrderValue),
        completionRate: Math.round(completionRatePercent * 100) / 100,
        averageCompletionTime: Math.round(avgCompletionTime / (1000 * 60 * 60 * 24)), // days
        totalOrders
      };
    } catch (error) {
      console.error('Error in getOrderAnalytics:', error);
      return {
        statusBreakdown: {},
        averageOrderValue: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        totalOrders: 0
      };
    }
  }

  /**
   * Get moderation analytics
   */
  async getModerationAnalytics() {
    try {
      const [
        violations,
        reports,
        warnings,
        bannedUsers
      ] = await Promise.all([
        supabaseAdmin.from('user_violations').select('violation_type, severity, created_at'),
        supabaseAdmin.from('user_reports').select('status, created_at'),
        supabaseAdmin.from('user_warnings').select('warning_type, created_at'),
        supabaseAdmin.from('user_moderation_status').select('is_banned').eq('is_banned', true)
      ]);

      const violationsByType = violations.data?.reduce((acc, v) => {
        acc[v.violation_type] = (acc[v.violation_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const reportsByStatus = reports.data?.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const recentViolations = violations.data?.filter(v => 
        new Date(v.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length || 0;

      return {
        totalViolations: violations.data?.length || 0,
        totalReports: reports.data?.length || 0,
        totalWarnings: warnings.data?.length || 0,
        bannedUsers: bannedUsers.data?.length || 0,
        violationsByType,
        reportsByStatus,
        recentViolations,
        moderationScore: Math.max(0, 100 - (recentViolations * 5) - (bannedUsers.data?.length || 0))
      };
    } catch (error) {
      console.error('Error in getModerationAnalytics:', error);
      return {
        totalViolations: 0,
        totalReports: 0,
        totalWarnings: 0,
        bannedUsers: 0,
        violationsByType: {},
        reportsByStatus: {},
        recentViolations: 0,
        moderationScore: 100
      };
    }
  }

  /**
   * Get all chats for admin management
   */
  async getAllChats(page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const { data: chats, error, count } = await supabaseAdmin
        .from('chats')
        .select(`
          id,
          participant1_id,
          participant2_id,
          created_at,
          last_message_at,
          is_active
        `, { count: 'exact' })
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching chats:', error);
        return { chats: [], total: 0 };
      }

      if (!chats || chats.length === 0) {
        return { chats: [], total: 0 };
      }

      // Get participant profiles
      const participantIds = [...new Set([
        ...chats.map(chat => chat.participant1_id),
        ...chats.map(chat => chat.participant2_id)
      ])];

      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', participantIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get message counts for each chat
      const chatIds = chats.map(chat => chat.id);
      const { data: messageCounts } = await supabaseAdmin
        .from('messages')
        .select('chat_id')
        .in('chat_id', chatIds);

      const messageCountMap = new Map();
      messageCounts?.forEach(msg => {
        messageCountMap.set(msg.chat_id, (messageCountMap.get(msg.chat_id) || 0) + 1);
      });

      // Combine chat data with profiles and message counts
      const enrichedChats = chats.map(chat => ({
        ...chat,
        message_count: messageCountMap.get(chat.id) || 0,
        participant1: profileMap.get(chat.participant1_id),
        participant2: profileMap.get(chat.participant2_id)
      }));

      return {
        chats: enrichedChats,
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching chats:', error);
      return { chats: [], total: 0 };
    }
  }

  /**
   * Delete a chat
   */
  async deleteChat(chatId: string): Promise<boolean> {
    try {
      // Delete messages first
      const { error: messagesError } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('chat_id', chatId);

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        return false;
      }

      // Delete the chat
      const { error: chatError } = await supabaseAdmin
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (chatError) {
        console.error('Error deleting chat:', chatError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteChat:', error);
      return false;
    }
  }

  /**
   * Get all users for management
   */
  async getAllUsers(page: number = 1, limit: number = 20): Promise<{ users: UserManagement[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const { data: users, error, count } = await supabaseAdmin
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          created_at,
          is_verified
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching users:', error);
        return { users: [], total: 0 };
      }

      // Get additional data for each user
      const enrichedUsers = await Promise.all(
        (users || []).map(async (user) => {
          const [servicesResult, jobsResult, walletResult] = await Promise.all([
            supabaseAdmin.from('services').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
            supabaseAdmin.from('job_listings').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
            supabaseAdmin.from('wallets').select('betame_stones, betame_betacoins').eq('user_id', user.id).single()
          ]);

          return {
            ...user,
            status: 'active' as const,
            total_services: servicesResult.count || 0,
            total_jobs: jobsResult.count || 0,
            wallet_balance: (walletResult.data?.betame_stones || 0) + (walletResult.data?.betame_betacoins || 0),
            last_sign_in_at: undefined // TODO: Get from auth.users if needed
          };
        })
      );

      return {
        users: enrichedUsers,
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { users: [], total: 0 };
    }
  }

  /**
   * Get all services for management
   */
  async getAllServices(page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      // Get services first
      const { data: services, error: servicesError, count } = await supabaseAdmin
        .from('services')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (servicesError) {
        console.error('Error fetching services:', servicesError);
        return { services: [], total: 0 };
      }

      if (!services || services.length === 0) {
        return { services: [], total: count || 0 };
      }

      // Get user profiles for the services
      const userIds = services.map(service => service.user_id).filter(Boolean);
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Return services without profile data
        return {
          services: services.map(service => ({ ...service, profiles: null })),
          total: count || 0
        };
      }

      // Combine services with profile data
      const servicesWithProfiles = services.map(service => {
        const profile = profiles?.find(p => p.id === service.user_id);
        return {
          ...service,
          profiles: profile || null
        };
      });

      return {
        services: servicesWithProfiles,
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching services:', error);
      return { services: [], total: 0 };
    }
  }

  /**
   * Get all job listings for management
   */
  async getAllJobs(page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      // First try with foreign key relationship
      let { data, error, count } = await supabaseAdmin
        .from('job_listings')
        .select(`
          *,
          profiles!job_listings_user_id_fkey(
            full_name,
            email
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // If foreign key fails, fallback to manual join
      if (error && error.code === 'PGRST200') {
        console.log('Foreign key relationship not found, using manual join');
        
        const { data: jobsData, error: jobsError, count: jobsCount } = await supabaseAdmin
          .from('job_listings')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (jobsError) {
          console.error('Error fetching jobs:', jobsError);
          return { jobs: [], total: 0 };
        }

        // Manually fetch profiles for each job
        const jobsWithProfiles = [];
        for (const job of jobsData || []) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email')
            .eq('id', job.user_id)
            .single();

          jobsWithProfiles.push({
            ...job,
            profiles: profile || { full_name: 'Unknown User', email: 'N/A' }
          });
        }

        return {
          jobs: jobsWithProfiles,
          total: jobsCount || 0
        };
      }

      if (error) {
        console.error('Error fetching jobs:', error);
        return { jobs: [], total: 0 };
      }

      return {
        jobs: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return { jobs: [], total: 0 };
    }
  }

  /**
   * Get all transactions for management
   */
  async getAllTransactions(page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabaseAdmin
        .from('transactions')
        .select(`
          *,
          profiles!transactions_user_id_fkey(
            full_name,
            email
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching transactions:', error);
        return { transactions: [], total: 0 };
      }

      return {
        transactions: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return { transactions: [], total: 0 };
    }
  }

  /**
   * Suspend/Unsuspend user
   */
  async toggleUserStatus(userId: string, suspend: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      // For now, we'll use a simple approach by updating user metadata
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { suspended: suspend }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error toggling user status:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  /**
   * Delete service (admin only)
   */
  async deleteService(serviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting service:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  /**
   * Delete job listing (admin only)
   */
  async deleteJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('job_listings')
        .delete()
        .eq('id', jobId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting job:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats() {
    try {
      // Get real notification statistics from the database
      const [totalNotifications, marketingNotifications, checkInNotifications, systemNotifications, totalUsers] = await Promise.all([
        supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }).eq('type', 'marketing'),
        supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }).eq('type', 'check_in'),
        supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }).eq('type', 'system'),
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      const totalSent = totalNotifications.count || 0;
      const marketingSent = marketingNotifications.count || 0;
      const checkInsSent = checkInNotifications.count || 0;
      const systemNotificationsSent = systemNotifications.count || 0;
      const totalUsersCount = totalUsers.count || 0;

      // Calculate daily average (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: recentNotifications } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      const dailyAverage = Math.round((recentNotifications || 0) / 7);

      return {
        totalSent,
        marketingSent,
        checkInsSent,
        systemNotificationsSent,
        usersWithPermissions: totalUsersCount, // Assume all users have permissions for now
        totalUsers: totalUsersCount,
        dailyAverage,
        openRate: 68.5, // Mock data for now
        clickRate: 12.3, // Mock data for now
      };
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      return {
        totalSent: 0,
        marketingSent: 0,
        checkInsSent: 0,
        systemNotificationsSent: 0,
        usersWithPermissions: 0,
        totalUsers: 0,
        dailyAverage: 0,
        openRate: 0,
        clickRate: 0,
      };
    }
  }

  /**
   * Send broadcast notification to all users
   */
  async sendBroadcastNotification(
    title: string,
    message: string,
    type: 'marketing' | 'system', // Now supports both marketing and system types
    targetUserIds?: string[]
  ): Promise<{ success: boolean; error?: string; sentCount?: number }> {
    try {
      let userIds = targetUserIds;
      
      // If no specific users provided, get all users
      if (!userIds) {
        const { data: users, error } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .limit(1000); // Limit for safety

        if (error) {
          console.error('Error fetching users for broadcast:', error);
          return { success: false, error: 'Failed to fetch users' };
        }

        userIds = users?.map(u => u.id) || [];
      }

      if (userIds.length === 0) {
        return { success: false, error: 'No users found' };
      }

      console.log(`📢 Broadcasting ${type} notification to ${userIds.length} users:`);
      console.log(`Title: ${title}`);
      console.log(`Message: ${message}`);

      let successCount = 0;
      let errorCount = 0;

      // Send notifications directly to Supabase for all users
      const notificationPromises = userIds.map(async (userId) => {
        try {
          const notificationId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Insert notification directly into Supabase
          const { error } = await supabaseAdmin.rpc('create_notification', {
            p_user_id: userId,
            p_type: type,
            p_title: title,
            p_message: message,
            p_data: { 
              source: 'admin_broadcast',
              broadcastType: type,
              notificationId
            },
            p_id: notificationId,
          });
          
          if (error) {
            console.error(`Failed to send notification to user ${userId}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to send notification to user ${userId}:`, error);
          errorCount++;
        }
      });

      // Wait for all notifications to be sent
      await Promise.allSettled(notificationPromises);

      console.log(`✅ Broadcast completed: ${successCount} successful, ${errorCount} failed`);

      return { 
        success: successCount > 0, 
        sentCount: successCount,
        error: errorCount > 0 ? `${errorCount} notifications failed to send` : undefined
      };
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  /**
   * Get notification delivery logs
   */
  async getNotificationLogs(page: number = 1, limit: number = 50) {
    try {
      // In a real app, this would fetch from a notification_logs table
      // For demo, return mock data
      const mockLogs = Array.from({ length: limit }, (_, i) => ({
        id: `log_${page}_${i}`,
        type: ['marketing', 'system', 'check_in'][Math.floor(Math.random() * 3)],
        title: `Sample Notification ${i + 1}`,
        message: `This is a sample notification message ${i + 1}`,
        sent_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        recipient_count: Math.floor(Math.random() * 1000) + 100,
        delivered_count: Math.floor(Math.random() * 900) + 80,
        opened_count: Math.floor(Math.random() * 600) + 50,
        clicked_count: Math.floor(Math.random() * 200) + 10,
        status: ['sent', 'delivered', 'failed'][Math.floor(Math.random() * 3)],
      }));

      return {
        logs: mockLogs,
        total: 500, // Mock total
        page,
        limit,
      };
    } catch (error) {
      console.error('Error fetching notification logs:', error);
      return {
        logs: [],
        total: 0,
        page,
        limit,
      };
    }
  }

  /**
   * Update global notification settings
   */
  async updateNotificationSettings(settings: {
    marketingEnabled: boolean;
    checkInEnabled: boolean;
    marketingTime?: string; // "10:00"
    checkInInterval?: number; // days
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real app, this would update a settings table
      console.log('📝 Updating global notification settings:', settings);
      
      // Simulate database update
      await new Promise(resolve => setTimeout(resolve, 500));

      return { success: true };
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }
}

export const adminService = new AdminService();
export default adminService;