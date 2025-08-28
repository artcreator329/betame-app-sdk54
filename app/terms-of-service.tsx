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
          <Text style={[styles.title, { color: colors.text.primary }]}>BetaMe – Terms of Service</Text>
          <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>Effective Date: 26/8/2025</Text>
          <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>Last Updated: 26/8/2025</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>1. Introduction</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Welcome to <Text style={styles.bold}>BetaMe</Text> ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the BetaMe mobile application and related services (collectively, the "Service").
            {'\n\n'}By accessing or using our Service, you agree to be bound by these Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>2. Acceptance of Terms</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            By creating an account, downloading, accessing, or using the BetaMe application, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
            {'\n\n'}If you do not agree, you shall not access or use the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>3. Eligibility</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            To use the Service, you must satisfy the following conditions:
            {'\n\n'}• Be at least <Text style={styles.bold}>18 years of age</Text> or the age of majority in your jurisdiction;
            {'\n'}• Have the legal capacity to enter into binding agreements;
            {'\n'}• Not be prohibited from using the Service under any applicable laws; and
            {'\n'}• Provide accurate, up-to-date and complete registration information.
            {'\n\n'}Use of the Service constitutes a representation and warranty that the user satisfies all eligibility requirements. Individuals who do not meet these requirements are not permitted to access or use the Service. If you do not meet all of these requirements, you must not access or use the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>4. Account Registration and Security</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>4.1 Account Creation</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Certain features require registration of an account.
            {'\n'}• You must provide accurate, current, and complete information at all times.
            {'\n'}• Misleading or false information may result in account suspension.
            {'\n'}• You must promptly update your information when changes occur.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>4.2 Account Security</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • You are responsible for maintaining confidentiality of login details.
            {'\n'}• All activities conducted under your account will be deemed your responsibility.
            {'\n'}• You are responsible for all activities under your account.
            {'\n'}• Notify us immediately if you suspect unauthorized use.
            {'\n'}• We reserve the right to suspend or terminate accounts that violate these Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>5. Service Description</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            BetaMe is a platform connecting users seeking services ("Customers") with service providers ("Providers"). Features include amongst others:
            {'\n\n'}• Service discovery and booking;
            {'\n'}• Secure payment processing via escrow;
            {'\n'}• In-app communication between Customers and Providers;
            {'\n'}• Ratings and reviews functionality; and
            {'\n'}• Dispute resolution mechanisms.
            {'\n\n'}The above features are illustrative and not intended to represent an exhaustive list of all functions of the Service.
            {'\n\n'}We only provide the Platform to connect Providers and Customers. We do not provide the services offered by Providers, and we do not guarantee the quality, outcome, or performance of those services.
            {'\n\n'}All services are the sole responsibility of the Providers. To the extent permitted by Malaysian law, we are not liable for any loss, damage, or claims arising from a Providers' services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>6. User Responsibilities</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>6.1 General Conduct</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Users agree to:
            {'\n'}• Comply with all applicable laws and regulations;
            {'\n'}• Provide accurate and truthful information;
            {'\n'}• Respect the rights, property and privacy of others;
            {'\n'}• Communicate respectfully and professionally; and
            {'\n'}• Report any violations of these Terms to us.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>6.2 Prohibited Activities</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Users shall not:
            {'\n'}• Use the Service for unlawful purposes;
            {'\n'}• Harass, abuse, or harm others;
            {'\n'}• Upload or share false, misleading, defamatory or fraudulent content;
            {'\n'}• Circumvent or manipulate payment systems;
            {'\n'}• Reverse-engineer the platform or attempt to access source code;
            {'\n'}• Create multiple accounts to bypass restrictions; and
            {'\n'}• Engage in spamming or unsolicited messaging.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>7. Service Provider Terms</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>7.1 Provider Obligations</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Providers must:
            {'\n'}• Hold all required licenses, permits, and qualifications under Malaysian law;
            {'\n'}• Deliver services professionally, timely, and as described;
            {'\n'}• Maintain adequate insurance coverage, where required;
            {'\n'}• Follow all applicable laws and regulations including trade licensing requirements; and
            {'\n'}• Honor confirmed bookings.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>7.2 Service Standards</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Services must be delivered as described.
            {'\n'}• Services must meet reasonable quality standards.
            {'\n'}• Providers must communicate promptly and professionally with Customers.
            {'\n'}• Any changes to services must be notified immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>8. Payment Terms</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>8.1 Payment Processing</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Payments are processed through our secure escrow system.
            {'\n'}• Providers will only receive funds once a service is marked as successfully completed. Payments may be withheld in the event of a dispute and such payments shall only be released upon resolution.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>8.2 Fees and Charges</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Platform fees shall apply to all transactions as the case may be.
            {'\n'}• All fees and applicable taxes will be disclosed before payment.
            {'\n'}• Additional charges may apply for premium features.
            {'\n'}• Fees are non-refundable unless otherwise stated.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>8.3 Refunds and Disputes</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Refund requests will be assessed on a case-by-case basis.
            {'\n'}• Disputes must be reported within 48 hours of service completion.
            {'\n'}• Mediation services are available for payment disputes; however, no guarantee is made regarding the outcome of such mediation.
            {'\n'}• Final decisions are made at the sole discretion of BetaMe.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>9. Content and Intellectual Property</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>9.1 User Content</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • You retain ownership of content submitted to the Service.
            {'\n'}• By submitting, you grant us the license to use, display, reproduce, and distribute such content for platform purposes.
            {'\n'}• You are responsible for ensuring you have rights to the content.
            {'\n'}• We may remove content that violates these Terms or applicable law.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>9.2 Platform Content</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • All platform content, trademarks, designs, and software are owned by or licensed to BetaMe.
            {'\n'}• You may not copy, modify, reproduce or distribute without prior written consent.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>9.3 Electronic Communication</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • You acknowledge and agree that you are fully responsible for the authenticity of all communications you send to BetaMe through electronic means.
            {'\n'}• Any communication or instruction that includes your user identification will be treated as if it came directly from you.
            {'\n'}• BetaMe is not required to verify whether such communications actually originated from you.
            {'\n'}• By using the Service, you agree to be bound by all such communications and instructions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>10. Privacy and Data Protection</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We are committed to protecting your personal data in compliance with the <Text style={styles.bold}>Personal Data Protection Act 2010 (PDPA)</Text>.
            {'\n\n'}• Our Privacy Policy explains how data is collected, used, and safeguarded.
            {'\n'}• By using the Service, you consent to such collection and processing.
            {'\n'}• You have the right to access and correct your personal data, and to withdraw consent, subject to statutory exceptions.
            {'\n'}• Technical and organisational safeguards are applied to ensure the protection of user information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>11. Disclaimers and Limitations</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>11.1 Service Availability</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • We strive to keep the Service available, but we do not guarantee uninterrupted access.
            {'\n'}• Temporary suspensions may occur for maintenance, upgrades, or unforeseen issues.
            {'\n'}We disclaim liability for delays, interruptions, or technical failures beyond our reasonable control.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>11.2 Third-Party Services</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • We are not responsible for third-party service quality or performance.
            {'\n'}• Customer–Provider disputes should be resolved directly.
            {'\n'}• We provide the platform but do not guarantee service outcomes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>12. Limitation of Liability</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            To the maximum extent permitted by law:
            {'\n\n'}• Our liability is limited to the amount paid for the Service;
            {'\n'}• We are not liable for indirect, incidental, consequential, or punitive damages;
            {'\n'}• We do not warrant the accuracy, quality, or reliability of user-generated content; and
            {'\n'}• The Service is provided on an "as is" basis, and all use is undertaken at the user's own risk.
            {'\n\n'}We are not liable whatsoever for all and any loss, damage, expenses, liability, cost or claim whatsoever and howsoever caused or arising but not limited to:
            {'\n'}(a) any failure, downtime, crash, breakdown, malfunction of or defects, bugs or glitches in any software, computer system or electronic or mechanical or telecommunication equipment of BetaMe or any telecommunication network operator, or any internet service provider or any operator, vendor, supplier or provider of any communications used by BetaMe;
            {'\n'}(b) the non-performance of its obligations hereunder by reason of any cause beyond BetaMe's control, including without limitation, transmission or computer delays, strikes and similar industrial action; and
            {'\n'}(c) any breach by you in connection with your obligations to BetaMe or the Terms herein.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>13. Indemnification</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            You agree to indemnify and hold BetaMe harmless against claims, damages, or expenses arising from:
            {'\n'}• Your use of the Service;
            {'\n'}• Your breach of these Terms;
            {'\n'}• Violation of third-party rights; and
            {'\n'}• Content you submit.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>14. Termination</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>14.1 Termination by You</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • You may terminate your account at any time.
            {'\n'}• Termination does not relieve you of outstanding obligations.
            {'\n'}• Certain Terms survive account termination (e.g., liability, IP rights, dispute resolution).
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>14.2 Termination by Us</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            We may suspend or terminate your account if:
            {'\n'}• You breach these Terms;
            {'\n'}• Fraudulent or illegal activity is detected;
            {'\n'}• Your account remains inactive for an extended period; and
            {'\n'}• The Service is discontinued.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>15. Dispute Resolution</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>15.1 Informal Resolution</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Users are encouraged to resolve disputes directly between themselves in good faith.
            {'\n'}• Support services are available to facilitate informal resolution where appropriate.
            {'\n'}Informal processes are not binding unless expressly agreed by the parties.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: colors.text.primary }]}>15.2 Formal Dispute Resolution</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • Unresolved disputes may be subject to arbitration.
            {'\n'}• The arbitration proceedings shall be governed by the rules of arbitration in force at the time of the dispute.
            {'\n'}• The right to bring or participate in class, collective, or representative actions is waived by users, to the extent that such waiver is valid under applicable law.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>16. Governing Law</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            These Terms shall be governed by the laws of Malaysia, and any dispute shall be resolved in the courts of Malaysia.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>17. Changes to Terms</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • We may update these Terms periodically.
            {'\n'}• Material changes will be communicated via email or in-app notification.
            {'\n'}• Continued use of the Service after changes constitutes acceptance.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>18. Notices</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • You agree to notify BetaMe in writing or via electronic communications of any change in your address, facsimile number, electronic mail address and mobile phone number.
            {'\n\n'}Anything whatsoever that BetaMe sends to you may be:
            {'\n'}(a) delivered by hand to your address as stated in the form or such other address as may be last known to BetaMe;
            {'\n'}(b) sent by pre-paid ordinary post to your address as stated in the form or to such other address as may be last known to BetaMe;
            {'\n'}(c) sent by facsimile transmission to your facsimile number last known to BetaMe;
            {'\n'}(d) sent by electronic mail to your electronic mail address last known to BetaMe;
            {'\n'}(e) sent by short message system (SMS) to your mobile phone number last known to BetaMe; and
            {'\n'}(f) given by posting on Beta's website; and
            {'\n\n'}Anything whatsoever that BetaMe sends to you including without limitation contract notes/statements, contra statements, statement of accounts and notices will be deemed to have been served upon and/or received by you that is regardless of whether you have actually received whatever BetaMe sends:
            {'\n'}(a) at the time of delivery at your address, if delivered by hand;
            {'\n'}(b) Forty-eight (48) hours after posting, if sent by pre-paid ordinary post and if it can be shown that whatever BetaMe sent was properly posted and correctly addressed to you;
            {'\n'}(c) at the time the facsimile transmission is completed;
            {'\n'}(d) at the time the electronic mailing is completed;
            {'\n'}(e) at the time the sending by short message system (SMS) is completed;
            {'\n'}(f) at the time of posting on BetaMe's website; and
            {'\n'}(g) at the time of transmission if transmitted electronically through the online services posted at BetaMe's website.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>19. Severability</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            If any provision is found invalid or unenforceable, the remaining Terms will remain in full effect.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>20. Entire Agreement</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            These Terms, together with our Privacy Policy, form the entire agreement between you and BetaMe regarding the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>21. Contact Information</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            For questions about these Terms:
            {'\n\n'}<Text style={styles.bold}>Email:</Text> legal@betame.com
            {'\n'}<Text style={styles.bold}>Address:</Text> 23, Jalan SB Indah 2/15, Taman Sungai Besi Indah, Seri Kembangan, 43300 Selangor
            {'\n'}<Text style={styles.bold}>Phone:</Text> 016-6497179
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            By using BetaMe, you acknowledge that you have read, understood, and agree to these Terms of Service.
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