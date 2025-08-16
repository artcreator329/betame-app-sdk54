import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && width >= 1024;

interface AdminNavItem {
  name: string;
  title: string;
  icon: string;
  route: string;
}

const adminNavItems: AdminNavItem[] = [
  { name: 'index', title: 'Dashboard', icon: 'grid-outline', route: '/admin' },
  { name: 'order-management', title: 'Orders', icon: 'receipt-outline', route: '/admin/order-management' },
  { name: 'users', title: 'Users', icon: 'people-outline', route: '/admin/users' },
  { name: 'services', title: 'Services', icon: 'briefcase-outline', route: '/admin/services' },
  { name: 'transactions', title: 'Transactions', icon: 'card-outline', route: '/admin/transactions' },
  { name: 'chats', title: 'Chats', icon: 'chatbubbles-outline', route: '/admin/chats' },
  { name: 'notifications', title: 'Notifications', icon: 'notifications-outline', route: '/admin/notifications' },
  { name: 'analytics', title: 'Analytics', icon: 'bar-chart-outline', route: '/admin/analytics' },
  { name: 'preferences', title: 'Preferences', icon: 'options-outline', route: '/admin/preferences' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline', route: '/admin/settings' },
];

function DesktopSidebar() {
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = segments[segments.length - 1] || 'index';

  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View style={styles.logoContainer}>
          <Ionicons name="shield-checkmark" size={32} color="#2196F3" />
          <Text style={styles.logoText}>BetaMe Admin</Text>
        </View>
      </View>

      <View style={styles.navContainer}>
        {adminNavItems.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[
              styles.navItem,
              currentRoute === item.name && styles.navItemActive
            ]}
            onPress={() => router.push(item.route as any)}
          >
            <Ionicons 
              name={item.icon as any} 
              size={20} 
              color={currentRoute === item.name ? '#2196F3' : '#666'} 
            />
            <Text style={[
              styles.navItemText,
              currentRoute === item.name && styles.navItemTextActive
            ]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sidebarFooter}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => router.push('/(tabs)')}
        >
          <Ionicons name="arrow-back-outline" size={20} color="#666" />
          <Text style={styles.logoutText}>Back to App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = segments[segments.length - 1] || 'index';
  const currentItem = adminNavItems.find(item => item.name === currentRoute);

  return (
    <>
      <View style={styles.mobileHeader}>
        <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)}>
          <Ionicons name="menu-outline" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.mobileHeaderTitle}>
          {currentItem?.title || 'Admin'}
        </Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)')}>
          <Ionicons name="arrow-back-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {menuOpen && (
        <View style={styles.mobileMenu}>
          {adminNavItems.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.mobileMenuItem,
                currentRoute === item.name && styles.mobileMenuItemActive
              ]}
              onPress={() => {
                router.push(item.route as any);
                setMenuOpen(false);
              }}
            >
              <Ionicons 
                name={item.icon as any} 
                size={20} 
                color={currentRoute === item.name ? '#2196F3' : '#666'} 
              />
              <Text style={[
                styles.mobileMenuItemText,
                currentRoute === item.name && styles.mobileMenuItemTextActive
              ]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    
    // Redirect non-admin users
    if (!user || !isAdmin) {
      router.replace('/(tabs)');
      return;
    }
  }, [user, isAdmin, loading]);

  // Show loading or redirect while checking auth
  if (loading || !user || !isAdmin) {
    return null;
  }

  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        <DesktopSidebar />
        <View style={styles.mainContent}>
          <Stack screenOptions={{ 
            headerShown: false,
            animation: 'none',
          }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="order-management" />
            <Stack.Screen name="users" />
            <Stack.Screen name="services" />
            <Stack.Screen name="transactions" />
                  <Stack.Screen name="chats" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="analytics" />
            <Stack.Screen name="preferences" />
            <Stack.Screen name="settings" />
          </Stack>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mobileContainer}>
      <MobileHeader />
      <Stack screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 450,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="order-management" />
        <Stack.Screen name="users" />
        <Stack.Screen name="services" />
        <Stack.Screen name="transactions" />
        <Stack.Screen name="chats" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="analytics" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="settings" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  navContainer: {
    flex: 1,
    paddingTop: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginHorizontal: 12,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#f0f8ff',
  },
  navItemText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    fontWeight: '500',
  },
  navItemTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  sidebarFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  mobileMenu: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mobileMenuItemActive: {
    backgroundColor: '#f0f8ff',
  },
  mobileMenuItemText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  mobileMenuItemTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
});