import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View, Text, Dimensions, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Home, Users, FileText, Bell, User, Briefcase } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, useSegments } from 'expo-router';
import { iosBadgeService } from '@/lib/ios-badge-service';
import { useAppStateIOSBadge } from '@/hooks/useAppStateIOSBadge';

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
  const { theme, isDarkMode } = useTheme();
  const { unreadCount } = useNotifications();
  const { totalUnreadCount } = useUnreadMessageCount();
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = segments[segments.length - 1] || 'index';
  const isAuthenticated = !!user;
  
  // Combine notification and message unread counts
  const totalBadgeCount = unreadCount + totalUnreadCount;
  
  // Update iOS badge count whenever total badge count changes
  useEffect(() => {
    iosBadgeService.updateBadgeCount(totalBadgeCount);
  }, [totalBadgeCount]);
  
  // Handle app state changes for iOS badge management
  useAppStateIOSBadge(totalBadgeCount);

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
    <View style={[styles.sidebar, { 
      backgroundColor: theme.background.tertiary,
      borderRightColor: theme.border.light,
      shadowColor: theme.shadow.medium,
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    }]}>
      <View style={[styles.sidebarHeader, { borderBottomColor: theme.border.light }]}>
        <View style={styles.logoContainer}>
          <Image 
            source={isDarkMode 
              ? require('../../assets/images/text-logo-white.png')
              : require('../../assets/images/text-logo.png')
            }
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
              style={[
              styles.navItem, 
              isActive && { backgroundColor: theme.background.secondary }
            ]}
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
                  color={isActive ? theme.primary.main : theme.text.secondary} 
                />
                {item.name === 'notifications' && <NotificationBadge count={totalBadgeCount} />}
              </View>
              <Text style={[
                styles.navItemText, 
                { color: theme.text.secondary },
                isActive && { color: theme.primary.main, fontWeight: '600' }
              ]}>
                {displayTitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.sidebarFooter, { borderTopColor: theme.border.light }]}>
        <Text style={[styles.footerText, { color: theme.text.secondary }]}>BetaMe v1.0.0</Text>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isAuthenticated = !!user;
  const { unreadCount } = useNotifications();
  const { totalUnreadCount } = useUnreadMessageCount();
  const segments = useSegments();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Combine notification and message unread counts for the badge
  const totalBadgeCount = unreadCount + totalUnreadCount;
  
  const screenWidth = Dimensions.get('window').width;
  
  // Calculate visible tabs based on authentication status
  const visibleTabs = navItems.filter(item => {
    if (item.requiresAuth && !isAuthenticated && item.name !== 'services') {
      return false;
    }
    return true;
  });
  
  // Calculate adaptive bottom margin for Android devices
  const getAdaptiveBottomMargin = () => {
    if (Platform.OS === 'android') {
      // Use safe area bottom inset + additional padding for Android
      const baseMargin = insets.bottom;
      const additionalPadding = 16; // Extra padding for Android
      return Math.max(baseMargin + additionalPadding, 25); // Minimum 25px
    }
    // For iOS, use the standard margin
    return 25;
  };
  
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
    <View style={[styles.desktopContainer, { backgroundColor: theme.background.primary }]}>
      <DesktopSidebar />
      <View style={[styles.mainContent, { backgroundColor: theme.background.primary }]}>
          <Tabs screenOptions={{ 
            headerShown: false,
            tabBarStyle: { display: 'none' }, // Hide the tab bar on desktop
            // Disable animations to prevent white flash
            animation: 'none' as const,
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
        tabBarActiveTintColor: '#007AFF', // Bright blue for selected
        tabBarInactiveTintColor: '#C7C7CC', // Light gray for unselected
        // Disable animations to prevent white flash
        animation: 'none' as const,
        tabBarStyle: {
          backgroundColor: theme.background.tertiary,
          borderTopWidth: 0,
          borderRadius: 25,
          marginHorizontal: 20,
          marginBottom: getAdaptiveBottomMargin(),
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
          position: 'absolute',
          shadowColor: theme.shadow.medium,
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
            backgroundColor: theme.background.tertiary,
            borderRadius: 25,
            overflow: 'hidden',
          }} />
        ),
        // Enhanced tab press feedback
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
              <NotificationBadge count={totalBadgeCount} />
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
  },
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    flexDirection: 'column',
    elevation: 4,
  },
  sidebarHeader: {
    padding: 24,
    borderBottomWidth: 1,
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
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
  mainContent: {
    flex: 1,
  },
});