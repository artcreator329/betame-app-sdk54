import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { XCircle } from 'lucide-react-native';

export default function PaymentCancelScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const [message, setMessage] = useState('Payment was cancelled.');

  const transactionId = searchParams.transaction_id as string;

  useEffect(() => {
    handlePaymentCancellation();
  }, []);

  const handlePaymentCancellation = async () => {
    try {
      if (transactionId) {
        // Update transaction status to cancelled
        await supabase
          .from('payment_transactions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', transactionId);
      }

      // Redirect to wallet after 3 seconds
      setTimeout(() => {
        router.replace('/wallet');
      }, 3000);
    } catch (error) {
      console.error('Error handling payment cancellation:', error);
      // Still redirect even if there's an error
      setTimeout(() => {
        router.replace('/wallet');
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <XCircle size={64} color={Colors.status.error} />
        <Text style={styles.title}>Payment Cancelled</Text>
        <Text style={styles.message}>{message}</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.retryButton]} 
            onPress={() => router.replace('/wallet')}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.redirect}>Redirecting to wallet...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  redirect: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary.main,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
