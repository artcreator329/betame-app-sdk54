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

export default function LegalScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Legal Information</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Legal Information</Text>
          <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>Last updated: January 1, 2025</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>1. Company Information</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            BetaMe is operated by Betame Sdn. Bhd., a company registered in Malaysia.
            {'\n'}Company Registration Number: [Registration Number]
            {'\n'}Registered Address: [Company Address]
            {'\n'}Email: legal@betame.com.my
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>2. Data Protection & Privacy</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We are committed to protecting your privacy and personal data in accordance with:
            {'\n'}• Personal Data Protection Act 2010 (PDPA) - Malaysia
            {'\n'}• General Data Protection Regulation (GDPR) - EU
            {'\n'}• Other applicable data protection laws
            {'\n\n'}Your personal data is collected, processed, and stored securely. We do not sell your personal information to third parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>3. Consumer Rights</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            As a consumer, you have the right to:
            {'\n'}• Clear and accurate information about services
            {'\n'}• Fair and transparent pricing
            {'\n'}• Quality services as described
            {'\n'}• Refund or replacement for unsatisfactory services
            {'\n'}• Protection against unfair business practices
            {'\n'}• Lodge complaints and seek redress
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>4. Service Provider Obligations</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Service providers must:
            {'\n'}• Comply with all applicable laws and regulations
            {'\n'}• Provide accurate service descriptions and pricing
            {'\n'}• Maintain appropriate licenses and certifications
            {'\n'}• Deliver services as promised
            {'\n'}• Maintain professional standards
            {'\n'}• Respect consumer rights and privacy
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>5. Dispute Resolution</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            In case of disputes between users:
            {'\n'}• We encourage direct communication between parties
            {'\n'}• Our customer service team can mediate disputes
            {'\n'}• Users may seek resolution through our dispute resolution process
            {'\n'}• Legal action may be pursued in Malaysian courts
            {'\n'}• Alternative dispute resolution methods are available
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>6. Tax Obligations</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Users are responsible for:
            {'\n'}• Declaring income from platform transactions
            {'\n'}• Paying applicable taxes on earnings
            {'\n'}• Maintaining proper financial records
            {'\n'}• Complying with tax regulations
            {'\n'}• Obtaining necessary business licenses
            {'\n\n'}BetaMe may provide transaction records for tax purposes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>7. Intellectual Property Rights</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Platform content and design are protected by copyright
            {'\n'}• BetaMe trademarks and logos are registered
            {'\n'}• Users retain rights to their own content
            {'\n'}• Unauthorized use of our intellectual property is prohibited
            {'\n'}• Report intellectual property violations to legal@betame.com.my
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>8. Regulatory Compliance</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            BetaMe complies with:
            {'\n'}• Malaysian Communications and Multimedia Act 1998
            {'\n'}• Consumer Protection Act
            {'\n'}• Competition Act 2010
            {'\n'}• E-commerce regulations
            {'\n'}• Financial services regulations (where applicable)
            {'\n'}• Industry-specific regulations
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>9. Liability Limitations</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • BetaMe acts as an intermediary platform
            {'\n'}• We are not responsible for user-to-user transactions
            {'\n'}• Service quality is the responsibility of service providers
            {'\n'}• Our liability is limited as outlined in our Terms of Service
            {'\n'}• Users should exercise due diligence when engaging services
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>10. Legal Notices</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • This platform is intended for legal business activities only
            {'\n'}• Users must comply with all applicable laws
            {'\n'}• We reserve the right to report illegal activities to authorities
            {'\n'}• Legal notices should be sent to legal@betame.com.my
            {'\n'}• Service of legal documents should follow proper procedures
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Contact Information</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            For legal inquiries about these Terms of Service:
            {'\n'}Email: legal@betame.com
            {'\n'}Address: 23, Jalan SB Indah 2/15, Taman Sungai Besi Indah, Seri Kembangan, 43300 Selangor
            {'\n'}Phone: 016-6497179
            {'\n\n'}• Our liability is limited as outlined in our Terms of Service
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.copyright, { color: colors.text.secondary }]}>
            © 2025 Betame Sdn. Bhd. All rights reserved.
            {'\n'}This legal information is provided for general guidance only and does not constitute legal advice.
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
    lineHeight: 20,
  },
});
