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
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Shield,
  RefreshCw,
  Settings,
  BarChart3,
  Zap,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { EKYCService } from '@/lib/ekyc-service';
import { adminService } from '@/lib/admin-service';
import { useColors } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface SyncStats {
  total_submissions: number;
  approved_submissions: number;
  rejected_submissions: number;
  pending_submissions: number;
  verified_profiles: number;
  sync_mismatches: number;
  recent_syncs_24h: number;
  last_sync_time: string;
}

interface SyncMismatch {
  user_id: string;
  user_email: string;
  user_name: string;
  ekyc_status: string;
  profile_status: string;
  ekyc_updated_at: string;
  profile_updated_at: string;
  mismatch_duration: string;
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  stats: SyncStats;
  mismatches: SyncMismatch[];
}

export default function EKYCMonitoring() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [isFixing, setIsFixing] = useState(false);

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
          'You do not have permission to access eKYC monitoring.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      await loadMonitoringData();
    } catch (error) {
      console.error('❌ Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    }
  };

  const loadMonitoringData = async () => {
    try {
      setIsLoading(true);
      
      // Load health status and statistics
      const health = await EKYCService.monitorSyncHealth();
      setHealthStatus(health);

      // Load recent sync logs
      const logs = await EKYCService.getSyncLogs(20);
      setSyncLogs(logs);

    } catch (error) {
      console.error('❌ Error loading monitoring data:', error);
      Alert.alert('Error', 'Failed to load monitoring data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMonitoringData();
    setRefreshing(false);
  };

  const handleFixSyncIssues = async () => {
    if (!healthStatus?.mismatches || healthStatus.mismatches.length === 0) {
      Alert.alert('No Issues', 'No sync issues found to fix.');
      return;
    }

    Alert.alert(
      'Fix Sync Issues',
      `Found ${healthStatus.mismatches.length} sync issue(s). Do you want to fix them automatically?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fix All',
          onPress: async () => {
            setIsFixing(true);
            try {
              const result = await EKYCService.fixVerificationStatusMismatch();
              Alert.alert(
                'Fix Complete',
                `Fixed ${result.fixed} users. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`,
                [{ text: 'OK', onPress: () => onRefresh() }]
              );
            } catch (error) {
              console.error('❌ Error fixing sync issues:', error);
              Alert.alert('Error', 'Failed to fix sync issues');
            } finally {
              setIsFixing(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return colors.status.success;
      case 'warning': return colors.status.warning;
      case 'critical': return colors.status.error;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle size={24} color={colors.status.success} />;
      case 'warning': return <AlertTriangle size={24} color={colors.status.warning} />;
      case 'critical': return <XCircle size={24} color={colors.status.error} />;
      default: return <Clock size={24} color={colors.text.secondary} />;
    }
  };

  const formatDuration = (duration: string) => {
    if (!duration) return 'Unknown';
    
    // Parse PostgreSQL interval format
    const match = duration.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    }
    
    return duration;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Loading monitoring data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.primary, borderBottomColor: colors.border.light }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>eKYC Monitoring</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <RefreshCw size={24} color={refreshing ? colors.text.secondary : colors.primary.main} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Health Status Card */}
        {healthStatus && (
          <View style={[styles.card, { backgroundColor: colors.background.secondary }]}>
            <View style={styles.cardHeader}>
              <View style={styles.statusHeader}>
                {getStatusIcon(healthStatus.status)}
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                  System Health
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(healthStatus.status) }]}>
                <Text style={[styles.statusBadgeText, { color: colors.text.white }]}>
                  {healthStatus.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {healthStatus.issues.length > 0 && (
              <View style={styles.issuesContainer}>
                <Text style={[styles.issuesTitle, { color: colors.text.primary }]}>Issues:</Text>
                {healthStatus.issues.map((issue, index) => (
                  <Text key={index} style={[styles.issueText, { color: colors.status.error }]}>
                    • {issue}
                  </Text>
                ))}
              </View>
            )}

            {healthStatus.mismatches.length > 0 && (
              <TouchableOpacity
                style={[styles.fixButton, { backgroundColor: colors.status.error }]}
                onPress={handleFixSyncIssues}
                disabled={isFixing}
              >
                {isFixing ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <Settings size={16} color={colors.text.white} />
                )}
                <Text style={[styles.fixButtonText, { color: colors.text.white }]}>
                  {isFixing ? 'Fixing...' : `Fix ${healthStatus.mismatches.length} Issue(s)`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Statistics Cards */}
        {healthStatus?.stats && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.background.secondary }]}>
              <Users size={24} color={colors.primary.main} />
              <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                {healthStatus.stats.total_submissions}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Total Submissions
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.background.secondary }]}>
              <CheckCircle size={24} color={colors.status.success} />
              <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                {healthStatus.stats.approved_submissions}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Approved
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.background.secondary }]}>
              <Shield size={24} color={colors.status.success} />
              <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                {healthStatus.stats.verified_profiles}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Verified Profiles
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.background.secondary }]}>
              <Activity size={24} color={colors.status.warning} />
              <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                {healthStatus.stats.recent_syncs_24h}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Syncs (24h)
              </Text>
            </View>
          </View>
        )}

        {/* Sync Mismatches */}
        {healthStatus?.mismatches && healthStatus.mismatches.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.background.secondary }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
              Sync Mismatches ({healthStatus.mismatches.length})
            </Text>
            {healthStatus.mismatches.map((mismatch, index) => (
              <View key={index} style={[styles.mismatchItem, { borderBottomColor: colors.border.light }]}>
                <View style={styles.mismatchHeader}>
                  <Text style={[styles.mismatchName, { color: colors.text.primary }]}>
                    {mismatch.user_name}
                  </Text>
                  <Text style={[styles.mismatchDuration, { color: colors.status.error }]}>
                    {formatDuration(mismatch.mismatch_duration)}
                  </Text>
                </View>
                <Text style={[styles.mismatchEmail, { color: colors.text.secondary }]}>
                  {mismatch.user_email}
                </Text>
                <View style={styles.mismatchStatus}>
                  <Text style={[styles.mismatchStatusText, { color: colors.text.secondary }]}>
                    eKYC: {mismatch.ekyc_status} → Profile: {mismatch.profile_status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Sync Operations */}
        {syncLogs.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.background.secondary }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
              Recent Sync Operations
            </Text>
            {syncLogs.slice(0, 10).map((log, index) => (
              <View key={index} style={[styles.logItem, { borderBottomColor: colors.border.light }]}>
                <View style={styles.logHeader}>
                  <View style={styles.logUser}>
                    {log.trigger_source === 'service_update_failed' ? (
                      <XCircle size={16} color={colors.status.error} />
                    ) : (
                      <CheckCircle size={16} color={colors.status.success} />
                    )}
                    <Text style={[styles.logUserName, { color: colors.text.primary }]}>
                      {log.user_name || 'Unknown'}
                    </Text>
                  </View>
                  <Text style={[styles.logTime, { color: colors.text.secondary }]}>
                    {new Date(log.sync_timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={[styles.logDetails, { color: colors.text.secondary }]}>
                  {log.old_ekyc_status || 'unknown'} → {log.new_ekyc_status || 'unknown'} ({log.trigger_source})
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={[styles.card, { backgroundColor: colors.background.secondary }]}>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
            Quick Actions
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary.main }]}
            onPress={() => router.push('/admin/ekyc-management')}
          >
            <Users size={20} color={colors.text.white} />
            <Text style={[styles.actionButtonText, { color: colors.text.white }]}>
              Manage eKYC Submissions
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.background.tertiary }]}
            onPress={onRefresh}
          >
            <RefreshCw size={20} color={colors.text.primary} />
            <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>
              Refresh Monitoring Data
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  issuesContainer: {
    marginTop: 12,
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  issueText: {
    fontSize: 14,
    marginBottom: 4,
  },
  fixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  fixButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: (width - 60) / 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  mismatchItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mismatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mismatchName: {
    fontSize: 16,
    fontWeight: '600',
  },
  mismatchDuration: {
    fontSize: 12,
    fontWeight: '600',
  },
  mismatchEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  mismatchStatus: {
    marginTop: 8,
  },
  mismatchStatusText: {
    fontSize: 12,
  },
  logItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logUserName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  logTime: {
    fontSize: 12,
  },
  logDetails: {
    fontSize: 12,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});