import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { referralService } from '@/lib/referral-service';
import { LinearGradient } from 'expo-linear-gradient';
import { audioSessionManager } from '@/lib/audio-session-manager';
import { supabase } from '@/lib/supabase';
import { useReferral } from '@/contexts/ReferralContext';

// Import BackgroundVideoPlayer for iOS with improved stability
const BackgroundVideoPlayer = Platform.OS === 'ios' 
  ? require('@/components/BackgroundVideoPlayer').BackgroundVideoPlayer 
  : null;

// Import Android Video Background Component
const AndroidVideoBackground = Platform.OS === 'android' 
  ? require('@/components/AndroidVideoBackground').AndroidVideoBackground 
  : null;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const { referralCode, clearReferralCode, hasReferralCode } = useReferral();

  const videos = [
    require('../../assets/images/sign_up_page_video.mp4'),
    require('../../assets/images/sign_up_page_video_2.mp4'),
    require('../../assets/images/sign_up_page_video_3.mp4'),
  ];

  // Configure audio session for silent video playback (only for iOS)
  useEffect(() => {
    if (Platform.OS === 'ios') {
      audioSessionManager.configureForSilentPlayback();
    }
  }, []);

  const handleVideoError = (error: any) => {
    console.log('Video error (non-critical):', error);
    // Don't take any action on video errors to prevent flashing
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email.trim(), password, rememberMe);
      
      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else {
        // Show success page before navigating to tabs
        router.replace('/auth/signin-success');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (isSignUp) {
      // Handle sign up
      if (!fullName.trim()) {
        Alert.alert('Error', 'Please enter your full name');
        return;
      }
      
      setLoading(true);
      try {
        const result = await signUp(email.trim(), password, fullName.trim());
        
        if (result.error) {
          Alert.alert('Error', result.error.message);
        } else if (result.user) {
          console.log('🔍 Login: User signed up:', result.user.id);
          
          // Handle referral code if provided from deep link
          if (referralCode && referralCode.trim()) {
            try {
              const referralSuccess = await referralService.handleReferralSignup(
                result.user.id, 
                referralCode.trim().toUpperCase()
              );
              
              // Clear the referral code after use
              clearReferralCode();
              
              if (referralSuccess) {
                Alert.alert(
                  'Account Created Successfully! 🎉',
                  'We\'ve sent a verification link to your email. Please check your inbox and click the verification link to activate your account.\n\n✅ Referral code applied! Your referrer has earned 15 BetaCoins.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Reset form
                        setEmail('');
                        setPassword('');
                        setFullName('');
                        setIsSignUp(false);
                      }
                    }
                  ]
                );
              } else {
                Alert.alert(
                  'Account Created Successfully! 🎉',
                  'We\'ve sent a verification link to your email. Please check your inbox and click the verification link to activate your account.\n\n⚠️ Referral code could not be applied. It may be invalid or already used.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Reset form
                        setEmail('');
                        setPassword('');
                        setFullName('');
                        setIsSignUp(false);
                      }
                    }
                  ]
                );
              }
            } catch (referralError) {
              console.error('Referral error:', referralError);
              Alert.alert(
                'Account Created Successfully! 🎉',
                'We\'ve sent a verification link to your email. Please check your inbox and click the verification link to activate your account.\n\n⚠️ Referral code could not be applied due to an error.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Reset form
                      setEmail('');
                      setPassword('');
                      setFullName('');
                      setIsSignUp(false);
                    }
                  }
                ]
              );
            }
          } else {
            // No referral code provided
            Alert.alert(
              'Account Created Successfully! 🎉',
              'We\'ve sent a verification link to your email. Please check your inbox and click the verification link to activate your account.\n\nIf you don\'t see the email, check your spam folder.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Reset form
                    setEmail('');
                    setPassword('');
                    setFullName('');
                    setReferralCode('');
                    setIsSignUp(false);
                  }
                }
              ]
            );
          }
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    } else {
      // Handle sign in using the existing handleSignIn function
      await handleSignIn();
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: 'betame://auth/verify-email',
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Verification Email Sent',
          'A new verification email has been sent to your inbox. Please check your email and click the verification link.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && AndroidVideoBackground && (
        <AndroidVideoBackground
          onVideoError={handleVideoError}
        />
      )}
      {Platform.OS === 'ios' && BackgroundVideoPlayer && (
        <BackgroundVideoPlayer
          videos={videos}
          onVideoError={handleVideoError}
        />
      )}
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Skip Button */}
          <View style={styles.skipContainer}>
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.topSection}>
              {/* Logo */}
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                <Image
                  source={require('../../assets/images/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              </View>

              {/* Title */}
              <View style={styles.titleContainer}>
                <Text style={styles.title}>
                  {isSignUp ? 'Create an account' : 'Welcome back'}
                </Text>
                <Text style={styles.subtitle}>
                  {isSignUp 
                    ? 'Enter your details to sign up'
                    : 'Enter your email or mobile to sign in'
                  }
                </Text>
              </View>
            </View>

            <View style={styles.formSection}>
              {/* Form */}
              <View style={styles.form}>
                {isSignUp && (
                  <TextInput
                   style={styles.input}
                   placeholder="Full Name"
                   placeholderTextColor="#9CA3AF"
                   value={fullName}
                   onChangeText={setFullName}
                   autoCapitalize="words"
                   textContentType="name"
                   returnKeyType="next"
                 />
                )}
                
                <TextInput
                   style={styles.input}
                   placeholder="email@domain.com"
                   placeholderTextColor="#9CA3AF"
                   value={email}
                   onChangeText={setEmail}
                   keyboardType="email-address"
                   autoCapitalize="none"
                   autoCorrect={false}
                   textContentType="emailAddress"
                   returnKeyType="next"
                 />
                
                <TextInput
                   style={styles.input}
                   placeholder="Password"
                   placeholderTextColor="#9CA3AF"
                   value={password}
                   onChangeText={setPassword}
                   secureTextEntry
                   textContentType={isSignUp ? "newPassword" : "password"}
                   returnKeyType={isSignUp ? "next" : "done"}
                   onSubmitEditing={isSignUp ? undefined : handleEmailAuth}
                 />

                {/* Referral Code Indicator - Show if referral code is captured from deep link */}
                {isSignUp && hasReferralCode && (
                  <View style={styles.referralIndicatorContainer}>
                    <Text style={styles.referralIndicatorText}>
                      🎉 Referral code applied! Your referrer will earn rewards when you sign up.
                    </Text>
                  </View>
                )}

                {/* Remember Me and Reset Password - Only show for sign in */}
                {!isSignUp && (
                  <View style={styles.rememberMeContainer}>
                    <View style={styles.rememberMeRow}>
                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => setRememberMe(!rememberMe)}
                      >
                        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                          {rememberMe && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </View>
                        <Text style={styles.rememberMeText}>Remember Me</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.resetPasswordButton}
                        onPress={() => router.push('/auth/reset-password')}
                      >
                        <Text style={styles.resetPasswordText}>Reset Password</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Email Verification Note for Sign Up */}
                {isSignUp && (
                  <View style={styles.verificationNoteContainer}>
                    <Text style={styles.verificationNoteText}>
                      📧 We'll send a verification link to your email
                    </Text>
                  </View>
                )}

                {/* Toggle Sign Up/Sign In */}
                 <View style={styles.toggleContainer}>
                   <Text style={styles.toggleText}>
                     {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                   </Text>
                   <TouchableOpacity onPress={() => {
                     setIsSignUp(!isSignUp);
                   }}>
                     <Text style={styles.toggleLink}>
                       {isSignUp ? ' Sign In' : ' Sign Up'}
                     </Text>
                   </TouchableOpacity>
                 </View>

                 <TouchableOpacity 
                   style={[styles.continueButton, loading && styles.disabledButton]} 
                   onPress={handleEmailAuth}
                   disabled={loading}
                 >
                   {loading ? (
                     <ActivityIndicator color="white" />
                   ) : (
                     <Text style={styles.continueButtonText}>
                       {isSignUp ? 'Sign Up' : 'Continue'}
                     </Text>
                   )}
                 </TouchableOpacity>

                 {isSignUp && (
                   <TouchableOpacity
                     style={styles.resendVerificationButton}
                     onPress={handleResendVerificationEmail}
                     disabled={loading}
                   >
                     <Text style={styles.resendVerificationText}>Resend Verification Email</Text>
                   </TouchableOpacity>
                 )}
              </View>

              {/* Terms */}
              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  By clicking continue, you agree to our
                </Text>
                <Text style={styles.termsText}>
                  <Text 
                    style={styles.termsLink} 
                    onPress={() => {
                      try {
                        console.log('Navigating to Terms of Service');
                        router.push('/terms-of-service');
                      } catch (error) {
                        console.error('Error navigating to Terms of Service:', error);
                        Alert.alert('Error', 'Unable to open Terms of Service');
                      }
                    }}
                  >
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text 
                    style={styles.termsLink} 
                    onPress={() => {
                      try {
                        console.log('Navigating to Privacy Policy');
                        router.push('/privacy-policy');
                      } catch (error) {
                        console.error('Error navigating to Privacy Policy:', error);
                        Alert.alert('Error', 'Unable to open Privacy Policy');
                      }
                    }}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.bottomSection}>
             </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  topSection: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 160,
    height: 160,
    borderRadius: 40,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  formSection: {
    marginTop: 16,
  },
  form: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  bottomSection: {
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  toggleText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  toggleLink: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  termsContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  termsLink: {
    color: '#007AFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  verificationNoteContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  verificationNoteText: {
    color: '#3B82F6',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  resendVerificationButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  resendVerificationText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  rememberMeContainer: {
    marginBottom: 16,
  },
  rememberMeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  resetPasswordButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resetPasswordText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  referralIndicatorContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  referralIndicatorText: {
    color: '#22C55E',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});