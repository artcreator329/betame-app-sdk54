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
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  DollarSign,
  MessageCircle,
  Star,
  Calendar,
  BarChart3,
  PieChart,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/lib/admin-service';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalServices: number;
    totalJobs: number;
    totalRevenue: number;
    growthRate: number;
  };
  userGrowth: {
    month: string;
    users: number;
    change: number;
  }[];
  revenueData: {
    month: string;
    revenue: number;
    change: number;
  }[];
  categoryBreakdown: {
    category: string;
    count: number;
    percentage: number;
  }[];
  topPerformers: {
    type: 'user' | 'service';
    name: string;
    value: number;
    metric: string;
  }[];
}

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ title, value, change, icon, color }: MetricCardProps) {
  const isPositive = change >= 0;
  
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        <View style={styles.metricChange}>
          {isPositive ? (
            <TrendingUp size={16} color="#10B981" />
          ) : (
            <TrendingDown size={16} color="#EF4444" />
          )}
          <Text
            style={[
              styles.changeText,
              { color: isPositive ? '#10B981' : '#EF4444' },
            ]}
          >
            {Math.abs(change)}%
          </Text>
        </View>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {children}
    </View>
  );
}

interface SimpleBarChartProps {
  data: { label: string; value: number; color: string }[];
}

function SimpleBarChart({ data }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(item => item.value));
  
  return (
    <View style={styles.barChart}>
      {data.map((item, index) => (
        <View key={index} style={styles.barContainer}>
          <View style={styles.barWrapper}>
            <View
              style={[
                styles.bar,
                {
                  height: (item.value / maxValue) * 100,
                  backgroundColor: item.color,
                },
              ]}
            />
          </View>
          <Text style={styles.barLabel}>{item.label}</Text>
          <Text style={styles.barValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AdminAnalytics() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    try {
      const isAdmin = await adminService.isAdmin(user.id);
      if (!isAdmin) {
        Alert.alert('Access Denied', 'Admin access required');
        router.back();
        return;
      }

      await loadAnalytics();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    }
  };

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // Get real analytics data from the database
      const analyticsData = await adminService.getAnalyticsData();
      
      setAnalyticsData(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toLocaleString()}`;
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analyticsData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load analytics data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAnalytics}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Platform insights and metrics</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Metrics */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Users"
            value={formatNumber(analyticsData.overview.totalUsers)}
            change={12.5}
            icon={<Users size={20} color={Colors.primary} />}
            color={Colors.primary}
          />
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(analyticsData.overview.totalRevenue)}
            change={18.2}
            icon={<DollarSign size={20} color="#10B981" />}
            color="#10B981"
          />
          <MetricCard
            title="Active Services"
            value={formatNumber(analyticsData.overview.totalServices)}
            change={8.7}
            icon={<Briefcase size={20} color="#F59E0B" />}
            color="#F59E0B"
          />
          <MetricCard
            title="Job Listings"
            value={formatNumber(analyticsData.overview.totalJobs)}
            change={-2.1}
            icon={<BarChart3 size={20} color="#8B5CF6" />}
            color="#8B5CF6"
          />
        </View>

        {/* User Growth Chart */}
        <ChartCard title="User Growth (Last 6 Months)">
          <SimpleBarChart
            data={(analyticsData?.userGrowth || []).map((item, index) => ({
              label: item.month,
              value: item.users,
              color: `hsl(${220 + index * 10}, 70%, 50%)`,
            }))}
          />
        </ChartCard>

        {/* Revenue Chart */}
        <ChartCard title="Revenue Trend (Last 6 Months)">
          <SimpleBarChart
            data={(analyticsData?.revenueData || []).map((item, index) => ({
              label: item.month,
              value: Math.round(item.revenue / 100),
              color: `hsl(${140 + index * 8}, 70%, 50%)`,
            }))}
          />
        </ChartCard>

        {/* Category Breakdown */}
        <ChartCard title="Service Categories">
          <View style={styles.categoryList}>
            {(analyticsData?.categoryBreakdown || []).map((category, index) => (
              <View key={index} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.category}</Text>
                  <Text style={styles.categoryCount}>{category.count} services</Text>
                </View>
                <View style={styles.categoryProgress}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${category.percentage}%`,
                          backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
                </View>
              </View>
            ))}
          </View>
        </ChartCard>

        {/* Top Performers */}
        <ChartCard title="Top Performers">
          <View style={styles.performersList}>
            {(analyticsData?.topPerformers || []).map((performer, index) => (
              <View key={index} style={styles.performerItem}>
                <View style={styles.performerInfo}>
                  <View style={[styles.performerIcon, { backgroundColor: performer.type === 'user' ? '#007AFF20' : '#10B98120' }]}>
                    {performer.type === 'user' ? (
                      <Users size={16} color="#007AFF" />
                    ) : (
                      <Star size={16} color="#10B981" />
                    )}
                  </View>
                  <View style={styles.performerDetails}>
                    <Text style={styles.performerName}>{performer.name}</Text>
                    <Text style={styles.performerType}>{performer.type === 'user' ? 'User' : 'Service'}</Text>
                  </View>
                </View>
                <View style={styles.performerMetric}>
                  <Text style={styles.performerValue}>{performer.value}</Text>
                  <Text style={styles.performerMetricLabel}>{performer.metric}</Text>
                </View>
              </View>
            ))}
          </View>
        </ChartCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: (width - 56) / 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 80,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  categoryList: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  categoryCount: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  categoryProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginLeft: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    minWidth: 35,
    textAlign: 'right',
  },
  performersList: {
    gap: 16,
  },
  performerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  performerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  performerDetails: {
    flex: 1,
  },
  performerName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  performerType: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  performerMetric: {
    alignItems: 'flex-end',
  },
  performerValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  performerMetricLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
});