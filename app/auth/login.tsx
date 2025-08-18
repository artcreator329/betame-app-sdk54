import React, { useState, useEffect, useRef } from 'react';
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
  Keyboard,
  Animated,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/lib/admin-service';
import { referralService } from '@/lib/referral-service';
import { ReferralInputModal } from '@/components/ReferralInputModal';
import { AdminSignInChoiceModal } from '@/components/AdminSignInChoiceModal';
import { adminPreferencesService } from '@/lib/admin-preferences-service';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const [showAdminChoice, setShowAdminChoice] = useState(false);
  const [adminUser, setAdminUser] = useState<{ id: string; email: string } | null>(null);
  const [adminFlowCompleted, setAdminFlowCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const adminModalRef = useRef<{ shouldShow: boolean; userData: { id: string; email: string } | null }>({ shouldShow: false, userData: null });
  const router = useRouter();
  const { signIn, signUp, checkAdminStatus, user, hasSignInError, clearSignInError } = useAuth();
  
  // Debug logging for error state changes
  useEffect(() => {
    console.log('🔄 Login: Error message changed:', errorMessage);
  }, [errorMessage]);
  const videoRef = useRef<Video>(null);

  // Add video error handling and rotation with fade effect
  const [videoError, setVideoError] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const videos = [
    require('../../assets/images/sign_up_page_video.mp4'),
    require('../../assets/images/sign_up_page_video_2.mp4'),
    require('../../assets/images/sign_up_page_video_3.mp4'),
  ];

  // Initialize with a random video index
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * videos.length);
    setCurrentVideoIndex(randomIndex);
  }, []);

  const handleVideoError = (error: any) => {
    console.log('Video error:', error);
    setVideoError(true);
    // Try to move to next video on error
    setTimeout(() => {
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
      setVideoError(false);
    }, 1000);
  };

  const handleVideoLoad = () => {
    setVideoError(false);
    // Fade in the new video
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const handleVideoEnd = () => {
    // Fade out current video
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      // Cycle to next video after fade out
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
    });
  };

  // Effect to handle admin flow after successful sign-in
  useEffect(() => {
    const handleAdminFlow = async () => {
      // Only proceed if we have a user, we're not in the middle of a sign-in attempt, there's no sign-in error, and no error message
      if (user && !adminFlowCompleted && !isSigningIn && !hasSignInError && !errorMessage) {
        // Double-check that we actually have a valid session
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            return;
          }
          
          const isAdmin = await adminService.isAdmin(user.id);
          
          if (isAdmin) {
            const shouldShowModal = await adminPreferencesService.shouldShowChoiceModal(user.id);
            
            if (shouldShowModal) {
              const adminUserData = { 
                id: user.id, 
                email: user.email || email.trim() 
              };
              
              adminModalRef.current = { shouldShow: true, userData: adminUserData };
              setAdminUser(adminUserData);
              setShowAdminChoice(true);
              setAdminFlowCompleted(true);
              setIsSigningIn(false); // Clear signing in flag
              clearSignInError(); // Clear error flag
            } else {
              // Auto-redirect based on saved preference
              const destination = await adminPreferencesService.getAutoRedirectDestination(user.id);
              await checkAdminStatus(user.id);
              
              if (destination === 'dashboard') {
                router.replace('/admin');
              } else {
                router.replace('/(tabs)');
              }
              setIsSigningIn(false); // Clear signing in flag
              clearSignInError(); // Clear error flag
            }
          } else {
            // Navigate to main app for non-admin users
            router.replace('/(tabs)');
            setIsSigningIn(false); // Clear signing in flag
            clearSignInError(); // Clear error flag
          }
        } catch (error) {
          // Silently handle session check errors
        }
      }
    };

    handleAdminFlow();
  }, [user, adminFlowCompleted, isSigningIn, hasSignInError, errorMessage]);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    setLoading(true);
    setErrorMessage(null); // Clear any previous errors
    setIsSigningIn(true); // Set signing in flag
    
    try {
      const result = await signIn(email.trim(), password);
      
      if (result.error) {
        console.log('🔄 Login: Sign in failed with error:', result.error.message);
        // Provide user-friendly error messages
        let errorMessage = 'An error occurred during sign in. Please try again.';
        
        if (result.error.message) {
          // Handle specific Supabase auth errors
          if (result.error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
          } else if (result.error.message.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and click the verification link to activate your account.';
          } else if (result.error.message.includes('Too many requests')) {
            errorMessage = 'Too many sign-in attempts. Please wait a few minutes before trying again.';
          } else if (result.error.message.includes('User not found')) {
            errorMessage = 'No account found with this email address. Please check your email or sign up.';
          } else {
            // Use the original error message for other cases
            errorMessage = result.error.message;
          }
        }
        
        console.log('🔄 Login: Setting error message:', errorMessage);
        setErrorMessage(errorMessage);
        setIsSigningIn(false); // Clear signing in flag on error
      } else if (result.user) {
        // Admin flow will be handled by useEffect when user state updates
        // Don't clear isSigningIn here - let the useEffect handle it
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An unexpected error occurred');
      setIsSigningIn(false); // Clear signing in flag on error
    } finally {
      setLoading(false);
    }
  };

  const handleAdminChoiceToDashboard = async (rememberChoice?: boolean) => {
    if (adminUser && rememberChoice) {
      await adminPreferencesService.saveSignInChoice(adminUser.id, 'dashboard', true);
    }
    
    // Set admin status in context now that user has made their choice
    await checkAdminStatus(adminUser?.id);
    
    adminModalRef.current = { shouldShow: false, userData: null };
    setShowAdminChoice(false);
    setAdminUser(null);
    setAdminFlowCompleted(false);
    setIsSigningIn(false); // Clear signing in flag
    clearSignInError(); // Clear error flag
    router.replace('/admin');
  };

  const handleAdminChoiceToApp = async (rememberChoice?: boolean) => {
    if (adminUser && rememberChoice) {
      await adminPreferencesService.saveSignInChoice(adminUser.id, 'app', true);
    }
    
    // Set admin status in context now that user has made their choice
    await checkAdminStatus(adminUser?.id);
    
    adminModalRef.current = { shouldShow: false, userData: null };
    setShowAdminChoice(false);
    setAdminUser(null);
    setAdminFlowCompleted(false);
    setIsSigningIn(false); // Clear signing in flag
    clearSignInError(); // Clear error flag
    router.replace('/(tabs)');
  };

  const handleReferralSuccess = () => {
    // Show success message and inform user to check email
    Alert.alert(
      'Account Created!',
      'Please check your email and click the verification link to complete your registration. The link will automatically redirect you back to the app.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setEmail('');
            setPassword('');
            setFullName('');
            setIsSignUp(false);
                            setNewUserId(null);
            setIsSigningIn(false); // Clear signing in flag
            clearSignInError(); // Clear error flag
          }
        }
      ]
    );
  };

  const handleReferralSkip = () => {
    setShowReferralModal(false);
    setIsSigningIn(false); // Clear signing in flag
    clearSignInError(); // Clear error flag
    handleReferralSuccess();
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
      setErrorMessage(null); // Clear any previous errors
      setIsSigningIn(true); // Set signing in flag for sign up too
      
      try {
        const result = await signUp(email.trim(), password, fullName.trim());
        
        if (result.error) {
          // Provide user-friendly error messages for sign up
          let errorMessage = 'An error occurred during sign up. Please try again.';
          
          if (result.error.message) {
            if (result.error.message.includes('User already registered')) {
              errorMessage = 'An account with this email already exists. Please sign in instead.';
            } else if (result.error.message.includes('Password should be at least')) {
              errorMessage = 'Password must be at least 6 characters long.';
            } else if (result.error.message.includes('Invalid email')) {
              errorMessage = 'Please enter a valid email address.';
            } else if (result.error.message.includes('Database error')) {
              errorMessage = 'Database error saving new user. Please try again or contact support if the issue persists.';
            } else {
              // Use the original error message for other cases
              errorMessage = result.error.message;
            }
          }
          
          setErrorMessage(errorMessage);
          setIsSigningIn(false); // Clear signing in flag on error
        } else if (result.user) {
          console.log('🔍 Login: User signed up:', result.user.id);
          
          // Store the new user ID and show referral modal
          setNewUserId(result.user.id);
          setShowReferralModal(true);
          // Don't clear isSigningIn here - let the referral flow handle it
        }
      } catch (error: any) {
        setErrorMessage(error.message || 'An unexpected error occurred');
        setIsSigningIn(false); // Clear signing in flag on error
      } finally {
        setLoading(false);
      }
    } else {
      // Handle sign in using the existing handleSignIn function
      await handleSignIn();
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address first');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'betame://auth/reset-password',
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        Alert.alert(
          'Reset Link Sent',
          'We\'ve sent a password reset link to your email. Please check your email and follow the instructions to reset your password.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      {/* Video Background */}
      <View style={styles.videoContainer}>
        {!videoError ? (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <Video
              ref={videoRef}
              source={videos[currentVideoIndex]}
              style={styles.video}
              resizeMode={ResizeMode.COVER}
              shouldPlay={true}
              isLooping={false}
              isMuted={true}
              onError={handleVideoError}
              onLoad={handleVideoLoad}
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded && status.didJustFinish) {
                  handleVideoEnd();
                }
              }}
              useNativeControls={false}
              posterStyle={{ resizeMode: 'cover' }}
              key={`video-${currentVideoIndex}`} // Force re-render when video changes
            />
          </Animated.View>
        ) : (
          <View style={styles.fallbackBackground} />
        )}
        {/* Overlay for better text readability */}
        <View style={styles.videoOverlay} />
      </View>
      
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
                   style={[
                     styles.input,
                     errorMessage && styles.inputError
                   ]}
                   placeholder="Full Name"
                   placeholderTextColor="#9CA3AF"
                   value={fullName}
                   onChangeText={(text) => {
                     setFullName(text);
                     setErrorMessage(null); // Clear error when user starts typing
                     clearSignInError(); // Clear error flag when user starts typing
                   }}
                   autoCapitalize="words"
                   textContentType="name"
                   returnKeyType="next"
                 />
                )}
                
                <TextInput
                   style={[
                     styles.input,
                     errorMessage && styles.inputError
                   ]}
                   placeholder="email@domain.com"
                   placeholderTextColor="#9CA3AF"
                   value={email}
                   onChangeText={(text) => {
                     setEmail(text);
                     setErrorMessage(null); // Clear error when user starts typing
                     clearSignInError(); // Clear error flag when user starts typing
                   }}
                   keyboardType="email-address"
                   autoCapitalize="none"
                   autoCorrect={false}
                   textContentType="emailAddress"
                   returnKeyType="next"
                 />
                
                <TextInput
                   style={[
                     styles.input,
                     errorMessage && styles.inputError
                   ]}
                   placeholder="Password"
                   placeholderTextColor="#9CA3AF"
                   value={password}
                   onChangeText={(text) => {
                     setPassword(text);
                     setErrorMessage(null); // Clear error when user starts typing
                     clearSignInError(); // Clear error flag when user starts typing
                   }}
                   secureTextEntry
                   textContentType={isSignUp ? "newPassword" : "password"}
                   returnKeyType="done"
                   onSubmitEditing={handleEmailAuth}
                 />

                {/* Toggle Sign Up/Sign In */}
                 {/* Error Message Display */}
                 {errorMessage && (
                   <View style={styles.errorContainer}>
                     <Text style={styles.errorText}>{errorMessage}</Text>
                   </View>
                 )}

                 <View style={styles.toggleContainer}>
                   <Text style={styles.toggleText}>
                     {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                   </Text>
                   <TouchableOpacity onPress={() => {
                     setIsSignUp(!isSignUp);
                     setErrorMessage(null); // Clear error when switching modes
                     setIsSigningIn(false); // Clear signing in flag when switching modes
                     clearSignInError(); // Clear error flag when switching modes
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

                 {!isSignUp && (
                   <TouchableOpacity
                     style={styles.forgotPasswordButton}
                     onPress={handleForgotPassword}
                     disabled={loading}
                   >
                     <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                   </TouchableOpacity>
                 )}
                 

              </View>

              {/* Terms */}
              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  By clicking continue, you agree to our
                </Text>
                <View style={styles.termsLinksContainer}>
                  <Text 
                    style={styles.termsLinkBold}
                    onPress={() => router.push('/terms-of-service')}
                  >
                    Terms of Service
                  </Text>
                  <Text style={styles.termsText}> and </Text>
                  <Text 
                    style={styles.termsLinkBold}
                    onPress={() => router.push('/privacy-policy')}
                  >
                    Privacy Policy
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.bottomSection}>
             </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Referral Input Modal */}
      {newUserId && (
        <ReferralInputModal
          visible={showReferralModal}
          onClose={handleReferralSkip}
          onSuccess={handleReferralSuccess}
          userId={newUserId}
        />
      )}

      {/* Admin Sign In Choice Modal */}
      {(showAdminChoice || adminModalRef.current.shouldShow) && (
        <AdminSignInChoiceModal
          visible={showAdminChoice || adminModalRef.current.shouldShow}
          onContinueToApp={handleAdminChoiceToApp}
          onGoToDashboard={handleAdminChoiceToDashboard}
          userEmail={adminUser?.email || adminModalRef.current.userData?.email}
        />
      )}
    </SafeAreaView>
  );
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fallbackBackground: {
    flex: 1,
    backgroundColor: '#1E3A8A',
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
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
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
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  inputError: {
    borderColor: 'rgba(255, 59, 48, 0.5)',
    borderWidth: 2,
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
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  toggleLink: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  termsContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  termsLink: {
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  termsLinkBold: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    letterSpacing: 0.5,
  },
  termsLinksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
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
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});