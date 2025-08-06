import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View, Text, Dimensions } from 'react-native';
import { Chrome as Home, Users, FileText, Bell, User, Briefcase } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

export default function TabLayout() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { unreadCount } = useNotifications();
  
  const screenWidth = Dimensions.get('window').width;
  const tabWidth = (screenWidth - 40) / 5; // 5 tabs, 40 for margins
  const indicatorPosition = useSharedValue(0);
  
  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: indicatorPosition.value }],
    };
  });
  
  const moveIndicator = (index: number) => {
    indicatorPosition.value = withSpring(index * tabWidth, {
      damping: 15,
      stiffness: 150,
    });
  };

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
          href: isAuthenticated ? '/services' : null,
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