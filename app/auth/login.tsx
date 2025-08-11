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
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/lib/admin-service';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const videoRef = useRef<Video>(null);

  // Add video error handling and rotation
  const [videoError, setVideoError] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const videos = [
    require('../../assets/images/sign_up_page_video.mp4'),
    require('../../assets/images/sign_up_page_video_2.mp4'),
    require('../../assets/images/sign_up_page_video_3.mp4'),
  ];

  const handleVideoError = (error: any) => {
    console.log('Video error:', error);
    setVideoError(true);
  };

  const handleVideoLoad = () => {
    console.log('Video loaded successfully');
    setVideoError(false);
  };

  const handleVideoEnd = () => {
    // Cycle to next video when current one ends
    setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      
      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else if (result.user) {
        // Check if user is admin
        const isAdmin = await adminService.isAdmin(result.user.id);
        
        if (isAdmin) {
          // Navigate to admin dashboard
          router.replace('/admin');
        } else {
          // Navigate to main app
          router.replace('/(tabs)');
        }
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
                }
              }
            ]
          );
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



  return (
    <SafeAreaView style={styles.container}>
      {/* Video Background */}
      <View style={styles.videoContainer}>
        {!videoError ? (
          <Video
            ref={videoRef}
            source={videos[currentVideoIndex]}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping={false}
            isMuted
            onError={handleVideoError}
            onLoad={handleVideoLoad}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded && status.didJustFinish) {
                handleVideoEnd();
              }
            }}
            useNativeControls={false}
            posterStyle={{ resizeMode: 'cover' }}
          />
        ) : (
          <View style={styles.fallbackBackground} />
        )}
        {/* Overlay for better text readability */}
        <View style={styles.videoOverlay} />
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
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
               />
              
              <TextInput
                 style={styles.input}
                 placeholder="Password"
                 placeholderTextColor="#9CA3AF"
                 value={password}
                 onChangeText={setPassword}
                 secureTextEntry
                 textContentType={isSignUp ? "newPassword" : "password"}
               />

              {/* Toggle Sign Up/Sign In */}
               <View style={styles.toggleContainer}>
                 <Text style={styles.toggleText}>
                   {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                 </Text>
                 <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
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
            </View>



            {/* Terms */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By clicking continue, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>
          </View>

          <View style={styles.bottomSection}>
           </View>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  fallbackBackground: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
    paddingTop: 20,
    paddingBottom: 40,
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
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
    color: '#FFFFFF',
    fontWeight: '600',
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
});