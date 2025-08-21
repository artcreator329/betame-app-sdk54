import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, AlertCircle, CheckCircle, Clock, MessageSquare } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { EscrowService } from '@/lib/escrow-service';
import { useAuth } from '@/contexts/AuthContext';

interface RevisionModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  serviceTitle: string;
  serviceProviderName: string;
  currentStatus: string;
  revisionReason?: string;
  revisionDeadline?: string;
  onStatusUpdate: () => void;
}

export default function RevisionModal({
  visible,
  onClose,
  jobId,
  serviceTitle,
  serviceProviderName,
  currentStatus,
  revisionReason,
  revisionDeadline,
  onStatusUpdate,
}: RevisionModalProps) {
  const colors = useColors();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [revisionReasonInput, setRevisionReasonInput] = useState('');
  const [disputeReasonInput, setDisputeReasonInput] = useState('');
  const [completionNotesInput, setCompletionNotesInput] = useState('');

  const handleRequestRevision = async () => {
    if (!revisionReasonInput.trim()) {
      Alert.alert('Required Field', 'Please provide a reason for the revision request.');
      return;
    }

    setLoading(true);
    try {
      const result = await EscrowService.requestRevision(
        jobId,
        user!.id,
        revisionReasonInput.trim()
      );

      if (result.success) {
        Alert.alert(
          'Revision Requested',
          'Your revision request has been sent to the service provider. They will respond within the deadline.',
          [{ text: 'OK', onPress: onClose }]
        );
        onStatusUpdate();
      } else {
        Alert.alert('Error', result.error || 'Failed to request revision');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request revision');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeRevision = async () => {
    setLoading(true);
    try {
      const result = await EscrowService.acknowledgeRevision(jobId, user!.id);

      if (result.success) {
        Alert.alert(
          'Revision Acknowledged',
          'You have acknowledged the revision request. Please work on the improvements and mark as completed when done.',
          [{ text: 'OK', onPress: onClose }]
        );
        onStatusUpdate();
      } else {
        Alert.alert('Error', result.error || 'Failed to acknowledge revision');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to acknowledge revision');
    } finally {
      setLoading(false);
    }
  };

  const handleDisputeRevision = async () => {
    if (!disputeReasonInput.trim()) {
      Alert.alert('Required Field', 'Please provide a reason for disputing the revision request.');
      return;
    }

    Alert.alert(
      'Dispute Revision Request',
      'Are you sure you want to dispute this revision request? This will escalate the issue to our support team.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispute',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await EscrowService.disputeRevision(
                jobId,
                user!.id,
                disputeReasonInput.trim()
              );

              if (result.success) {
                Alert.alert(
                  'Revision Disputed',
                  'Your dispute has been filed. Our support team will review the case and contact both parties.',
                  [{ text: 'OK', onPress: onClose }]
                );
                onStatusUpdate();
              } else {
                Alert.alert('Error', result.error || 'Failed to dispute revision');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to dispute revision');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCompleteRevision = async () => {
    setLoading(true);
    try {
      const result = await EscrowService.completeRevision(
        jobId,
        user!.id,
        completionNotesInput.trim() || undefined
      );

      if (result.success) {
        Alert.alert(
          'Revision Completed',
          'You have marked the revision as completed. The buyer will be notified to review the updated work.',
          [{ text: 'OK', onPress: onClose }]
        );
        onStatusUpdate();
      } else {
        Alert.alert('Error', result.error || 'Failed to complete revision');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete revision');
    } finally {
      setLoading(false);
    }
  };

  const renderBuyerReviewingContent = () => (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <CheckCircle size={48} color={colors.primary.main} />
      </View>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Review Completed Work
      </Text>
      <Text style={[styles.description, { color: colors.text.secondary }]}>
        {serviceProviderName} has marked "{serviceTitle}" as completed. Please review the work and choose an action.
      </Text>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary.main }]}
          onPress={() => {
            // This would call confirmCompletionAndReleasePayment
            Alert.alert('Confirm Completion', 'This will release payment to the service provider.');
          }}
        >
          <Text style={[styles.buttonText, { color: colors.background.primary }]}>
            Confirm & Release Payment
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { borderColor: colors.border.main }]}
          onPress={() => setRevisionReasonInput('')}
        >
          <MessageSquare size={20} color={colors.primary.main} />
          <Text style={[styles.buttonText, { color: colors.primary.main }]}>
            Request Improvements
          </Text>
        </TouchableOpacity>
      </View>

      {revisionReasonInput !== '' && (
        <View style={styles.revisionSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Revision Request Details
          </Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: colors.background.secondary, 
              borderColor: colors.border.main,
              color: colors.text.primary 
            }]}
            placeholder="Describe what improvements or changes you need..."
            placeholderTextColor={colors.text.secondary}
            value={revisionReasonInput}
            onChangeText={setRevisionReasonInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary.main }]}
            onPress={handleRequestRevision}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.background.primary} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.background.primary }]}>
                Submit Revision Request
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderRevisionRequestedContent = () => (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <AlertCircle size={48} color={colors.status.warning} />
      </View>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Revision Requested
      </Text>
      <Text style={[styles.description, { color: colors.text.secondary }]}>
        The buyer has requested improvements for "{serviceTitle}".
      </Text>

      <View style={styles.revisionInfo}>
        <Text style={[styles.infoLabel, { color: colors.text.primary }]}>Reason:</Text>
        <Text style={[styles.infoValue, { color: colors.text.secondary }]}>
          {revisionReason}
        </Text>
        {revisionDeadline && (
          <>
            <Text style={[styles.infoLabel, { color: colors.text.primary }]}>Deadline:</Text>
            <Text style={[styles.infoValue, { color: colors.text.secondary }]}>
              {new Date(revisionDeadline).toLocaleDateString()}
            </Text>
          </>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary.main }]}
          onPress={handleAcknowledgeRevision}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.background.primary} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.background.primary }]}>
              Acknowledge & Work on Improvements
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { borderColor: colors.border.main }]}
          onPress={() => setDisputeReasonInput('')}
        >
          <AlertCircle size={20} color={colors.status.error} />
          <Text style={[styles.buttonText, { color: colors.status.error }]}>
            Dispute Request
          </Text>
        </TouchableOpacity>
      </View>

      {disputeReasonInput !== '' && (
        <View style={styles.revisionSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Dispute Reason
          </Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: colors.background.secondary, 
              borderColor: colors.border.main,
              color: colors.text.primary 
            }]}
            placeholder="Explain why you are disputing this revision request..."
            placeholderTextColor={colors.text.secondary}
            value={disputeReasonInput}
            onChangeText={setDisputeReasonInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.status.error }]}
            onPress={handleDisputeRevision}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.background.primary} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.background.primary }]}>
                Submit Dispute
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderRevisionInProgressContent = () => (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <Clock size={48} color={colors.primary.main} />
      </View>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Working on Improvements
      </Text>
      <Text style={[styles.description, { color: colors.text.secondary }]}>
        You are currently working on the requested improvements for "{serviceTitle}".
      </Text>

      <View style={styles.revisionInfo}>
        <Text style={[styles.infoLabel, { color: colors.text.primary }]}>Original Request:</Text>
        <Text style={[styles.infoValue, { color: colors.text.secondary }]}>
          {revisionReason}
        </Text>
      </View>

      <View style={styles.revisionSection}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Completion Notes (Optional)
        </Text>
        <TextInput
          style={[styles.textInput, { 
            backgroundColor: colors.background.secondary, 
            borderColor: colors.border.main,
            color: colors.text.primary 
          }]}
          placeholder="Describe what improvements you've made..."
          placeholderTextColor={colors.text.secondary}
          value={completionNotesInput}
          onChangeText={setCompletionNotesInput}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary.main }]}
          onPress={handleCompleteRevision}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.background.primary} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.background.primary }]}>
              Mark Revision Complete
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRevisionCompletedContent = () => (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <CheckCircle size={48} color={colors.status.success} />
      </View>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Revision Completed
      </Text>
      <Text style={[styles.description, { color: colors.text.secondary }]}>
        {serviceProviderName} has completed the requested improvements for "{serviceTitle}". Please review the updated work.
      </Text>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary.main }]}
          onPress={() => {
            // This would call confirmCompletionAndReleasePayment
            Alert.alert('Confirm Completion', 'This will release payment to the service provider.');
          }}
        >
          <Text style={[styles.buttonText, { color: colors.background.primary }]}>
            Confirm & Release Payment
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { borderColor: colors.border.main }]}
          onPress={() => setRevisionReasonInput('')}
        >
          <MessageSquare size={20} color={colors.primary.main} />
          <Text style={[styles.buttonText, { color: colors.primary.main }]}>
            Request Additional Changes
          </Text>
        </TouchableOpacity>
      </View>

      {revisionReasonInput !== '' && (
        <View style={styles.revisionSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Additional Revision Request
          </Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: colors.background.secondary, 
              borderColor: colors.border.main,
              color: colors.text.primary 
            }]}
            placeholder="Describe what additional changes you need..."
            placeholderTextColor={colors.text.secondary}
            value={revisionReasonInput}
            onChangeText={setRevisionReasonInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary.main }]}
            onPress={handleRequestRevision}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.background.primary} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.background.primary }]}>
                Submit Additional Request
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    switch (currentStatus) {
      case 'buyer_reviewing':
        return renderBuyerReviewingContent();
      case 'revision_requested':
        return renderRevisionRequestedContent();
      case 'revision_in_progress':
        return renderRevisionInProgressContent();
      case 'revision_completed':
        return renderRevisionCompletedContent();
      default:
        return (
          <View style={styles.content}>
            <Text style={[styles.description, { color: colors.text.secondary }]}>
              Current status: {currentStatus}
            </Text>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Job Revision
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  revisionInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  revisionSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 16,
  },
});
