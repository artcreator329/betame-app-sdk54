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
import { ReferralProvider } from '@/contexts/ReferralContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, ActivityIndicator, Image, StyleSheet, Dimensions, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { configureLocalNotifications } from '@/lib/local-notifications';
import { useDeepLinking } from '@/hooks/useDeepLinking';
import { audioSessionManager } from '@/lib/audio-session-manager';
import * as SplashScreen from 'expo-splash-screen';
import { DARK_BACKGROUND } from '@/constants/NavigationStyles';

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
    <View style={[styles.splashContainer, { backgroundColor: '#0f1419' }]}>
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
        <Text style={[styles.splashSubtext, { color: '#94a3b8' }]}>
          Connecting People, Powering Possibilities
        </Text>
      </View>
      <ActivityIndicator 
        size="large" 
        color="#4db8d8" 
        style={styles.loadingIndicator}
      />
    </View>
  );
}

function ThemedSplashScreen() {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.splashContainer, { backgroundColor: theme.background.primary }]}>
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
        <Text style={[styles.splashSubtext, { color: theme.text.secondary }]}>
          Connecting People, Powering Possibilities
        </Text>
      </View>
      <ActivityIndicator 
        size="large" 
        color={theme.primary.main} 
        style={styles.loadingIndicator}
      />
    </View>
  );
}

