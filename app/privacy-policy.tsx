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
          <Text style={[styles.title, { color: colors.text.primary }]}>BetaMe – Privacy Policy</Text>
          <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>Effective Date: 7th September 2025</Text>
          <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>Last Updated: 7th September 2025</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>1. Introduction</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            BetaMe ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal data when you use our mobile application and related services (the "Service"). By using the Service, you acknowledge that you have read and understood this Privacy Policy and agree to the practices described herein. If you do not agree, please discontinue use of the Service.
            {'\n\n'}"Personal Data" is defined in the Personal Data Protection Act 2010 ("PDPA") and generally refers to any information that relates directly or indirectly to you, from which you may be identified, and includes sensitive personal data and expressions of opinion about you.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>2. What Personal Data We Collect</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>2.1 Personal Information</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Account Information: Full name, email address, phone number, date of birth, gender, residential address, profile photo, government-issued ID (for verification).
            {'\n\n'}• Payment Information: Credit/debit card details, bank account information, payment history, billing address.
            {'\n\n'}• Service Information: Service preferences, booking history, reviews and ratings, communication records.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>2.2 Location Data</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • GPS coordinates (if location services are enabled).
            {'\n'}• Address and service delivery locations.
            {'\n'}• Approximate geolocation derived from IP address.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>2.3 Device and Usage Data</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Device type, model, and operating system version.
            {'\n'}• App version and device identifiers (UDID, advertising ID).
            {'\n'}• IP address, browser type, and version.
            {'\n'}• Usage patterns, preferences, crash reports, and diagnostic data.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>2.4 Communication Data</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Messages exchanged between users.
            {'\n'}• Customer support communications.
            {'\n'}• Notification and marketing preferences.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>3. How We Collect Personal Data</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We collect Personal Data:
            {'\n\n'}• Directly from you: e.g., during account registration, profile updates, booking requests, payment transactions, surveys, or customer support interactions conducted through, among others, telephone calls, emails, letters, SMS, social media platforms, or in-person and virtual meetings. This also includes situations where you provide your Personal Data to us for any purpose not otherwise specified herein.
            {'\n\n'}• Automatically: through cookies, device identifiers, log files, and in-app usage analytics and when you interact with our communications such as emails or marketing messages (including when you request to be contacted, subscribe to mailing lists, or respond to promotional initiatives).
            {'\n\n'}• From third parties: including payment processors, identity verification providers, social media integrations, marketing partners, and public databases.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>4. How We Use Your Information</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Your Personal Data is used strictly for lawful purposes, including but not limited to:
            {'\n\n'}• Service Provision: To create and manage accounts, facilitate transactions, enable communication between users, and provide customer support.
            {'\n\n'}• Verification and Security: To confirm identities, detect fraud, prevent abuse, and maintain platform integrity.
            {'\n\n'}• Improvement and Analytics: To analyze usage patterns, test features, enhance user experience, and develop new services.
            {'\n\n'}• Communication: To send service-related updates, administrative notices, and---with your consent---marketing communications.
            {'\n\n'}• Legal and Compliance: To comply with applicable laws, enforce our Terms of Service, resolve disputes, and protect the rights, safety, and property of BetaMe, users, and third parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>5. Disclosure of Personal Data</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We may disclose Personal Data as follows:
            {'\n\n'}• To Other Users: Limited information such as profile details, service-related communications, ratings, and necessary location data.
            {'\n\n'}• To Service Providers: Third-party vendors who provide payment processing, hosting, analytics, cloud storage, customer support, and marketing services, subject to confidentiality obligations.
            {'\n\n'}• For Legal Purposes: Where required by law, regulation, or court order; or to protect BetaMe's legal rights, property, and safety.
            {'\n\n'}• Business Transfers: In connection with a merger, acquisition, sale of assets, restructuring, or insolvency.
            {'\n\n'}• With Consent: When you authorize sharing with third parties for integrations, promotions, or research purposes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>6. Data Security</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We adopt appropriate technical and organisational measures to protect your Personal Data against accidental, unlawful, or unauthorised destruction, loss, alteration, access, disclosure, or use. Such measures include, but are not limited to, the following:
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>6.1 Security Measures</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Encryption of Personal Data both in transit and at rest.
            {'\n'}• Maintenance of secure server infrastructure.
            {'\n'}• Periodic security testing, audits, and monitoring.
            {'\n'}• Implementation of access controls and authentication.
            {'\n'}• Ongoing training of employee on data protection and information security obligations.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>6.2 Payment Security</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Compliance with the Payment Card Industry Data Security Standard (PCI DSS).
            {'\n'}• Tokenization and encryption of payment data.
            {'\n'}• Use of secure payment gateways and processors.
            {'\n'}• Deployment of fraud detection, monitoring, and prevention systems.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>6.3 Incident Response</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Continuous security monitoring.
            {'\n'}• Established incident response protocols to address potential breaches.
            {'\n'}• User notification procedures to affected users and regulators in accordance with applicable law.
            {'\n'}• Remediation and mitigation measures to prevent recurrence.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>7. Data Retention</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We will retain your Personal Data only for as long as is reasonably necessary to fulfil the purposes for which it was collected, as outlined in this Policy, or to comply with legal, regulatory, and contractual requirements. Once retention is no longer necessary, Personal Data will be securely deleted or anonymised in accordance with the PDPA.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>7.1 Retention Periods</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Account Information: Retained for the duration of your active account and for a reasonable period thereafter to resolve disputes, enforce agreements, or as otherwise required by law.
            {'\n\n'}• Transaction and Payment Records: Retained for a minimum of seven (7) years to comply with accounting, taxation, and statutory requirements.
            {'\n\n'}• Communications (including customer support and correspondence): Retained for up to two (2) years from the date of the last interaction, unless a longer retention period is necessary for dispute resolution, fraud prevention, or legal compliance.
            {'\n\n'}• Analytics and Usage Data: Retained for up to three (3) years for service improvement and research purposes, after which such data will be anonymised or securely deleted.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>7.2 Deletion and Disposal</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            You may request the deletion of your Personal Data at any time. Such requests will be honoured unless retention is required to comply with legal, regulatory, contractual, or legitimate business obligations. Personal Data that is no longer required will be securely destroyed, anonymised, or permanently deleted from our records and systems in accordance with the PDPA.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>8. Your Privacy Rights</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Under the PDPA, you have the following rights:
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>8.1 Access and Portability</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Request access to your Personal Data.
            {'\n'}• Obtain a copy in a portable format.
            {'\n'}• Request details of how your Personal Data is processed.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>8.2 Correction and Updates</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Correct or update inaccurate, incomplete, or outdated information.
            {'\n'}• Ask us to complete missing data.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>8.3 Deletion and Erasure</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Request deletion of your account or specific Personal Data that is no longer needed.
            {'\n'}• Exercise your "right to be forgotten," subject to legal or regulatory requirements.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>8.4 Withdraw or Restrict Processing</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Withdraw your consent to processing (where applicable).
            {'\n'}• Request that we limit processing that may cause damage or distress.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>8.5 Communication Preferences</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Opt out of marketing messages at any time.
            {'\n'}• Manage push notifications and message frequency.
            {'\n'}• Note: we may still send you essential service-related communications.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>9. Cookies and Tracking</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>9.1 Types of Cookies</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We use cookies to support the Service, including:
            {'\n'}• Essential (required for core functions)
            {'\n'}• Analytics (to understand usage)
            {'\n'}• Preferences (to remember your settings)
            {'\n'}• Marketing (to show relevant ads)
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>9.2 Cookie Management</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            You can manage cookies by:
            {'\n'}• Adjusting your browser settings to block or delete cookies.
            {'\n'}• Using device or app settings to control cookies and tracking.
            {'\n'}• Opting out of third-party cookies through their own policies.
            {'\n'}• Choosing to disable certain cookies, noting that some features of the Service may not function properly.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>10. Third-Party Services</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>10.1 Integrated Services</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We may integrate with or rely on third-party services, including:
            {'\n'}• Social media platforms.
            {'\n'}• Payment processors and financial institutions.
            {'\n'}• Map and location services.
            {'\n'}• Analytics and performance monitoring providers.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>10.2 Third-Party Policies</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Each third-party service provider has its own privacy policy and practices, which govern how they process Personal Data.
            {'\n'}• We are not responsible for the content, security, or privacy practices of such third parties.
            {'\n'}• You are encouraged to review the privacy policies of these third parties before using their services.
            {'\n'}• Where applicable, you may manage or limit data sharing through your account settings or by withdrawing consent, subject to the PDPA.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>11. International Data Transfers</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>11.1 Cross-Border Processing</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Your Personal Data may be transferred or stored outside Malaysia where our servers or service providers are located.
            {'\n'}• We will ensure appropriate safeguards are in place and that such transfers comply with the PDPA.
            {'\n'}• Where required by law, we will obtain your consent before transferring your data overseas.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>11.2 Regional Compliance</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • We comply with Malaysia's PDPA for all users.
            {'\n'}• For users outside Malaysia, we will also observe applicable local data protection requirements where relevant.
            {'\n'}• We continue to review and update our practices to ensure compliance.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>12. Children's Privacy</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • The Service is not intended for individuals under the age of 18.
            {'\n'}• We do not knowingly collect or process Personal Data of minors without parental or guardian consent, as required under the PDPA.
            {'\n'}• Parents or guardians are encouraged to supervise minors' use of the Service.
            {'\n'}• If you believe that we have inadvertently collected Personal Data of a minor, please contact us immediately so we can take appropriate action.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>13. Changes to This Policy</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>13.1 Policy Updates</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • We may amend or update this Privacy Policy from time to time, in line with the PDPA and other applicable laws.
            {'\n'}• Any material changes will be communicated to you clearly and in a timely manner.
            {'\n'}• Your continued use of the Service after such changes indicates your acceptance of the updated Policy.
            {'\n'}• You may request access to prior versions of this Policy at any time.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>13.2 Notification Methods</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • In-app messages
            {'\n'}• Email
            {'\n'}• Notices on our website
            {'\n'}• Push notifications
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>14. Contact Information</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            <Text style={styles.bold}>Privacy Inquiries:</Text>
            {'\n'}Email: privacy@betame.com
            {'\n'}Address: 23, Jalan SB Indah 2/15, Taman Sungai Besi Indah, Seri Kembangan, 43300 Selangor
            {'\n'}Phone: 016-6497179
            {'\n\n'}<Text style={styles.bold}>Data Protection Officer (DPO):</Text>
            {'\n'}Email: dpo@betame.com
            {'\n'}Address: [Insert DPO Address]
            {'\n\n'}<Text style={styles.bold}>Response Times:</Text>
            {'\n'}• General inquiries: We aim to respond within 14 business days.
            {'\n'}• Requests to access or correct personal data: We will respond within 21 days from the date we receive a complete request.
            {'\n'}• Urgent matters: We will respond within 14 business days, where reasonably practicable.
            {'\n\n'}If we need more time than the stated timeframe, we will notify you in writing with the reason for the delay and let you know when you can expect a full response.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            This Privacy Policy explains how we collect, use, and protect your information. For any concerns, please contact us using the details above.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.copyright, { color: colors.text.secondary }]}>
            © 2025 BetaMe. All rights reserved.
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
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
  },
  bold: {
    fontWeight: '600',
  },
  copyright: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});