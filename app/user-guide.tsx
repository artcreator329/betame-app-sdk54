import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Search, Heart, MessageCircle, CreditCard, Star, Shield, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

interface GuideStepProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  steps: string[];
}

function GuideStep({ icon, title, description, steps }: GuideStepProps) {
  const colors = useColors();
  
  return (
    <View style={[styles.guideStep, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIcon}>
          {icon}
        </View>
        <View style={styles.stepTitleContainer}>
          <Text style={[styles.stepTitle, { color: colors.text.primary }]}>{title}</Text>
          <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>{description}</Text>
        </View>
      </View>
      <View style={styles.stepsList}>
        {steps.map((step, index) => (
          <View key={index} style={styles.stepItem}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary.main }]}>
              <Text style={[styles.stepNumberText, { color: colors.text.white }]}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.text.secondary }]}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function UserGuideScreen() {
  const router = useRouter();
  const colors = useColors();

  const guideData = [
    {
      icon: <User size={24} color={colors.primary.main} />,
      title: "Getting Started",
      description: "Create your account and set up your profile",
      steps: [
        "Download the BetaMe app from your app store",
        "Tap 'Sign Up' and enter your email and password",
        "Verify your email address through the confirmation link",
        "Complete your profile with a photo and bio",
        "Enable location services for better service discovery"
      ]
    },
    {
      icon: <Search size={24} color={colors.primary.main} />,
      title: "Finding Services",
      description: "Discover and book services that meet your needs",
      steps: [
        "Use the search bar to find specific services",
        "Browse categories on the home screen",
        "Filter results by location, price, and ratings",
        "Read service descriptions and provider profiles",
        "Check reviews and ratings from other customers"
      ]
    },
    {
      icon: <MessageCircle size={24} color={colors.primary.main} />,
      title: "Booking Services",
      description: "How to book and communicate with service providers",
      steps: [
        "Tap on a service you're interested in",
        "Review the service details and pricing",
        "Tap 'Book Now' or 'Contact Provider'",
        "Send a message to discuss your requirements",
        "Confirm the booking and make payment"
      ]
    },
    {
      icon: <CreditCard size={24} color={colors.primary.main} />,
      title: "Payments & BetaCoin",
      description: "Understanding payments and virtual currency",
      steps: [
        "Add payment methods in the Wallet section",
        "Purchase BetaCoin for platform transactions",
        "Use BetaCoin to pay for services and features",
        "Track your transaction history in the wallet",
        "Set up automatic BetaCoin top-ups if needed"
      ]
    },
    {
      icon: <User size={24} color={colors.primary.main} />,
      title: "Offering Services",
      description: "Start earning by providing your own services",
      steps: [
        "Go to your profile and tap 'Offer Your Best Service'",
        "Fill in service details: title, description, price",
        "Add high-quality photos of your work",
        "Select appropriate categories and tags",
        "Publish your service and start receiving bookings"
      ]
    },
    {
      icon: <Star size={24} color={colors.primary.main} />,
      title: "Reviews & Ratings",
      description: "Building trust through feedback system",
      steps: [
        "Complete services to unlock review features",
        "Rate your experience after each service",
        "Write detailed reviews to help other users",
        "Respond professionally to reviews you receive",
        "Maintain high ratings to boost your visibility"
      ]
    },
    {
      icon: <Heart size={24} color={colors.primary.main} />,
      title: "Favorites & Referrals",
      description: "Save favorites and earn through referrals",
      steps: [
        "Tap the heart icon to save favorite services",
        "Access your favorites from the settings menu",
        "Share your referral code with friends",
        "Earn rewards when friends join using your code",
        "Track your referral earnings in your profile"
      ]
    },
    {
      icon: <Shield size={24} color={colors.primary.main} />,
      title: "Safety & Security",
      description: "Staying safe while using the platform",
      steps: [
        "Verify service providers before booking",
        "Use the in-app messaging system for communication",
        "Report suspicious activity to our support team",
        "Keep your personal information private",
        "Use secure payment methods through the app"
      ]
    },
    {
      icon: <Settings size={24} color={colors.primary.main} />,
      title: "Account Management",
      description: "Managing your account settings and preferences",
      steps: [
        "Access settings from your profile page",
        "Update your personal information and preferences",
        "Manage notification settings for different activities",
        "Set up privacy and security preferences",
        "Contact support if you need help with your account"
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>User Guide</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text.primary }]}>How to Use BetaMe</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            A comprehensive guide to help you make the most of BetaMe's features
          </Text>
        </View>

        <View style={styles.guideContainer}>
          {guideData.map((item, index) => (
            <GuideStep
              key={index}
              icon={item.icon}
              title={item.title}
              description={item.description}
              steps={item.steps}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.needMoreHelp, { color: colors.text.primary }]}>Need More Help?</Text>
          <Text style={[styles.helpText, { color: colors.text.secondary }]}>
            If you need additional assistance, check out our FAQ section or contact our support team.
          </Text>
          <View style={styles.helpButtons}>
            <TouchableOpacity
              style={[styles.helpButton, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}
              onPress={() => router.push('/faq')}
            >
              <Text style={[styles.helpButtonText, { color: colors.text.primary }]}>View FAQ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.helpButton, { backgroundColor: colors.primary.main }]}
              onPress={() => router.push('/contact-us')}
            >
              <Text style={[styles.helpButtonText, { color: colors.text.white }]}>Contact Support</Text>
            </TouchableOpacity>
          </View>
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
  guideContainer: {
    marginBottom: 32,
  },
  guideStep: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  stepTitleContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepsList: {
    marginLeft: 40,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  needMoreHelp: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  helpButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  helpButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  copyright: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});