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
  Activity,
  Users,
  CheckCircle,
  AlertTriangle,
  Star,
  TrendingUp,
  Shield,
  MessageSquare,
  Briefcase,
  Calendar,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/lib/admin-service';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface PlatformHealthData {
  platformHealth: {
    activeUsers: number;
    completedOrders: number;
    disputeRate: number;
    averageRating: number;
    systemUptime: number;
    healthScore: number;
  };
  userEngagement: {
    dailyActiveUsers: number;
    messagesSent: number;
    servicesCreated: number;
    jobsPosted: number;
    checkIns: number;
    engagementScore: number;
  };
  moderationStats: {
    totalViolations: number;
    totalReports: number;
    totalWarnings: number;
    bannedUsers: number;
    violationsByType: Record<string, number>;
    reportsByStatus: Record<string, number>;
    recentViolations: number;
    moderationScore: number;
  };
}

interface HealthCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

function HealthCard({ title, value, subtitle, icon, color, trend }: HealthCardProps) {
  return (
    <View style={styles.healthCard}>
      <View style={styles.healthCardHeader}>
        <View style={[styles.healthCardIcon, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        {trend !== undefined && (
          <View style={styles.trendContainer}>
            <TrendingUp 
              size={14} 
              color={trend >= 0 ? '#10B981' : '#EF4444'} 
              style={{ transform: [{ rotate: trend >= 0 ? '0deg' : '180deg' }] }}
            />
            <Text style={[styles.trendText, { color: trend >= 0 ? '#10B981' : '#EF4444' }]}>
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.healthCardValue}>{value}</Text>
      <Text style={styles.healthCardTitle}>{title}</Text>
      {subtitle && <Text style={styles.healthCardSubtitle}>{subtitle}</Text>}
    </View>
  );
}

interface ScoreRingProps {
  score: number;
  size: number;
  strokeWidth: number;
  color: string;
  label: string;
}

function ScoreRing({ score, size, strokeWidth, color, label }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <View style={styles.scoreRingContainer}>
      <View style={[styles.scoreRing, { width: size, height: size }]}>
        <View style={styles.scoreRingBackground} />
        <View 
          style={[
            styles.scoreRingProgress,
            {
              width: size - strokeWidth,
              height: size - strokeWidth,
              borderRadius: (size - strokeWidth) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              transform: [{ rotate: '-90deg' }]
            }
          ]}
        />
        <View style={styles.scoreRingCenter}>
          <Text style={styles.scoreRingValue}>{score}</Text>
          <Text style={styles.scoreRingPercent}>%</Text>
        </View>
      </View>
      <Text style={styles.scoreRingLabel}>{label}</Text>
    </View>
  );
}

export default function PlatformHealth() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState<PlatformHealthData | null>(null);

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

      await loadHealthData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    }
  };

  const loadHealthData = async () => {
    try {
      setIsLoading(true);
      const analyticsData = await adminService.getAnalyticsData();
      setHealthData({
        platformHealth: analyticsData.platformHealth,
        userEngagement: analyticsData.userEngagement,
        moderationStats: analyticsData.moderationStats
      });
    } catch (error) {
      console.error('Error loading health data:', error);
      Alert.alert('Error', 'Failed to load platform health data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHealthData();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>Loading platform health...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!healthData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load platform health data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadHealthData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Health Score Overview */}
        <View style={styles.scoreSection}>
          <Text style={styles.sectionTitle}>Overall Health Score</Text>
          <View style={styles.scoreGrid}>
            <ScoreRing
              score={healthData.platformHealth.healthScore}
              size={120}
              strokeWidth={8}
              color={getHealthColor(healthData.platformHealth.healthScore)}
              label="Platform Health"
            />
            <ScoreRing
              score={healthData.userEngagement.engagementScore}
              size={120}
              strokeWidth={8}
              color={getHealthColor(healthData.userEngagement.engagementScore)}
              label="User Engagement"
            />
            <ScoreRing
              score={healthData.moderationStats.moderationScore}
              size={120}
              strokeWidth={8}
              color={getHealthColor(healthData.moderationStats.moderationScore)}
              label="Moderation Score"
            />
          </View>
        </View>

        {/* Platform Metrics */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Platform Metrics</Text>
          <View style={styles.metricsGrid}>
            <HealthCard
              title="Active Users"
              value={healthData.platformHealth.activeUsers}
              subtitle="Last 30 days"
              icon={<Users size={20} color="#007AFF" />}
              color="#007AFF"
              trend={12.5}
            />
            <HealthCard
              title="Completed Orders"
              value={healthData.platformHealth.completedOrders}
              icon={<CheckCircle size={20} color="#10B981" />}
              color="#10B981"
              trend={8.3}
            />
            <HealthCard
              title="Dispute Rate"
              value={`${healthData.platformHealth.disputeRate}%`}
              icon={<AlertTriangle size={20} color="#F59E0B" />}
              color="#F59E0B"
              trend={-2.1}
            />
            <HealthCard
              title="Average Rating"
              value={healthData.platformHealth.averageRating.toFixed(1)}
              subtitle="Out of 5.0"
              icon={<Star size={20} color="#FFD700" />}
              color="#FFD700"
              trend={1.2}
            />
            <HealthCard
              title="System Uptime"
              value={`${healthData.platformHealth.systemUptime}%`}
              icon={<Activity size={20} color="#10B981" />}
              color="#10B981"
            />
          </View>
        </View>

        {/* User Engagement */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>User Engagement (Last 7 Days)</Text>
          <View style={styles.metricsGrid}>
            <HealthCard
              title="Daily Active Users"
              value={healthData.userEngagement.dailyActiveUsers}
              icon={<Users size={20} color="#8B5CF6" />}
              color="#8B5CF6"
            />
            <HealthCard
              title="Messages Sent"
              value={healthData.userEngagement.messagesSent}
              icon={<MessageSquare size={20} color="#06B6D4" />}
              color="#06B6D4"
            />
            <HealthCard
              title="Services Created"
              value={healthData.userEngagement.servicesCreated}
              icon={<Briefcase size={20} color="#10B981" />}
              color="#10B981"
            />
            <HealthCard
              title="Jobs Posted"
              value={healthData.userEngagement.jobsPosted}
              icon={<Calendar size={20} color="#F59E0B" />}
              color="#F59E0B"
            />
            <HealthCard
              title="Daily Check-ins"
              value={healthData.userEngagement.checkIns}
              icon={<CheckCircle size={20} color="#EF4444" />}
              color="#EF4444"
            />
          </View>
        </View>

        {/* Moderation Overview */}
        <View style={styles.moderationSection}>
          <Text style={styles.sectionTitle}>Moderation Overview</Text>
          <View style={styles.moderationGrid}>
            <View style={styles.moderationCard}>
              <View style={styles.moderationHeader}>
                <Shield size={24} color="#EF4444" />
                <Text style={styles.moderationTitle}>Security Status</Text>
              </View>
              <View style={styles.moderationStats}>
                <View style={styles.moderationStat}>
                  <Text style={styles.moderationStatValue}>{healthData.moderationStats.totalViolations}</Text>
                  <Text style={styles.moderationStatLabel}>Total Violations</Text>
                </View>
                <View style={styles.moderationStat}>
                  <Text style={styles.moderationStatValue}>{healthData.moderationStats.recentViolations}</Text>
                  <Text style={styles.moderationStatLabel}>Recent (7 days)</Text>
                </View>
                <View style={styles.moderationStat}>
                  <Text style={styles.moderationStatValue}>{healthData.moderationStats.bannedUsers}</Text>
                  <Text style={styles.moderationStatLabel}>Banned Users</Text>
                </View>
              </View>
            </View>

            <View style={styles.moderationCard}>
              <View style={styles.moderationHeader}>
                <AlertTriangle size={24} color="#F59E0B" />
                <Text style={styles.moderationTitle}>Reports & Warnings</Text>
              </View>
              <View style={styles.moderationStats}>
                <View style={styles.moderationStat}>
                  <Text style={styles.moderationStatValue}>{healthData.moderationStats.totalReports}</Text>
                  <Text style={styles.moderationStatLabel}>Total Reports</Text>
                </View>
                <View style={styles.moderationStat}>
                  <Text style={styles.moderationStatValue}>{healthData.moderationStats.totalWarnings}</Text>
                  <Text style={styles.moderationStatLabel}>Warnings Issued</Text>
                </View>
                <View style={styles.moderationStat}>
                  <Text style={styles.moderationStatValue}>
                    {healthData.moderationStats.reportsByStatus?.pending || 0}
                  </Text>
                  <Text style={styles.moderationStatLabel}>Pending Review</Text>
                </View>
              </View>
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
  scoreSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  scoreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreRingContainer: {
    alignItems: 'center',
  },
  scoreRing: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreRingBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
  },
  scoreRingProgress: {
    position: 'absolute',
  },
  scoreRingCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreRingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  scoreRingPercent: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  scoreRingLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  metricsSection: {
    marginBottom: 32,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  healthCard: {
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
  healthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthCardIcon: {
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
  healthCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  healthCardTitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  healthCardSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  moderationSection: {
    marginBottom: 32,
  },
  moderationGrid: {
    gap: 16,
  },
  moderationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moderationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  moderationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  moderationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  moderationStat: {
    alignItems: 'center',
  },
  moderationStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  moderationStatLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});