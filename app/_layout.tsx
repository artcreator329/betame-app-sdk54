// Import crypto polyfill first to ensure it's available before other modules
import '../metro-shims/crypto-polyfill';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';
    
    // Allow access to auth pages without authentication
    if (inAuthGroup) {
      return;
    }
    
    // For tabs group, allow homepage access without authentication
    if (inTabsGroup) {
      const currentTab = segments[1];
      const isHomePage = !currentTab; // Default tab (no specific tab segment) is homepage
      
      // Allow homepage access for everyone, require auth for other tabs
      if (!isHomePage && !user) {
        router.replace('/auth/login');
        return;
      }
      return;
    }
    
    // Allow access to specific pages without authentication
    const publicPages = ['trending', 'nearby'];
    const currentPage = segments[0];
    
    if (publicPages.includes(currentPage)) {
      return;
    }
    
    // If user is not authenticated and not in auth, tabs, or public pages, redirect to homepage
    if (!user) {
      router.replace('/(tabs)');
      return;
    }
    
    // For authenticated users, allow access to all pages
  }, [user, segments, loading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="service/[id]" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="chat/[participantId]" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="become-seller" />
      <Stack.Screen name="nearby" />
      <Stack.Screen name="create-job-listing" />
      <Stack.Screen name="create-service-listing" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="trending" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
