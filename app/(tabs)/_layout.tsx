import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View, Text, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, Users, FileText, Bell, User, Briefcase } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
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
          <Text style={styles.logoText}>BETAME</Text>
        </View>
      </View>

      <View style={styles.navContainer}>
        {navItems.map((item) => {
          // Skip auth-required items if user is not authenticated (except services for browsing)
          if (item.requiresAuth && !isAuthenticated && item.name !== 'services') return null;
          
          const isActive = currentRoute === item.name;
          const IconComponent = item.icon;
          
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.navItemContent}>
                <IconComponent 
                  size={20} 
                  color={isActive ? '#007AFF' : '#666'} 
                />
                {item.name === 'notifications' && <NotificationBadge count={unreadCount} />}
              </View>
              <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sidebarFooter}>
        <Text style={styles.footerText}>BetaMe v1.0</Text>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { unreadCount } = useNotifications();
  const segments = useSegments();
  
  const screenWidth = Dimensions.get('window').width;
  
  // Calculate visible tabs based on authentication status
  const visibleTabs = navItems.filter(item => {
    if (item.requiresAuth && !isAuthenticated && item.name !== 'services') {
      return false;
    }
    return true;
  });
  
  const visibleTabCount = visibleTabs.length;
  const tabWidth = isDesktop ? (screenWidth - 200) / visibleTabCount : (screenWidth - 40) / visibleTabCount;
  const indicatorPosition = useSharedValue(0);
  
  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: indicatorPosition.value }],
    };
  });
  
  const moveIndicator = (index: number) => {
    // Map the actual tab index to the visible tab index
    const visibleIndex = visibleTabs.findIndex(tab => tab.name === navItems[index].name);
    if (visibleIndex !== -1) {
      indicatorPosition.value = withSpring(visibleIndex * tabWidth, {
        damping: 15,
        stiffness: 150,
      });
    }
  };

  // Set initial indicator position based on current route
  useEffect(() => {
    const currentRoute = segments[segments.length - 1] || 'index';
    const currentIndex = navItems.findIndex(item => item.name === currentRoute);
    if (currentIndex !== -1) {
      moveIndicator(currentIndex);
    }
  }, [isAuthenticated, visibleTabCount, segments]);

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
            <Tabs.Screen name="profile" />
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
          }}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 4,
                  left: 8,
                  width: tabWidth - 16,
                  height: 4,
                  backgroundColor: '#007AFF',
                  borderRadius: 2,
                },
                animatedIndicatorStyle,
              ]}
            />
          </View>
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
        listeners={{
          focus: () => moveIndicator(0),
        }}
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
        listeners={{
          focus: () => moveIndicator(1),
        }}
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
        listeners={{
          focus: () => moveIndicator(2),
        }}
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
        listeners={{
          focus: () => moveIndicator(3),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
        listeners={{
          focus: () => moveIndicator(4),
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
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 1,
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