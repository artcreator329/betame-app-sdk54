import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VerifyEmailUniversal() {
  const { token_hash, type, next } = useLocalSearchParams<{
    token_hash: string;
    type: string;
    next?: string;
  }>();
  const router = useRouter();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    verifyEmail();
  }, []);

  const verifyEmail = async () => {
    if (!token_hash || !type) {
      setStatus('error');
      setMessage('Invalid verification link. Missing required parameters.');
      return;
    }

    try {
      // Use Supabase auth to verify the email token
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      });

      if (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(error.message || 'Email verification failed. Please try again or contact support.');
        return;
      }

      // Success!
      setStatus('success');
      setMessage('Your email has been successfully verified!');
      
      // Start countdown to redirect
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Redirect to app
            const deepLinkUrl = `betame://auth/verify-email?verified=true${next ? `&next=${encodeURIComponent(next)}` : ''}`;
            if (typeof window !== 'undefined') {
              window.location.href = deepLinkUrl;
              
              // Fallback if app doesn't open
              setTimeout(() => {
                if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                  router.replace('/(tabs)');
                }
              }, 1000);
            } else {
              router.replace('/(tabs)');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Unexpected error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred. Please try again later.');
    }
  };

  const handleOpenApp = () => {
    const deepLinkUrl = `betame://auth/verify-email?verified=true${next ? `&next=${encodeURIComponent(next)}` : ''}`;
    if (typeof window !== 'undefined') {
      window.location.href = deepLinkUrl;
      
      // Fallback if app doesn't open
      setTimeout(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          router.replace('/(tabs)');
        }
      }, 1000);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logo}>
          <Text style={styles.logoText}>B</Text>
        </View>
        
        {status === 'loading' && (
          <View style={styles.state}>
            <Text style={styles.title}>Verifying Email</Text>
            <Text style={styles.message}>Please wait while we verify your email address...</Text>
            <ActivityIndicator size="large" color="#3B82F6" style={styles.spinner} />
          </View>
        )}

        {status === 'success' && (
          <View style={styles.state}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.title}>Email Verified!</Text>
            <Text style={styles.message}>Your email has been successfully verified.</Text>
            <Text style={styles.message}>Redirecting to BetaMe app...</Text>
            <Text style={styles.countdown}>Redirecting in {countdown} seconds</Text>
            <Text style={styles.link} onPress={handleOpenApp}>
              Open BetaMe App
            </Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.state}>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.link} onPress={() => router.replace('/auth/login')}>
              Back to Login
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  state: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 30,
    lineHeight: 24,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 20,
  },
  successIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  countdown: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    textAlign: 'center',
  },
  link: {
    backgroundColor: '#3B82F6',
    color: 'white',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    fontWeight: '500',
    marginTop: 20,
    textAlign: 'center',
  },
});
