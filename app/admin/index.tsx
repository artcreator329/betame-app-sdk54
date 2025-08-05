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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService, DashboardStats } from '@/lib/admin-service';
import { Ionicons } from '@expo/vector-icons';

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

  useEffect(() => {
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
              await signOut();
              router.replace('/auth/login');
            } catch (error) {
              console.error('Error signing out:', error);
            }
          },
        },
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
      title: 'Total Services',
      value: stats?.totalServices.toString() || '0',
      icon: 'briefcase',
      color: '#34C759',
      route: '/admin/services',
    },
    {
      title: 'Total Jobs',
      value: stats?.totalJobs.toString() || '0',
      icon: 'hammer',
      color: '#FF9500',
      route: '/admin/jobs',
    },
    {
      title: 'Transactions',
      value: stats?.totalTransactions.toString() || '0',
      icon: 'card',
      color: '#AF52DE',
      route: '/admin/transactions',
    },
    {
      title: 'Revenue',
      value: `$${stats?.totalRevenue.toFixed(2) || '0.00'}`,
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back, Admin</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

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
              onPress={() => router.push(option.route as any)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  signOutButton: {
    padding: 8,
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
});