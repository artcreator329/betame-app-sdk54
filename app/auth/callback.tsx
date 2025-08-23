import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Example deep link: betame://auth/callback#access_token=...&refresh_token=...&type=recovery
        const url = await Linking.getInitialURL();
        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        let type: string | null = null;

        if (url) {
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
            type = hashParams.get('type');
          } else {
            const queryIndex = url.indexOf('?');
            if (queryIndex !== -1) {
              const queryParams = new URLSearchParams(url.substring(queryIndex + 1));
              accessToken = queryParams.get('access_token');
              refreshToken = queryParams.get('refresh_token');
              type = queryParams.get('type');
            }
          }
        }

        if (type === 'recovery' && accessToken) {
          // Set session so updateUser calls succeed
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken ?? ''
          });
          if (error) {
            console.error('❌ AuthCallback: setSession error:', error);
          }

          router.replace({
            pathname: '/auth/reset-password',
            params: { type: 'recovery', token: accessToken }
          });
          return;
        }

        // Fallback: proceed to app or login
        setTimeout(() => {
          if (user) router.replace('/auth/signin-success');
          else router.replace('/auth/login');
        }, 500);
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/auth/login');
      }
    };

    if (!loading) handleCallback();
  }, [user, loading, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Completing sign in...</Text>
    </View>
  );
}