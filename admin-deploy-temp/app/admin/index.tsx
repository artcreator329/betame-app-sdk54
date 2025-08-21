import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService, DashboardStats } from '@/lib/admin-service';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && width >= 1024;

interface DashboardCard {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Broadcast notification state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('Test Broadcast Notification');
  const [broadcastMessage, setBroadcastMessage] = useState('This is a test broadcast notification from the admin panel.');
  const [broadcastType, setBroadcastType] = useState<'marketing' | 'system'>('system');
  const [isSending, setIsSending] = useState(false);

  // Debug modal state changes


  useEffect(() => {
    console.log('🔍 AdminDashboard component loaded');
    console.log('🔍 Management options:', managementOptions.map(opt => opt.title));
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const dashboardStats = await adminService.getDashboardStats();
      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      Alert.alert('Error', 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    // For web, use confirm instead of Alert which might not work properly
    if (isWeb) {
      const confirmed = confirm('Are you sure you want to sign out?');
      if (!confirmed) return;
      
      try {
        console.log('🔄 Admin: Starting sign out process...');
        
        // Try to sign out properly first
        const result = await signOut();
        console.log('✅ Admin: Sign out completed, result:', result);
        
        // Use router navigation instead of window.location for better compatibility
        if (result && result.error) {
          console.error('❌ Admin: Sign out error:', result.error);
          // Still navigate away even on error to prevent loops
          router.replace('/auth/login');
        } else {
          // Navigate to login page after successful sign out
          router.replace('/auth/login');
        }
        
      } catch (error) {
        console.error('❌ Admin: Sign out exception:', error);
        // Force navigation even on error to prevent loops
        router.replace('/auth/login');
      }
    } else {
      // Use Alert for mobile
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🔄 Admin: Starting sign out process...');
                const result = await signOut();
                
                if (result && result.error) {
                  console.error('❌ Admin: Sign out error:', result.error);
                  Alert.alert('Error', 'Failed to sign out. Please try again.');
                } else {
                  console.log('✅ Admin: Sign out successful, navigating...');
                  // Navigate to main app instead of login
                  router.replace('/(tabs)');
                }
              } catch (error) {
                console.error('❌ Admin: Sign out exception:', error);
                Alert.alert('Error', 'An unexpected error occurred while signing out.');
              }
            },
          },
        ]
      );
    }
  };

  const sendBroadcastNotification = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert('Error', 'Please enter both title and message');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Admin user not found');
      return;
    }

    Alert.alert(
      'Send Broadcast Notification',
      `Are you sure you want to send this ${broadcastType} notification to all users?\n\nTitle: ${broadcastTitle}\nMessage: ${broadcastMessage}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
                      onPress: async () => {
              setIsSending(true);
              try {
                const result = await adminService.sendBroadcastNotification(
                  broadcastTitle,
                  broadcastMessage,
                  broadcastType
                );

                if (result.success) {
                  Alert.alert(
                    'Success', 
                    `Broadcast notification sent to ${result.sentCount} users!`
                  );
                  setBroadcastTitle('');
                  setBroadcastMessage('');
                  setShowBroadcastModal(false);
                } else {
                  Alert.alert('Error', result.error || 'Failed to send broadcast notification');
                }
              } catch (error) {
                console.error('Error sending broadcast:', error);
                Alert.alert('Error', 'Failed to send broadcast notification');
              } finally {
                setIsSending(false);
              }
            }
        }
      ]
    );
  };

  const dashboardCards: DashboardCard[] = [
    {
      title: 'Total Users',
      value: stats?.totalUsers.toString() || '0',
      icon: 'people',
      color: '#007AFF',
      route: '/admin/users',
    },
    {
      title: 'Active Services',
      value: stats?.activeServices?.toString() || '0',
      icon: 'briefcase',
      color: '#34C759',
      route: '/admin/services',
    },
    {
      title: 'Active Jobs',
      value: stats?.activeJobs?.toString() || '0',
      icon: 'hammer',
      color: '#FF9500',
      route: '/admin/jobs',
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders?.toString() || '0',
      icon: 'receipt',
      color: '#8B5CF6',
      route: '/admin/order-management',
    },
    {
      title: 'Revenue',
      value: `RM ${stats?.totalRevenue?.toFixed(0) || '0'}`,
      icon: 'trending-up',
      color: '#FF3B30',
      route: '/admin/analytics',
    },
    {
      title: 'Active Chats',
      value: stats?.activeChats.toString() || '0',
      icon: 'chatbubbles',
      color: '#5AC8FA',
      route: '/admin/chats',
    },
    {
      title: 'Escrow Held',
      value: stats?.escrowHeld?.toString() || '0',
      icon: 'shield-checkmark',
      color: '#10B981',
      route: '/admin/order-management',
    },
    {
      title: 'Pending Reports',
      value: stats?.pendingReports?.toString() || '0',
      icon: 'flag',
      color: '#F59E0B',
      route: '/admin/moderation',
    },
  ];

  const managementOptions = [
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: 'people' as keyof typeof Ionicons.glyphMap,
      route: '/admin/users',
      color: '#007AFF',
    },
    {
      title: 'Service Management',
      description: 'Manage services and listings',
      icon: 'briefcase' as keyof typeof Ionicons.glyphMap,
      route: '/admin/services',
      color: '#34C759',
    },
    {
      title: 'Job Management',
      description: 'Manage job listings and applications',
      icon: 'hammer' as keyof typeof Ionicons.glyphMap,
      route: '/admin/jobs',
      color: '#FF9500',
    },
    {
      title: 'Transaction Management',
      description: 'View and manage transactions',
      icon: 'card' as keyof typeof Ionicons.glyphMap,
      route: '/admin/transactions',
      color: '#AF52DE',
    },
    {
      title: 'Chat Management',
      description: 'Monitor and manage chat conversations',
      icon: 'chatbubbles' as keyof typeof Ionicons.glyphMap,
      route: '/admin/chats',
      color: '#5AC8FA',
    },
    {
      title: 'Analytics',
      description: 'View detailed analytics and reports',
      icon: 'analytics' as keyof typeof Ionicons.glyphMap,
      route: '/admin/analytics',
      color: '#FF3B30',
    },
    {
      title: 'Platform Health',
      description: 'Monitor system health and performance',
      icon: 'pulse' as keyof typeof Ionicons.glyphMap,
      route: '/admin/platform-health',
      color: '#10B981',
    },
    {
      title: 'Order Management',
      description: 'Manage orders, disputes, and payouts',
      icon: 'receipt' as keyof typeof Ionicons.glyphMap,
      route: '/admin/order-management',
      color: '#8B5CF6',
    },
    {
      title: 'Moderation Center',
      description: 'Handle reports, violations, and user safety',
      icon: 'shield-checkmark' as keyof typeof Ionicons.glyphMap,
      route: '/admin/moderation',
      color: '#EF4444',
    },
    {
      title: 'Financial Analytics',
      description: 'Revenue insights and financial metrics',
      icon: 'trending-up' as keyof typeof Ionicons.glyphMap,
      route: '/admin/financial-analytics',
      color: '#10B981',
    },
    {
      title: 'System Monitor',
      description: 'Real-time system health and performance',
      icon: 'pulse' as keyof typeof Ionicons.glyphMap,
      route: '/admin/system-monitor',
      color: '#8B5CF6',
    },
    {
      title: 'Broadcast Notifications',
      description: 'Send notifications to all users',
      icon: 'notifications' as keyof typeof Ionicons.glyphMap,
      route: '',
      color: '#FF6B35',
    },
    {
      title: 'Settings',
      description: 'System settings and configuration',
      icon: 'settings' as keyof typeof Ionicons.glyphMap,
      route: '/admin/settings',
      color: '#8E8E93',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        {/* Desktop Header */}
        <View style={styles.desktopHeader}>
          <View style={styles.desktopHeaderContent}>
            <Text style={styles.desktopHeaderTitle}>Admin Dashboard</Text>
            <Text style={styles.desktopHeaderSubtitle}>Welcome back, Admin</Text>
          </View>
          <TouchableOpacity 
            style={styles.desktopSignOutButton} 
            onPress={handleSignOut}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Sign out of admin dashboard"
          >
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.desktopScrollView} showsVerticalScrollIndicator={false}>
          {/* Desktop Stats Grid */}
          <View style={styles.desktopStatsContainer}>
            <Text style={styles.desktopSectionTitle}>Overview</Text>
            <View style={styles.desktopStatsGrid}>
              {dashboardCards.map((card, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.desktopStatCard}
                  onPress={() => router.push(card.route as any)}
                >
                  <View style={styles.desktopStatHeader}>
                    <View style={[styles.desktopStatIcon, { backgroundColor: card.color }]}>
                      <Ionicons name={card.icon} size={24} color="white" />
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#C7C7CC" />
                  </View>
                  <Text style={styles.desktopStatValue}>{card.value}</Text>
                  <Text style={styles.desktopStatTitle}>{card.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Desktop Management Grid */}
          <View style={styles.desktopManagementContainer}>
            <Text style={styles.desktopSectionTitle}>Quick Actions</Text>
            <View style={styles.desktopManagementGrid}>
              {managementOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.desktopManagementCard}
                  onPress={() => {
                    if (option.route) {
                      router.push(option.route as any);
                    } else {
                      setShowBroadcastModal(true);
                    }
                  }}
                >
                  <View style={[styles.desktopManagementIcon, { backgroundColor: option.color }]}>
                    <Ionicons name={option.icon} size={28} color="white" />
                  </View>
                  <Text style={styles.desktopManagementTitle}>{option.title}</Text>
                  <Text style={styles.desktopManagementDescription}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            {dashboardCards.map((card, index) => (
              <TouchableOpacity
                key={index}
                style={styles.statCard}
                onPress={() => router.push(card.route as any)}
              >
                <View style={[styles.statIcon, { backgroundColor: card.color }]}>
                  <Ionicons name={card.icon} size={24} color="white" />
                </View>
                <Text style={styles.statValue}>{card.value}</Text>
                <Text style={styles.statTitle}>{card.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Management Options */}
        <View style={styles.managementContainer}>
          <Text style={styles.sectionTitle}>Management</Text>
          {managementOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.managementCard}
              onPress={() => {
                if (option.route) {
                  router.push(option.route as any);
                } else {
                  setShowBroadcastModal(true);
                }
              }}
            >
              <View style={[styles.managementIcon, { backgroundColor: option.color }]}>
                <Ionicons name={option.icon} size={24} color="white" />
              </View>
              <View style={styles.managementContent}>
                <Text style={styles.managementTitle}>{option.title}</Text>
                <Text style={styles.managementDescription}>{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Broadcast Notification Modal */}
      <Modal
        visible={showBroadcastModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBroadcastModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Broadcast Notification</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowBroadcastModal(false)}
              >
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Type Selection */}
              <Text style={styles.modalLabel}>Notification Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: broadcastType === 'system' ? '#007AFF' : '#F2F2F7' }
                  ]}
                  onPress={() => setBroadcastType('system')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    { color: broadcastType === 'system' ? 'white' : '#8E8E93' }
                  ]}>System</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: broadcastType === 'marketing' ? '#007AFF' : '#F2F2F7' }
                  ]}
                  onPress={() => setBroadcastType('marketing')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    { color: broadcastType === 'marketing' ? 'white' : '#8E8E93' }
                  ]}>Marketing</Text>
                </TouchableOpacity>
              </View>

              {/* Title Input */}
              <Text style={styles.modalLabel}>Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter notification title..."
                placeholderTextColor="#8E8E93"
                value={broadcastTitle}
                onChangeText={setBroadcastTitle}
                maxLength={100}
              />

              {/* Message Input */}
              <Text style={styles.modalLabel}>Message</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Enter notification message..."
                placeholderTextColor="#8E8E93"
                value={broadcastMessage}
                onChangeText={setBroadcastMessage}
                multiline
                numberOfLines={4}
                maxLength={300}
              />

              {/* Send Button */}
              <TouchableOpacity
                style={[
                  styles.modalSendButton,
                  { 
                    opacity: (broadcastTitle.trim() && broadcastMessage.trim() && !isSending) ? 1 : 0.5
                  }
                ]}
                onPress={() => {
                  console.log('🔍 Send button clicked!');
                  sendBroadcastNotification();
                }}
                disabled={!broadcastTitle.trim() || !broadcastMessage.trim() || isSending}
              >
                <Ionicons name="send" size={18} color="white" />
                <Text style={styles.modalSendButtonText}>
                  {isSending ? 'Sending...' : 'Send to All Users'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  desktopContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  desktopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  desktopHeaderContent: {
    flex: 1,
  },
  desktopHeaderTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  desktopHeaderSubtitle: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 4,
  },
  desktopSignOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
    gap: 8,
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
  desktopScrollView: {
    flex: 1,
  },
  desktopStatsContainer: {
    padding: 32,
  },
  desktopSectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 24,
  },
  desktopStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  desktopStatCard: {
    width: (width - 280 - 64 - 40) / 3, // Sidebar width - padding - gaps, divided by 3
    minWidth: 200,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  desktopStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  desktopStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  desktopStatTitle: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  desktopManagementContainer: {
    padding: 32,
    paddingTop: 0,
  },
  desktopManagementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  desktopManagementCard: {
    width: (width - 280 - 64 - 20) / 2, // Sidebar width - padding - gap, divided by 2
    minWidth: 300,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    alignItems: 'center',
    textAlign: 'center',
  },
  desktopManagementIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  desktopManagementTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  desktopManagementDescription: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
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
    color: '#8E8E93',
  },

  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  managementContainer: {
    padding: 20,
    paddingTop: 0,
  },
  managementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  managementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  managementContent: {
    flex: 1,
  },
  managementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  managementDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: 'white',
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
    marginTop: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1D1D1F',
    backgroundColor: 'white',
    marginBottom: 16,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 20,
  },
  modalSendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});