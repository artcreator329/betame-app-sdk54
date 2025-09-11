import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { adminService } from '@/lib/admin-service';
import { useNavigationAnimation } from '@/hooks/useNavigationAnimation';

// Import Android Video Background Component
const AndroidVideoBackground = Platform.OS === 'android' 
  ? require('@/components/AndroidVideoBackground').AndroidVideoBackground 
  : null;

export default function VerifyEmailScreen() {
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [manualNavigation, setManualNavigation] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const params = useLocalSearchParams();
  const { replaceWithAnimation } = useNavigationAnimation();

  // Debug: Log component render
  console.log('📧 VerifyEmailScreen: Component rendering...');

  const videos = [
    require('../../assets/images/sign_up_page_video.mp4'),
    require('../../assets/images/sign_up_page_video_2.mp4'),
    require('../../assets/images/sign_up_page_video_3.mp4'),
  ];

  const handleVideoEnd = () => {
    // Cycle to next video when current one ends
    setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
  };

  const handleGoToHomepage = async () => {
    console.log('🏠 User manually navigating to homepage');
    console.log('🏠 Current user state:', user?.id);
    console.log('🏠 Current auth loading:', authLoading);
    
    // Set flag to prevent automatic redirect
    setManualNavigation(true);
    
    try {
      // Check current session to ensure we have valid authentication
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🏠 Current session check:', !!session);
      
      if (!session) {
        console.log('🏠 No valid session found, redirecting to login');
        router.replace('/auth/login');
        return;
      }
      
      // For authenticated users, navigate to main app
      console.log('🏠 Valid session found, navigating to main app');
      router.replace('/(tabs)');
      
    } catch (error) {
      console.error('🏠 Navigation error:', error);
      // Fallback to login if there's an error
      router.replace('/auth/login');
    }
  };

  useEffect(() => {
    console.log('📧 VerifyEmailScreen: Component mounted with params:', params);
    console.log('📧 VerifyEmailScreen: Expo Router pathname:', window?.location?.pathname || 'N/A');
    console.log('📧 VerifyEmailScreen: Component successfully loaded!');
    
    // Add a small delay to ensure component is fully mounted
    setTimeout(() => {
      handleEmailVerification();
    }, 100);
  }, []);

  const handleEmailVerification = async () => {
    console.log('📧 VerifyEmailScreen: Starting email verification process');
    console.log('📧 All params received:', JSON.stringify(params, null, 2));
    
    try {
      // Check if this is coming from web verification
      const webVerification = params.web_verification as string;
      const verified = params.verified as string;
      const accessToken = params.access_token as string;
      const refreshToken = params.refresh_token as string;
      const expiresAt = params.expires_at as string;
      
      console.log('📧 Extracted params - webVerification:', webVerification, 'verified:', verified);
      
      if (webVerification === 'success' && verified === 'true') {
        // Email was already verified by web page, now handle auto-login
        console.log('📧 Web verification success detected - showing success screen');
        setVerificationStatus('success');
        setLoading(false);
        
        // Auto-login if session data is available
        if (accessToken && refreshToken) {
          try {
            console.log('🔐 Auto-login: Setting session from web verification');
            console.log('🔐 Access token available:', !!accessToken);
            console.log('🔐 Refresh token available:', !!refreshToken);
            
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (sessionError) {
              console.error('❌ Auto-login failed:', sessionError);
              // Still show success but user will need to login manually
            } else {
              console.log('✅ Auto-login successful - user should be signed in');
              // Check if user is now authenticated
              const { data: { user } } = await supabase.auth.getUser();
              console.log('🔐 Current user after auto-login:', user?.id);
            }
          } catch (error) {
            console.error('❌ Auto-login error:', error);
          }
        } else {
          console.log('⚠️ No session tokens available for auto-login');
        }
        
        // Auto-redirect after 3 seconds to main app (only if user hasn't manually navigated)
        console.log('📧 Will redirect to main app in 3 seconds');
        setTimeout(() => {
          if (!manualNavigation) {
            console.log('📧 Auto-redirecting to main app now');
            router.replace('/(tabs)');
          } else {
            console.log('📧 Skipping auto-redirect - user manually navigated');
          }
        }, 3000);
        return;
      }
      
      // Extract token_hash from URL parameters (sent from email template)
      const tokenHash = (params.token_hash || params.token) as string;
      const type = params.type as string;

      if (!tokenHash) {
        console.error('No token_hash found in URL parameters');
        setVerificationStatus('error');
        setLoading(false);
        return;
      }

      // Support multiple verification types
      const validTypes = ['signup', 'magiclink', 'recovery'];
      if (!validTypes.includes(type)) {
        console.error('Invalid verification type:', type);
        setVerificationStatus('error');
        setLoading(false);
        return;
      }

      // Verify the email token using token_hash
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'signup' | 'magiclink' | 'recovery'
      });

      if (error) {
        console.error('Email verification error:', error);
        setVerificationStatus('error');
        const errorMessage = type === 'recovery' 
          ? 'Unable to verify password reset link. Please try again.'
          : 'Unable to verify your email. Please try signing up again.';
        Alert.alert('Verification Failed', errorMessage);
      } else if (data.user) {
        console.log(`Email verified successfully (${type}):`, data.user.id);
        setVerificationStatus('success');
        
        // Handle different verification types
        if (type === 'recovery') {
          // For password recovery, redirect to reset password screen
          setTimeout(() => {
            if (!manualNavigation) {
              router.replace('/auth/reset-password');
            }
          }, 2000);
        } else {
          // For signup and magiclink, check if user is admin and navigate accordingly
          const isAdmin = await adminService.isAdmin(data.user.id);
          
          setTimeout(() => {
            if (!manualNavigation) {
              if (isAdmin) {
                router.replace('/admin');
              } else {
                router.replace('/auth/signin-success');
              }
            }
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Unexpected verification error:', error);
      setVerificationStatus('error');
      Alert.alert('Verification Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    const type = params.type as string;
    
    switch (verificationStatus) {
      case 'verifying':
        const verifyingTitle = type === 'recovery' ? 'Verifying reset link...' : 'Verifying your email...';
        const verifyingSubtitle = type === 'recovery' 
          ? 'Please wait while we verify your password reset request'
          : 'Please wait while we confirm your account';
        return (
          <>
            <ActivityIndicator size="large" color="#FFFFFF" style={styles.spinner} />
            <Text style={styles.title}>{verifyingTitle}</Text>
            <Text style={styles.subtitle}>{verifyingSubtitle}</Text>
          </>
        );
      case 'success':
        return (
          <>
            <View style={styles.successIcon}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
            <Text style={styles.title}>Email Verified!</Text>
            <Text style={styles.subtitle}>Your account has been successfully verified. Redirecting you to the app...</Text>
            <TouchableOpacity 
              style={styles.homepageButton} 
              onPress={async () => {
                console.log('🏠 Button pressed!');
                await handleGoToHomepage();
              }}
              activeOpacity={0.8}
              disabled={false}
            >
              <Text style={styles.homepageButtonText}>Go to Homepage</Text>
            </TouchableOpacity>
          </>
        );
      case 'error':
        return (
          <>
            <View style={styles.errorIcon}>
              <Text style={styles.errorMark}>✗</Text>
            </View>
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.subtitle}>Unable to verify your email. Please try signing up again or contact support.</Text>
          </>
        );
    }
  };

  // Safety wrapper for rendering
  const renderSafeContent = () => {
    try {
      return (
        <SafeAreaView style={styles.container}>
          {Platform.OS === 'android' && AndroidVideoBackground && (
            <AndroidVideoBackground
              onVideoError={(error: any) => console.log('Android video error:', error)}
            />
          )}
          {Platform.OS === 'ios' && (
            <View style={styles.videoContainer}>
              <Video
                source={videos[currentVideoIndex]}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping={false}
                isMuted
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded && status.didJustFinish) {
                    handleVideoEnd();
                  }
                }}
              />
              {/* Overlay for better text readability */}
              <View style={styles.videoOverlay} />
            </View>
          )}
          
          <View style={styles.content}>
            {renderContent()}
          </View>
        </SafeAreaView>
      );
    } catch (error) {
      console.error('❌ VerifyEmailScreen render error:', error);
      // Fallback minimal UI
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Email Verification</Text>
            <Text style={styles.subtitle}>Loading...</Text>
          </View>
        </SafeAreaView>
      );
    }
  };

  return renderSafeContent();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  spinner: {
    marginBottom: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 2,
    borderColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 2,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkmark: {
    fontSize: 40,
    color: '#22C55E',
    fontWeight: 'bold',
  },
  errorMark: {
    fontSize: 40,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  homepageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 16,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  homepageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});