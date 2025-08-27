import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import CurlecPaymentService from '../lib/curlec-payment-service';
import Colors from '../constants/Colors';

export default function CurlecApiTest() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const testCurlecConnection = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to test Curlec API');
      return;
    }

    try {
      setLoading(true);
      setTestResult('Testing Curlec API connection...\n');

      const paymentService = CurlecPaymentService.getInstance();

      // Test with a small amount
      const response = await paymentService.createCheckoutSession({
        user_id: user.id,
        payment_type: 'betacoin_purchase',
        amount: 500, // RM5.00 in cents
        currency: 'MYR',
              success_url: 'https://betame.com.my/payment/success?checkout_id={CHECKOUT_ID}',
      cancel_url: 'https://betame.com.my/payment/cancel',
        metadata: {
          betacoin_amount: 20,
          package_id: 'test-package',
          package_name: 'Test Package',
        },
      });

      setTestResult(prev => prev + `\nResponse received:\n`);
      setTestResult(prev => prev + `Success: ${response.success}\n`);
      
      if (response.success) {
        setTestResult(prev => prev + `Checkout URL: ${response.checkout_url}\n`);
        setTestResult(prev => prev + `Checkout ID: ${response.checkout_id}\n`);
        setTestResult(prev => prev + `\n✅ Curlec API is working correctly!\n`);
      } else {
        setTestResult(prev => prev + `Error: ${response.error}\n`);
        setTestResult(prev => prev + `\n❌ Curlec API test failed!\n`);
      }

    } catch (error) {
      console.error('Curlec API test error:', error);
      setTestResult(prev => prev + `\nException: ${error}\n`);
      setTestResult(prev => prev + `\n❌ Curlec API test failed with exception!\n`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResult('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="card" size={48} color={Colors.primary.main} />
          <Text style={styles.title}>Curlec API Test</Text>
          <Text style={styles.subtitle}>
            Test the Curlec payment API connection
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Test Configuration:</Text>
          <Text style={styles.infoText}>
            • API Key: rzp_test_R9Zq5e24ydHz2T{'\n'}
            • Environment: Sandbox{'\n'}
            • Test Amount: RM 5.00{'\n'}
            • Currency: MYR
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={testCurlecConnection}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="white" />
                <Text style={styles.buttonText}>Test Curlec API</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={clearResults}
          >
            <Ionicons name="refresh" size={20} color={Colors.primary.main} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Clear Results
            </Text>
          </TouchableOpacity>
        </View>

        {testResult ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Test Results:</Text>
            <ScrollView style={styles.resultScroll}>
              <Text style={styles.resultText}>{testResult}</Text>
            </ScrollView>
          </View>
        ) : null}
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
    gap: 12,
    marginBottom: 24,
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
    backgroundColor: Colors.primary.main,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: Colors.primary.main,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: Colors.primary.main,
  },
  resultContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  resultScroll: {
    flex: 1,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});

