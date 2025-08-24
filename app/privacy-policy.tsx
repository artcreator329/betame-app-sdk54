import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Privacy Policy</Text>
          <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>Last updated: January 1, 2025</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>1. Information We Collect</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us. 
            This includes:
            {'\n'}• Personal information (name, email, phone number)
            {'\n'}• Profile information (bio, profile picture, location)
            {'\n'}• Payment information (processed securely by our payment partners)
            {'\n'}• Communication data (messages, reviews, support tickets)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>2. How We Use Your Information</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We use your information to:
            {'\n'}• Provide and improve our services
            {'\n'}• Process transactions and send confirmations
            {'\n'}• Communicate with you about your account and services
            {'\n'}• Send marketing communications (with your consent)
            {'\n'}• Ensure platform security and prevent fraud
            {'\n'}• Comply with legal obligations
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>3. Information Sharing</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We may share your information with:
            {'\n'}• Other users (as necessary for transactions)
            {'\n'}• Service providers who assist our operations
            {'\n'}• Payment processors for transaction processing
            {'\n'}• Law enforcement when required by law
            {'\n'}• Business partners (with your explicit consent)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>4. Data Security</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We implement appropriate security measures to protect your personal information against unauthorized access, 
            alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security audits.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>5. Data Retention</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We retain your personal information for as long as necessary to provide our services and comply with legal obligations. 
            You may request deletion of your account and associated data at any time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>6. Your Rights</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            You have the right to:
            {'\n'}• Access your personal information
            {'\n'}• Correct inaccurate information
            {'\n'}• Delete your account and data
            {'\n'}• Opt-out of marketing communications
            {'\n'}• Data portability (receive a copy of your data)
            {'\n'}• Object to certain processing activities
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>7. Cookies and Tracking</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We use cookies and similar technologies to improve your experience, analyze usage patterns, and provide personalized content. 
            You can control cookie settings through your device preferences.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>8. Third-Party Services</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Our platform may contain links to third-party services. We are not responsible for the privacy practices of these 
            external services. Please review their privacy policies before providing any information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>9. Children's Privacy</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Our services are not intended for children under 13. We do not knowingly collect personal information from children 
            under 13. If we become aware of such collection, we will delete the information immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>10. Changes to Privacy Policy</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We may update this privacy policy from time to time. We will notify you of any material changes by posting the 
            new policy on this page and updating the "last updated" date.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>11. Contact Us</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            If you have any questions about this Privacy Policy, please contact us at:
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
    fontFamily: Platform.OS === 'web' ? 'League Spartan, system-ui, -apple-system, sans-serif' : 'System',
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