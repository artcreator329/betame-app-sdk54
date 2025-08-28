import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import CurlecPaymentService from '../lib/curlec-payment-service';
import Colors from '../constants/Colors';
import { useColors } from '@/contexts/ThemeContext';

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
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'wallet' | 'card'>('wallet');

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

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ 
            flex: 1, 
            backgroundColor: colors.background.primary,
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
              backgroundColor: colors.background.tertiary,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.main,
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text.primary }}>Service Payment</Text>
              <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={{ flex: 1, padding: 20 }}>
              {/* Service Details */}
              <View style={[styles.serviceDetails, { backgroundColor: colors.background.secondary }]}>
                <Text style={[styles.serviceName, { color: colors.text.primary }]}>{serviceName}</Text>
                <Text style={[styles.providerName, { color: colors.text.secondary }]}>by {serviceProviderName}</Text>
                <Text style={[styles.orderId, { color: colors.text.tertiary }]}>Order ID: {orderId}</Text>
              </View>

              {/* Payment Method Selection */}
              <View style={{ marginTop: 20 }}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Payment Method</Text>
                
                                 <TouchableOpacity
                   style={{
                     flexDirection: 'row',
                     alignItems: 'center',
                     paddingVertical: 12,
                     paddingHorizontal: 16,
                     borderRadius: 12,
                     marginBottom: 10,
                     borderWidth: 1,
                     backgroundColor: selectedPaymentMethod === 'wallet' ? colors.primary.main : colors.background.secondary,
                     borderColor: colors.border.main,
                   }}
                   onPress={() => setSelectedPaymentMethod('wallet')}
                 >
                   <Ionicons 
                     name="wallet" 
                     size={24} 
                     color={selectedPaymentMethod === 'wallet' ? colors.text.white : colors.text.primary} 
                   />
                   <Text style={{
                     fontSize: 14,
                     marginLeft: 12,
                     color: selectedPaymentMethod === 'wallet' ? colors.text.white : colors.text.primary
                   }}>
                     BetaCoin Wallet
                   </Text>
                 </TouchableOpacity>

                 <TouchableOpacity
                   style={{
                     flexDirection: 'row',
                     alignItems: 'center',
                     paddingVertical: 12,
                     paddingHorizontal: 16,
                     borderRadius: 12,
                     marginBottom: 10,
                     borderWidth: 1,
                     backgroundColor: selectedPaymentMethod === 'card' ? colors.primary.main : colors.background.secondary,
                     borderColor: colors.border.main,
                   }}
                   onPress={() => setSelectedPaymentMethod('card')}
                 >
                   <Ionicons 
                     name="card" 
                     size={24} 
                     color={selectedPaymentMethod === 'card' ? colors.text.white : colors.text.primary} 
                   />
                   <Text style={{
                     fontSize: 14,
                     marginLeft: 12,
                     color: selectedPaymentMethod === 'card' ? colors.text.white : colors.text.primary
                   }}>
                     Credit/Debit Card
                   </Text>
                 </TouchableOpacity>
              </View>

              {/* Payment Summary */}
              <View style={[styles.paymentSummary, { backgroundColor: colors.background.secondary }]}>
                <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>Payment Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Service Amount:</Text>
                  <Text style={[styles.summaryValue, { color: colors.text.primary }]}>{formatAmount(amount)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Processing Fee:</Text>
                  <Text style={[styles.summaryValue, { color: colors.text.primary }]}>RM 0.00</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={[styles.summaryLabel, { color: colors.text.primary, fontWeight: 'bold' }]}>Total:</Text>
                  <Text style={[styles.summaryValue, { color: colors.primary.main, fontWeight: 'bold' }]}>{formatAmount(amount)}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: colors.background.tertiary, borderTopColor: colors.border.main }]}>
              <TouchableOpacity
                style={[styles.payButton, { backgroundColor: colors.primary.main }]}
                onPress={handlePayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text.white} size="small" />
                ) : (
                  <Text style={[styles.payButtonText, { color: colors.text.white }]}>
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
                <Text style={{ color: colors.text.secondary, fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  serviceDetails: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  providerName: {
    fontSize: 14,
    marginBottom: 8,
  },
  orderId: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paymentMethodText: {
    fontSize: 14,
    marginLeft: 12,
  },
  paymentSummary: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  payButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

