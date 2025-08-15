import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, Wallet, HelpCircle, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

interface PaymentHelpItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  solutions: string[];
}

function PaymentHelpItem({ icon, title, description, solutions }: PaymentHelpItemProps) {
  const colors = useColors();
  
  return (
    <View style={[styles.helpItem, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIcon}>
          {icon}
        </View>
        <View style={styles.itemTitleContainer}>
          <Text style={[styles.itemTitle, { color: colors.text.primary }]}>{title}</Text>
          <Text style={[styles.itemDescription, { color: colors.text.secondary }]}>{description}</Text>
        </View>
      </View>
      <View style={styles.solutionsList}>
        {solutions.map((solution, index) => (
          <View key={index} style={styles.solutionItem}>
            <CheckCircle size={16} color={colors.status.success} style={styles.checkIcon} />
            <Text style={[styles.solutionText, { color: colors.text.secondary }]}>{solution}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PaymentHelpScreen() {
  const router = useRouter();
  const colors = useColors();

  const handleEmailSupport = () => {
    Linking.openURL('mailto:customer.service@betame.com.my?subject=Payment Support Request');
  };

  const paymentHelpData = [
    {
      icon: <CreditCard size={24} color={colors.primary.main} />,
      title: "Payment Failed",
      description: "Your payment was declined or failed to process",
      solutions: [
        "Check that your card details are entered correctly",
        "Ensure your card has sufficient funds or credit limit",
        "Verify that your card is not expired",
        "Try using a different payment method",
        "Contact your bank to check for any restrictions",
        "Clear your app cache and try again"
      ]
    },
    {
      icon: <Wallet size={24} color={colors.primary.main} />,
      title: "BetaCoin Issues",
      description: "Problems with purchasing or using BetaCoin",
      solutions: [
        "Check your internet connection and try again",
        "Verify that your payment method is valid",
        "Wait a few minutes for the transaction to process",
        "Check your BetaCoin balance in the wallet section",
        "Restart the app and check your balance again",
        "Contact support if BetaCoin doesn't appear after 30 minutes"
      ]
    },
    {
      icon: <RefreshCw size={24} color={colors.primary.main} />,
      title: "Refund Requests",
      description: "How to request refunds for services or purchases",
      solutions: [
        "Contact the service provider first to resolve the issue",
        "Use the dispute resolution system in the app",
        "Provide clear documentation of the problem",
        "Submit a refund request through customer support",
        "Allow 5-7 business days for refund processing",
        "Check your original payment method for the refund"
      ]
    },
    {
      icon: <AlertCircle size={24} color={colors.status.warning} />,
      title: "Unauthorized Charges",
      description: "Suspicious or unauthorized transactions on your account",
      solutions: [
        "Immediately change your account password",
        "Review your recent transaction history",
        "Report the unauthorized charge to our support team",
        "Contact your bank or card issuer",
        "Enable additional security features on your account",
        "Monitor your account regularly for suspicious activity"
      ]
    },
    {
      icon: <HelpCircle size={24} color={colors.primary.main} />,
      title: "Payment Methods",
      description: "Adding, removing, or updating payment methods",
      solutions: [
        "Go to Settings > Payment Methods to manage cards",
        "Ensure your payment method is supported in your region",
        "Update expired cards with new expiration dates",
        "Remove old or unused payment methods for security",
        "Add multiple payment methods as backup options",
        "Verify your billing address matches your card details"
      ]
    },
    {
      icon: <CheckCircle size={24} color={colors.status.success} />,
      title: "Transaction History",
      description: "Viewing and understanding your payment history",
      solutions: [
        "Access transaction history through the Wallet section",
        "Filter transactions by date, type, or amount",
        "Download transaction receipts for your records",
        "Check transaction status (pending, completed, failed)",
        "Contact support for missing transaction records",
        "Keep receipts for tax or business purposes"
      ]
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Payment Help</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Payment Support</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Get help with payments, BetaCoin, refunds, and billing issues
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}
              onPress={() => router.push('/wallet')}
            >
              <Wallet size={24} color={colors.primary.main} />
              <Text style={[styles.quickActionText, { color: colors.text.primary }]}>View Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}
              onPress={handleEmailSupport}
            >
              <CreditCard size={24} color={colors.primary.main} />
              <Text style={[styles.quickActionText, { color: colors.text.primary }]}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Help Items */}
        <View style={styles.helpContainer}>
          {paymentHelpData.map((item, index) => (
            <PaymentHelpItem
              key={index}
              icon={item.icon}
              title={item.title}
              description={item.description}
              solutions={item.solutions}
            />
          ))}
        </View>

        {/* Supported Payment Methods */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Supported Payment Methods</Text>
          <View style={[styles.paymentMethods, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <Text style={[styles.paymentMethodsTitle, { color: colors.text.primary }]}>We Accept:</Text>
            <Text style={[styles.paymentMethodsList, { color: colors.text.secondary }]}>
              • Major credit cards (Visa, Mastercard, American Express)
              {'\n'}• Debit cards
              {'\n'}• Online banking (FPX)
              {'\n'}• Digital wallets (Touch 'n Go, GrabPay, Boost)
              {'\n'}• BetaCoin (our virtual currency)
            </Text>
          </View>
        </View>

        {/* Security Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Payment Security</Text>
          <View style={[styles.securityInfo, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <View style={styles.securityHeader}>
              <CheckCircle size={24} color={colors.status.success} />
              <Text style={[styles.securityTitle, { color: colors.text.primary }]}>Your payments are secure</Text>
            </View>
            <Text style={[styles.securityText, { color: colors.text.secondary }]}>
              We use industry-standard encryption and security measures to protect your payment information. 
              Your card details are never stored on our servers and all transactions are processed through 
              secure, PCI-compliant payment gateways.
            </Text>
          </View>
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <Text style={[styles.contactTitle, { color: colors.text.primary }]}>Still Need Help?</Text>
          <Text style={[styles.contactText, { color: colors.text.secondary }]}>
            If you can't find the solution to your payment issue, our support team is here to help.
          </Text>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: colors.primary.main }]}
            onPress={handleEmailSupport}
          >
            <Text style={[styles.contactButtonText, { color: colors.text.white }]}>Contact Payment Support</Text>
          </TouchableOpacity>
          <Text style={[styles.responseTime, { color: colors.text.secondary }]}>
            Average response time: 2-4 hours for payment issues
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.copyright, { color: colors.text.secondary }]}>
            © 2025 Betame Sdn. Bhd. All rights reserved.
          </Text>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  helpContainer: {
    marginBottom: 32,
  },
  helpItem: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  itemIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  itemTitleContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  solutionsList: {
    marginLeft: 40,
  },
  solutionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  solutionText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  paymentMethods: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  paymentMethodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  paymentMethodsList: {
    fontSize: 15,
    lineHeight: 22,
  },
  securityInfo: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  securityText: {
    fontSize: 15,
    lineHeight: 22,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  contactButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  responseTime: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  copyright: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});