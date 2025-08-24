import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View, Text, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, Users, FileText, Bell, User, Briefcase } from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
// Removed animation imports to prevent flashing
// Removed unused import
import { useRouter, useSegments } from 'expo-router';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && width >= 1024;

interface NavItem {
  name: string;
  title: string;
  icon: any;
  route: string;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { name: 'index', title: 'Home', icon: Home, route: '/' },
  { name: 'services', title: 'Services', icon: Briefcase, route: '/services', requiresAuth: true },
  { name: 'orders', title: 'Orders', icon: FileText, route: '/orders', requiresAuth: true },
  { name: 'notifications', title: 'Notifications', icon: Bell, route: '/notifications', requiresAuth: true },
  { name: 'profile', title: 'Profile', icon: User, route: '/profile' },
];

function DesktopSidebar() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = segments[segments.length - 1] || 'index';
  const isAuthenticated = !!user;

  const NotificationBadge = ({ count }: { count: number }) => {
    if (count === 0) return null;
    
    return (
      <View style={styles.notificationBadge}>
        <Text style={styles.notificationBadgeText}>
          {count > 99 ? '99+' : count.toString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/text-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.navContainer}>
        {navItems.map((item) => {
          // Skip auth-required items if user is not authenticated (except services for browsing)
          if (item.requiresAuth && !isAuthenticated && item.name !== 'services') return null;
          
          // For profile tab, show "Sign In" when not authenticated
          const displayTitle = item.name === 'profile' && !isAuthenticated ? 'Sign In' : item.title;
          const displayRoute = item.name === 'profile' && !isAuthenticated ? '/auth/login' : item.route;
          const isActive = currentRoute === item.name;
          const IconComponent = item.icon;
          
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => {
                if (item.name === 'profile' && !isAuthenticated) {
                  router.push('/auth/login');
                } else {
                  router.push(displayRoute as any);
                }
              }}
            >
              <View style={styles.navItemContent}>
                <IconComponent 
                  size={20} 
                  color={isActive ? '#007AFF' : '#666'} 
                />
                {item.name === 'notifications' && <NotificationBadge count={unreadCount} />}
              </View>
              <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                {displayTitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sidebarFooter}>
        <Text style={styles.footerText}>BetaMe v1.0.0</Text>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { unreadCount } = useNotifications();
  const segments = useSegments();
  const router = useRouter();
  
  const screenWidth = Dimensions.get('window').width;
  
  // Calculate visible tabs based on authentication status
  const visibleTabs = navItems.filter(item => {
    if (item.requiresAuth && !isAuthenticated && item.name !== 'services') {
      return false;
    }
    return true;
  });
  
  // Removed animation code to prevent flashing

  const NotificationBadge = ({ count }: { count: number }) => {
    if (count === 0) return null;
    
    return (
      <View style={{
        position: 'absolute',
        top: -2,
        right: -6,
        backgroundColor: '#34C759',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }}>
        <Text style={{
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: '600',
          textAlign: 'center',
        }}>
          {count > 99 ? '99+' : count.toString()}
        </Text>
      </View>
    );
  };

  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        <DesktopSidebar />
        <View style={styles.mainContent}>
          <Tabs screenOptions={{ 
            headerShown: false,
            tabBarStyle: { display: 'none' }, // Hide the tab bar on desktop
          }}>
            <Tabs.Screen name="index" />
            <Tabs.Screen name="services" />
            <Tabs.Screen name="orders" options={{ href: isAuthenticated ? '/orders' : null }} />
            <Tabs.Screen name="notifications" options={{ href: isAuthenticated ? '/notifications' : null }} />
            <Tabs.Screen name="profile" options={{ href: isAuthenticated ? '/profile' : null }} />
          </Tabs>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 0,
          borderRadius: 25,
          marginHorizontal: 20,
          marginBottom: 25,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
          position: 'absolute',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarBackground: () => (
          <View style={{
            flex: 1,
            backgroundColor: 'white',
            borderRadius: 25,
            overflow: 'hidden',
          }} />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
        // Removed animation listeners
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, size }) => (
            <Briefcase size={size} color={color} />
          ),
          // Allow non-authenticated users to browse services
        }}
        // Removed animation listeners
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <FileText size={size} color={color} />
          ),
          href: isAuthenticated ? '/orders' : null,
        }}
        // Removed animation listeners
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <Bell size={size} color={color} />
              <NotificationBadge count={unreadCount} />
            </View>
          ),
          href: isAuthenticated ? '/notifications' : null,
        }}
        // Removed animation listeners
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isAuthenticated ? 'Profile' : 'Sign In',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (!isAuthenticated) {
              e.preventDefault();
              router.push('/auth/login');
            }
          },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
  },
  sidebar: {
    width: 240,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sidebarHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    height: 28,
    width: 100,
  },
  navContainer: {
    flex: 1,
    paddingTop: 24,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#f0f8ff',
  },
  navItemContent: {
    position: 'relative',
    marginRight: 16,
  },
  navItemText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  navItemTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#34C759',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sidebarFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});