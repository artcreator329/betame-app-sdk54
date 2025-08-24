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
    'AudioSession',
    'SessionAPIUtilities',
    'kMXSessionProperty_HasEchoCancelledInput',
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
import { View, Text, ActivityIndicator, Image, StyleSheet, Dimensions, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { configureLocalNotifications } from '@/lib/local-notifications';
import { useDeepLinking } from '@/hooks/useDeepLinking';
import { audioSessionManager } from '@/lib/audio-session-manager';
import * as SplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function CustomSplashScreen() {
  useEffect(() => {
    const hideSplash = async () => {
      try {
        // Hide the native splash screen immediately
        await SplashScreen.hideAsync();
      } catch (error) {
        console.warn('Error hiding splash screen:', error);
      }
    };

    hideSplash();
  }, []);

  return (
    <View style={styles.splashContainer}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/icon_splashscreen.png')}
          style={styles.splashImage}
          resizeMode="contain"
        />
        <Image 
          source={require('../assets/images/text-logo.png')}
          style={styles.splashTextLogo}
          resizeMode="contain"
        />
        <Text style={styles.splashSubtext}>Connecting People & Services</Text>
      </View>
      <ActivityIndicator 
        size="large" 
        color="#007AFF" 
        style={styles.loadingIndicator}
      />
    </View>
  );
}

function RootLayoutNav() {
  const { user, isAdmin, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  
  // Initialize deep linking
  useDeepLinking();

  // Check if this is admin-only deployment (only for admin dashboard deployment)
  const isAdminOnly = process.env.EXPO_PUBLIC_ADMIN_ONLY === 'true';

  // Configure audio session globally to prevent AudioSession logs
  useEffect(() => {
    audioSessionManager.configureForSilentPlayback();
  }, []);

  // Mark component as mounted after initial render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  console.log('🔄 RootLayoutNav: Rendering with user:', !!user, 'isAdmin:', isAdmin, 'loading:', loading, 'segments:', segments);

  useEffect(() => {
    console.log('🔄 RootLayoutNav: useEffect triggered with loading:', loading);
    
    // Don't navigate until component is mounted
    if (!isMounted) {
      console.log('⏳ RootLayoutNav: Component not mounted yet, skipping navigation');
      return;
    }

    // If this is admin-only deployment, redirect to admin dashboard
    // (This only applies to the admin dashboard deployment, not the main app)
    if (isAdminOnly) {
      console.log('🔍 Layout: Admin-only deployment, redirecting to admin dashboard');
      router.replace('/admin-dashboard');
      return;
    }
    
    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';
    const inAdminGroup = segments[0] === 'admin';
    
    console.log('🔍 Layout: Current segments:', segments);
    console.log('🔍 Layout: User:', !!user, 'isAdmin:', isAdmin, 'loading:', loading);
    console.log('🔍 Layout: Groups - auth:', inAuthGroup, 'tabs:', inTabsGroup, 'admin:', inAdminGroup);
    
    // Allow access to auth pages without authentication
    if (inAuthGroup) {
      console.log('🔍 Layout: In auth group, allowing access');
      return;
    }
    
    // Allow access to pages with verification tokens for deep linking
    const hasVerificationToken = segments.some(segment => 
      segment.includes('token=') || 
      segment.includes('type=') || 
      segment.includes('email=')
    );
    
    if (hasVerificationToken) {
      console.log('🔍 Layout: Has verification token, allowing access');
      return;
    }
    
    // If still loading, don't navigate - wait for loading to complete
    if (loading) {
      console.log('⏳ RootLayoutNav: Still loading, waiting for authentication to complete');
      return;
    }
    
    // Public pages that don't require authentication
    const publicPages = [
      'about-us', 'contact-us', 'faq', 'legal', 'privacy-policy', 'terms-of-service',
      'safety-security', 'payment-help', 'support', 'user-guide'
    ];
    
    const currentPage = segments[0];
    
    // Allow non-authenticated users to access the homepage (tabs group)
    if (!user && inTabsGroup) {
      console.log('🔍 Layout: Non-authenticated user accessing homepage, allowing access');
      return;
    }
    
    // Temporarily allow all access for debugging
    console.log('🔍 Layout: Allowing access to all pages for debugging');
    
    // Check if user is admin and trying to access admin pages
    if (inAdminGroup && !isAdmin) {
      console.log('🔍 Layout: Non-admin trying to access admin pages, redirecting to home');
      router.replace('/');
      return;
    }
    

    
    // Pages that require authentication (user-specific actions)
    const authenticatedPages = [
      'settings', 'edit-profile', 'notification-settings', 'wallet', 'messages',
      'favorites', 'orders', 'create-service-listing', 'create-job-listing',
      'become-service-provider', 'ekyc-verification', 'malaysian-payment-gateway',
      'edit-service', 'job-acceptance', 'job-progress', 'job-completion', 'job-review',
      'bank-upload'
    ];
    
    // Pages that require authentication for actions but allow viewing
    const viewOnlyPages = [
      'search', 'trending', 'nearby', 'check-in', 'detailed-service-listing',
      'service', 'profile', 'user-profile', 'chat', 'job', 'test-map'
    ];
    
    // Allow access to public pages without authentication
    if (publicPages.includes(currentPage)) {
      console.log('🔍 Layout: Accessing public page, allowing access');
      return;
    }
    
    // Check authentication for authenticated pages (require login)
    if (authenticatedPages.includes(currentPage)) {
      if (!user) {
        console.log('🔍 Layout: Unauthenticated user trying to access authenticated page, redirecting to login');
        router.replace('/auth/login');
        return;
      }
      console.log('🔍 Layout: Accessing authenticated page, allowing access');
      return;
    }
    
    // Allow viewing of service-related pages without authentication
    if (viewOnlyPages.includes(currentPage)) {
      console.log('🔍 Layout: Accessing view-only page, allowing access for browsing');
      return;
    }
    
    // Allow admin users to access admin pages
    const onAdminPage = segments[0] === 'admin' || segments[0] === 'admin-dashboard';
    
    // Default navigation for authenticated users - only redirect if not in any allowed group
    if (user && !inTabsGroup && !inAdminGroup && !inAuthGroup && !onAdminPage) {
      console.log('🔍 Layout: Authenticated user on unknown page, redirecting to home');
      router.replace('/');
    }
    
    // Temporarily allow all access for debugging
    console.log('🔍 Layout: Allowing access to all pages for debugging');
  }, [user, isAdmin, loading, segments, isMounted]);

  if (loading) {
    return <CustomSplashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[participantId]" options={{ headerShown: false }} />
      <Stack.Screen name="job/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="service/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="profile/[userId]" options={{ headerShown: false }} />
      <Stack.Screen name="user-profile/[userId]" options={{ headerShown: false }} />
      <Stack.Screen name="edit-service/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="job-acceptance/[jobId]" options={{ headerShown: false }} />
      <Stack.Screen name="job-progress/[jobId]" options={{ headerShown: false }} />
      <Stack.Screen name="job-completion/[jobId]" options={{ headerShown: false }} />
      <Stack.Screen name="job-review/[jobId]" options={{ headerShown: false }} />
      <Stack.Screen name="check-in" options={{ headerShown: false }} />
      <Stack.Screen name="nearby" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="trending" options={{ headerShown: false }} />
      <Stack.Screen name="favorites" options={{ headerShown: false }} />
      <Stack.Screen name="orders" options={{ headerShown: false }} />
      <Stack.Screen name="messages" options={{ headerShown: false }} />
      <Stack.Screen name="wallet" options={{ headerShown: false }} />
      <Stack.Screen name="create-service-listing" options={{ headerShown: false }} />
      <Stack.Screen name="create-job-listing" options={{ headerShown: false }} />
      <Stack.Screen name="detailed-service-listing" options={{ headerShown: false }} />
      <Stack.Screen name="become-service-provider" options={{ headerShown: false }} />
      <Stack.Screen name="bank-upload" options={{ headerShown: false }} />
      <Stack.Screen name="ekyc-verification" options={{ headerShown: false }} />
      <Stack.Screen name="malaysian-payment-gateway" options={{ headerShown: false }} />
      <Stack.Screen name="about-us" options={{ headerShown: false }} />
      <Stack.Screen name="contact-us" options={{ headerShown: false }} />
      <Stack.Screen name="faq" options={{ headerShown: false }} />
      <Stack.Screen name="legal" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
      <Stack.Screen name="safety-security" options={{ headerShown: false }} />
      <Stack.Screen name="payment-help" options={{ headerShown: false }} />
      <Stack.Screen name="support" options={{ headerShown: false }} />
      <Stack.Screen name="user-guide" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
      <Stack.Screen name="test-map" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
    </Stack>
  );
}

function ThemedStatusBar() {
  const { isDarkMode } = useTheme();
  return <StatusBar style={isDarkMode ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  useFrameworkReady();
  const [appIsReady, setAppIsReady] = useState(false);

  console.log('🔄 App: Rendering RootLayout...');

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const success = await configureLocalNotifications();
        if (success) {
          console.log('✅ Notifications configured successfully');
        } else {
          console.log('⚠️ Notifications configuration failed');
        }
      } catch (error) {
        console.error('❌ Error setting up notifications:', error);
      }
    };
    
    const prepareApp = async () => {
      try {
        // Setup notifications
        await setupNotifications();
        
        // Remove artificial delay to prevent flashing
        setAppIsReady(true);
      } catch (error) {
        console.error('❌ Error preparing app:', error);
        setAppIsReady(true);
      }
    };
    
    prepareApp();
  }, []);

  if (!appIsReady) {
    return <CustomSplashScreen />;
  }

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

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  splashImage: {
    width: width * 0.5,
    height: height * 0.15,
    marginBottom: 30,
  },
  splashTextLogo: {
    height: 42,
    width: 180,
    marginBottom: 8,
  },
  splashSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    fontWeight: '400',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingIndicator: {
    marginTop: 20,
  },
});
