import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText,
  Camera,
  User,
  Lock,
  Clock,
  Trash2
} from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';

interface PDPAConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  userName?: string;
}

export function PDPAConsentModal({ 
  visible, 
  onAccept, 
  onDecline, 
  userName = 'User' 
}: PDPAConsentModalProps) {
  const colors = useColors();
  const [hasReadConsent, setHasReadConsent] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  const handleAccept = () => {
    if (!hasReadConsent || !hasAcceptedTerms) {
      Alert.alert(
        'Consent Required',
        'Please read the consent form and accept the terms before proceeding.',
        [{ text: 'OK' }]
      );
      return;
    }

    onAccept();
  };

  const handleDecline = () => {
    Alert.alert(
      'Consent Required',
      'You must provide consent to proceed with eKYC verification. Without consent, you cannot complete the verification process.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: onDecline }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
          <View style={styles.headerContent}>
            <Shield size={24} color={colors.primary.main} />
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              Personal Data Protection Act (PDPA) Consent
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
            Malaysia's Personal Data Protection Act 2010
          </Text>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Important Notice */}
          <View style={[styles.noticeBox, { backgroundColor: colors.status.warning + '15', borderColor: colors.status.warning }]}>
            <AlertCircle size={20} color={colors.status.warning} />
            <View style={styles.noticeContent}>
              <Text style={[styles.noticeTitle, { color: colors.status.warning }]}>
                Important Notice
              </Text>
              <Text style={[styles.noticeText, { color: colors.text.primary }]}>
                This consent is required under Malaysia's Personal Data Protection Act 2010 (PDPA) before we can process your eKYC verification.
              </Text>
            </View>
          </View>

          {/* Consent Form */}
          <View style={[styles.consentSection, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Consent for Personal Data Processing
            </Text>
            
            <Text style={[styles.consentText, { color: colors.text.secondary }]}>
              Dear {userName},
            </Text>
            
            <Text style={[styles.consentText, { color: colors.text.secondary }]}>
              BetaMe ("we", "our", or "us") is committed to protecting your personal data in accordance with Malaysia's Personal Data Protection Act 2010 (PDPA). Before proceeding with your eKYC (Electronic Know Your Customer) verification, we require your explicit consent to process your personal data.
            </Text>

            <Text style={[styles.consentSubtitle, { color: colors.text.primary }]}>
              What Personal Data We Will Collect:
            </Text>

            <View style={styles.dataList}>
              <View style={styles.dataItem}>
                <FileText size={16} color={colors.text.secondary} />
                <Text style={[styles.dataText, { color: colors.text.secondary }]}>
                  <Text style={{ fontWeight: '600' }}>Identity Documents:</Text> Your Malaysian IC (MyKad) or Passport
                </Text>
              </View>
              
              <View style={styles.dataItem}>
                <Camera size={16} color={colors.text.secondary} />
                <Text style={[styles.dataText, { color: colors.text.secondary }]}>
                  <Text style={{ fontWeight: '600' }}>Liveness Verification:</Text> Photo of yourself holding your identity document
                </Text>
              </View>
              
              <View style={styles.dataItem}>
                <User size={16} color={colors.text.secondary} />
                <Text style={[styles.dataText, { color: colors.text.secondary }]}>
                  <Text style={{ fontWeight: '600' }}>Personal Information:</Text> Full name, date of birth, address, phone number, email
                </Text>
              </View>
            </View>

            <Text style={[styles.consentSubtitle, { color: colors.text.primary }]}>
              How We Will Use Your Data:
            </Text>

            <View style={styles.purposeList}>
              <Text style={[styles.purposeText, { color: colors.text.secondary }]}>
                • To verify your identity for eKYC compliance
              </Text>
              <Text style={[styles.purposeText, { color: colors.text.secondary }]}>
                • To comply with Malaysian regulatory requirements
              </Text>
              <Text style={[styles.purposeText, { color: colors.text.secondary }]}>
                • To prevent fraud and ensure platform security
              </Text>
              <Text style={[styles.purposeText, { color: colors.text.secondary }]}>
                • To provide you with verified service provider status
              </Text>
            </View>

            <Text style={[styles.consentSubtitle, { color: colors.text.primary }]}>
              Data Retention and Security:
            </Text>

            <View style={styles.securityList}>
              <View style={styles.securityItem}>
                <Lock size={16} color={colors.text.secondary} />
                <Text style={[styles.securityText, { color: colors.text.secondary }]}>
                  <Text style={{ fontWeight: '600' }}>Secure Processing:</Text> All data is encrypted and processed securely
                </Text>
              </View>
              
              <View style={styles.securityItem}>
                <Clock size={16} color={colors.text.secondary} />
                <Text style={[styles.securityText, { color: colors.text.secondary }]}>
                  <Text style={{ fontWeight: '600' }}>Temporary Storage:</Text> Data is only stored during verification process
                </Text>
              </View>
              
              <View style={styles.securityItem}>
                <Trash2 size={16} color={colors.text.secondary} />
                <Text style={[styles.securityText, { color: colors.text.secondary }]}>
                  <Text style={{ fontWeight: '600' }}>Automatic Deletion:</Text> All documents are automatically deleted after verification
                </Text>
              </View>
            </View>

            <Text style={[styles.consentSubtitle, { color: colors.text.primary }]}>
              Your Rights Under PDPA:
            </Text>

            <View style={styles.rightsList}>
              <Text style={[styles.rightsText, { color: colors.text.secondary }]}>
                • Right to access your personal data
              </Text>
              <Text style={[styles.rightsText, { color: colors.text.secondary }]}>
                • Right to correct inaccurate data
              </Text>
              <Text style={[styles.rightsText, { color: colors.text.secondary }]}>
                • Right to withdraw consent at any time
              </Text>
              <Text style={[styles.rightsText, { color: colors.text.secondary }]}>
                • Right to lodge a complaint with the Personal Data Protection Commissioner
              </Text>
            </View>

            <Text style={[styles.consentText, { color: colors.text.secondary }]}>
              By providing your consent, you acknowledge that you have read and understood this notice and agree to the processing of your personal data for the purposes stated above.
            </Text>

            <Text style={[styles.consentText, { color: colors.text.secondary }]}>
              You may withdraw your consent at any time by contacting us at privacy@betame.com.my
            </Text>
          </View>

          {/* Checkboxes */}
          <View style={styles.checkboxSection}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setHasReadConsent(!hasReadConsent)}
            >
              <View style={[
                styles.checkbox,
                hasReadConsent && { backgroundColor: colors.primary.main }
              ]}>
                {hasReadConsent && <CheckCircle size={16} color="white" />}
              </View>
              <Text style={[styles.checkboxText, { color: colors.text.primary }]}>
                I have read and understood the PDPA consent notice above
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setHasAcceptedTerms(!hasAcceptedTerms)}
            >
              <View style={[
                styles.checkbox,
                hasAcceptedTerms && { backgroundColor: colors.primary.main }
              ]}>
                {hasAcceptedTerms && <CheckCircle size={16} color="white" />}
              </View>
              <Text style={[styles.checkboxText, { color: colors.text.primary }]}>
                I consent to the processing of my personal data for eKYC verification purposes
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actionContainer, { backgroundColor: colors.background.tertiary }]}>
          <TouchableOpacity
            style={[styles.declineButton, { borderColor: colors.border.light }]}
            onPress={handleDecline}
          >
            <XCircle size={20} color={colors.status.error} />
            <Text style={[styles.declineButtonText, { color: colors.status.error }]}>
              Decline
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.acceptButton, 
              { 
                backgroundColor: (hasReadConsent && hasAcceptedTerms) 
                  ? colors.primary.main 
                  : colors.interactive.disabled 
              }
            ]}
            onPress={handleAccept}
            disabled={!hasReadConsent || !hasAcceptedTerms}
          >
            <CheckCircle size={20} color="white" />
            <Text style={[styles.acceptButtonText, { color: 'white' }]}>
              Accept & Continue
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    marginLeft: 36,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  noticeContent: {
    flex: 1,
    marginLeft: 12,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  consentSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  consentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  consentSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  dataList: {
    marginBottom: 16,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dataText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  purposeList: {
    marginBottom: 16,
  },
  purposeText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  securityList: {
    marginBottom: 16,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  rightsList: {
    marginBottom: 16,
  },
  rightsText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  checkboxSection: {
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
