import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Clock, User, Calendar, MapPin, DollarSign, MessageCircle, Star, AlertCircle, Flag } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { ActiveJobService, ActiveJob } from '../../lib/active-job-service';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../lib/notification-service';

interface JobAcceptanceProps {
  jobId: string;
}

export default function JobAcceptanceScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<JobAcceptanceProps>();
  const { user, userProfile } = useAuth();
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadJobData();
    }
  }, [jobId]);

  const loadJobData = async () => {
    try {
      setIsLoading(true);
      const jobData = await ActiveJobService.getActiveJob(jobId);
      setJob(jobData);
    } catch (error) {
      console.error('Error loading job data:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setIsLoading(false);
    }
  };

  const isBuyer = job?.buyer_id === user?.id;
  const isSeller = job?.seller_id === user?.id;

  const handleExtendJob = async () => {
    if (!job) return;

    Alert.alert(
      'Extend Job',
      'How many additional days would you like to extend this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '3 Days', onPress: () => extendJob(3) },
        { text: '7 Days', onPress: () => extendJob(7) },
        { text: '14 Days', onPress: () => extendJob(14) },
      ]
    );
  };

  const extendJob = async (additionalDays: number) => {
    if (!job) return;

    setIsExtending(true);
    try {
      // Update job delivery time
      const updatedJob = await ActiveJobService.updateJobDeliveryTime(job.id!, additionalDays);
      
      if (updatedJob) {
        setJob(updatedJob);
        
        // Send notification to the other party
        const notificationData = {
          participantId: isBuyer ? job.seller_id : job.buyer_id,
          participantName: userProfile?.full_name || user?.email?.split('@')[0] || 'User',
          participantImage: userProfile?.avatar_url || '',
          jobId: job.id!,
          jobTitle: job.title,
          extensionDays: additionalDays,
          isExtendedByBuyer: isBuyer,
        };

        await notificationService.addJobExtendedNotification(notificationData);

        Alert.alert(
          'Job Extended',
          `Job has been extended by ${additionalDays} days. The other party has been notified.`
        );
      }
    } catch (error) {
      console.error('Error extending job:', error);
      Alert.alert('Error', 'Failed to extend job');
    } finally {
      setIsExtending(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!job) return;

    Alert.alert(
      'Complete Job',
      'Are you sure you want to mark this job as completed? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const success = await ActiveJobService.completeJob(job.id!);
              
              if (success) {
                // Send notification to the other party
                const notificationData = {
                  participantId: isBuyer ? job.seller_id : job.buyer_id,
                  participantName: userProfile?.full_name || user?.email?.split('@')[0] || 'User',
                  participantImage: userProfile?.avatar_url || '',
                  jobId: job.id!,
                  jobTitle: job.title,
                  isCompletedByBuyer: isBuyer,
                };

                await notificationService.addJobCompletedNotification(notificationData);

                Alert.alert(
                  'Job Completed',
                  'Job has been marked as completed. You can now rate and review the other party.',
                  [
                    {
                      text: 'Rate & Review',
                      onPress: () => router.push(`/job-review/${job.id}`)
                    },
                    { text: 'OK' }
                  ]
                );
              }
            } catch (error) {
              console.error('Error completing job:', error);
              Alert.alert('Error', 'Failed to complete job');
            }
          }
        }
      ]
    );
  };

  const handleReportJob = () => {
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim() || !job) return;

    try {
      // In a real app, this would send the report to your backend
      await notificationService.addJobReportedNotification({
        jobId: job.id!,
        jobTitle: job.title,
        reportedBy: user?.id || '',
        reportedByName: userProfile?.full_name || user?.email?.split('@')[0] || 'User',
        reason: reportReason,
        reportedUserId: isBuyer ? job.seller_id : job.buyer_id,
      });

      setShowReportModal(false);
      setReportReason('');
      
      Alert.alert(
        'Report Submitted',
        'Thank you for reporting this issue. Our team will review it and take appropriate action.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const handleMessage = () => {
    // Navigate to chat with the other party
    const otherPartyId = isBuyer ? job?.seller_id : job?.buyer_id;
    if (otherPartyId) {
      router.push(`/chat/${otherPartyId}`);
    }
  };

  const handleViewProgress = () => {
    router.push(`/job-progress/${jobId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return Colors.status.success;
      case 'in_progress':
        return Colors.primary.main;
      case 'cancelled':
        return Colors.status.error;
      default:
        return Colors.text.secondary;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={Colors.status.error} />
          <Text style={styles.errorTitle}>Job Not Found</Text>
          <Text style={styles.errorDescription}>
            The job you're looking for doesn't exist or you don't have permission to view it.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Acceptance</Text>
        <TouchableOpacity onPress={handleReportJob}>
          <Flag size={24} color={Colors.status.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Success Message */}
        <View style={styles.successSection}>
          <CheckCircle size={48} color={Colors.status.success} />
          <Text style={styles.successTitle}>Job Accepted Successfully!</Text>
          <Text style={styles.successDescription}>
            {isBuyer 
              ? 'Your payment has been processed and the seller has been notified.'
              : 'The buyer has accepted your offer and payment has been received.'
            }
          </Text>
        </View>

        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <View style={styles.jobCard}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobDescription}>{job.description}</Text>
            
            <View style={styles.jobDetails}>
              <View style={styles.detailRow}>
                <DollarSign size={16} color={Colors.primary.main} />
                <Text style={styles.detailLabel}>Price:</Text>
                <Text style={styles.detailValue}>{job.currency} {job.price}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Clock size={16} color={Colors.primary.main} />
                <Text style={styles.detailLabel}>Delivery Time:</Text>
                <Text style={styles.detailValue}>{job.delivery_time}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Calendar size={16} color={Colors.primary.main} />
                <Text style={styles.detailLabel}>Started:</Text>
                <Text style={styles.detailValue}>
                  {job.started_at ? formatDate(job.started_at) : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <User size={16} color={Colors.primary.main} />
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, { color: getStatusColor(job.status) }]}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${job.progress_percentage}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{job.progress_percentage}% Complete</Text>
            <TouchableOpacity style={styles.viewProgressButton} onPress={handleViewProgress}>
              <Text style={styles.viewProgressButtonText}>View Progress Updates</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          {/* Message Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
            <MessageCircle size={20} color={Colors.primary.main} />
            <Text style={styles.actionButtonText}>Message {isBuyer ? 'Seller' : 'Buyer'}</Text>
          </TouchableOpacity>

          {/* Extend Job Button */}
          {job.status === 'in_progress' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.extendButton]} 
              onPress={handleExtendJob}
              disabled={isExtending}
            >
              <Clock size={20} color={Colors.status.warning} />
              <Text style={styles.extendButtonText}>
                {isExtending ? 'Extending...' : 'Extend Job'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Complete Job Button */}
          {job.status === 'in_progress' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.completeButton]} 
              onPress={handleCompleteJob}
            >
              <CheckCircle size={20} color={Colors.status.success} />
              <Text style={styles.completeButtonText}>Complete Job</Text>
            </TouchableOpacity>
          )}

          {/* Rate & Review Button */}
          {job.status === 'completed' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.reviewButton]} 
              onPress={() => router.push(`/job-review/${job.id}`)}
            >
              <Star size={20} color={Colors.status.warning} />
              <Text style={styles.reviewButtonText}>Rate & Review</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Important Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Important Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              • Payment has been held in escrow and will be released when the job is completed
            </Text>
            <Text style={styles.infoText}>
              • You can extend the job timeline if needed
            </Text>
            <Text style={styles.infoText}>
              • Both parties can mark the job as complete
            </Text>
            <Text style={styles.infoText}>
              • Disputes can be raised if there are issues
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Issue</Text>
            <Text style={styles.modalSubtitle}>
              Please describe the issue you're experiencing with this job:
            </Text>
            
            <View style={styles.reportOptions}>
              <TouchableOpacity
                style={styles.reportOption}
                onPress={() => setReportReason('Poor communication')}
              >
                <Text style={styles.reportOptionText}>Poor communication</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reportOption}
                onPress={() => setReportReason('Quality issues')}
              >
                <Text style={styles.reportOptionText}>Quality issues</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reportOption}
                onPress={() => setReportReason('Delays')}
              >
                <Text style={styles.reportOptionText}>Delays</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reportOption}
                onPress={() => setReportReason('Payment issues')}
              >
                <Text style={styles.reportOptionText}>Payment issues</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reportOption}
                onPress={() => setReportReason('Other')}
              >
                <Text style={styles.reportOptionText}>Other</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  !reportReason.trim() && styles.modalSubmitButtonDisabled
                ]}
                onPress={submitReport}
                disabled={!reportReason.trim()}
              >
                <Text style={styles.modalSubmitText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.status.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  successSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.status.success + '10',
    borderRadius: 12,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.status.success,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  jobCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  jobDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  progressCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border.light,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.status.success,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.main,
    textAlign: 'center',
    marginBottom: 12,
  },
  viewProgressButton: {
    backgroundColor: Colors.primary.main,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
  },
  viewProgressButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  extendButton: {
    borderColor: Colors.status.warning,
  },
  extendButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.status.warning,
  },
  completeButton: {
    borderColor: Colors.status.success,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.status.success,
  },
  reviewButton: {
    borderColor: Colors.status.warning,
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.status.warning,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  reportOptions: {
    marginBottom: 20,
  },
  reportOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  reportOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.status.error,
    alignItems: 'center',
  },
  modalSubmitButtonDisabled: {
    backgroundColor: Colors.interactive.disabled,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
}); 