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
import { supabase } from '@/lib/supabase';

export default function BecomeSellerScreen() {
  const router = useRouter();
  const { user, userProfile, refreshProfile } = useAuth();
  const [isBecomingSeller, setIsBecomingSeller] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to become a seller. Would you like to sign in now?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
    }
  }, [user, router]);

  // Function to register user as seller
  const handleBecomeSeller = async () => {
    if (!user) return;

    setIsBecomingSeller(true);
    try {
      // Check if user_profiles record exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ is_seller: true })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile record with only seller-specific data
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            is_seller: true,
          });

        if (insertError) throw insertError;
      }

      // Refresh the user profile
      await refreshProfile();

      Alert.alert(
        'Success!',
        'You are now registered as a seller. You can start creating service listings!',
        [
          { text: 'OK', onPress: () => router.push('/create-service-listing') }
        ]
      );
    } catch (error: any) {
      console.error('Error becoming seller:', error);
      Alert.alert(
        'Error',
        'Failed to register as seller. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsBecomingSeller(false);
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
          <Text style={styles.subtitle}>Please sign in to become a seller</Text>
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
        {userProfile?.is_seller ? (
          <>
            <Text style={styles.title}>You're a verified seller!</Text>
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
        ) : (
          <>
            <Text style={styles.title}>Become a Seller</Text>
            <Text style={styles.subtitle}>Start offering your services and earn money on our platform!</Text>
            
            <View style={styles.benefitsList}>
              <Text style={styles.benefitItem}>• Create unlimited service listings</Text>
              <Text style={styles.benefitItem}>• Set your own prices and terms</Text>
              <Text style={styles.benefitItem}>• Build your reputation with reviews</Text>
              <Text style={styles.benefitItem}>• Earn money from your skills</Text>
            </View>

            <TouchableOpacity 
              style={[styles.becomeSellerButton, isBecomingSeller && styles.disabledButton]}
              onPress={handleBecomeSeller}
              disabled={isBecomingSeller}
            >
              {isBecomingSeller ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.becomeSellerButtonText}>Become a Seller</Text>
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
  becomeSellerButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 56,
  },
  becomeSellerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});