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
  Linking,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { X, CreditCard, Wallet, Clock, MapPin, FileText, Star, Shield, CheckCircle, AlertCircle, ExternalLink, Calendar } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { ServiceOffer, ServiceOfferData } from '../types/chat';
import { PaymentService } from '../lib/payment-service';
import { WalletService } from '../lib/wallet-service';
import { MalaysianPaymentGatewayService, MalaysianPaymentGateway, PaymentRequest, PaymentResponse } from '../lib/malaysian-payment-gateway';

interface MalaysianPaymentModalProps {
  visible: boolean;
  offer: ServiceOffer;
  serviceData: ServiceOfferData;
  buyerId: string;
  serviceProviderId: string;
  onClose: () => void;
  onPaymentSuccess: (activeJobId: string) => void;
}

type PaymentMethod = 'credits' | 'fpx' | 'tng' | 'grabpay' | 'boost' | 'shopee' | 'paypal';

interface PaymentStep {
  id: 'summary' | 'method' | 'processing' | 'redirect' | 'success' | 'failed';
  title: string;
  description: string;
}

export function MalaysianPaymentModal({
  visible,
  offer,
  serviceData,
  buyerId,
  serviceProviderId,
  onClose,
  onPaymentSuccess,
}: MalaysianPaymentModalProps) {
  const [currentStep, setCurrentStep] = useState<PaymentStep['id']>('summary');
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('credits');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [paymentResponse, setPaymentResponse] = useState<PaymentResponse | null>(null);
  const [transactionId, setTransactionId] = useState<string>('');

  const paymentSteps: PaymentStep[] = [
    { id: 'summary', title: 'Payment Summary', description: 'Review your payment details' },
    { id: 'method', title: 'Choose Payment Method', description: 'Select your preferred payment method' },
    { id: 'processing', title: 'Processing Payment', description: 'Please wait while we process your payment' },
    { id: 'redirect', title: 'Redirecting to Payment', description: 'You will be redirected to complete payment' },
    { id: 'success', title: 'Payment Successful', description: 'Your payment has been completed successfully' },
    { id: 'failed', title: 'Payment Failed', description: 'There was an issue with your payment' },
  ];

  const malaysianGateways = MalaysianPaymentGatewayService.getAvailableGateways();

  useEffect(() => {
    if (visible) {
      loadWalletData();
      loadPaymentSummary();
      setCurrentStep('summary');
      setSelectedPaymentMethod('credits');
      setSelectedBank('');
      setPaymentResponse(null);
      setTransactionId('');
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
    return malaysianGateways.find(gateway => gateway.id === selectedPaymentMethod) || malaysianGateways[0];
  };

  const getTotalWithProcessingFee = () => {
    if (!paymentSummary) return 0;
    const gateway = getSelectedGateway();
    return paymentSummary.totalAmount + gateway.processingFee;
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setSelectedBank(''); // Reset bank selection when changing payment method
  };

  const handleBankSelect = (bank: string) => {
    setSelectedBank(bank);
  };

  const handleProceedToPayment = async () => {
    if (selectedPaymentMethod === 'fpx' && !selectedBank) {
      Alert.alert('Select Bank', 'Please select a bank for FPX payment');
      return;
    }

    setCurrentStep('processing');
    setIsProcessing(true);

    try {
      if (selectedPaymentMethod === 'credits') {
        await processCreditsPayment();
      } else {
        await processExternalPayment();
      }
    } catch (error) {
      console.error('Payment error:', error);
      setCurrentStep('failed');
      setIsProcessing(false);
    }
  };

  const processCreditsPayment = async () => {
    if (!walletData || !paymentSummary || !serviceData) return;

    const totalAmount = getTotalWithProcessingFee();

    if (walletData.betame_credits < totalAmount) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${totalAmount} credits but only have ${walletData.betame_credits} credits.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Purchase Credits', onPress: () => {
            onClose();
            // Navigate to wallet/credits purchase screen
          }}
        ]
      );
      setCurrentStep('summary');
      setIsProcessing(false);
      return;
    }

    const result = await PaymentService.processOfferPayment(
      offer,
      serviceData,
      buyerId,
      serviceProviderId
    );

    if (result.success && result.activeJobId) {
      setCurrentStep('success');
      setTimeout(() => {
        onClose();
        onPaymentSuccess(result.activeJobId || '');
      }, 2000);
    } else {
      setCurrentStep('failed');
    }
    setIsProcessing(false);
  };

  const processExternalPayment = async () => {
    if (!paymentSummary || !serviceData) return;

    const paymentRequest: PaymentRequest = {
      amount: getTotalWithProcessingFee(),
      currency: 'MYR',
      orderId: `ORDER_${Date.now()}`,
      description: `Payment for ${serviceData.title}`,
      buyerId,
      serviceProviderId,
      serviceId: serviceData.id,
      paymentMethod: selectedPaymentMethod,
    };

    const response = await MalaysianPaymentGatewayService.initiatePayment(paymentRequest);

    if (response.success && response.transactionId) {
      setPaymentResponse(response);
      setTransactionId(response.transactionId);
      
      if (response.redirectUrl) {
        setCurrentStep('redirect');
        // Simulate redirect to payment gateway
        setTimeout(() => {
          simulatePaymentCompletion(response.transactionId);
        }, 3000);
      } else {
        setCurrentStep('success');
      }
    } else {
      setCurrentStep('failed');
    }
    setIsProcessing(false);
  };

  const simulatePaymentCompletion = async (txnId: string) => {
    // In real implementation, this would be a webhook or polling mechanism
    const status = await MalaysianPaymentGatewayService.simulatePaymentCompletion(txnId);
    
    if (status.status === 'completed') {
      // Process the successful payment through our system
      const result = await PaymentService.processOfferPayment(
        offer,
        serviceData,
        buyerId,
        serviceProviderId
      );

      if (result.success && result.activeJobId) {
        setCurrentStep('success');
        setTimeout(() => {
          onClose();
          onPaymentSuccess(result.activeJobId || '');
        }, 2000);
      } else {
        setCurrentStep('failed');
      }
    } else {
      setCurrentStep('failed');
    }
  };

  const handleRetry = () => {
    setCurrentStep('summary');
    setIsProcessing(false);
    setPaymentResponse(null);
    setTransactionId('');
  };

  const handleClose = () => {
    if (isProcessing) {
      Alert.alert(
        'Cancel Payment',
        'Are you sure you want to cancel this payment?',
        [
          { text: 'Continue Payment', style: 'cancel' },
          { text: 'Cancel', style: 'destructive', onPress: onClose }
        ]
      );
    } else {
      onClose();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'summary':
        return renderPaymentSummary();
      case 'method':
        return renderPaymentMethodSelection();
      case 'processing':
        return renderProcessingStep();
      case 'redirect':
        return renderRedirectStep();
      case 'success':
        return renderSuccessStep();
      case 'failed':
        return renderFailedStep();
      default:
        return renderPaymentSummary();
    }
  };

  const renderPaymentSummary = () => {
    console.log('Rendering Payment Summary with data:', {
      serviceData: serviceData,
      offer: offer,
      paymentSummary: paymentSummary
    });
    
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        {/* Job Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <View style={styles.jobDetailsContainer}>
          {/* Service Header */}
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

          {/* Service Provider Information */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>👤 Service Provider:</Text>
            <Text style={styles.detailValue}>{serviceData?.service_provider_name || 'Service Provider'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>⭐ Rating:</Text>
            <Text style={styles.detailValue}>
              {serviceData?.service_provider_rating || '4.5'} ({serviceData?.service_provider_reviews || '10'} reviews)
            </Text>
          </View>

          {/* Service Location */}
          {serviceData?.service_area && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📍 Service Area:</Text>
              <Text style={styles.detailValue}>{serviceData.service_area}</Text>
            </View>
          )}

          {/* Description */}
          {serviceData?.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.detailLabel}>📝 Description:</Text>
              <Text style={styles.descriptionText}>{serviceData.description}</Text>
            </View>
          )}

          {/* Custom Requirements */}
          {offer?.customDescription && (
            <View style={styles.descriptionSection}>
              <Text style={styles.detailLabel}>📋 Custom Requirements:</Text>
              <Text style={styles.descriptionText}>{offer.customDescription}</Text>
            </View>
          )}

          {/* Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.detailLabel}>⏰ Timeline:</Text>
            <View style={styles.timelineItem}>
              <Clock size={16} color={Colors.primary.main} />
              <Text style={styles.timelineText}>Expected Delivery: {offer?.customDeliveryTime || 7} days</Text>
            </View>
            <View style={styles.timelineItem}>
              <Calendar size={16} color={Colors.status.info} />
              <Text style={styles.timelineText}>Start Date: {new Date().toLocaleDateString()}</Text>
            </View>
            <View style={styles.timelineItem}>
              <Calendar size={16} color={Colors.status.success} />
              <Text style={styles.timelineText}>Expected Completion: {new Date(Date.now() + (offer?.customDeliveryTime || 7) * 24 * 60 * 60 * 1000).toLocaleDateString()}</Text>
            </View>
          </View>

          {/* Protection */}
          <View style={styles.protectionSection}>
            <Text style={styles.detailLabel}>🛡️ Protection:</Text>
            <View style={styles.protectionItem}>
              <Shield size={16} color={Colors.status.success} />
              <Text style={styles.protectionText}>Protected by BetaMe Guarantee</Text>
            </View>
          </View>

          {/* Payment Terms */}
          <View style={styles.termsSection}>
            <Text style={styles.detailLabel}>💰 Payment Terms:</Text>
            <View style={styles.termsItem}>
              <CheckCircle size={14} color={Colors.status.success} />
              <Text style={styles.termsText}>Payment held in escrow until job completion</Text>
            </View>
            <View style={styles.termsItem}>
              <CheckCircle size={14} color={Colors.status.success} />
              <Text style={styles.termsText}>Full refund if job not completed on time</Text>
            </View>
            <View style={styles.termsItem}>
              <CheckCircle size={14} color={Colors.status.success} />
              <Text style={styles.termsText}>Dispute resolution available</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Payment Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Summary</Text>
        <View style={styles.paymentDetails}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Service Price</Text>
            <Text style={styles.paymentValue}>
              RM {paymentSummary?.finalPrice || 0}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Service Fee (5%)</Text>
            <Text style={styles.paymentValue}>
              RM {paymentSummary?.serviceFee || 0}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Subtotal</Text>
            <Text style={styles.paymentValue}>
              RM {paymentSummary?.totalAmount || 0}
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

      {/* Wallet Balance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Wallet</Text>
        <View style={styles.walletInfo}>
          <View style={styles.walletRow}>
            <Wallet size={20} color={Colors.primary.main} />
            <Text style={styles.walletLabel}>Available Credits</Text>
            <Text style={styles.walletValue}>
              {walletData?.betame_credits || 0} Credits
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
  };

  const renderPaymentMethodSelection = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose Payment Method</Text>
        
        {/* Credits Option */}
        <TouchableOpacity
          style={[
            styles.paymentMethodOption,
            selectedPaymentMethod === 'credits' && styles.paymentMethodSelected
          ]}
          onPress={() => handlePaymentMethodSelect('credits')}
        >
          <View style={styles.paymentMethodLeft}>
            <Text style={styles.paymentMethodIcon}>💳</Text>
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodName}>BetaMe Credits</Text>
              <Text style={styles.paymentMethodDescription}>
                Use your existing credits (No processing fee)
              </Text>
            </View>
          </View>
          <View style={[
            styles.radioButton,
            selectedPaymentMethod === 'credits' && styles.radioButtonSelected
          ]} />
        </TouchableOpacity>

        {/* Malaysian Payment Gateways */}
        {malaysianGateways.map((gateway) => (
          <TouchableOpacity
            key={gateway.id}
            style={[
              styles.paymentMethodOption,
              selectedPaymentMethod === gateway.id && styles.paymentMethodSelected
            ]}
            onPress={() => handlePaymentMethodSelect(gateway.id as PaymentMethod)}
          >
            <View style={styles.paymentMethodLeft}>
              <Text style={styles.paymentMethodIcon}>{gateway.icon}</Text>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodName}>{gateway.name}</Text>
                <Text style={styles.paymentMethodDescription}>
                  {gateway.description}
                  {gateway.processingFee > 0 && ` (+RM ${gateway.processingFee.toFixed(2)} fee)`}
                </Text>
              </View>
            </View>
            <View style={[
              styles.radioButton,
              selectedPaymentMethod === gateway.id && styles.radioButtonSelected
            ]} />
          </TouchableOpacity>
        ))}

        {/* Bank Selection for FPX */}
        {selectedPaymentMethod === 'fpx' && (
          <View style={styles.bankSelectionContainer}>
            <Text style={styles.bankSelectionTitle}>Select Your Bank</Text>
            <ScrollView style={styles.bankList} showsVerticalScrollIndicator={false}>
              {MalaysianPaymentGatewayService.getSupportedBanks().map((bank) => (
                <TouchableOpacity
                  key={bank}
                  style={[
                    styles.bankOption,
                    selectedBank === bank && styles.bankOptionSelected
                  ]}
                  onPress={() => handleBankSelect(bank)}
                >
                  <Text style={[
                    styles.bankOptionText,
                    selectedBank === bank && styles.bankOptionTextSelected
                  ]}>
                    {bank}
                  </Text>
                  {selectedBank === bank && (
                    <CheckCircle size={20} color={Colors.primary.main} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderProcessingStep = () => (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color={Colors.primary.main} />
      <Text style={styles.processingTitle}>Processing Payment</Text>
      <Text style={styles.processingDescription}>
        Please wait while we process your payment...
      </Text>
    </View>
  );

  const renderRedirectStep = () => (
    <View style={styles.redirectContainer}>
      <ExternalLink size={48} color={Colors.primary.main} />
      <Text style={styles.redirectTitle}>Redirecting to Payment Gateway</Text>
      <Text style={styles.redirectDescription}>
        You will be redirected to {getSelectedGateway().name} to complete your payment.
      </Text>
      {paymentResponse?.redirectUrl && (
        <TouchableOpacity
          style={styles.openPaymentButton}
          onPress={() => Linking.openURL(paymentResponse.redirectUrl!)}
        >
          <Text style={styles.openPaymentButtonText}>Open Payment Gateway</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <LottieView
        source={require('../assets/images/success-animation.json')}
        autoPlay
        loop={false}
        style={styles.lottieAnimation}
      />
      <Text style={styles.successTitle}>Payment Successful!</Text>
      <Text style={styles.successDescription}>
        Your payment has been processed and the job has been created.
      </Text>
      {transactionId && (
        <Text style={styles.transactionId}>Transaction ID: {transactionId}</Text>
      )}
    </View>
  );

  const renderFailedStep = () => (
    <View style={styles.failedContainer}>
      <AlertCircle size={64} color={Colors.status.error} />
      <Text style={styles.failedTitle}>Payment Failed</Text>
      <Text style={styles.failedDescription}>
        {paymentResponse?.error || 'There was an issue with your payment. Please try again.'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const getCurrentStepInfo = () => {
    return paymentSteps.find(step => step.id === currentStep) || paymentSteps[0];
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

  const currentStepInfo = getCurrentStepInfo();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{currentStepInfo.title}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            <Text style={styles.stepDescription}>{currentStepInfo.description}</Text>
          </View>

          {/* Content */}
          {renderStepContent()}

          {/* Footer */}
          {currentStep === 'summary' && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.proceedButton}
                onPress={() => setCurrentStep('method')}
              >
                <Text style={styles.proceedButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 'method' && (
            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => setCurrentStep('summary')}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.payButton,
                  (selectedPaymentMethod === 'fpx' && !selectedBank) && styles.payButtonDisabled
                ]}
                onPress={handleProceedToPayment}
                disabled={selectedPaymentMethod === 'fpx' && !selectedBank}
              >
                <Text style={styles.payButtonText}>
                  Pay RM {getTotalWithProcessingFee().toFixed(2)}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    maxWidth: 450,
    height: '95%',
    maxHeight: 800,
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
  stepIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 15,
  },
  serviceInfo: {
    backgroundColor: Colors.background.secondary,
    padding: 15,
    borderRadius: 12,
    minHeight: 200,
  },
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
    flexShrink: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 5,
    flexWrap: 'wrap',
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
  serviceDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 5,
    fontStyle: 'italic',
    flex: 1,
    flexWrap: 'wrap',
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
    flex: 1,
    flexWrap: 'wrap',
  },
  timelineContainer: {
    gap: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  timelineText: {
    fontSize: 12,
    color: Colors.text.secondary,
    flex: 1,
    flexWrap: 'wrap',
  },
  sellerContainer: {
    marginBottom: 12,
  },
  sellerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.text.secondary,
    flex: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: Colors.text.secondary,
    flex: 1,
    flexWrap: 'wrap',
  },
  paymentTermsContainer: {
    backgroundColor: Colors.background.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  paymentTermsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary.main,
    marginBottom: 8,
  },
  paymentTermsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  paymentTermsText: {
    fontSize: 11,
    color: Colors.text.secondary,
    flex: 1,
    flexWrap: 'wrap',
  },
  debugContainer: {
    backgroundColor: Colors.background.primary,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.main,
  },
  debugText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  simpleContent: {
    padding: 20,
    flex: 1,
  },
  simpleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 20,
  },
  simpleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  simpleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    flex: 0.3,
  },
  simpleValue: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 0.7,
    textAlign: 'right',
  },
  simpleSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  simpleDescription: {
    fontSize: 14,
    color: Colors.text.primary,
    marginTop: 4,
    lineHeight: 20,
  },
  jobDetailsContainer: {
    backgroundColor: Colors.background.secondary,
    padding: 25,
    borderRadius: 12,
    marginBottom: 25,
    minHeight: 300,
  },
  detailRow: {
    flexDirection: 'column',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  descriptionSection: {
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginTop: 8,
    lineHeight: 18,
    fontStyle: 'italic',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  timelineSection: {
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  timelineText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  protectionSection: {
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  protectionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  protectionText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  termsSection: {
    marginBottom: 15,
  },
  termsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  termsText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
  paymentMethodDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
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
  bankSelectionContainer: {
    marginTop: 15,
  },
  bankSelectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 10,
  },
  bankList: {
    maxHeight: 200,
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  bankOptionSelected: {
    borderColor: Colors.primary.main,
    backgroundColor: Colors.primary.light,
  },
  bankOptionText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  bankOptionTextSelected: {
    color: Colors.primary.main,
    fontWeight: '600',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  processingDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  redirectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  redirectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  redirectDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  openPaymentButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  openPaymentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.status.success,
    marginTop: 16,
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  transactionId: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  failedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  failedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.status.error,
    marginTop: 16,
    marginBottom: 8,
  },
  failedDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  proceedButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary.main,
    alignItems: 'center',
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.white,
  },
  backButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  backButtonText: {
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
}); 