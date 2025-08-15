import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

interface FAQItemProps {
  question: string;
  answer: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function FAQItem({ question, answer, isExpanded, onToggle }: FAQItemProps) {
  const colors = useColors();
  
  return (
    <View style={[styles.faqItem, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
      <TouchableOpacity style={styles.questionContainer} onPress={onToggle}>
        <Text style={[styles.question, { color: colors.text.primary }]}>{question}</Text>
        {isExpanded ? (
          <ChevronUp size={20} color={colors.text.secondary} />
        ) : (
          <ChevronDown size={20} color={colors.text.secondary} />
        )}
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.answerContainer}>
          <Text style={[styles.answer, { color: colors.text.secondary }]}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

export default function FAQScreen() {
  const router = useRouter();
  const colors = useColors();
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const faqData = [
    {
      question: "How do I create an account on BetaMe?",
      answer: "To create an account, tap 'Sign Up' on the login screen, enter your email and password, then verify your email address. You can also sign up using your Google or Apple account for faster registration."
    },
    {
      question: "How do I post a service on BetaMe?",
      answer: "Go to your profile, tap 'Offer Your Best Service/Product Now', fill in the service details including title, description, price, and category. Add photos to make your service more attractive, then publish it."
    },
    {
      question: "How do payments work on BetaMe?",
      answer: "BetaMe uses secure payment processing. Customers pay through the app, and funds are held securely until the service is completed. Service providers receive payment after successful completion and customer confirmation."
    },
    {
      question: "What is BetaCoin and how do I use it?",
      answer: "BetaCoin is BetaMe's virtual currency that you can use to purchase services, boost your listings, or access premium features. You can buy BetaCoin through the wallet section using various payment methods."
    },
    {
      question: "How do I contact customer support?",
      answer: "You can contact our support team through the 'Contact Us' section in settings, email us at customer.service@betame.com.my, or use the in-app support chat feature."
    },
    {
      question: "Can I cancel a service booking?",
      answer: "Yes, you can cancel a booking before the service provider accepts it. Once accepted, cancellation policies depend on the specific service and timing. Check the service details for cancellation terms."
    },
    {
      question: "How do I leave a review?",
      answer: "After a service is completed, you'll receive a notification to rate and review your experience. You can also access past bookings in your profile to leave reviews."
    },
    {
      question: "What should I do if I have a dispute?",
      answer: "If you have a dispute with a service provider or customer, contact our support team immediately. We have a dispute resolution process to help resolve issues fairly."
    },
    {
      question: "How do I boost my service listing?",
      answer: "In your service listing, tap the boost option and choose your boost duration. Boosted services appear higher in search results and get more visibility to potential customers."
    },
    {
      question: "Is my personal information safe?",
      answer: "Yes, we take privacy seriously. Your personal information is encrypted and protected. We never share your data with third parties without your consent. Read our Privacy Policy for full details."
    },
    {
      question: "How do I change my profile information?",
      answer: "Go to Settings > My Account or tap the camera icon on your profile photo. You can update your name, bio, profile picture, cover photo, and other details."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept major credit cards, debit cards, online banking, and digital wallets. Payment methods may vary by region. Check the wallet section for available options in your area."
    },
    {
      question: "How do I enable notifications?",
      answer: "Go to Settings > Notifications to customize your notification preferences. You can choose to receive notifications for bookings, messages, promotions, and other activities."
    },
    {
      question: "Can I use BetaMe in multiple locations?",
      answer: "Yes, BetaMe works across different locations. You can update your location in your profile settings or enable location services to find services near you wherever you are."
    },
    {
      question: "How do I delete my account?",
      answer: "To delete your account, contact our support team at customer.service@betame.com.my. Please note that account deletion is permanent and cannot be undone."
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>FAQ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Frequently Asked Questions</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Find answers to common questions about using BetaMe
          </Text>
        </View>

        <View style={styles.faqContainer}>
          {faqData.map((item, index) => (
            <FAQItem
              key={index}
              question={item.question}
              answer={item.answer}
              isExpanded={expandedItems.includes(index)}
              onToggle={() => toggleItem(index)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.stillNeedHelp, { color: colors.text.primary }]}>Still need help?</Text>
          <Text style={[styles.contactText, { color: colors.text.secondary }]}>
            If you can't find the answer you're looking for, feel free to contact our support team.
          </Text>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: colors.primary.main }]}
            onPress={() => router.push('/contact-us')}
          >
            <Text style={[styles.contactButtonText, { color: colors.text.white }]}>Contact Support</Text>
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
  faqContainer: {
    marginBottom: 32,
  },
  faqItem: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  answerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  answer: {
    fontSize: 15,
    lineHeight: 22,
  },
  stillNeedHelp: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  contactButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  copyright: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});