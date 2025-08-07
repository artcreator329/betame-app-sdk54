import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Handle auth callback and redirect
    const handleCallback = async () => {
      try {
        // Wait a moment for auth state to settle
        setTimeout(() => {
          if (user) {
            // User is authenticated, redirect to main app
            router.replace('/(tabs)');
          } else {
            // No user, redirect to login
            router.replace('/auth/login');
          }
        }, 1000);
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/auth/login');
      }
    };

    if (!loading) {
      handleCallback();
    }
  }, [user, loading, router]);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#ffffff'
    }}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
        Completing sign in...
      </Text>
    </View>
  );
}