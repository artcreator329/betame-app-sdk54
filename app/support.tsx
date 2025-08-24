import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, MessageCircle, Phone, HelpCircle, FileText, Shield, CreditCard } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

interface SupportOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}

function SupportOption({ icon, title, description, onPress }: SupportOptionProps) {
  const colors = useColors();
  
  return (
    <TouchableOpacity 
      style={[styles.supportOption, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]} 
      onPress={onPress}
    >
      <View style={styles.optionIcon}>
        {icon}
      </View>
      <View style={styles.optionContent}>
        <Text style={[styles.optionTitle, { color: colors.text.primary }]}>{title}</Text>
        <Text style={[styles.optionDescription, { color: colors.text.secondary }]}>{description}</Text>
      </View>
      <View style={styles.arrow}>
        <Text style={[styles.arrowText, { color: colors.text.secondary }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SupportScreen() {
  const router = useRouter();
  const colors = useColors();
  const [feedbackText, setFeedbackText] = useState('');

  const handleEmailSupport = () => {
    Linking.openURL('mailto:customer.service@betame.com.my?subject=Support Request');
  };

  const handleSubmitFeedback = () => {
    if (feedbackText.trim()) {
      const subject = 'App Feedback';
      const body = feedbackText;
      Linking.openURL(`mailto:customer.service@betame.com.my?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      setFeedbackText('');
      Alert.alert('Thank you!', 'Your feedback has been sent to our support team.');
    } else {
      Alert.alert('Please enter your feedback before submitting.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text.primary }]}>How can we help you?</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Choose from the options below or contact us directly
          </Text>
        </View>

        {/* Quick Support Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Quick Help</Text>
          
          <SupportOption
            icon={<HelpCircle size={24} color={colors.primary.main} />}
            title="FAQ"
            description="Find answers to common questions"
            onPress={() => router.push('/faq')}
          />

          <SupportOption
            icon={<FileText size={24} color={colors.primary.main} />}
            title="User Guide"
            description="Learn how to use BetaMe effectively"
            onPress={() => router.push('/user-guide')}
          />

          <SupportOption
            icon={<Shield size={24} color={colors.primary.main} />}
            title="Safety & Security"
            description="Information about platform safety"
            onPress={() => router.push('/safety-security')}
          />

          <SupportOption
            icon={<CreditCard size={24} color={colors.primary.main} />}
            title="Payment Help"
            description="Issues with payments and billing"
            onPress={() => router.push('/payment-help')}
          />
        </View>

        {/* Contact Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Contact Us</Text>
          
          <SupportOption
            icon={<Mail size={24} color={colors.primary.main} />}
            title="Email Support"
            description="customer.service@betame.com.my"
            onPress={handleEmailSupport}
          />

          <SupportOption
            icon={<MessageCircle size={24} color={colors.primary.main} />}
            title="Live Chat"
            description="Chat with our support team"
            onPress={() => Alert.alert('Coming Soon', 'Live chat feature will be available soon!')}
          />
        </View>

        {/* Feedback Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Send Feedback</Text>
          <Text style={[styles.feedbackDescription, { color: colors.text.secondary }]}>
            Help us improve BetaMe by sharing your thoughts and suggestions
          </Text>
          
          <View style={[styles.feedbackContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <TextInput
              style={[styles.feedbackInput, { color: colors.text.primary }]}
              placeholder="Tell us what you think..."
              placeholderTextColor={colors.text.secondary}
              multiline
              numberOfLines={4}
              value={feedbackText}
              onChangeText={setFeedbackText}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary.main }]}
              onPress={handleSubmitFeedback}
            >
              <Text style={[styles.submitButtonText, { color: colors.text.white }]}>Send Feedback</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Emergency Contact</Text>
          <Text style={[styles.emergencyText, { color: colors.text.secondary }]}>
            For urgent issues related to safety or security, please contact us immediately at:
          </Text>
          <TouchableOpacity onPress={handleEmailSupport}>
            <Text style={[styles.emergencyEmail, { color: colors.status.error }]}>
              customer.service@betame.com.my
            </Text>
          </TouchableOpacity>
        </View>

        {/* Response Time */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Response Times</Text>
          <Text style={[styles.responseText, { color: colors.text.secondary }]}>
            • Email support: Within 24 hours
            {'\n'}• General inquiries: 1-2 business days
            {'\n'}• Technical issues: Within 4 hours
            {'\n'}• Emergency issues: Immediate response
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  arrow: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '300',
  },
  feedbackDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  feedbackContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  feedbackInput: {
    fontSize: 16,
    minHeight: 100,
    marginBottom: 16,
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emergencyText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  emergencyEmail: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  responseText: {
    fontSize: 14,
    lineHeight: 22,
  },
  copyright: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});