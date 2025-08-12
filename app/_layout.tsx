// Import crypto polyfill first to ensure it's available before other modules
import '../metro-shims/crypto-polyfill';
import { LogBox } from 'react-native';
import logger from '@/lib/logger';

// Disable debugger warnings in development
if (__DEV__) {
  // Disable React Native's yellow box warnings
  LogBox.ignoreLogs([
    'AsyncStorage has been extracted from react-native core',
    'ViewPropTypes will be removed from React Native',
    'ColorPropType will be removed from React Native',
    'requireNativeComponent',
    'Sending',
    'Warning:',
    'Deprecated',
    'Non-serializable values were found in the navigation state',
    'VirtualizedLists should never be nested',
    'Animated: `useNativeDriver` was not specified',
    'componentWillReceiveProps has been renamed',
    'componentWillMount has been renamed',
    'componentWillUpdate has been renamed',
  ]);
  
  // Optionally disable all warnings (uncomment if you want to suppress all)
  // LogBox.ignoreAllLogs();
  
  // Disable the debugger banner completely
  LogBox.ignoreAllLogs();
}

import { Stack, useRouter, useSegments } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SupabaseChatProvider } from '@/contexts/SupabaseChatContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { configureLocalNotifications } from '@/lib/local-notifications';
import { useDeepLinking } from '@/hooks/useDeepLinking';

function LoadingScreen() {
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#ffffff'
    }}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
        Loading...
      </Text>
    </View>
  );
}

function RootLayoutNav() {
  const { user, isAdmin, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // Initialize deep linking
  useDeepLinking();

  console.log('🔄 RootLayoutNav: Rendering with user:', !!user, 'isAdmin:', isAdmin, 'loading:', loading, 'segments:', segments);

  useEffect(() => {
    console.log('🔄 RootLayoutNav: useEffect triggered with loading:', loading);
    if (loading) {
      console.log('⏳ RootLayoutNav: Still loading, returning early');
      return;
    }

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
        console.log('🔍 Layout: Non-homepage tab without auth, redirecting to login');
        router.replace('/auth/login');
        return;
      }
      console.log('🔍 Layout: In tabs group, allowing access');
      return;
    }
    
    // Allow access to specific pages without authentication
    const publicPages = ['trending', 'nearby', 'user-profile', 'profile', 'service'];
    const currentPage = segments[0];
    
    if (publicPages.includes(currentPage)) {
      console.log('🔍 Layout: Public page, allowing access');
      return;
    }
    
    // If user is not authenticated and not in auth, tabs, or public pages, redirect to homepage
    if (!user) {
      console.log('🔍 Layout: No user and not in allowed pages, redirecting to tabs');
      router.replace('/(tabs)');
      return;
    }
    
    // For authenticated users, allow access to all pages
    console.log('🔍 Layout: Authenticated user, allowing access to all pages');
  }, [user, isAdmin, segments, loading]);

  console.log('🔄 RootLayoutNav: About to render Stack with segments:', segments);

  // Show loading screen while auth is loading
  if (loading) {
    console.log('⏳ RootLayoutNav: Showing loading screen');
    return <LoadingScreen />;
  }

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
      <Stack.Screen name="profile/[userId]" />
      <Stack.Screen name="search" />
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

  console.log('🔄 App: Rendering RootLayout...');

  useEffect(() => {
    configureLocalNotifications();
  }, []);

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
