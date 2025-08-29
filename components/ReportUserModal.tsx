import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Flag, X } from 'lucide-react-native';
import { UserReportService } from '@/lib/user-report-service';

interface ReportUserModalProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  reporterId: string;
  reportedUserName: string;
  context?: {
    chatId?: string;
    profileContext?: string;
  };
}

const REPORT_REASONS = [
  'Inappropriate content',
  'Harassment or bullying',
  'Spam or scam',
  'Fake profile',
  'Inappropriate behavior',
  'Other',
];

export default function ReportUserModal({
  visible,
  onClose,
  reportedUserId,
  reporterId,
  reportedUserName,
  context,
}: ReportUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async (reason: string) => {
    if (!reportedUserId || !reporterId) {
      Alert.alert('Error', 'Missing user information');
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await UserReportService.reportUser(
        reportedUserId,
        reporterId,
        reason,
        context
      );

      if (success) {
        Alert.alert(
          'Report Submitted',
          'Thank you for reporting. Our team will review this report and take appropriate action.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert('Error', 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Flag size={20} color="#FF3B30" />
              <Text style={styles.modalTitle}>Report User</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <X size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Why are you reporting {reportedUserName}?
          </Text>

          {REPORT_REASONS.map((reason, index) => (
            <TouchableOpacity
              key={index}
              style={styles.reportOption}
              onPress={() => handleReport(reason)}
              disabled={isSubmitting}
            >
              <Text style={styles.reportOptionText}>{reason}</Text>
            </TouchableOpacity>
          ))}

          {isSubmitting && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Submitting report...</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.modalCancelButton, isSubmitting && styles.disabledButton]}
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 20,
    lineHeight: 22,
  },
  reportOption: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reportOptionText: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  modalCancelButton: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
});
