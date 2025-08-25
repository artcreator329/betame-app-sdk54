import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Shield
} from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';

interface RealNameInputModalProps {
  visible: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  realName: string;
  setRealName: (name: string) => void;
}

export function RealNameInputModal({ 
  visible, 
  onSubmit, 
  onCancel, 
  realName, 
  setRealName 
}: RealNameInputModalProps) {
  const colors = useColors();

  const handleSubmit = () => {
    if (!realName.trim()) {
      Alert.alert('Real Name Required', 'Please enter your real name to continue.');
      return;
    }
    
    // Validate that it's a reasonable name (at least 2 characters, no numbers)
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    if (!nameRegex.test(realName.trim())) {
      Alert.alert(
        'Invalid Name Format', 
        'Please enter your real name using only letters and spaces (2-50 characters).'
      );
      return;
    }
    
    onSubmit();
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel eKYC Verification',
      'Are you sure you want to cancel? You can start the verification process again later.',
      [
        { text: 'Continue', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: onCancel }
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
            <User size={24} color={colors.primary.main} />
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              Enter Your Real Name
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
            Required for eKYC verification
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Important Notice */}
          <View style={[styles.noticeBox, { backgroundColor: colors.status.warning + '15', borderColor: colors.status.warning }]}>
            <AlertCircle size={20} color={colors.status.warning} />
            <View style={styles.noticeContent}>
              <Text style={[styles.noticeTitle, { color: colors.status.warning }]}>
                Important Notice
              </Text>
              <Text style={[styles.noticeText, { color: colors.text.primary }]}>
                For eKYC verification, we need your real name as it appears on your official identity documents (IC or Passport). This name will be used in the PDPA consent form and verification process.
              </Text>
            </View>
          </View>

          {/* Real Name Input */}
          <View style={[styles.inputSection, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Your Real Name
            </Text>
            
            <Text style={[styles.inputDescription, { color: colors.text.secondary }]}>
              Please enter your full name exactly as it appears on your Malaysian IC or Passport.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
                Full Name <Text style={{ color: colors.status.error }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.background.secondary, 
                  borderColor: colors.border.light, 
                  color: colors.text.primary 
                }]}
                value={realName}
                onChangeText={setRealName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Text style={[styles.inputHint, { color: colors.text.tertiary }]}>
                Example: Ahmad bin Abdullah or Sarah Tan Li Ming
              </Text>
            </View>

            {/* Requirements */}
            <View style={styles.requirementsContainer}>
              <Text style={[styles.requirementsTitle, { color: colors.text.primary }]}>
                Requirements:
              </Text>
              <View style={styles.requirementItem}>
                <CheckCircle size={16} color={colors.status.success} />
                <Text style={[styles.requirementText, { color: colors.text.secondary }]}>
                  Must match your official identity document
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <CheckCircle size={16} color={colors.status.success} />
                <Text style={[styles.requirementText, { color: colors.text.secondary }]}>
                  Use only letters and spaces
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <CheckCircle size={16} color={colors.status.success} />
                <Text style={[styles.requirementText, { color: colors.text.secondary }]}>
                  Include your full name (first, middle, last)
                </Text>
              </View>
            </View>
          </View>

          {/* Privacy Notice */}
          <View style={[styles.privacyNotice, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <Shield size={16} color={colors.text.secondary} />
            <Text style={[styles.privacyText, { color: colors.text.secondary }]}>
              Your real name will only be used for eKYC verification and PDPA consent purposes. It will be handled securely and in accordance with Malaysian privacy laws.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionContainer, { backgroundColor: colors.background.tertiary }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border.light }]}
            onPress={handleCancel}
          >
            <XCircle size={20} color={colors.status.error} />
            <Text style={[styles.cancelButtonText, { color: colors.status.error }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.submitButton, 
              { 
                backgroundColor: realName.trim() ? colors.primary.main : colors.interactive.disabled 
              }
            ]}
            onPress={handleSubmit}
            disabled={!realName.trim()}
          >
            <CheckCircle size={20} color="white" />
            <Text style={[styles.submitButtonText, { color: 'white' }]}>
              Continue
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
  inputSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  requirementsContainer: {
    marginTop: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 14,
    marginLeft: 8,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  privacyText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
