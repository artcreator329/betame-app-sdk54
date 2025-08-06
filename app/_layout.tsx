// Import crypto polyfill first to ensure it's available before other modules
import '../metro-shims/crypto-polyfill';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SupabaseChatProvider } from '@/contexts/SupabaseChatContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';

function RootLayoutNav() {
  const { user, isAdmin, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';
    const inAdminGroup = segments[0] === 'admin';
    
    console.log('🔍 Layout: Current segments:', segments);
    console.log('🔍 Layout: User:', !!user, 'isAdmin:', isAdmin, 'loading:', loading);
    console.log('🔍 Layout: Groups - auth:', inAuthGroup, 'tabs:', inTabsGroup, 'admin:', inAdminGroup);
    
    // Allow access to auth pages without authentication
    // Also allow access when there are verification tokens in the URL
    if (inAuthGroup) {
      console.log('🔍 Layout: In auth group, allowing access');
      return;
    }
    
    // Allow access to pages with verification tokens for deep linking
    const hasVerificationToken = segments.some(segment => 
      segment?.includes('token=') || segment?.includes('code=') || segment?.includes('verification=')
    );
    if (hasVerificationToken) {
      console.log('🔍 Layout: Verification token detected, allowing access');
      return;
    }
    
    // If user is authenticated and is admin, redirect to admin dashboard
    if (user && isAdmin && !inAdminGroup) {
      console.log('🔍 Layout: Admin user not in admin group, redirecting to /admin');
      router.replace('/admin');
      return;
    }
    
    // If user is not admin but trying to access admin pages, redirect to homepage
    if (inAdminGroup && (!user || !isAdmin)) {
      router.replace('/(tabs)');
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
  }, [user, isAdmin, segments, loading]);

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 450,
        animationTypeForReplace: 'push',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}>
      <Stack.Screen 
        name="auth/login" 
        options={{ 
          animation: 'fade',
          animationDuration: 350,
        }}
      />
      <Stack.Screen 
        name="auth/verify-email" 
        options={{ 
          animation: 'fade',
          animationDuration: 350,
        }}
      />
      <Stack.Screen 
        name="auth/callback" 
        options={{ 
          animation: 'fade',
          animationDuration: 350,
        }}
      />
      <Stack.Screen 
        name="auth/reset-password" 
        options={{ 
          animation: 'fade',
          animationDuration: 350,
        }}
      />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="service/[id]" />
      <Stack.Screen name="user-profile/[userId]" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="chat/[participantId]" />
      <Stack.Screen 
        name="wallet" 
        options={{ 
          animation: 'slide_from_bottom',
          animationDuration: 500,
        }}
      />
      <Stack.Screen 
        name="settings" 
        options={{ 
          animation: 'slide_from_bottom',
          animationDuration: 500,
        }}
      />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen 
        name="become-seller" 
        options={{ 
          animation: 'slide_from_bottom',
          animationDuration: 500,
        }}
      />
      <Stack.Screen name="nearby" />
      <Stack.Screen 
        name="create-job-listing" 
        options={{ 
          animation: 'slide_from_bottom',
          animationDuration: 500,
        }}
      />
      <Stack.Screen 
        name="create-service-listing" 
        options={{ 
          animation: 'slide_from_bottom',
          animationDuration: 500,
        }}
      />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="trending" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function ThemedStatusBar() {
  const { isDarkMode } = useTheme();
  return <StatusBar style={isDarkMode ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <SupabaseChatProvider>
                <ThemedStatusBar />
                <RootLayoutNav />
              </SupabaseChatProvider>
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
