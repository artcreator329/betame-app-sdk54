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
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  PieChart,
  BarChart3,
  Calendar,
  Users,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/lib/admin-service';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface FinancialData {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  totalTransactions: number;
  averageTransactionValue: number;
  platformFees: number;
  escrowBalance: number;
  pendingPayouts: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    transactions: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  topEarners: Array<{
    userId: string;
    userName: string;
    earnings: number;
    transactions: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function MetricCard({ title, value, subtitle, icon, color, trend }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        {trend && (
          <View style={styles.trendContainer}>
            {trend.isPositive ? (
              <ArrowUpRight size={16} color="#10B981" />
            ) : (
              <ArrowDownRight size={16} color="#EF4444" />
            )}
            <Text style={[styles.trendText, { color: trend.isPositive ? '#10B981' : '#EF4444' }]}>
              {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
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

interface RevenueBarChartProps {
  data: Array<{ month: string; revenue: number; transactions: number }>;
}

function RevenueBarChart({ data }: RevenueBarChartProps) {
  const maxRevenue = Math.max(...data.map(item => item.revenue));
  
  return (
    <View style={styles.barChart}>
      {data.map((item, index) => (
        <View key={index} style={styles.barContainer}>
          <View style={styles.barWrapper}>
            <View
              style={[
                styles.bar,
                {
                  height: (item.revenue / maxRevenue) * 120,
                  backgroundColor: '#007AFF',
                },
              ]}
            />
          </View>
          <Text style={styles.barLabel}>{item.month}</Text>
          <Text style={styles.barValue}>RM {item.revenue.toLocaleString()}</Text>
          <Text style={styles.barSubValue}>{item.transactions} txns</Text>
        </View>
      ))}
    </View>
  );
}

export default function FinancialAnalytics() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);

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

      await loadFinancialData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    }
  };

  const loadFinancialData = async () => {
    try {
      setIsLoading(true);
      
      // Get analytics data and generate financial insights
      const analyticsData = await adminService.getAnalyticsData();
      
      // Mock financial data - in real app, this would come from comprehensive financial analytics
      const mockFinancialData: FinancialData = {
        totalRevenue: analyticsData.overview.totalRevenue,
        monthlyRevenue: analyticsData.overview.totalRevenue * 0.15, // Assume 15% is current month
        revenueGrowth: 18.5,
        totalTransactions: analyticsData.overview.totalJobs + analyticsData.overview.totalServices,
        averageTransactionValue: analyticsData.overview.totalRevenue / Math.max(1, analyticsData.overview.totalJobs + analyticsData.overview.totalServices),
        platformFees: analyticsData.overview.totalRevenue * 0.05, // 5% platform fee
        escrowBalance: analyticsData.overview.totalRevenue * 0.12, // 12% in escrow
        pendingPayouts: analyticsData.overview.totalRevenue * 0.08, // 8% pending payouts
        revenueByMonth: [
          { month: 'Jan', revenue: 45000, transactions: 120 },
          { month: 'Feb', revenue: 52000, transactions: 135 },
          { month: 'Mar', revenue: 48000, transactions: 128 },
          { month: 'Apr', revenue: 61000, transactions: 156 },
          { month: 'May', revenue: 58000, transactions: 148 },
          { month: 'Jun', revenue: 67000, transactions: 172 },
        ],
        revenueByCategory: [
          { category: 'Technology', revenue: 125000, percentage: 35 },
          { category: 'Design', revenue: 89000, percentage: 25 },
          { category: 'Marketing', revenue: 71000, percentage: 20 },
          { category: 'Writing', revenue: 43000, percentage: 12 },
          { category: 'Other', revenue: 28000, percentage: 8 },
        ],
        topEarners: [
          { userId: 'user_1', userName: 'John Developer', earnings: 15600, transactions: 24 },
          { userId: 'user_2', userName: 'Sarah Designer', earnings: 12800, transactions: 19 },
          { userId: 'user_3', userName: 'Mike Marketer', earnings: 11200, transactions: 16 },
          { userId: 'user_4', userName: 'Lisa Writer', earnings: 9800, transactions: 22 },
        ],
        paymentMethods: [
          { method: 'BetaCoin Wallet', count: 245, percentage: 68 },
          { method: 'Credit Card', count: 89, percentage: 25 },
          { method: 'Bank Transfer', count: 25, percentage: 7 },
        ],
      };
      
      setFinancialData(mockFinancialData);
    } catch (error) {
      console.error('Error loading financial data:', error);
      Alert.alert('Error', 'Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading financial analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!financialData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load financial data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFinancialData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Key Metrics */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Key Financial Metrics</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Revenue"
              value={`RM ${financialData.totalRevenue.toLocaleString()}`}
              icon={<DollarSign size={20} color="#10B981" />}
              color="#10B981"
              trend={{ value: financialData.revenueGrowth, isPositive: true }}
            />
            <MetricCard
              title="Monthly Revenue"
              value={`RM ${financialData.monthlyRevenue.toLocaleString()}`}
              subtitle="Current month"
              icon={<TrendingUp size={20} color="#007AFF" />}
              color="#007AFF"
              trend={{ value: 12.3, isPositive: true }}
            />
            <MetricCard
              title="Avg Transaction"
              value={`RM ${Math.round(financialData.averageTransactionValue)}`}
              icon={<CreditCard size={20} color="#8B5CF6" />}
              color="#8B5CF6"
              trend={{ value: 5.7, isPositive: true }}
            />
            <MetricCard
              title="Platform Fees"
              value={`RM ${financialData.platformFees.toLocaleString()}`}
              subtitle="5% commission"
              icon={<PieChart size={20} color="#F59E0B" />}
              color="#F59E0B"
              trend={{ value: 8.2, isPositive: true }}
            />
            <MetricCard
              title="Escrow Balance"
              value={`RM ${financialData.escrowBalance.toLocaleString()}`}
              subtitle="Funds held"
              icon={<Wallet size={20} color="#06B6D4" />}
              color="#06B6D4"
            />
            <MetricCard
              title="Pending Payouts"
              value={`RM ${financialData.pendingPayouts.toLocaleString()}`}
              subtitle="Awaiting release"
              icon={<ArrowUpRight size={20} color="#EF4444" />}
              color="#EF4444"
            />
          </View>
        </View>

        {/* Revenue Trend */}
        <ChartCard title="Revenue Trend (Last 6 Months)">
          <RevenueBarChart data={financialData.revenueByMonth} />
        </ChartCard>

        {/* Revenue by Category */}
        <ChartCard title="Revenue by Category">
          <View style={styles.categoryList}>
            {financialData.revenueByCategory.map((category, index) => (
              <View key={index} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.category}</Text>
                  <Text style={styles.categoryRevenue}>RM {category.revenue.toLocaleString()}</Text>
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

        {/* Top Earners */}
        <ChartCard title="Top Earning Users">
          <View style={styles.earnersList}>
            {financialData.topEarners.map((earner, index) => (
              <View key={index} style={styles.earnerItem}>
                <View style={styles.earnerRank}>
                  <Text style={styles.rankNumber}>#{index + 1}</Text>
                </View>
                <View style={styles.earnerInfo}>
                  <Text style={styles.earnerName}>{earner.userName}</Text>
                  <Text style={styles.earnerTransactions}>{earner.transactions} transactions</Text>
                </View>
                <View style={styles.earnerEarnings}>
                  <Text style={styles.earningsAmount}>RM {earner.earnings.toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </View>
        </ChartCard>

        {/* Payment Methods */}
        <ChartCard title="Payment Method Distribution">
          <View style={styles.paymentMethodsList}>
            {financialData.paymentMethods.map((method, index) => (
              <View key={index} style={styles.paymentMethodItem}>
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodName}>{method.method}</Text>
                  <Text style={styles.paymentMethodCount}>{method.count} transactions</Text>
                </View>
                <View style={styles.paymentMethodProgress}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${method.percentage}%`,
                          backgroundColor: index === 0 ? '#007AFF' : index === 1 ? '#10B981' : '#F59E0B',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.paymentMethodPercentage}>{method.percentage}%</Text>
                </View>
              </View>
            ))}
          </View>
        </ChartCard>

        {/* Financial Health Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Financial Health Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Revenue Growth Rate</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                +{financialData.revenueGrowth}%
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Transaction Success Rate</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>98.5%</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Average Processing Time</Text>
              <Text style={styles.summaryValue}>2.3 days</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Dispute Rate</Text>
              <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>1.2%</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
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

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  metricsSection: {
    marginBottom: 32,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: (width - 56) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    height: 160,
    paddingHorizontal: 8,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 120,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: 24,
    borderRadius: 4,
    minHeight: 8,
  },
  barLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  barSubValue: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  categoryList: {
    gap: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  categoryRevenue: {
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
  earnersList: {
    gap: 16,
  },
  earnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earnerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  earnerInfo: {
    flex: 1,
  },
  earnerName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  earnerTransactions: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  earnerEarnings: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  paymentMethodsList: {
    gap: 16,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  paymentMethodCount: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  paymentMethodProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginLeft: 16,
  },
  paymentMethodPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    minWidth: 35,
    textAlign: 'right',
  },
  summarySection: {
    marginBottom: 32,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});