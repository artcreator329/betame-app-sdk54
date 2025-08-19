import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/auth-service';

export default function BecomeServiceProviderScreen() {
  const router = useRouter();
  const { user, userProfile, refreshProfile } = useAuth();
  const [isBecomingServiceProvider, setIsBecomingServiceProvider] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to become a service provider. Would you like to sign in now?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
    }
  }, [user, router]);

  // Function to register user as service provider
  const handleBecomeServiceProvider = async () => {
    if (!user) return;

    setIsBecomingServiceProvider(true);
    try {
      const { data, error } = await authService.becomeServiceProvider();
      
      if (error) {
        throw error;
      }

      // Refresh the user profile
      await refreshProfile();

      Alert.alert(
        'Success!',
        'You are now registered as a service provider. You can start creating service listings!',
        [
          { text: 'OK', onPress: () => router.push('/create-service-listing') }
        ]
      );
    } catch (error: any) {
      console.error('Error becoming service provider:', error);
      Alert.alert(
        'Error',
        'Failed to register as service provider. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsBecomingServiceProvider(false);
    }
  };

  // Don't render the main content if user is not authenticated
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Sign In Required</Text>
          <Text style={styles.subtitle}>Please sign in to become a service provider</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1D1D1F" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {userProfile?.is_service_provider ? (
          <>
            <Text style={styles.title}>You're a verified service provider!</Text>
            <Text style={styles.subtitle}>Start listing your services/jobs!</Text>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/create-service-listing')}
              >
                <Text style={styles.buttonText}>Create service listing</Text>
                <View style={styles.iconContainer}>
                  <Plus size={20} color="white" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/create-job-listing')}
              >
                <Text style={styles.buttonText}>Create job listing</Text>
                <View style={styles.iconContainer}>
                  <Plus size={20} color="white" />
                </View>
              </TouchableOpacity>
            </View>
          </>
        ) : userProfile?.verification_status === 'in_progress' ? (
          <>
            <Text style={styles.title}>Verification in Progress</Text>
            <Text style={styles.subtitle}>Your eKYC verification is currently being processed. We'll notify you once it's complete!</Text>
            
            <View style={styles.statusContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.statusText}>Processing your verification...</Text>
              <Text style={styles.statusSubtext}>This typically takes 1-3 business days</Text>
            </View>
          </>
        ) : userProfile?.verification_status === 'verified' ? (
          <>
            <Text style={styles.title}>Verification Complete!</Text>
            <Text style={styles.subtitle}>Your eKYC verification has been approved. Complete your service provider registration!</Text>
            
            <TouchableOpacity 
              style={[styles.becomeServiceProviderButton, isBecomingServiceProvider && styles.disabledButton]}
              onPress={handleBecomeServiceProvider}
              disabled={isBecomingServiceProvider}
            >
              {isBecomingServiceProvider ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.becomeServiceProviderButtonText}>Complete Registration</Text>
              )}
            </TouchableOpacity>
          </>
        ) : userProfile?.verification_status === 'rejected' ? (
          <>
            <Text style={styles.title}>Verification Rejected</Text>
            <Text style={styles.subtitle}>Unfortunately, your eKYC verification was not approved. Please try again with updated documents.</Text>
            
            <TouchableOpacity 
              style={styles.becomeServiceProviderButton}
              onPress={() => router.push('/ekyc-verification')}
            >
              <Text style={styles.becomeServiceProviderButtonText}>Retry Verification</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Become a Service Provider</Text>
            <Text style={styles.subtitle}>Start offering your services and earn money on our platform!</Text>
            
            <View style={styles.benefitsList}>
              <Text style={styles.benefitItem}>• Create unlimited service listings</Text>
              <Text style={styles.benefitItem}>• Set your own prices and terms</Text>
              <Text style={styles.benefitItem}>• Build your reputation with reviews</Text>
              <Text style={styles.benefitItem}>• Earn money from your skills</Text>
            </View>

            <TouchableOpacity 
              style={[styles.becomeServiceProviderButton, isBecomingServiceProvider && styles.disabledButton]}
              onPress={() => router.push('/ekyc-verification')}
              disabled={isBecomingServiceProvider}
            >
              {isBecomingServiceProvider ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.becomeServiceProviderButtonText}>Start eKYC Verification</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 60,
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  actionButton: {
    backgroundColor: '#8E8E93',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  iconContainer: {
    backgroundColor: '#34C759',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitsList: {
    marginVertical: 30,
    paddingHorizontal: 20,
  },
  benefitItem: {
    fontSize: 16,
    color: '#1D1D1F',
    marginBottom: 12,
    lineHeight: 22,
  },
  becomeServiceProviderButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 56,
  },
  becomeServiceProviderButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1D1D1F',
    marginTop: 20,
    textAlign: 'center',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
});