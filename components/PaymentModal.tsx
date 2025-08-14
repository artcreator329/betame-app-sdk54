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
} from 'react-native';
import { X, CreditCard, Wallet, Clock, MapPin, FileText, Star, Shield } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { ServiceOffer, ServiceOfferData } from '../types/chat';
import { PaymentService } from '../lib/payment-service';
import { WalletService } from '../lib/wallet-service';

interface PaymentModalProps {
  visible: boolean;
  offer: ServiceOffer;
  serviceData: ServiceOfferData;
  buyerId: string;
  sellerId: string;
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

export function PaymentModal({
  visible,
  offer,
  serviceData,
  buyerId,
  sellerId,
  onClose,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('betacoins');

  const malaysianPaymentGateways: MalaysianPaymentGateway[] = [
    {
      id: 'betacoins',
      name: 'BetaCoins',
      icon: '💳',
      description: 'Use your existing BetaCoins',
      processingFee: 0,
    },
    {
      id: 'fpx',
      name: 'FPX Online Banking',
      icon: '🏦',
      description: 'Direct bank transfer via FPX',
      processingFee: 1.50,
    },
    {
      id: 'tng',
      name: 'Touch \'n Go eWallet',
      icon: '📱',
      description: 'Pay with TnG eWallet',
      processingFee: 0.50,
    },
    {
      id: 'grabpay',
      name: 'GrabPay',
      icon: '🚗',
      description: 'Pay with GrabPay wallet',
      processingFee: 0.50,
    },
    {
      id: 'boost',
      name: 'Boost',
      icon: '🚀',
      description: 'Pay with Boost wallet',
      processingFee: 0.50,
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
    if (!serviceData) {
      console.warn('ServiceData is undefined, cannot load payment summary');
      return;
    }
    const summary = PaymentService.getPaymentSummary(offer, serviceData);
    setPaymentSummary(summary);
  };

  const getSelectedGateway = () => {
    return malaysianPaymentGateways.find(gateway => gateway.id === selectedPaymentMethod) || malaysianPaymentGateways[0];
  };

  const getTotalWithProcessingFee = () => {
    if (!paymentSummary) return 0;
    const gateway = getSelectedGateway();
    return paymentSummary.totalAmount + gateway.processingFee;
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
    if (!walletData || !paymentSummary || !serviceData) return;

    setIsProcessing(true);

    try {
      const result = await PaymentService.processOfferPayment(
        offer,
        serviceData,
        buyerId,
        sellerId
      );

      if (result.success && result.activeJobId) {
        Alert.alert(
          'Payment Successful!',
          'Your payment has been processed and the job has been created. You can now track the progress in your profile.',
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
                onPaymentSuccess(result.activeJobId || '');
              }
            }
          ]
        );
      } else {
        Alert.alert('Payment Failed', result.error || 'An unexpected error occurred.');
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
            <ActivityIndicator size="large" color={Colors.primary.main} />
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
              <X size={24} color={Colors.text.secondary} />
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
                      <FileText size={24} color={Colors.text.secondary} />
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
                    <Clock size={16} color={Colors.primary.main} />
                    <Text style={styles.timelineText}>
                      Delivery: {offer.customDeliveryTime || 7} days
                    </Text>
                  </View>
                  <View style={styles.timelineItem}>
                    <Shield size={16} color={Colors.status.success} />
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
                  <Text style={styles.paymentLabel}>Service Fee (5%)</Text>
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
                {getSelectedGateway().processingFee > 0 && (
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>
                      {getSelectedGateway().name} Processing Fee
                    </Text>
                    <Text style={styles.paymentValue}>
                      RM {getSelectedGateway().processingFee.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={[styles.paymentRow, styles.totalRow]}>  
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>
                    {selectedPaymentMethod === 'betacoins' 
                      ? `${getTotalWithProcessingFee()} BetaCoins`
                      : `RM ${getTotalWithProcessingFee().toFixed(2)}`
                    }
                  </Text>
                </View>
              </View>
            </View>

            {/* Wallet Balance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Wallet</Text>
              <View style={styles.walletInfo}>
                <View style={styles.walletRow}>
                  <Wallet size={20} color={Colors.primary.main} />
                  <Text style={styles.walletLabel}>Available BetaCoins</Text>
                  <Text style={[styles.walletValue, hasInsufficientFunds && styles.insufficientFunds]}>
                    {walletData.betame_betacoins} BetaCoins
                  </Text>
                </View>
                {hasInsufficientFunds && (
                  <Text style={styles.insufficientText}>
                    You need {paymentSummary.finalPrice - walletData.betame_betacoins} more BetaCoins
                  </Text>
                )}
              </View>
            </View>

            {/* Payment Method Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choose Payment Method</Text>
              {malaysianPaymentGateways.map((gateway) => {
                const isSelected = selectedPaymentMethod === gateway.id;
                const isBetaCoinsInsufficient = gateway.id === 'betacoins' && walletData && walletData.betame_betacoins < getTotalWithProcessingFee();
                
                return (
                  <TouchableOpacity
                    key={gateway.id}
                    style={[
                      styles.paymentMethodOption,
                      isSelected && styles.paymentMethodSelected,
                      isBetaCoinsInsufficient && styles.paymentMethodDisabled
                    ]}
                    onPress={() => !isBetaCoinsInsufficient && setSelectedPaymentMethod(gateway.id)}
                    disabled={isBetaCoinsInsufficient}
                  >
                    <View style={styles.paymentMethodLeft}>
                      <Text style={styles.paymentMethodIcon}>{gateway.icon}</Text>
                      <View style={styles.paymentMethodInfo}>
                        <Text style={[
                          styles.paymentMethodName,
                          isBetaCoinsInsufficient && styles.paymentMethodNameDisabled
                        ]}>
                          {gateway.name}
                        </Text>
                        <Text style={[
                          styles.paymentMethodDescription,
                          isBetaCoinsInsufficient && styles.paymentMethodDescriptionDisabled
                        ]}>
                          {gateway.description}
                          {gateway.processingFee > 0 && ` (+RM ${gateway.processingFee.toFixed(2)} fee)`}
                        </Text>
                        {isBetaCoinsInsufficient && (
                          <Text style={styles.insufficientBetaCoinsText}>
                            Insufficient BetaCoins
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={[
                      styles.radioButton,
                      isSelected && styles.radioButtonSelected
                    ]} />
                  </TouchableOpacity>
                );
              })}
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
                (selectedPaymentMethod === 'betacoins' && walletData.betame_betacoins < getTotalWithProcessingFee()) && styles.payButtonDisabled,
                isProcessing && styles.payButtonDisabled
              ]}
              onPress={handlePayment}
              disabled={isProcessing || (selectedPaymentMethod === 'betacoins' && walletData.betame_betacoins < getTotalWithProcessingFee())}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={Colors.text.white} />
              ) : (
                <Text style={styles.payButtonText}>
                  {selectedPaymentMethod === 'betacoins' && walletData.betame_betacoins < getTotalWithProcessingFee()
                    ? 'Insufficient BetaCoins'
                    : selectedPaymentMethod === 'betacoins' 
                      ? `Pay ${getTotalWithProcessingFee()} BetaCoins`
                      : `Pay RM ${getTotalWithProcessingFee().toFixed(2)}`
                  }
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
    color: Colors.text.primary,
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
    color: Colors.text.primary,
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
    color: Colors.text.primary,
    marginBottom: 5,
  },
  serviceDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 5,
    fontStyle: 'italic',
  },
  deliveryTime: {
    fontSize: 12,
    color: Colors.text.secondary,
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
    color: Colors.text.secondary,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
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
    color: Colors.text.primary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.main,
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
    color: Colors.text.secondary,
  },
  walletValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
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
    color: Colors.text.primary,
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
    color: Colors.text.secondary,
  },
  payButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary.main,
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
    color: Colors.text.secondary,
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
    color: Colors.text.secondary,
    marginTop: 4,
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
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
    color: Colors.primary.main,
    marginBottom: 4,
  },
  customDescription: {
    fontSize: 14,
    color: Colors.text.primary,
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
    color: Colors.text.secondary,
  },
  // Payment method selection styles
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.secondary,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodSelected: {
    borderColor: Colors.primary.main,
    backgroundColor: Colors.primary.light,
  },
  paymentMethodDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.interactive.disabled,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  paymentMethodNameDisabled: {
    color: Colors.text.secondary,
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  paymentMethodDescriptionDisabled: {
    color: Colors.text.tertiary,
  },
  insufficientBetaCoinsText: {
    fontSize: 11,
    color: Colors.status.error,
    fontWeight: '500',
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border.light,
    backgroundColor: 'transparent',
  },
  radioButtonSelected: {
    borderColor: Colors.primary.main,
    backgroundColor: Colors.primary.main,
  },
});