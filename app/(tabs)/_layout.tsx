import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, Text } from 'react-native';
import { Chrome as Home, Users, FileText, Bell, User, Briefcase } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

export default function TabLayout() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { unreadCount } = useNotifications();

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
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size }) => (
            <Home size={size} color="white" />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ size }) => (
            <Briefcase size={size} color="white" />
          ),
          href: isAuthenticated ? '/services' : null,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ size }) => (
            <FileText size={size} color="white" />
          ),
          href: isAuthenticated ? '/orders' : null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ size }) => (
            <View style={{ position: 'relative' }}>
              <Bell size={size} color="white" />
              <NotificationBadge count={unreadCount} />
            </View>
          ),
          href: isAuthenticated ? '/notifications' : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size }) => (
            <User size={size} color="white" />
          ),
        }}
      />
    </Tabs>
  );
}