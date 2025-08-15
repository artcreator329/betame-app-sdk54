import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Terms of Service</Text>
          <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>Last updated: January 1, 2025</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>1. Acceptance of Terms</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            By accessing and using BetaMe services, you accept and agree to be bound by the terms and provision of this agreement. 
            If you do not agree to abide by the above, please do not use this service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>2. Service Description</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            BetaMe is a marketplace platform that connects service providers with customers. We facilitate transactions but are not 
            directly involved in the actual exchange of services between users.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>3. User Responsibilities</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Users are responsible for:
            {'\n'}• Providing accurate and truthful information
            {'\n'}• Maintaining the security of their account
            {'\n'}• Complying with all applicable laws and regulations
            {'\n'}• Respecting other users and their intellectual property
            {'\n'}• Using the platform for legitimate business purposes only
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>4. Payment Terms</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            All payments are processed securely through our payment partners. Service fees and commissions are clearly disclosed 
            before any transaction. Refunds are subject to our refund policy and the specific terms agreed upon between users.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>5. Prohibited Activities</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Users may not:
            {'\n'}• Engage in fraudulent or illegal activities
            {'\n'}• Harass, abuse, or harm other users
            {'\n'}• Post inappropriate or offensive content
            {'\n'}• Attempt to circumvent platform fees
            {'\n'}• Use automated systems to access the platform
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>6. Intellectual Property</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            The BetaMe platform, including its design, features, and content, is owned by Betame Sdn. Bhd. and protected by 
            intellectual property laws. Users retain ownership of their own content but grant us a license to use it on the platform.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>7. Limitation of Liability</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            BetaMe is not liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. 
            Our total liability is limited to the amount of fees paid by you in the 12 months preceding the claim.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>8. Termination</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We reserve the right to terminate or suspend accounts that violate these terms. Users may also terminate their 
            accounts at any time by contacting customer service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>9. Changes to Terms</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We may update these terms from time to time. Users will be notified of significant changes, and continued use 
            of the platform constitutes acceptance of the updated terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>10. Contact Information</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            For questions about these Terms of Service, please contact us at:
            {'\n'}Email: customer.service@betame.com.my
            {'\n'}Developer inquiries: developer@betame.com.my
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
  lastUpdated: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
  },
  copyright: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});