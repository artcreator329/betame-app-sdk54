import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import CurlecPaymentService from '../lib/curlec-payment-service';
import Colors from '../constants/Colors';

interface ServicePaymentModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  serviceName: string;
  amount: number; // Amount in cents
  currency?: string;
  serviceProviderName?: string;
}

export default function ServicePaymentModal({
  visible,
  onClose,
  orderId,
  serviceName,
  amount,
  currency = 'MYR',
  serviceProviderName,
}: ServicePaymentModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!user) {
      Alert.alert('Error', 'Please ensure you are logged in to make a payment.');
      return;
    }

    try {
      setLoading(true);
      const paymentService = CurlecPaymentService.getInstance();

      // Create checkout session
      const response = await paymentService.createCheckoutSession({
        user_id: user.id,
        payment_type: 'service_payment',
        amount: amount,
        currency: currency,
        order_id: orderId,
        success_url: `${process.env.EXPO_PUBLIC_APP_URL}/payment/success?checkout_id={CHECKOUT_ID}`,
        cancel_url: `${process.env.EXPO_PUBLIC_APP_URL}/payment/cancel`,
        metadata: {
          service_name: serviceName,
          service_provider_name: serviceProviderName,
          order_id: orderId,
        },
      });

      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to create payment session');
        return;
      }

      // Open payment URL in browser
      if (response.checkout_url) {
        const supported = await Linking.canOpenURL(response.checkout_url);
        if (supported) {
          await Linking.openURL(response.checkout_url);
          onClose();
        } else {
          Alert.alert('Error', 'Cannot open payment page. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error creating payment session:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amountInCents: number) => {
    return `RM${(amountInCents / 100).toFixed(2)}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ 
            flex: 1, 
            backgroundColor: 'white', 
            marginTop: 50,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}>
            {/* Header */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#f0f0f0',
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Service Payment</Text>
              <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={{ flex: 1, padding: 20 }}>
              <Text style={{ fontSize: 16, marginBottom: 20, color: '#666' }}>
                Complete your payment for the following service:
              </Text>

              {/* Service Details */}
              <View style={{ 
                backgroundColor: '#f8f9ff', 
                padding: 16, 
                borderRadius: 12, 
                marginBottom: 20,
                borderWidth: 1,
                borderColor: Colors.primary,
              }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                  Service Details
                </Text>
                
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>Service:</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600' }}>{serviceName}</Text>
                </View>
                
                {serviceProviderName && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, color: '#666' }}>Service Provider:</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600' }}>{serviceProviderName}</Text>
                  </View>
                )}
                
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>Order ID:</Text>
                  <Text style={{ fontSize: 14, fontFamily: 'monospace' }}>{orderId}</Text>
                </View>
                
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#e0e0e0',
                }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Total Amount:</Text>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: Colors.primary }}>
                    {formatAmount(amount)}
                  </Text>
                </View>
              </View>

              {/* Payment Methods Info */}
              <View style={{ 
                backgroundColor: '#f5f5f5', 
                padding: 16, 
                borderRadius: 12, 
                marginBottom: 20 
              }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
                  Payment Methods Available:
                </Text>
                <Text style={{ fontSize: 12, color: '#666', lineHeight: 18 }}>
                  • Credit/Debit Cards (Visa, Mastercard, American Express){'\n'}
                  • FPX Online Banking{'\n'}
                  • E-Wallets (Boost, Touch 'n Go, GrabPay){'\n'}
                  • All payments are processed securely through Curlec
                </Text>
              </View>

              {/* Security Notice */}
              <View style={{ 
                backgroundColor: '#fff8e1', 
                padding: 16, 
                borderRadius: 12, 
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#ffc107',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="shield-checkmark" size={16} color="#ffc107" />
                  <Text style={{ fontSize: 14, fontWeight: 'bold', marginLeft: 8, color: '#ffc107' }}>
                    Secure Payment
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#666', lineHeight: 16 }}>
                  Your payment information is encrypted and secure. We never store your card details on our servers.
                </Text>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={{ 
              padding: 20, 
              borderTopWidth: 1, 
              borderTopColor: '#f0f0f0',
              backgroundColor: 'white',
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.primary,
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  opacity: loading ? 0.7 : 1,
                }}
                onPress={handlePayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                    Pay {formatAmount(amount)}
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{ 
                  paddingVertical: 12, 
                  alignItems: 'center',
                  marginTop: 8,
                }}
                onPress={onClose}
              >
                <Text style={{ color: '#666', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
