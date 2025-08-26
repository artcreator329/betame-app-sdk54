import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { WalletService } from '@/lib/wallet-service';
import { Colors } from '@/constants/Colors';
import { CheckCircle, XCircle } from 'lucide-react-native';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing payment...');
  const [transaction, setTransaction] = useState<any>(null);

  const transactionId = searchParams.transaction_id as string;
  const paymentId = searchParams.razorpay_payment_id as string;
  const paymentStatus = searchParams.razorpay_payment_link_status as string;

  useEffect(() => {
    handlePaymentCallback();
  }, []);

  const handlePaymentCallback = async () => {
    try {
      console.log('Payment callback received:', {
        transactionId,
        paymentId,
        paymentStatus,
      });

      if (!transactionId) {
        setStatus('error');
        setMessage('Invalid transaction ID');
        return;
      }

      // Check if payment was successful or failed
      if (paymentStatus === 'paid') {
        // For successful payments, we'll verify the transaction status
        // Failed payments will be handled by webhooks or by checking transaction status
        // Verify the transaction in our database
        const { data: transaction, error } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('id', transactionId)
          .single();

        if (error || !transaction) {
          console.error('Transaction not found:', error);
          setStatus('error');
          setMessage('Transaction not found');
          return;
        }

        // Store transaction in state for display
        setTransaction(transaction);

        // Check transaction status and handle accordingly
        if (transaction.status === 'failed') {
          setStatus('error');
          setMessage(transaction.error_message || 'Payment failed');
          
          // Redirect to failed page after 2 seconds
          setTimeout(() => {
            router.replace({
              pathname: '/payment/failed',
              params: {
                transaction_id: transactionId,
                error_message: transaction.error_message || 'Payment failed'
              }
            });
          }, 2000);
          return;
        }

        if (transaction.status === 'cancelled') {
          setStatus('error');
          setMessage('Payment was cancelled');
          
          // Redirect to cancel page after 2 seconds
          setTimeout(() => {
            router.replace({
              pathname: '/payment/cancel',
              params: { transaction_id: transactionId }
            });
          }, 2000);
          return;
        }

        if (transaction.status === 'expired') {
          setStatus('error');
          setMessage('Payment link expired');
          
          // Redirect to failed page after 2 seconds
          setTimeout(() => {
            router.replace({
              pathname: '/payment/failed',
              params: {
                transaction_id: transactionId,
                error_message: 'Payment link expired'
              }
            });
          }, 2000);
          return;
        }

        // Check if transaction is already completed
        if (transaction.status === 'completed') {
          setStatus('success');
          
          // Set appropriate message based on payment type
          if (transaction.payment_type === 'betacoin_purchase') {
            setMessage('BetaCoins purchased successfully!');
          } else if (transaction.payment_type === 'service_payment') {
            setMessage('Order placed successfully! Your service provider will be notified.');
          } else {
            setMessage('Payment completed successfully!');
          }
          
          // Redirect based on payment type
          if (transaction.payment_type === 'betacoin_purchase') {
            // Redirect to wallet for BetaCoin purchases
            setTimeout(() => {
              router.replace('/wallet');
            }, 2000);
          } else if (transaction.payment_type === 'service_payment') {
            // Redirect to active jobs for service payments
            setTimeout(() => {
              router.replace('/profile');
            }, 2000);
          } else {
            // Default redirect to wallet
            setTimeout(() => {
              router.replace('/wallet');
            }, 2000);
          }
          return;
        }

        // Update transaction status
        const { error: updateError } = await supabase
          .from('payment_transactions')
          .update({
            status: 'completed',
            curlec_payment_id: paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transactionId);

        if (updateError) {
          console.error('Failed to update transaction:', updateError);
          setStatus('error');
          setMessage('Failed to update transaction');
          return;
        }

        // Process the payment based on type
        if (transaction.payment_type === 'betacoin_purchase') {
          const betacoinAmount = transaction.metadata?.betacoin_amount || 0;
          
          // Add BetaCoins to user's wallet
          const result = await WalletService.addBetaCoins(transaction.user_id, betacoinAmount);
          
          if (!result.success) {
            console.error('Failed to add BetaCoins:', result.error);
            setStatus('error');
            setMessage('Payment successful but failed to add BetaCoins');
            return;
          }

          setStatus('success');
          setMessage(`Payment successful! ${betacoinAmount} BetaCoins added to your wallet.`);
        } else {
          setStatus('success');
          setMessage('Payment completed successfully!');
        }

        // Redirect to wallet after 3 seconds
        setTimeout(() => {
          router.replace('/wallet');
        }, 3000);

      } else {
        // Payment failed or cancelled
        setStatus('error');
        setMessage('Payment was not completed successfully.');
        
        // Update transaction status
        await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', transactionId);

        // Redirect to wallet after 3 seconds
        setTimeout(() => {
          router.replace('/wallet');
        }, 3000);
      }

    } catch (error) {
      console.error('Error processing payment callback:', error);
      setStatus('error');
      setMessage('An error occurred while processing the payment.');
      
      // Redirect to wallet after 3 seconds
      setTimeout(() => {
        router.replace('/wallet');
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={Colors.primary.main} />
            <Text style={styles.message}>{message}</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.successIconContainer}>
              <CheckCircle size={80} color={Colors.status.success} />
            </View>
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.message}>{message}</Text>
            
            {transactionId && (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Transaction Details</Text>
                <Text style={styles.detailText}>Transaction ID: {transactionId}</Text>
                {paymentId && <Text style={styles.detailText}>Payment ID: {paymentId}</Text>}
                {transaction?.payment_type === 'service_payment' && (
                  <Text style={styles.detailText}>Payment Type: Service Order</Text>
                )}
                {transaction?.payment_type === 'betacoin_purchase' && (
                  <Text style={styles.detailText}>Payment Type: BetaCoin Purchase</Text>
                )}
              </View>
            )}
            
            <Text style={styles.redirect}>Redirecting to wallet...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={64} color={Colors.status.error} />
            <Text style={styles.title}>Payment Failed</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.redirect}>Redirecting to wallet...</Text>
          </>
        )}
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
  successIconContainer: {
    marginBottom: 20,
  },
  detailsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
});