function RootLayoutNav() {
  const { user, isAdmin, loading } = useAuth();
  const { theme, isLoading: themeLoading } = useTheme();
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
      'safety-security', 'payment-help', 'support', 'user-guide', 'order-help'
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
      'bank-upload', 'payment'
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

  if (loading || themeLoading) {
    return <ThemedSplashScreen />;
  }

  // Enhanced Stack screen options with smooth slow-in-slow-out animations
  const stackScreenOptions = {
    headerShown: false,
    // Enable smooth slide animation
    animation: 'slide_from_right' as const,
    // Enable gestures for smooth interaction
    gestureEnabled: true,
    // Force dark background at all times
    cardStyle: {
      backgroundColor: DARK_BACKGROUND,
    },
    // Custom style interpolator with slow-in-slow-out easing
    cardStyleInterpolator: ({ current, next, layouts }: any) => {
      // Slow-in-slow-out easing function (cubic-bezier equivalent)
      const easeInOut = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };

      const progress = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

      return {
        cardStyle: {
          backgroundColor: DARK_BACKGROUND,
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.width, 0],
                extrapolate: 'clamp',
                // Apply easing curve for smooth animation
                easing: (t: number) => easeInOut(t),
              }),
            },
            {
              scale: next
                ? next.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.95],
                    extrapolate: 'clamp',
                    easing: (t: number) => easeInOut(t),
                  })
                : 1,
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0, 0.8, 1],
            extrapolate: 'clamp',
            easing: (t: number) => easeInOut(t),
          }),
        },
        overlayStyle: {
          backgroundColor: DARK_BACKGROUND,
          opacity: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.3],
            extrapolate: 'clamp',
            easing: (t: number) => easeInOut(t),
          }),
        },
      };
    },
    // Smooth transition timing
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 350,
          easing: require('react-native').Easing.bezier(0.25, 0.46, 0.45, 0.94), // Slow-in-slow-out
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 300,
          easing: require('react-native').Easing.bezier(0.25, 0.46, 0.45, 0.94), // Slow-in-slow-out
        },
      },
    },
  };

  // Modal screens with smooth slide-up animation
  const modalScreenOptions = {
    headerShown: false,
    animation: 'slide_from_bottom' as const,
    presentation: 'modal' as const,
    gestureEnabled: true,
    gestureDirection: 'vertical' as const,
    cardStyle: {
      backgroundColor: DARK_BACKGROUND,
    },
    cardStyleInterpolator: ({ current, layouts }: any) => {
      const easeInOut = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };

      return {
        cardStyle: {
          backgroundColor: DARK_BACKGROUND,
          transform: [
            {
              translateY: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.height, 0],
                extrapolate: 'clamp',
                easing: (t: number) => easeInOut(t),
              }),
            },
            {
              scale: current.progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.9, 0.95, 1],
                extrapolate: 'clamp',
                easing: (t: number) => easeInOut(t),
              }),
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 0.2, 1],
            outputRange: [0, 0.7, 1],
            extrapolate: 'clamp',
            easing: (t: number) => easeInOut(t),
          }),
        },
        overlayStyle: {
          backgroundColor: DARK_BACKGROUND,
          opacity: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.5],
            extrapolate: 'clamp',
            easing: (t: number) => easeInOut(t),
          }),
        },
      };
    },
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 400,
          easing: require('react-native').Easing.bezier(0.25, 0.46, 0.45, 0.94),
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 350,
          easing: require('react-native').Easing.bezier(0.25, 0.46, 0.45, 0.94),
        },
      },
    },
  };

  // Tab transitions - no animations to prevent white flash
  const tabScreenOptions = {
    ...stackScreenOptions,
    animation: 'none' as const,
    gestureEnabled: false,
    cardStyleInterpolator: () => {
      return {
        cardStyle: {
          backgroundColor: DARK_BACKGROUND,
          opacity: 1,
        },
      };
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: DARK_BACKGROUND }}>
      <Stack screenOptions={stackScreenOptions}>
        {/* Tab screens with fade animation */}
        <Stack.Screen 
          name="(tabs)" 
          options={tabScreenOptions}
        />
        
        {/* Auth screens with slide animation */}
        <Stack.Screen 
          name="auth" 
          options={stackScreenOptions}
        />
        
        {/* Admin screens with slide animation */}
        <Stack.Screen 
          name="admin" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="admin-dashboard" 
          options={stackScreenOptions}
        />
        
        {/* Chat screens with slide animation */}
        <Stack.Screen 
          name="chat/[participantId]" 
          options={stackScreenOptions}
        />
        
        {/* Job-related screens with slide animation */}
        <Stack.Screen 
          name="job/[id]" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="job-acceptance/[jobId]" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="job-progress/[jobId]" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="job-completion/[jobId]" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="job-review/[jobId]" 
          options={stackScreenOptions}
        />
        
        {/* Service-related screens with slide animation */}
        <Stack.Screen 
          name="service/[id]" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="edit-service/[id]" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="detailed-service-listing" 
          options={stackScreenOptions}
        />
        
        {/* Profile screens with slide animation */}
        <Stack.Screen 
          name="profile/[userId]" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="user-profile/[userId]" 
          options={stackScreenOptions}
        />
        
        {/* Location and search screens with slide animation */}
        <Stack.Screen 
          name="check-in" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="nearby" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="search" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="trending" 
          options={stackScreenOptions}
        />
        
        {/* User action screens with slide animation */}
        <Stack.Screen 
          name="favorites" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="orders" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="messages" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="wallet" 
          options={stackScreenOptions}
        />
        
        {/* Creation screens with slide animation */}
        <Stack.Screen 
          name="create-service-listing" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="create-job-listing" 
          options={stackScreenOptions}
        />
        
        {/* Authentication and verification screens with slide animation */}
        <Stack.Screen 
          name="become-service-provider" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="bank-upload" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="ekyc-verification" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="malaysian-payment-gateway" 
          options={stackScreenOptions}
        />
        
        {/* Settings screens with slide animation */}
        <Stack.Screen 
          name="settings" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="edit-profile" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="notification-settings" 
          options={stackScreenOptions}
        />
        
        {/* Information pages with slide animation */}
        <Stack.Screen 
          name="about-us" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="contact-us" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="faq" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="legal" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="privacy-policy" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="terms-of-service" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="safety-security" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="payment-help" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="support" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="user-guide" 
          options={stackScreenOptions}
        />
        <Stack.Screen 
          name="order-help" 
          options={stackScreenOptions}
        />
        
        {/* Test and utility screens */}
        <Stack.Screen 
          name="test-map" 
          options={stackScreenOptions}
        />
        
        {/* Error screen */}
        <Stack.Screen 
          name="+not-found" 
          options={{ 
            title: 'Oops!',
            ...stackScreenOptions
          }} 
        />
      </Stack>
    </View>
  );
}

function ThemedStatusBar() {
  const { isDarkMode } = useTheme();
  return <StatusBar style={isDarkMode ? 'light' : 'dark'} />;
}

function ThemedRootContainer({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background.primary }}>
      {children}
    </View>
  );
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: DARK_BACKGROUND }}>
      <SafeAreaProvider style={{ backgroundColor: DARK_BACKGROUND }}>
        <AuthProvider>
          <ThemeProvider>
            <ReferralProvider>
              <View style={{ flex: 1, backgroundColor: DARK_BACKGROUND }}>
                <NotificationProvider>
                  <SupabaseChatProvider>
                    <ThemedStatusBar />
                    <RootLayoutNav />
                  </SupabaseChatProvider>
                </NotificationProvider>
              </View>
            </ReferralProvider>
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
