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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, MapPin, Clock, Send } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

export default function ContactUsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      Alert.alert('Missing Information', 'Please fill in all fields before submitting.');
      return;
    }

    const emailBody = `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`;
    const mailtoUrl = `mailto:customer.service@betame.com.my?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(emailBody)}`;
    
    Linking.openURL(mailtoUrl);
    
    // Reset form
    setFormData({ name: '', email: '', subject: '', message: '' });
    Alert.alert('Thank you!', 'Your message has been sent to our team. We will get back to you soon.');
  };

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Contact Us</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Get in Touch</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Contact Information</Text>
          
          <View style={[styles.contactCard, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <View style={styles.contactItem}>
              <Mail size={20} color={colors.primary.main} />
              <View style={styles.contactText}>
                <Text style={[styles.contactLabel, { color: colors.text.secondary }]}>Customer Service</Text>
                <TouchableOpacity onPress={() => handleEmailPress('customer.service@betame.com.my')}>
                  <Text style={[styles.contactValue, { color: colors.primary.main }]}>customer.service@betame.com.my</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.contactItem}>
              <Mail size={20} color={colors.primary.main} />
              <View style={styles.contactText}>
                <Text style={[styles.contactLabel, { color: colors.text.secondary }]}>Developer Support</Text>
                <TouchableOpacity onPress={() => handleEmailPress('developer@betame.com.my')}>
                  <Text style={[styles.contactValue, { color: colors.primary.main }]}>developer@betame.com.my</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.contactItem}>
              <MapPin size={20} color={colors.primary.main} />
              <View style={styles.contactText}>
                <Text style={[styles.contactLabel, { color: colors.text.secondary }]}>Company</Text>
                <Text style={[styles.contactValue, { color: colors.text.primary }]}>Betame Sdn. Bhd.</Text>
                <Text style={[styles.contactValue, { color: colors.text.primary }]}>Malaysia</Text>
              </View>
            </View>

            <View style={styles.contactItem}>
              <Clock size={20} color={colors.primary.main} />
              <View style={styles.contactText}>
                <Text style={[styles.contactLabel, { color: colors.text.secondary }]}>Response Time</Text>
                <Text style={[styles.contactValue, { color: colors.text.primary }]}>Within 24 hours</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Send us a Message</Text>
          
          <View style={[styles.formContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background.primary, borderColor: colors.border.light, color: colors.text.primary }]}
                placeholder="Your full name"
                placeholderTextColor={colors.text.secondary}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Email *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background.primary, borderColor: colors.border.light, color: colors.text.primary }]}
                placeholder="your.email@example.com"
                placeholderTextColor={colors.text.secondary}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Subject *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background.primary, borderColor: colors.border.light, color: colors.text.primary }]}
                placeholder="What is this regarding?"
                placeholderTextColor={colors.text.secondary}
                value={formData.subject}
                onChangeText={(value) => handleInputChange('subject', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Message *</Text>
              <TextInput
                style={[styles.textAreaInput, { backgroundColor: colors.background.primary, borderColor: colors.border.light, color: colors.text.primary }]}
                placeholder="Please describe your inquiry in detail..."
                placeholderTextColor={colors.text.secondary}
                value={formData.message}
                onChangeText={(value) => handleInputChange('message', value)}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary.main }]}
              onPress={handleSubmit}
            >
              <Send size={20} color="white" />
              <Text style={[styles.submitButtonText, { color: colors.text.white }]}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Link */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Need Quick Answers?</Text>
          <TouchableOpacity
            style={[styles.faqButton, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}
            onPress={() => router.push('/support')}
          >
            <Text style={[styles.faqButtonText, { color: colors.primary.main }]}>Check our Support Center</Text>
          </TouchableOpacity>
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
  contactCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  contactText: {
    marginLeft: 16,
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  formContainer: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textAreaInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 120,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  faqButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  faqButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  copyright: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});