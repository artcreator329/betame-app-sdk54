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
import { ArrowLeft, Shield, Lock, Eye, AlertTriangle, CheckCircle, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

interface SafetyTipProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tips: string[];
}

function SafetyTip({ icon, title, description, tips }: SafetyTipProps) {
  const colors = useColors();
  
  return (
    <View style={[styles.safetyTip, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
      <View style={styles.tipHeader}>
        <View style={styles.tipIcon}>
          {icon}
        </View>
        <View style={styles.tipTitleContainer}>
          <Text style={[styles.tipTitle, { color: colors.text.primary }]}>{title}</Text>
          <Text style={[styles.tipDescription, { color: colors.text.secondary }]}>{description}</Text>
        </View>
      </View>
      <View style={styles.tipsList}>
        {tips.map((tip, index) => (
          <View key={index} style={styles.tipItem}>
            <CheckCircle size={16} color={colors.status.success} style={styles.checkIcon} />
            <Text style={[styles.tipText, { color: colors.text.secondary }]}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function SafetySecurityScreen() {
  const router = useRouter();
  const colors = useColors();

  const safetyData = [
    {
      icon: <Shield size={24} color={colors.primary.main} />,
      title: "Account Security",
      description: "Keep your account safe and secure",
      tips: [
        "Use a strong, unique password for your BetaMe account",
        "Enable two-factor authentication when available",
        "Never share your login credentials with anyone",
        "Log out from shared or public devices",
        "Regularly update your password",
        "Review your account activity regularly"
      ]
    },
    {
      icon: <Lock size={24} color={colors.primary.main} />,
      title: "Payment Security",
      description: "Secure payment practices and fraud prevention",
      tips: [
        "Only use secure payment methods through the app",
        "Never share your payment details outside the platform",
        "Verify service details before making payments",
        "Keep receipts and transaction records",
        "Report suspicious payment requests immediately",
        "Use BetaCoin for added security in transactions"
      ]
    },
    {
      icon: <Eye size={24} color={colors.primary.main} />,
      title: "Privacy Protection",
      description: "Protecting your personal information",
      tips: [
        "Only share necessary information with service providers",
        "Use the in-app messaging system for communication",
        "Be cautious about sharing personal details in public profiles",
        "Review and adjust your privacy settings regularly",
        "Report users who request inappropriate personal information",
        "Keep your location sharing settings appropriate"
      ]
    },
    {
      icon: <MessageCircle size={24} color={colors.primary.main} />,
      title: "Safe Communication",
      description: "Best practices for communicating with other users",
      tips: [
        "Use BetaMe's messaging system for all communications",
        "Keep conversations professional and service-related",
        "Don't share external contact information unnecessarily",
        "Report inappropriate messages or behavior",
        "Be clear about service expectations and boundaries",
        "Document important agreements in writing"
      ]
    },
    {
      icon: <CheckCircle size={24} color={colors.primary.main} />,
      title: "Service Verification",
      description: "How to verify services and providers",
      tips: [
        "Check provider profiles, ratings, and reviews",
        "Look for verified badges and certifications",
        "Read service descriptions carefully",
        "Ask questions before booking services",
        "Start with smaller services to build trust",
        "Meet in public places for in-person services when possible"
      ]
    },
    {
      icon: <AlertTriangle size={24} color={colors.status.warning} />,
      title: "Red Flags to Watch",
      description: "Warning signs of potentially unsafe situations",
      tips: [
        "Requests to communicate outside the platform",
        "Pressure to pay outside the secure payment system",
        "Services that seem too good to be true",
        "Providers with no reviews or very low ratings",
        "Requests for excessive personal information",
        "Aggressive or inappropriate behavior"
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Safety & Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Stay Safe on BetaMe</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Your safety and security are our top priorities. Follow these guidelines to have a safe experience on our platform.
          </Text>
        </View>

        <View style={styles.safetyContainer}>
          {safetyData.map((item, index) => (
            <SafetyTip
              key={index}
              icon={item.icon}
              title={item.title}
              description={item.description}
              tips={item.tips}
            />
          ))}
        </View>

        {/* Emergency Section */}
        <View style={[styles.emergencySection, { backgroundColor: colors.status.error, borderColor: colors.status.error }]}>
          <View style={styles.emergencyHeader}>
            <AlertTriangle size={24} color="white" />
            <Text style={[styles.emergencyTitle, { color: 'white' }]}>Emergency Situations</Text>
          </View>
          <Text style={[styles.emergencyText, { color: 'white' }]}>
            If you encounter any threatening behavior, fraud, or feel unsafe:
          </Text>
          <View style={styles.emergencyActions}>
            <Text style={[styles.emergencyAction, { color: 'white' }]}>• Stop all communication immediately</Text>
            <Text style={[styles.emergencyAction, { color: 'white' }]}>• Document the incident with screenshots</Text>
            <Text style={[styles.emergencyAction, { color: 'white' }]}>• Report the user through the app</Text>
            <Text style={[styles.emergencyAction, { color: 'white' }]}>• Contact our support team immediately</Text>
            <Text style={[styles.emergencyAction, { color: 'white' }]}>• Contact local authorities if necessary</Text>
          </View>
        </View>

        {/* Reporting Section */}
        <View style={styles.section}>
          <Text style={[styles.reportTitle, { color: colors.text.primary }]}>Report Issues</Text>
          <Text style={[styles.reportText, { color: colors.text.secondary }]}>
            Help us maintain a safe community by reporting any suspicious activity, inappropriate behavior, or security concerns.
          </Text>
          <TouchableOpacity
            style={[styles.reportButton, { backgroundColor: colors.primary.main }]}
            onPress={() => router.push('/contact-us')}
          >
            <Text style={[styles.reportButtonText, { color: colors.text.white }]}>Report an Issue</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <Text style={[styles.supportTitle, { color: colors.text.primary }]}>Need Help?</Text>
          <Text style={[styles.supportText, { color: colors.text.secondary }]}>
            Our support team is available 24/7 to help with safety and security concerns.
          </Text>
          <Text style={[styles.supportEmail, { color: colors.primary.main }]}>
            legal@betame.com
          </Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            If you encounter any safety or security concerns while using BetaMe, please report them immediately to our support team at legal@betame.com.
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
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  safetyContainer: {
    marginBottom: 32,
  },
  safetyTip: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tipIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  tipTitleContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipsList: {
    marginLeft: 40,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  emergencySection: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  emergencyText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  emergencyActions: {
    marginLeft: 16,
  },
  emergencyAction: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  reportText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  reportButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  supportEmail: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  copyright: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});