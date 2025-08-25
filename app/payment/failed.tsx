import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { XCircle, RefreshCw } from 'lucide-react-native';

export default function PaymentFailedScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const [message, setMessage] = useState('Payment failed. Please try again.');

  const transactionId = searchParams.transaction_id as string;
  const errorMessage = searchParams.error_message as string;

  useEffect(() => {
    handlePaymentFailure();
  }, []);

  const handlePaymentFailure = async () => {
    try {
      if (transactionId) {
        // Update transaction status to failed
        await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            error_message: errorMessage || 'Payment failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', transactionId);
      }

      // Set custom message if provided
      if (errorMessage) {
        setMessage(errorMessage);
      }
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  };

  const handleRetry = () => {
    // Navigate back to wallet to try again
    router.replace('/wallet');
  };

  const handleGoToWallet = () => {
    router.replace('/wallet');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <XCircle size={64} color={Colors.status.error} />
        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.message}>{message}</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.retryButton]} 
            onPress={handleRetry}
          >
            <RefreshCw size={20} color="white" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.walletButton]} 
            onPress={handleGoToWallet}
          >
            <Text style={styles.walletButtonText}>Go to Wallet</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 30,
    color: '#666',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  retryButton: {
    backgroundColor: Colors.primary.main,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  walletButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border.main,
  },
  walletButtonText: {
    color: Colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
