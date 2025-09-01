import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function OrderHelpPage() {
  const router = useRouter();

  const handleContactSupport = async () => {
    const email = 'help@betame.com.my';
    const subject = 'Order Help Request';
    const body = 'Hi BetaMe Support Team,\n\nI need help with my order. Please provide assistance.\n\nThank you.';
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      await Linking.openURL(mailtoUrl);
    } catch (error) {
      console.error('Error opening email app:', error);
      // Silently fail - no alert shown to user
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Help</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.iconContainer}>
            <Ionicons name="help-circle" size={48} color="#2196F3" />
          </View>
          <Text style={styles.title}>Understanding Your Order Card</Text>
          <Text style={styles.description}>
            Your order card shows all the important information about your service order and provides buttons to help you manage the order process.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status Meanings</Text>
          
          <View style={styles.statusItem}>
            <View style={[styles.statusBadge, { backgroundColor: '#FFA500' }]}>
              <Text style={styles.statusText}>Payment Received</Text>
            </View>
            <Text style={styles.statusDescription}>
              Your payment has been received and the service provider can now start working.
            </Text>
          </View>

          <View style={styles.statusItem}>
            <View style={[styles.statusBadge, { backgroundColor: '#2196F3' }]}>
              <Text style={styles.statusText}>Work in Progress</Text>
            </View>
            <Text style={styles.statusDescription}>
              The service provider has started working on your order.
            </Text>
          </View>

          <View style={styles.statusItem}>
            <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.statusText}>Work Completed</Text>
            </View>
            <Text style={styles.statusDescription}>
              The service provider has finished the work and submitted it for your review.
            </Text>
          </View>

          <View style={styles.statusItem}>
            <View style={[styles.statusBadge, { backgroundColor: '#9C27B0' }]}>
              <Text style={styles.statusText}>Buyer Reviewing</Text>
            </View>
            <Text style={styles.statusDescription}>
              You need to review the completed work and either confirm it or raise a dispute within the time limit.
            </Text>
          </View>

          <View style={styles.statusItem}>
            <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.statusText}>Completed</Text>
            </View>
            <Text style={styles.statusDescription}>
              The order is complete and payment has been released to the service provider.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Button Functions</Text>
          
          <View style={styles.buttonItem}>
            <View style={styles.buttonExample}>
              <Text style={styles.buttonText}>Start Work</Text>
            </View>
            <Text style={styles.buttonDescription}>
              (Service Provider) Click this to begin working on the order after payment is received.
            </Text>
          </View>

          <View style={styles.buttonItem}>
            <View style={styles.buttonExample}>
              <Text style={styles.buttonText}>Mark Completed</Text>
            </View>
            <Text style={styles.buttonDescription}>
              (Service Provider) Click this when you've finished the work to submit it for buyer review.
            </Text>
          </View>

          <View style={styles.buttonItem}>
            <View style={[styles.buttonExample, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.buttonText}>Confirm Work</Text>
            </View>
            <Text style={styles.buttonDescription}>
              (Buyer) Click this if you're satisfied with the completed work. Payment will be released.
            </Text>
          </View>

          <View style={styles.buttonItem}>
            <View style={[styles.buttonExample, { backgroundColor: '#F44336' }]}>
              <Text style={styles.buttonText}>Raise Dispute</Text>
            </View>
            <Text style={styles.buttonDescription}>
              (Buyer) Click this if you're not satisfied with the work. Provide details about the issue.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Having Issues with Your Order?</Text>
          <Text style={styles.description}>
            We understand that sometimes things don't go as planned. Here's the best way to resolve any issues:
          </Text>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Talk to Your Service Provider First</Text>
              <Text style={styles.stepDescription}>
                Most issues can be resolved through direct communication. Use the "Contact Provider" button on your order to discuss any concerns or clarifications needed.
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Give Them a Chance to Fix It</Text>
              <Text style={styles.stepDescription}>
                Service providers want to deliver quality work. Allow them the opportunity to address your concerns and make necessary improvements.
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Use the Dispute System if Needed</Text>
              <Text style={styles.stepDescription}>
                If communication doesn't resolve the issue, you can raise a dispute during the review period. This allows our team to mediate and find a fair solution.
              </Text>
            </View>
          </View>

          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={20} color="#FF6B35" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Refunds - Last Resort Only</Text>
              <Text style={styles.warningDescription}>
                Refunds should only be requested when all other options have been exhausted. We encourage working together to find solutions that benefit both parties. Refunds may take 5-7 business days to process and are subject to our terms and conditions.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need More Help?</Text>
          <Text style={styles.description}>
            If you've tried communicating with your service provider and still need assistance, our support team is here to help mediate and find the best solution.
          </Text>
        </View>

        <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
          <Ionicons name="mail" size={20} color="#fff" />
          <Text style={styles.contactButtonText}>Contact Support</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statusItem: {
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonItem: {
    marginBottom: 16,
  },
  buttonExample: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 32,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF4E6',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
    marginTop: 8,
    alignItems: 'flex-start',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    marginBottom: 6,
  },
  warningDescription: {
    fontSize: 14,
    color: '#8B4513',
    lineHeight: 20,
  },
});