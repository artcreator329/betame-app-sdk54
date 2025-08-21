// Import crypto polyfill first to ensure it's available before other modules
import '../metro-shims/crypto-polyfill';
import { LogBox } from 'react-native';
import logger from '@/lib/logger';

// Disable debugger warnings in development
if (__DEV__) {
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
import { View, Text, ActivityIndicator, Image, StyleSheet, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { configureLocalNotifications } from '@/lib/local-notifications';
import { useDeepLinking } from '@/hooks/useDeepLinking';
import { audioSessionManager } from '@/lib/audio-session-manager';
import * as SplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function CustomSplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
        setTimeout(() => {
          setIsVisible(false);
        }, 100);
      } catch (error) {
        console.warn('Error hiding splash screen:', error);
      }
    };

    hideSplash();
  }, []);

  return (
    <View style={[styles.splashContainer, { opacity: isVisible ? 1 : 0 }]}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/icon_splashscreen.png')}
          style={styles.splashImage}
          resizeMode="contain"
        />
        <Text style={styles.splashText}>BetaMe Admin</Text>
        <Text style={styles.splashSubtext}>Management Console</Text>
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

  // Configure audio session globally to prevent AudioSession logs
  useEffect(() => {
    audioSessionManager.configureForSilentPlayback();
  }, []);

  // Mark component as mounted after initial render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    // Always redirect to admin dashboard for admin-only deployment
    console.log('🔍 Layout: Admin-only deployment, redirecting to admin dashboard');
    router.replace('/admin-dashboard');
  }, [isMounted]);

  if (loading) {
    return <CustomSplashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
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
        await setupNotifications();
        await new Promise(resolve => setTimeout(resolve, 2000));
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
  splashText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
    letterSpacing: 1,
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
