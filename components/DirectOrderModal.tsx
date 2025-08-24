import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { X, CreditCard, Wallet, Clock, FileText, Shield } from 'lucide-react-native';
import { useColors } from '../contexts/ThemeContext';
import { DirectOrderData } from '../lib/payment-service';
import { PaymentService } from '../lib/payment-service';
import { WalletService } from '../lib/wallet-service';

interface DirectOrderModalProps {
  visible: boolean;
  orderData: DirectOrderData;
  buyerId: string;
  serviceProviderId: string;
  onClose: () => void;
  onPaymentSuccess: (activeJobId: string) => void;
}

type PaymentMethod = 'betacoins' | 'fpx' | 'tng' | 'grabpay' | 'boost';

interface MalaysianPaymentGateway {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
  processingFee: number;
}

export function DirectOrderModal({
  visible,
  orderData,
  buyerId,
  serviceProviderId,
  onClose,
  onPaymentSuccess,
}: DirectOrderModalProps) {
  const colors = useColors();
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('fpx');
  const [customDescription, setCustomDescription] = useState('');
  const [customDeliveryTime, setCustomDeliveryTime] = useState('7');

  const malaysianPaymentGateways: MalaysianPaymentGateway[] = [

    {
      id: 'fpx',
      name: 'FPX Online Banking',
      icon: '🏦',
      description: 'Direct bank transfer via FPX',
      processingFee: 0,
    },
    {
      id: 'tng',
      name: 'Touch \'n Go eWallet',
      icon: '📱',
      description: 'Pay with TnG eWallet',
      processingFee: 0,
    },
    {
      id: 'grabpay',
      name: 'GrabPay',
      icon: '🚗',
      description: 'Pay with GrabPay wallet',
      processingFee: 0,
    },
    {
      id: 'boost',
      name: 'Boost',
      icon: '🚀',
      description: 'Pay with Boost wallet',
      processingFee: 0,
    },
  ];

  useEffect(() => {
    if (visible) {
      loadWalletData();
      loadPaymentSummary();
    }
  }, [visible]);

  const loadWalletData = async () => {
    try {
      const wallet = await WalletService.getWallet(buyerId);
      setWalletData(wallet);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const loadPaymentSummary = () => {
    const summary = PaymentService.getPaymentSummaryForDirectOrder(orderData);
    setPaymentSummary(summary);
  };

  const getSelectedGateway = () => {
    return malaysianPaymentGateways.find(gateway => gateway.id === selectedPaymentMethod) || malaysianPaymentGateways[0];
  };

  const getTotalWithProcessingFee = () => {
    if (!paymentSummary) return 0;
    return paymentSummary.totalAmount;
  };

  const handlePayment = async () => {
    if (!walletData || !paymentSummary) {
      Alert.alert('Error', 'Unable to process payment. Please try again.');
      return;
    }

    const totalAmount = getTotalWithProcessingFee();
    const gateway = getSelectedGateway();

    // For BetaCoins payment, check balance
    if (selectedPaymentMethod === 'betacoins' && walletData.betame_betacoins < totalAmount) {
      Alert.alert(
        'Insufficient BetaCoins',
        `You need ${totalAmount} BetaCoins but only have ${walletData.betame_betacoins} BetaCoins. Please purchase more BetaCoins to continue.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Purchase BetaCoins', onPress: () => {
            onClose();
            // Navigate to wallet/BetaCoins purchase screen
          }}
        ]
      );
      return;
    }

    // For other payment methods, show processing message
    if (selectedPaymentMethod !== 'betacoins') {
      Alert.alert(
        'Redirecting to Payment',
        `You will be redirected to ${gateway.name} to complete your payment of RM ${totalAmount.toFixed(2)}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => processPayment() }
        ]
      );
      return;
    }

    await processPayment();
  };

  const processPayment = async () => {
    if (!paymentSummary) return;

    setIsProcessing(true);

    try {
      // Prepare order data with custom fields
      const enhancedOrderData = {
        ...orderData,
        customDescription: customDescription.trim() || undefined,
        customDeliveryTime: customDeliveryTime ? parseInt(customDeliveryTime) : undefined,
      };

      // Import ActiveJobService dynamically
      const { ActiveJobService } = await import('@/lib/active-job-service');
      
      // Create the job record for external payment
      const activeJob = await ActiveJobService.createJobFromDirectOrder(
        enhancedOrderData,
        buyerId,
        serviceProviderId
      );

      if (activeJob) {
        Alert.alert(
          'Order Successful!',
          'Your order has been placed successfully. The service provider will be notified to confirm your order.',
          [
            {
              text: 'View Orders',
              onPress: () => {
                onClose();
                onPaymentSuccess(activeJob.id || '');
              }
            },
            {
              text: 'OK',
              onPress: () => {
                onClose();
                onPaymentSuccess(activeJob.id || '');
              }
            }
          ]
        );
      } else {
        Alert.alert('Order Creation Failed', 'Failed to create order. Please try again.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Payment Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!paymentSummary) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.loadingText}>Loading payment details...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Place Order</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Service Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Details</Text>
              <View style={styles.serviceInfo}>
                {/* Service Image and Title */}
                <View style={styles.serviceHeader}>
                  {orderData?.image_url ? (
                    <Image source={{ uri: orderData.image_url }} style={styles.serviceImage} />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <FileText size={24} color={colors.text.secondary} />
                    </View>
                  )}
                  <View style={styles.serviceHeaderText}>
                    <Text style={styles.serviceName}>{orderData?.title || 'Service'}</Text>
                    {orderData?.category_name && (
                      <Text style={styles.categoryBadge}>📂 {orderData.category_name}</Text>
                    )}
                  </View>
                </View>

                {/* Service Description */}
                {orderData?.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>Description:</Text>
                    <Text style={styles.serviceDescription}>{orderData.description}</Text>
                  </View>
                )}

                {/* Custom Requirements Input */}
                <View style={styles.customContainer}>
                  <Text style={styles.customLabel}>📝 Additional Requirements (Optional):</Text>
                  <TextInput
                    style={styles.customInput}
                    value={customDescription}
                    onChangeText={setCustomDescription}
                    placeholder="Add any specific requirements or notes..."
                    placeholderTextColor={colors.text.secondary}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                  />
                </View>

                {/* Delivery Time Input */}
                <View style={styles.deliveryContainer}>
                  <Text style={styles.deliveryLabel}>⏰ Expected Delivery Time (days):</Text>
                  <TextInput
                    style={styles.deliveryInput}
                    value={customDeliveryTime}
                    onChangeText={setCustomDeliveryTime}
                    placeholder="7"
                    placeholderTextColor={colors.text.secondary}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>

                {/* Timeline and Protection */}
                <View style={styles.timelineContainer}>
                  <View style={styles.timelineItem}>
                    <Clock size={16} color={'#007AFF'} />
                    <Text style={styles.timelineText}>
                      Delivery: {customDeliveryTime || 7} days
                    </Text>
                  </View>
                  <View style={styles.timelineItem}>
                    <Shield size={16} color={'#10B981'} />
                    <Text style={styles.timelineText}>Protected by BetaMe Guarantee</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Payment Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Summary</Text>
              <View style={styles.paymentDetails}>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Service Price</Text>
                  <Text style={styles.paymentValue}>
                    RM {paymentSummary.finalPrice}
                  </Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Processing Fee (2.2%)</Text>
                  <Text style={styles.paymentValue}>
                    RM {paymentSummary.serviceFee}
                  </Text>
                </View>

                <View style={[styles.paymentRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    RM {getTotalWithProcessingFee()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Methods */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentMethods}>
                {malaysianPaymentGateways.map((gateway) => (
                  <TouchableOpacity
                    key={gateway.id}
                    style={[
                      styles.paymentMethodItem,
                      selectedPaymentMethod === gateway.id && styles.selectedPaymentMethod
                    ]}
                    onPress={() => setSelectedPaymentMethod(gateway.id)}
                  >
                    <View style={styles.paymentMethodInfo}>
                      <Text style={styles.paymentMethodIcon}>{gateway.icon}</Text>
                      <View style={styles.paymentMethodDetails}>
                        <Text style={styles.paymentMethodName}>{gateway.name}</Text>
                        <Text style={styles.paymentMethodDescription}>{gateway.description}</Text>
                      </View>
                    </View>
                    {selectedPaymentMethod === gateway.id && (
                      <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedIndicatorText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>


          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
                          <TouchableOpacity
                style={[
                  styles.payButton,
                  isProcessing && styles.payButtonDisabled
                ]}
                onPress={handlePayment}
                disabled={isProcessing}
              >
              {isProcessing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <CreditCard size={20} color="white" />
              )}
              <Text style={styles.payButtonText}>
                {isProcessing ? 'Processing...' : `Pay RM ${getTotalWithProcessingFee()}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  serviceInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceHeaderText: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  categoryBadge: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  customContainer: {
    marginBottom: 16,
  },
  customLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  deliveryContainer: {
    marginBottom: 16,
  },
  deliveryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  deliveryInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000000',
    width: 80,
  },
  timelineContainer: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'League Spartan, system-ui, -apple-system, sans-serif' : 'System',
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  paymentDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  paymentMethods: {
    gap: 8,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    backgroundColor: 'white',
  },
  selectedPaymentMethod: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 8,
  },
  insufficientFunds: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  payButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  payButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
});
