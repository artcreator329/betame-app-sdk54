import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();

  const handleEmailAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isSignUp) {
        if (!fullName.trim()) {
          Alert.alert('Error', 'Please enter your full name');
          setLoading(false);
          return;
        }
        result = await signUp(email.trim(), password, fullName.trim());
      } else {
        result = await signIn(email.trim(), password);
      }

      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else {
        // Navigation will be handled by the auth state change
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        Alert.alert('Error', error.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithApple();
      if (error) {
        Alert.alert('Error', error.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {/* Social Login */}
            <View style={styles.socialContainer}>
              <TouchableOpacity 
                style={styles.socialButton} 
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.socialButton} 
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                <Text style={styles.socialButtonText}>Continue with Apple</Text>
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
    backgroundColor: '#FAFAFA',
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
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
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
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontWeight: '400',
  },
  formSection: {
    marginTop: 16,
  },
  form: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 8,
  },
  socialContainer: {
    marginBottom: 24,
  },
  socialButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
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
    color: '#6B7280',
  },
  toggleLink: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  termsContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 32,
  },
  termsLink: {
    color: '#007AFF',
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
    color: '#007AFF',
    fontWeight: '500',
  },
});