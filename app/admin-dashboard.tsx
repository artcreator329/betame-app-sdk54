import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  Briefcase,
  DollarSign,
  MessageSquare,
  Star,
  TrendingUp,
  Shield,
  Settings,
  BarChart3,
  Bell,
  UserCheck,
  Trash2,
  Eye,
  ArrowLeft,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService, DashboardStats, UserManagement } from '@/lib/admin-service';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  onPress?: () => void;
}

function StatCard({ title, value, icon, color, onPress }: StatCardProps) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color } as any]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statCardHeader}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' } as any]}>
          {icon}
        </View>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

interface QuickActionProps {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
  color: string;
}

function QuickAction({ title, icon, onPress, color }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' } as any]}>
        {icon}
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalServices: 0,
    totalJobs: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    activeChats: 0,
    pendingReviews: 0,
  });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    try {
      const adminStatus = await adminService.isAdmin(user.id);
      if (!adminStatus) {
        Alert.alert(
          'Access Denied',
          'You do not have permission to access the admin dashboard.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
        return;
      }

      setIsAdmin(true);
      await loadDashboardData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.replace('/(tabs)');
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const dashboardStats = await adminService.getDashboardStats();
      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (!isAdmin || isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {!isAdmin ? 'Verifying admin access...' : 'Loading dashboard...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>BetaMe Management Console</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Users"
              value={formatNumber(stats.totalUsers)}
              icon={<Users size={24} color={Colors.primary} />}
              color={Colors.primary}
              onPress={() => router.push('/admin/users')}
            />
            <StatCard
              title="Active Services"
              value={formatNumber(stats.totalServices)}
              icon={<Briefcase size={24} color="#10B981" />}
              color="#10B981"
              onPress={() => router.push('/admin/services')}
            />
            <StatCard
              title="Job Listings"
              value={formatNumber(stats.totalJobs)}
              icon={<UserCheck size={24} color="#F59E0B" />}
              color="#F59E0B"
              onPress={() => router.push('/admin/jobs')}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon={<DollarSign size={24} color="#EF4444" />}
              color="#EF4444"
              onPress={() => router.push('/admin/transactions')}
            />
            <StatCard
              title="Active Chats"
              value={formatNumber(stats.activeChats)}
              icon={<MessageSquare size={24} color="#8B5CF6" />}
              color="#8B5CF6"
              onPress={() => router.push('/admin/chats')}
            />
            <StatCard
              title="Transactions"
              value={formatNumber(stats.totalTransactions)}
              icon={<TrendingUp size={24} color="#06B6D4" />}
              color="#06B6D4"
              onPress={() => router.push('/admin/transactions')}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              title="User Management"
              icon={<Users size={20} color={Colors.primary} />}
              onPress={() => router.push('/admin/users')}
              color={Colors.primary}
            />
            <QuickAction
              title="Service Moderation"
              icon={<Shield size={20} color="#10B981" />}
              onPress={() => router.push('/admin/services')}
              color="#10B981"
            />
            <QuickAction
              title="Analytics"
              icon={<BarChart3 size={20} color="#F59E0B" />}
              onPress={() => router.push('/admin/analytics')}
              color="#F59E0B"
            />
            <QuickAction
              title="Notifications"
              icon={<Bell size={20} color="#8B5CF6" />}
              onPress={() => router.push('/admin/notifications')}
              color="#8B5CF6"
            />
            <QuickAction
              title="System Settings"
              icon={<Settings size={20} color="#EF4444" />}
              onPress={() => router.push('/admin/settings')}
              color="#EF4444"
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentActivitySection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <Text style={styles.activityText}>Dashboard loaded successfully</Text>
            <Text style={styles.activityTime}>Just now</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: (width - 52) / 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (width - 52) / 2,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  recentActivitySection: {
    paddingHorizontal: 20,
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  activityText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});