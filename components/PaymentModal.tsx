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
  Platform,
} from 'react-native';
import { X, CreditCard, Wallet, Clock, MapPin, FileText, Star, Shield } from 'lucide-react-native';
import { useColors } from '../contexts/ThemeContext';
import { ServiceOffer, ServiceOfferData } from '../types/chat';
import { PaymentService } from '../lib/payment-service';
import { WalletService } from '../lib/wallet-service';
import { CurlecPaymentService } from '../lib/curlec-payment-service';
import { Linking } from 'react-native';

interface PaymentModalProps {
  visible: boolean;
  offer: ServiceOffer;
  serviceData: ServiceOfferData;
  buyerId: string;
  serviceProviderId: string;
  onClose: () => void;
  onPaymentSuccess: (activeJobId: string) => void;
}



export function PaymentModal({
  visible,
  offer,
  serviceData,
  buyerId,
  serviceProviderId,
  onClose,
  onPaymentSuccess,
}: PaymentModalProps) {
  const colors = useColors();
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);


  useEffect(() => {
    if (visible) {
      loadPaymentSummary();
    }
  }, [visible]);



  const loadPaymentSummary = () => {
    if (!serviceData) {
      console.warn('ServiceData is undefined, cannot load payment summary');
      return;
    }
    const summary = PaymentService.getPaymentSummary(offer, serviceData);
    setPaymentSummary(summary);
  };

  const getTotalWithProcessingFee = () => {
    if (!paymentSummary) return 0;
    return paymentSummary.totalAmount;
  };

  const handlePayment = async () => {
    if (!paymentSummary) {
      Alert.alert('Error', 'Unable to process payment. Please try again.');
      return;
    }

    const totalAmount = getTotalWithProcessingFee();

    // Show payment confirmation
    Alert.alert(
      'Confirm Payment',
      `You will be redirected to our secure payment gateway to complete your payment of RM ${totalAmount.toFixed(2)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => processPayment() }
      ]
    );
  };

  const processPayment = async () => {
    if (!paymentSummary || !serviceData) return;

    setIsProcessing(true);

    try {
      const totalAmount = getTotalWithProcessingFee();
      
      // Use Curlec payment gateway for all external payments
      const curlecService = CurlecPaymentService.getInstance();
      
      // Create checkout session with Curlec
      const response = await curlecService.createCheckoutSession({
        user_id: buyerId,
        payment_type: 'service_payment',
        amount: Math.round(totalAmount * 100), // Convert to cents and round to avoid floating point issues
        currency: 'MYR',
        order_id: `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        success_url: 'betame://payment/success',
        cancel_url: 'betame://payment/cancel',
        metadata: {
          service_name: serviceData.title,
          service_provider_id: serviceProviderId,
          offer_id: offer.id,
          payment_method: 'curlec',
          service_data: JSON.stringify(serviceData),
          offer_data: JSON.stringify(offer),
        },
      });

      if (!response.success) {
        Alert.alert('Payment Error', response.error || 'Failed to create payment session');
        return;
      }

      // Open payment URL
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
      console.error('Error processing payment:', error);
      Alert.alert('Payment Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!paymentSummary || !walletData) {
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

  const hasInsufficientFunds = walletData.betame_betacoins < paymentSummary.finalPrice;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Payment Confirmation</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Enhanced Service Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Details</Text>
              <View style={styles.serviceInfo}>
                {/* Service Image and Title */}
                <View style={styles.serviceHeader}>
                  {serviceData?.image_url ? (
                    <Image source={{ uri: serviceData.image_url }} style={styles.serviceImage} />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <FileText size={24} color={colors.text.secondary} />
                    </View>
                  )}
                  <View style={styles.serviceHeaderText}>
                    <Text style={styles.serviceName}>{serviceData?.title || 'Service'}</Text>
                    {serviceData?.category_name && (
                      <Text style={styles.categoryBadge}>📂 {serviceData.category_name}</Text>
                    )}
                  </View>
                </View>

                {/* Service Description */}
                {serviceData?.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>Description:</Text>
                    <Text style={styles.serviceDescription}>{serviceData.description}</Text>
                  </View>
                )}

                {/* Custom Requirements */}
                {offer.customDescription && (
                  <View style={styles.customContainer}>
                    <Text style={styles.customLabel}>📝 Custom Requirements:</Text>
                    <Text style={styles.customDescription}>{offer.customDescription}</Text>
                  </View>
                )}

                {/* Timeline and Delivery */}
                <View style={styles.timelineContainer}>
                  <View style={styles.timelineItem}>
                    <Clock size={16} color={colors.primary.main} />
                    <Text style={styles.timelineText}>
                      Delivery: {offer.customDeliveryTime || 7} days
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
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Subtotal</Text>
                  <Text style={styles.paymentValue}>
                    RM {paymentSummary.totalAmount}
                  </Text>
                </View>

                <View style={[styles.paymentRow, styles.totalRow]}>  
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>
                    RM {getTotalWithProcessingFee().toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>




          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isProcessing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.payButton,
                isProcessing && styles.payButtonDisabled
              ]}
              onPress={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={Colors.text.white} />
              ) : (
                <Text style={styles.payButtonText}>
                  Pay RM {getTotalWithProcessingFee().toFixed(2)}
                </Text>
              )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: Colors.text.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 10,
  },
  serviceInfo: {
    backgroundColor: Colors.background.secondary,
    padding: 15,
    borderRadius: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 5,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  deliveryTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentDetails: {
    backgroundColor: Colors.background.secondary,
    padding: 15,
    borderRadius: 12,
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
    borderTopColor: Colors.border.light,
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  walletInfo: {
    backgroundColor: Colors.background.secondary,
    padding: 15,
    borderRadius: 12,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletLabel: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  walletValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  insufficientFunds: {
    color: Colors.status.error,
  },
  insufficientText: {
    fontSize: 12,
    color: Colors.status.error,
    marginTop: 5,
    fontStyle: 'italic',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  payButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: Colors.interactive.disabled,
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.white,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 10,
    textAlign: 'center',
  },
  // Enhanced service details styles
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
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
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceHeaderText: {
    flex: 1,
  },
  categoryBadge: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  customContainer: {
    backgroundColor: Colors.background.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  customLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  customDescription: {
    fontSize: 14,
    color: '#000000',
    fontStyle: 'italic',
  },
  timelineContainer: {
    gap: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'League Spartan, system-ui, -apple-system, sans-serif' : 'System',
    fontWeight: '600',
    color: '#6B7280',
  },
  insufficientBetaCoinsText: {
    fontSize: 11,
    color: Colors.status.error,
    fontWeight: '500',
    marginTop: 2,
  },
});