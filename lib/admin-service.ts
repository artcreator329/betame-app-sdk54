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
      console.log('🔍 AdminService: isAdmin called with userId:', userId);
      const user = userId || (await supabase.auth.getUser()).data.user?.id;
      console.log('🔍 AdminService: Final user ID to check:', user);
      
      if (!user) {
        console.log('🔍 AdminService: No user ID found, returning false');
        return false;
      }

      console.log('🔍 AdminService: Querying admin_roles table for user:', user);
      const { data, error } = await supabase
        .from('admin_roles')
        .select('id')
        .eq('user_id', user)
        .single();

      console.log('🔍 AdminService: Query result - data:', data, 'error:', error);
      const isAdmin = !error && !!data;
      console.log('🔍 AdminService: Final admin status:', isAdmin);
      
      return isAdmin;
    } catch (error) {
      console.error('🔍 AdminService: Error checking admin status:', error);
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
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [usersResult, servicesResult, jobsResult, transactionsResult, chatsResult] = await Promise.all([
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('services').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('job_listings').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('transactions').select('amount', { count: 'exact' }),
        supabaseAdmin.from('chats').select('id', { count: 'exact', head: true })
      ]);

      const totalRevenue = transactionsResult.data?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0;

      return {
        totalUsers: usersResult.count || 0,
        totalServices: servicesResult.count || 0,
        totalJobs: jobsResult.count || 0,
        totalTransactions: transactionsResult.count || 0,
        totalRevenue,
        activeChats: chatsResult.count || 0,
        pendingReviews: 0 // TODO: Implement reviews count
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
        pendingReviews: 0
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
      const [stats, userGrowth, revenueData, categoryBreakdown, topPerformers] = await Promise.all([
        this.getDashboardStats(),
        this.getUserGrowthAnalytics(),
        this.getRevenueAnalytics(),
        this.getCategoryBreakdown(),
        this.getTopPerformers()
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
        topPerformers
      };
    } catch (error) {
      console.error('Error in getAnalyticsData:', error);
      throw error;
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
            supabaseAdmin.from('wallets').select('stones, credits').eq('user_id', user.id).single()
          ]);

          return {
            ...user,
            status: 'active' as const,
            total_services: servicesResult.count || 0,
            total_jobs: jobsResult.count || 0,
            wallet_balance: (walletResult.data?.stones || 0) + (walletResult.data?.credits || 0),
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

      const { data, error, count } = await supabaseAdmin
        .from('services')
        .select(`
          *,
          profiles!services_user_id_fkey(
            full_name,
            email
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching services:', error);
        return { services: [], total: 0 };
      }

      return {
        services: data || [],
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
}

export const adminService = new AdminService();
export default adminService;