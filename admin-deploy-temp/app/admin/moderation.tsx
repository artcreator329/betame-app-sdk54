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
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  Filter,
  Shield,
  AlertTriangle,
  Flag,
  Ban,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  MessageSquare,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/lib/admin-service';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface ModerationData {
  totalViolations: number;
  totalReports: number;
  totalWarnings: number;
  bannedUsers: number;
  violationsByType: Record<string, number>;
  reportsByStatus: Record<string, number>;
  recentViolations: number;
  moderationScore: number;
}

interface Report {
  id: string;
  reported_user_id: string;
  reporter_user_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
  chat_id?: string;
}

interface Violation {
  id: string;
  user_id: string;
  violation_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  violation_details?: string;
  message_content?: string;
  created_at: string;
  resolved_at?: string;
}

interface ModerationCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  onPress?: () => void;
}

function ModerationCard({ title, value, subtitle, icon, color, onPress }: ModerationCardProps) {
  return (
    <TouchableOpacity style={styles.moderationCard} onPress={onPress} disabled={!onPress}>
      <View style={styles.moderationCardHeader}>
        <View style={[styles.moderationCardIcon, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
      </View>
      <Text style={styles.moderationCardValue}>{value}</Text>
      <Text style={styles.moderationCardTitle}>{title}</Text>
      {subtitle && <Text style={styles.moderationCardSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

interface ReportCardProps {
  report: Report;
  onAction: (report: Report, action: 'approve' | 'reject') => void;
}

function ReportCard({ report, onAction }: ReportCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'reviewed':
        return '#3B82F6';
      case 'resolved':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} color="#F59E0B" />;
      case 'reviewed':
        return <Eye size={16} color="#3B82F6" />;
      case 'resolved':
        return <CheckCircle size={16} color="#10B981" />;
      default:
        return <AlertTriangle size={16} color="#6B7280" />;
    }
  };

  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportReason}>{report.reason}</Text>
          <Text style={styles.reportId}>Report #{report.id.slice(-8)}</Text>
        </View>
        <View style={styles.reportStatus}>
          {getStatusIcon(report.status)}
          <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
            {report.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.reportDetails}>
        <Text style={styles.reportDetail}>
          Reported User: {report.reported_user_id.slice(-8)}
        </Text>
        <Text style={styles.reportDetail}>
          Reporter: {report.reporter_user_id.slice(-8)}
        </Text>
        <Text style={styles.reportDetail}>
          Date: {new Date(report.created_at).toLocaleDateString()}
        </Text>
      </View>

      {report.status === 'pending' && (
        <View style={styles.reportActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => onAction(report, 'approve')}
          >
            <CheckCircle size={16} color="white" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => onAction(report, 'reject')}
          >
            <XCircle size={16} color="white" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

interface ViolationCardProps {
  violation: Violation;
  onResolve: (violation: Violation) => void;
}

function ViolationCard({ violation, onResolve }: ViolationCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return '#10B981';
      case 'medium':
        return '#F59E0B';
      case 'high':
        return '#EF4444';
      case 'critical':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={styles.violationCard}>
      <View style={styles.violationHeader}>
        <View style={styles.violationInfo}>
          <Text style={styles.violationType}>{violation.violation_type.replace('_', ' ')}</Text>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(violation.severity) + '20' }]}>
            <Text style={[styles.severityText, { color: getSeverityColor(violation.severity) }]}>
              {violation.severity.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.violationDetails}>
        <Text style={styles.violationDetail}>
          User: {violation.user_id.slice(-8)}
        </Text>
        <Text style={styles.violationDetail}>
          Date: {new Date(violation.created_at).toLocaleDateString()}
        </Text>
        {violation.violation_details && (
          <Text style={styles.violationDescription}>
            Details: {violation.violation_details}
          </Text>
        )}
        {violation.message_content && (
          <Text style={styles.violationMessage}>
            Message: "{violation.message_content}"
          </Text>
        )}
      </View>

      {!violation.resolved_at && (
        <TouchableOpacity
          style={styles.resolveButton}
          onPress={() => onResolve(violation)}
        >
          <CheckCircle size={16} color="white" />
          <Text style={styles.resolveButtonText}>Mark Resolved</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ModerationCenter() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [moderationData, setModerationData] = useState<ModerationData | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'violations'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

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

      await loadModerationData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    }
  };

  const loadModerationData = async () => {
    try {
      setIsLoading(true);
      
      const [analyticsData, mockReports, mockViolations] = await Promise.all([
        adminService.getAnalyticsData(),
        loadMockReports(),
        loadMockViolations()
      ]);

      setModerationData(analyticsData.moderationStats);
      setReports(mockReports);
      setViolations(mockViolations);
    } catch (error) {
      console.error('Error loading moderation data:', error);
      Alert.alert('Error', 'Failed to load moderation data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockReports = async (): Promise<Report[]> => {
    // Mock data - in real app, this would come from adminService
    return [
      {
        id: 'report_1',
        reported_user_id: 'user_123',
        reporter_user_id: 'user_456',
        reason: 'Inappropriate content',
        status: 'pending',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        chat_id: 'chat_789'
      },
      {
        id: 'report_2',
        reported_user_id: 'user_789',
        reporter_user_id: 'user_012',
        reason: 'Spam messages',
        status: 'reviewed',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ];
  };

  const loadMockViolations = async (): Promise<Violation[]> => {
    // Mock data - in real app, this would come from adminService
    return [
      {
        id: 'violation_1',
        user_id: 'user_123',
        violation_type: 'contact_info_sharing',
        severity: 'medium',
        violation_details: 'User shared phone number in chat',
        message_content: 'Call me at 012-345-6789',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'violation_2',
        user_id: 'user_456',
        violation_type: 'spam',
        severity: 'high',
        violation_details: 'Multiple spam messages sent',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadModerationData();
    setRefreshing(false);
  };

  const handleReportAction = async (report: Report, action: 'approve' | 'reject') => {
    Alert.alert(
      `${action === 'approve' ? 'Approve' : 'Reject'} Report`,
      `Are you sure you want to ${action} this report?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          onPress: async () => {
            try {
              // Update report status
              const updatedReports = reports.map(r => 
                r.id === report.id 
                  ? { ...r, status: action === 'approve' ? 'resolved' as const : 'reviewed' as const }
                  : r
              );
              setReports(updatedReports);
              
              Alert.alert('Success', `Report ${action}d successfully`);
            } catch (error) {
              Alert.alert('Error', `Failed to ${action} report`);
            }
          }
        }
      ]
    );
  };

  const handleResolveViolation = async (violation: Violation) => {
    Alert.alert(
      'Resolve Violation',
      'Are you sure you want to mark this violation as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: async () => {
            try {
              const updatedViolations = violations.map(v => 
                v.id === violation.id 
                  ? { ...v, resolved_at: new Date().toISOString() }
                  : v
              );
              setViolations(updatedViolations);
              
              Alert.alert('Success', 'Violation marked as resolved');
            } catch (error) {
              Alert.alert('Error', 'Failed to resolve violation');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading moderation center...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredReports = reports.filter(report =>
    report.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredViolations = violations.filter(violation =>
    violation.violation_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    violation.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Shield size={20} color={activeTab === 'overview' ? Colors.primary : Colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Flag size={20} color={activeTab === 'reports' ? Colors.primary : Colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
            Reports ({reports.filter(r => r.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'violations' && styles.activeTab]}
          onPress={() => setActiveTab('violations')}
        >
          <AlertTriangle size={20} color={activeTab === 'violations' ? Colors.primary : Colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'violations' && styles.activeTabText]}>
            Violations ({violations.filter(v => !v.resolved_at).length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && moderationData && (
          <>
            {/* Moderation Score */}
            <View style={styles.scoreSection}>
              <Text style={styles.sectionTitle}>Moderation Health Score</Text>
              <View style={styles.scoreCard}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreValue}>{moderationData.moderationScore}</Text>
                  <Text style={styles.scoreLabel}>/ 100</Text>
                </View>
                <View style={styles.scoreDetails}>
                  <Text style={styles.scoreDescription}>
                    {moderationData.moderationScore >= 80 ? 'Excellent' : 
                     moderationData.moderationScore >= 60 ? 'Good' : 'Needs Attention'}
                  </Text>
                  <Text style={styles.scoreSubtext}>
                    Platform safety and moderation effectiveness
                  </Text>
                </View>
              </View>
            </View>

            {/* Overview Cards */}
            <View style={styles.overviewSection}>
              <Text style={styles.sectionTitle}>Moderation Overview</Text>
              <View style={styles.overviewGrid}>
                <ModerationCard
                  title="Total Reports"
                  value={moderationData.totalReports}
                  icon={<Flag size={20} color="#F59E0B" />}
                  color="#F59E0B"
                  onPress={() => setActiveTab('reports')}
                />
                <ModerationCard
                  title="Total Violations"
                  value={moderationData.totalViolations}
                  icon={<AlertTriangle size={20} color="#EF4444" />}
                  color="#EF4444"
                  onPress={() => setActiveTab('violations')}
                />
                <ModerationCard
                  title="Warnings Issued"
                  value={moderationData.totalWarnings}
                  icon={<MessageSquare size={20} color="#F59E0B" />}
                  color="#F59E0B"
                />
                <ModerationCard
                  title="Banned Users"
                  value={moderationData.bannedUsers}
                  icon={<Ban size={20} color="#DC2626" />}
                  color="#DC2626"
                />
                <ModerationCard
                  title="Recent Violations"
                  value={moderationData.recentViolations}
                  subtitle="Last 7 days"
                  icon={<Clock size={20} color="#8B5CF6" />}
                  color="#8B5CF6"
                />
                <ModerationCard
                  title="Pending Review"
                  value={reports.filter(r => r.status === 'pending').length}
                  icon={<Eye size={20} color="#3B82F6" />}
                  color="#3B82F6"
                />
              </View>
            </View>

            {/* Violation Types Breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionTitle}>Violation Types</Text>
              <View style={styles.breakdownCard}>
                {Object.entries(moderationData.violationsByType).map(([type, count]) => (
                  <View key={type} style={styles.breakdownItem}>
                    <Text style={styles.breakdownType}>{type.replace('_', ' ')}</Text>
                    <View style={styles.breakdownBar}>
                      <View 
                        style={[
                          styles.breakdownProgress,
                          { 
                            width: `${(count / Math.max(...Object.values(moderationData.violationsByType))) * 100}%`,
                            backgroundColor: '#EF4444'
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.breakdownCount}>{count}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {activeTab === 'reports' && (
          <>
            {/* Search */}
            <View style={styles.searchContainer}>
              <Search size={20} color={Colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search reports..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={Colors.text.secondary}
              />
            </View>

            {/* Reports List */}
            <View style={styles.reportsSection}>
              <Text style={styles.sectionTitle}>User Reports ({filteredReports.length})</Text>
              {filteredReports.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Flag size={48} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No reports found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery ? 'Try adjusting your search criteria' : 'All reports have been handled'}
                  </Text>
                </View>
              ) : (
                filteredReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onAction={handleReportAction}
                  />
                ))
              )}
            </View>
          </>
        )}

        {activeTab === 'violations' && (
          <>
            {/* Search */}
            <View style={styles.searchContainer}>
              <Search size={20} color={Colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search violations..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={Colors.text.secondary}
              />
            </View>

            {/* Violations List */}
            <View style={styles.violationsSection}>
              <Text style={styles.sectionTitle}>User Violations ({filteredViolations.length})</Text>
              {filteredViolations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <AlertTriangle size={48} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No violations found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery ? 'Try adjusting your search criteria' : 'No violations detected'}
                  </Text>
                </View>
              ) : (
                filteredViolations.map((violation) => (
                  <ViolationCard
                    key={violation.id}
                    violation={violation}
                    onResolve={handleResolveViolation}
                  />
                ))
              )}
            </View>
          </>
        )}
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

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 8,
  },
  activeTab: {
    backgroundColor: Colors.primary + '20',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  activeTabText: {
    color: Colors.primary,
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
  scoreSection: {
    marginBottom: 32,
  },
  scoreCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981' + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#10B981',
  },
  scoreDetails: {
    flex: 1,
  },
  scoreDescription: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  scoreSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  overviewSection: {
    marginBottom: 32,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  moderationCard: {
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
  moderationCardHeader: {
    marginBottom: 12,
  },
  moderationCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moderationCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  moderationCardTitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  moderationCardSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  breakdownSection: {
    marginBottom: 32,
  },
  breakdownCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  breakdownType: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    width: 120,
    textTransform: 'capitalize',
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  breakdownProgress: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    minWidth: 30,
    textAlign: 'right',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  reportsSection: {
    marginBottom: 32,
  },
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
    marginRight: 16,
  },
  reportReason: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  reportId: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  reportStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportDetails: {
    marginBottom: 16,
  },
  reportDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  violationsSection: {
    marginBottom: 32,
  },
  violationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  violationHeader: {
    marginBottom: 12,
  },
  violationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  violationType: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  violationDetails: {
    marginBottom: 16,
  },
  violationDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  violationDescription: {
    fontSize: 14,
    color: Colors.text.primary,
    marginTop: 8,
  },
  violationMessage: {
    fontSize: 14,
    color: Colors.text.primary,
    fontStyle: 'italic',
    marginTop: 4,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  resolveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});