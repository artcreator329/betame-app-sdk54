import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import CurlecPaymentService from '../lib/curlec-payment-service';
import Colors from '../constants/Colors';

export default function CurlecTestPayment() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const testPayment = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to test payments');
      return;
    }

    try {
      setLoading(true);
      const paymentService = CurlecPaymentService.getInstance();

      // Test payment of RM10.00 (1000 cents)
      const response = await paymentService.createCheckoutSession({
        user_id: user.id,
        payment_type: 'betacoin_purchase',
        amount: 1000, // RM10.00 in cents
        currency: 'MYR',
        success_url: `${process.env.EXPO_PUBLIC_APP_URL || 'https://yourapp.com'}/payment/success?checkout_id={CHECKOUT_ID}`,
        cancel_url: `${process.env.EXPO_PUBLIC_APP_URL || 'https://yourapp.com'}/payment/cancel`,
        metadata: {
          betacoin_amount: 100,
          package_id: 'test-package',
          package_name: 'Test Package',
        },
      });

      if (!response.success) {
        Alert.alert('Payment Error', response.error || 'Failed to create payment session');
        return;
      }

      console.log('Payment session created:', response);

      // Open payment URL in browser
      if (response.checkout_url) {
        const supported = await Linking.canOpenURL(response.checkout_url);
        if (supported) {
          await Linking.openURL(response.checkout_url);
        } else {
          Alert.alert('Error', 'Cannot open payment page. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error creating test payment:', error);
      Alert.alert('Error', 'Failed to create test payment. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const testServicePayment = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to test payments');
      return;
    }

    try {
      setLoading(true);
      const paymentService = CurlecPaymentService.getInstance();

      // Test service payment of RM25.00 (2500 cents)
      const response = await paymentService.createCheckoutSession({
        user_id: user.id,
        payment_type: 'service_payment',
        amount: 2500, // RM25.00 in cents
        currency: 'MYR',
        order_id: 'test-order-123',
        success_url: `${process.env.EXPO_PUBLIC_APP_URL || 'https://yourapp.com'}/payment/success?checkout_id={CHECKOUT_ID}`,
        cancel_url: `${process.env.EXPO_PUBLIC_APP_URL || 'https://yourapp.com'}/payment/cancel`,
        metadata: {
          service_name: 'Test Service',
          service_provider_name: 'Test Provider',
          order_id: 'test-order-123',
        },
      });

      if (!response.success) {
        Alert.alert('Payment Error', response.error || 'Failed to create payment session');
        return;
      }

      console.log('Service payment session created:', response);

      // Open payment URL in browser
      if (response.checkout_url) {
        const supported = await Linking.canOpenURL(response.checkout_url);
        if (supported) {
          await Linking.openURL(response.checkout_url);
        } else {
          Alert.alert('Error', 'Cannot open payment page. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error creating test service payment:', error);
      Alert.alert('Error', 'Failed to create test service payment. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="card" size={48} color={Colors.primary} />
          <Text style={styles.title}>Curlec Payment Test</Text>
          <Text style={styles.subtitle}>
            Test the Curlec payment integration with your credentials
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Test Credentials:</Text>
          <Text style={styles.infoText}>
            • API Key: rzp_test_R9Zq5e24ydHz2T{'\n'}
            • Environment: Sandbox{'\n'}
            • Currency: MYR{'\n'}
            • Test Amounts: RM10.00, RM25.00
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={testPayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="diamond" size={20} color="white" />
                <Text style={styles.buttonText}>Test BetaCoin Purchase (RM10)</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={testServicePayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <>
                <Ionicons name="card" size={20} color={Colors.primary} />
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Test Service Payment (RM25)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Instructions:</Text>
          <Text style={styles.instructionsText}>
            1. Tap a test button above{'\n'}
            2. You'll be redirected to Curlec payment page{'\n'}
            3. Use test card: 4242424242424242{'\n'}
            4. Any future expiry date{'\n'}
            5. Any 3-digit CVV{'\n'}
            6. Complete the payment to test the flow
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: Colors.primary,
  },
  instructions: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f57c00',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
