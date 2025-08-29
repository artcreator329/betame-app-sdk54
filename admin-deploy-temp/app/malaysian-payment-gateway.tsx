import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, Lock, Shield, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';
import { FeeService } from '../lib/fee-service';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  processingTime: string;
  fee: string;
}

interface Bank {
  id: string;
  name: string;
  code: string;
}

export default function MalaysianPaymentGatewayScreen() {
  const router = useRouter();
  const colors = useColors();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'method' | 'details' | 'processing' | 'success'>('method');

  // Mock payment amount
  const paymentAmount = 150.00;
  const feeCalculation = FeeService.calculateFees(paymentAmount);
  const buyerFee = feeCalculation.buyerFee;
  const totalAmount = feeCalculation.buyerTotal;

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'fpx',
      name: 'FPX (Online Banking)',
      icon: '🏦',
      description: 'Pay directly from your bank account',
      processingTime: 'Instant',
      fee: 'Free'
    },
    {
      id: 'tng',
      name: 'Touch \'n Go eWallet',
      icon: '📱',
      description: 'Pay using your TnG eWallet balance',
      processingTime: 'Instant',
      fee: 'Free'
    },
    {
      id: 'grabpay',
      name: 'GrabPay',
      icon: '🚗',
      description: 'Pay using your GrabPay wallet',
      processingTime: 'Instant',
      fee: 'Free'
    },
    {
      id: 'boost',
      name: 'Boost',
      icon: '⚡',
      description: 'Pay using your Boost wallet',
      processingTime: 'Instant',
      fee: 'Free'
    },
    {
      id: 'credit_card',
      name: 'Credit/Debit Card',
      icon: '💳',
      description: 'Visa, Mastercard, American Express',
      processingTime: '2-3 minutes',
      fee: 'Free'
    }
  ];

  const banks: Bank[] = [
    { id: 'maybank', name: 'Maybank', code: 'MB' },
    { id: 'cimb', name: 'CIMB Bank', code: 'CIMB' },
    { id: 'public', name: 'Public Bank', code: 'PBB' },
    { id: 'rhb', name: 'RHB Bank', code: 'RHB' },
    { id: 'hongleong', name: 'Hong Leong Bank', code: 'HLB' },
    { id: 'ambank', name: 'AmBank', code: 'AMB' },
    { id: 'alliance', name: 'Alliance Bank', code: 'ABMB' },
    { id: 'affin', name: 'Affin Bank', code: 'AFFIN' }
  ];

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    setCurrentStep('details');
  };

  const handleBankSelect = (bankId: string) => {
    setSelectedBank(bankId);
  };

  const handleProceedToPayment = () => {
    if (selectedPaymentMethod === 'credit_card') {
      if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
        Alert.alert('Error', 'Please fill in all card details');
        return;
      }
    } else if (selectedPaymentMethod === 'fpx' && !selectedBank) {
      Alert.alert('Error', 'Please select a bank');
      return;
    }

    setCurrentStep('processing');
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep('success');
    }, 3000);
  };

  const handleBackToMethod = () => {
    setCurrentStep('method');
    setSelectedPaymentMethod('');
    setSelectedBank('');
  };

  const handleComplete = () => {
    Alert.alert(
      'Payment Successful!',
      'Your payment has been processed successfully. You will receive a confirmation email shortly.',
      [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]
    );
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const renderPaymentMethodStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text.primary }]}>Choose Payment Method</Text>
      <Text style={[styles.stepSubtitle, { color: colors.text.secondary }]}>
        Select your preferred payment method
      </Text>

      <View style={styles.paymentMethodsContainer}>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethodCard,
              { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }
            ]}
            onPress={() => handlePaymentMethodSelect(method.id)}
          >
            <View style={styles.paymentMethodHeader}>
              <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
              <View style={styles.paymentMethodInfo}>
                <Text style={[styles.paymentMethodName, { color: colors.text.primary }]}>
                  {method.name}
                </Text>
                <Text style={[styles.paymentMethodDescription, { color: colors.text.secondary }]}>
                  {method.description}
                </Text>
              </View>
            </View>
            <View style={styles.paymentMethodDetails}>
              <Text style={[styles.paymentMethodDetail, { color: colors.text.secondary }]}>
                Processing: {method.processingTime}
              </Text>
              <Text style={[styles.paymentMethodDetail, { color: colors.text.secondary }]}>
                Fee: {method.fee}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPaymentDetailsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={handleBackToMethod}>
          <ArrowLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.stepTitle, { color: colors.text.primary }]}>Payment Details</Text>
        <View style={{ width: 20 }} />
      </View>

      {selectedPaymentMethod === 'fpx' && (
        <View style={styles.bankSelectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Select Your Bank</Text>
          <View style={styles.banksGrid}>
            {banks.map((bank) => (
              <TouchableOpacity
                key={bank.id}
                style={[
                  styles.bankCard,
                  { backgroundColor: colors.background.tertiary, borderColor: colors.border.light },
                  selectedBank === bank.id && { borderColor: colors.primary.main, borderWidth: 2 }
                ]}
                onPress={() => handleBankSelect(bank.id)}
              >
                <Text style={[styles.bankName, { color: colors.text.primary }]}>{bank.name}</Text>
                <Text style={[styles.bankCode, { color: colors.text.secondary }]}>{bank.code}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {selectedPaymentMethod === 'credit_card' && (
        <View style={styles.creditCardContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Card Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Card Number</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="numeric"
              maxLength={19}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Expiry Date</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
                value={expiryDate}
                onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                placeholder="MM/YY"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>CVV</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
                value={cvv}
                onChangeText={setCvv}
                placeholder="123"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Cardholder Name</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
              value={cardholderName}
              onChangeText={setCardholderName}
              placeholder="John Doe"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="words"
            />
          </View>
        </View>
      )}

      {selectedPaymentMethod === 'tng' && (
        <View style={styles.walletContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Touch 'n Go eWallet</Text>
          <View style={[styles.walletInfo, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <Text style={styles.walletIcon}>📱</Text>
            <Text style={[styles.walletText, { color: colors.text.secondary }]}>
              You will be redirected to Touch 'n Go eWallet to complete your payment
            </Text>
          </View>
        </View>
      )}

      {selectedPaymentMethod === 'grabpay' && (
        <View style={styles.walletContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>GrabPay</Text>
          <View style={[styles.walletInfo, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <Text style={styles.walletIcon}>🚗</Text>
            <Text style={[styles.walletText, { color: colors.text.secondary }]}>
              You will be redirected to GrabPay to complete your payment
            </Text>
          </View>
        </View>
      )}

      {selectedPaymentMethod === 'boost' && (
        <View style={styles.walletContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Boost</Text>
          <View style={[styles.walletInfo, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <Text style={styles.walletIcon}>⚡</Text>
            <Text style={[styles.walletText, { color: colors.text.secondary }]}>
              You will be redirected to Boost to complete your payment
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderProcessingStep = () => (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color={colors.primary.main} />
      <Text style={[styles.processingTitle, { color: colors.text.primary }]}>Processing Payment</Text>
      <Text style={[styles.processingSubtitle, { color: colors.text.secondary }]}>
        Please wait while we process your payment...
      </Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <CheckCircle size={64} color={colors.status.success} />
      </View>
      <Text style={[styles.successTitle, { color: colors.text.primary }]}>Payment Successful!</Text>
      <Text style={[styles.successSubtitle, { color: colors.text.secondary }]}>
        Your payment has been processed successfully
      </Text>
      
      <View style={[styles.paymentSummary, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
        <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>Payment Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Amount:</Text>
          <Text style={[styles.summaryValue, { color: colors.text.primary }]}>RM {paymentAmount.toFixed(2)}</Text>
        </View>
                 <View style={styles.summaryRow}>
           <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Processing Fee:</Text>
           <Text style={[styles.summaryValue, { color: colors.text.primary }]}>RM {buyerFee.toFixed(2)}</Text>
         </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={[styles.summaryLabel, { color: colors.text.primary, fontWeight: '600' }]}>Total:</Text>
          <Text style={[styles.summaryValue, { color: colors.text.primary, fontWeight: '600' }]}>RM {totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.completeButton, { backgroundColor: colors.primary.main }]}
        onPress={handleComplete}
      >
        <Text style={[styles.completeButtonText, { color: colors.text.white }]}>Complete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Payment Gateway</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Payment Summary */}
      <View style={[styles.paymentSummaryHeader, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
        <Text style={[styles.paymentAmount, { color: colors.text.primary }]}>RM {totalAmount.toFixed(2)}</Text>
        <Text style={[styles.paymentDescription, { color: colors.text.secondary }]}>
          Processing Fee: RM {buyerFee.toFixed(2)}
        </Text>
      </View>

      {/* Security Badge */}
      <View style={[styles.securityBadge, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
        <Shield size={16} color={colors.status.success} />
        <Text style={[styles.securityText, { color: colors.text.secondary }]}>
          Secure payment powered by Malaysian Payment Gateway
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 'method' && renderPaymentMethodStep()}
        {currentStep === 'details' && renderPaymentDetailsStep()}
        {currentStep === 'processing' && renderProcessingStep()}
        {currentStep === 'success' && renderSuccessStep()}
      </ScrollView>

      {/* Action Button */}
      {currentStep === 'details' && (
        <View style={[styles.actionContainer, { backgroundColor: colors.background.tertiary }]}>
          <TouchableOpacity
            style={[styles.proceedButton, { backgroundColor: colors.primary.main }]}
            onPress={handleProceedToPayment}
          >
            <Text style={[styles.proceedButtonText, { color: colors.text.white }]}>
              Pay RM {totalAmount.toFixed(2)}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  paymentSummaryHeader: {
    padding: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  paymentAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  paymentDescription: {
    fontSize: 14,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  securityText: {
    fontSize: 12,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    paddingVertical: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  paymentMethodsContainer: {
    gap: 12,
  },
  paymentMethodCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    marginBottom: 2,
  },
  paymentMethodDescription: {
    fontSize: 14,
  },
  paymentMethodDetails: {
    marginLeft: 36,
  },
  paymentMethodDetail: {
    fontSize: 12,
    marginBottom: 2,
  },
  bankSelectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  banksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bankCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  bankName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  bankCode: {
    fontSize: 12,
  },
  creditCardContainer: {
    marginTop: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  walletContainer: {
    marginTop: 20,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  walletIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  walletText: {
    fontSize: 14,
    flex: 1,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  paymentSummary: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    paddingTop: 12,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
  },
  actionContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  proceedButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  proceedButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  completeButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
