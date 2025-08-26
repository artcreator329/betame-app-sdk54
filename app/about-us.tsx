import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Globe, MapPin, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

export default function AboutUsScreen() {
  const router = useRouter();
  const colors = useColors();

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handlePhonePress = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>About Us</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text.primary }]}>About BetaMe</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Connecting Communities Through Services</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Our Mission</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            BetaMe is dedicated to creating a vibrant marketplace where service providers and customers can connect, 
            collaborate, and grow together. We believe in empowering individuals and small businesses by providing 
            them with the tools and platform they need to succeed.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>What We Do</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Our platform facilitates seamless connections between service providers and customers across various categories:
            {'\n'}• Professional services and consulting
            {'\n'}• Creative and digital services
            {'\n'}• Home and lifestyle services
            {'\n'}• Education and training
            {'\n'}• Health and wellness
            {'\n'}• And much more!
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Our Values</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            <Text style={{ fontWeight: '600' }}>Trust & Safety:</Text> We prioritize the security and safety of all our users through 
            robust verification processes and secure payment systems.
            {'\n\n'}<Text style={{ fontWeight: '600' }}>Quality:</Text> We maintain high standards to ensure exceptional service 
            experiences for both providers and customers.
            {'\n\n'}<Text style={{ fontWeight: '600' }}>Innovation:</Text> We continuously evolve our platform with cutting-edge 
            technology to better serve our community.
            {'\n\n'}<Text style={{ fontWeight: '600' }}>Community:</Text> We foster a supportive environment where everyone can 
            thrive and succeed together.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Why Choose BetaMe?</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            • <Text style={{ fontWeight: '600' }}>Easy to Use:</Text> Intuitive interface designed for seamless user experience
            {'\n'}• <Text style={{ fontWeight: '600' }}>Secure Payments:</Text> Protected transactions with multiple payment options
            {'\n'}• <Text style={{ fontWeight: '600' }}>Quality Assurance:</Text> Verified providers and customer review system
            {'\n'}• <Text style={{ fontWeight: '600' }}>24/7 Support:</Text> Dedicated customer service team ready to help
            {'\n'}• <Text style={{ fontWeight: '600' }}>Fair Pricing:</Text> Competitive rates with transparent fee structure
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Company Information</Text>
          <View style={styles.companyInfo}>
            <View style={styles.contactItem}>
              <Mail size={20} color={colors.primary.main} />
              <View style={styles.contactText}>
                <Text style={[styles.contactLabel, { color: colors.text.secondary }]}>Email</Text>
                <TouchableOpacity onPress={() => handleEmailPress('legal@betame.com')}>
                  <Text style={[styles.contactValue, { color: colors.primary.main }]}>legal@betame.com</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.contactItem}>
              <MapPin size={20} color={colors.primary.main} />
              <View style={styles.contactText}>
                <Text style={[styles.contactLabel, { color: colors.text.secondary }]}>Address</Text>
                <Text style={[styles.contactValue, { color: colors.text.primary }]}>
                  23, Jalan SB Indah 2/15, Taman Sungai Besi Indah, Seri Kembangan, 43300 Selangor
                </Text>
              </View>
            </View>

            <View style={styles.contactItem}>
              <Phone size={20} color={colors.primary.main} />
              <View style={styles.contactText}>
                <Text style={[styles.contactLabel, { color: colors.text.secondary }]}>Phone</Text>
                <TouchableOpacity onPress={() => handlePhonePress('016-6497179')}>
                  <Text style={[styles.contactValue, { color: colors.primary.main }]}>016-6497179</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Join Our Community</Text>
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            Whether you're looking to offer your services or find the perfect service provider, BetaMe is here to help you 
            succeed. Join thousands of satisfied users who have made BetaMe their go-to marketplace for quality services.
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
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
  companyInfo: {
    marginTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    marginLeft: 12,
  },
  contactLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  copyright: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});