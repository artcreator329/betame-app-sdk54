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
import { ArrowLeft, Users, Shield, Heart, AlertTriangle, MessageCircle, Star, Flag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

export default function CommunityGuidelinesScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Community Guidelines</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text.primary }]}>BetaMe Community Guidelines</Text>
          <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>Effective Date: 26/8/2025</Text>
          <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>Last Updated: 26/8/2025</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Our Mission</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            BetaMe is committed to fostering a safe, respectful, and inclusive community where users can connect, collaborate, and access quality services. These guidelines help ensure everyone has a positive experience on our platform.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>1. Respect and Kindness</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Treat all users with respect, dignity, and kindness
            {'\n'}• Use inclusive and appropriate language
            {'\n'}• Avoid discriminatory, offensive, or inflammatory comments
            {'\n'}• Respect cultural differences and diverse perspectives
            {'\n'}• Be patient and understanding with others
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>2. Professional Communication</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Maintain professional and courteous communication
            {'\n'}• Respond promptly to messages and inquiries
            {'\n'}• Use clear, respectful language in all interactions
            {'\n'}• Avoid aggressive, threatening, or harassing behavior
            {'\n'}• Keep discussions relevant and constructive
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>3. Service Quality Standards</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>For Service Providers:</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Deliver services as described and agreed upon
            {'\n'}• Maintain high professional standards
            {'\n'}• Meet deadlines and commitments
            {'\n'}• Provide accurate service descriptions and pricing
            {'\n'}• Handle disputes professionally and constructively
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>For Customers:</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Provide clear requirements and expectations
            {'\n'}• Communicate respectfully with service providers
            {'\n'}• Pay promptly for completed services
            {'\n'}• Provide honest and constructive feedback
            {'\n'}• Respect service providers' time and expertise
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>4. Content and Media</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Share only appropriate and relevant content
            {'\n'}• Respect intellectual property rights
            {'\n'}• Avoid sharing misleading or false information
            {'\n'}• Do not post spam, advertisements, or promotional content
            {'\n'}• Keep personal information private and secure
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>5. Safety and Security</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Never share personal financial information in chat
            {'\n'}• Use the platform's secure payment system only
            {'\n'}• Report suspicious or fraudulent activities immediately
            {'\n'}• Protect your account credentials
            {'\n'}• Be cautious when meeting in person (if applicable)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>6. Prohibited Activities</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            The following activities are strictly prohibited:
            {'\n\n'}• Harassment, bullying, or intimidation
            {'\n'}• Discrimination based on race, religion, gender, or other characteristics
            {'\n'}• Fraud, scams, or deceptive practices
            {'\n'}• Illegal activities or services
            {'\n'}• Spam, phishing, or unsolicited commercial messages
            {'\n'}• Impersonation of others or false representation
            {'\n'}• Sharing of explicit, violent, or inappropriate content
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>7. Reporting and Enforcement</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Report violations using the in-app reporting feature
            {'\n'}• Provide specific details when reporting issues
            {'\n'}• False reports may result in account penalties
            {'\n'}• BetaMe reserves the right to take appropriate action
            {'\n'}• Actions may include warnings, temporary suspension, or permanent ban
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>8. Dispute Resolution</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Attempt to resolve disputes directly with the other party first
            {'\n'}• Use the platform's messaging system for communication
            {'\n'}• Contact customer support for assistance when needed
            {'\n'}• Provide evidence and documentation for disputes
            {'\n'}• Accept mediation decisions in good faith
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>9. Privacy and Data Protection</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Respect others' privacy and personal information
            {'\n'}• Do not share private conversations or personal data
            {'\n'}• Follow data protection laws and regulations
            {'\n'}• Use the platform's privacy settings appropriately
            {'\n'}• Report privacy violations immediately
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>10. Continuous Improvement</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • These guidelines may be updated periodically
            {'\n'}• Stay informed about changes and updates
            {'\n'}• Provide constructive feedback to help improve the community
            {'\n'}• Participate in community discussions respectfully
            {'\n'}• Help create a positive environment for all users
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Contact Information</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            If you have questions about these guidelines or need to report violations:
            {'\n\n'}• Email: community@betame.com
            {'\n'}• In-app support: Use the "Contact Us" feature
            {'\n'}• Emergency: Contact local authorities for urgent safety concerns
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            By using BetaMe, you agree to follow these Community Guidelines. Violations may result in account restrictions or termination. Thank you for helping us maintain a safe and welcoming community.
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
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'League Spartan, system-ui, -apple-system, sans-serif' : 'System',
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'League Spartan, system-ui, -apple-system, sans-serif' : 'System',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: Platform.OS === 'web' ? 'League Spartan, system-ui, -apple-system, sans-serif' : 'System',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'League Spartan, system-ui, -apple-system, sans-serif' : 'System',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.OS === 'web' ? 'League Spartan, system-ui, -apple-system, sans-serif' : 'System',
  },
});
