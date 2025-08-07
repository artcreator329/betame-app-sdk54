import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Clock, CheckCircle, AlertCircle, MessageCircle, Star, Flag } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { ActiveJobService, ActiveJob, JobProgress } from '../../lib/active-job-service';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../lib/notification-service';

interface JobProgressProps {
  jobId: string;
}

export default function JobProgressScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<JobProgressProps>();
  const { user, userProfile } = useAuth();
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [progressHistory, setProgressHistory] = useState<JobProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProgressModal, setShowAddProgressModal] = useState(false);
  const [newProgressMessage, setNewProgressMessage] = useState('');
  const [newProgressPercentage, setNewProgressPercentage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    if (jobId) {
      loadJobData();
    }
  }, [jobId]);

  const loadJobData = async () => {
    try {
      setIsLoading(true);
      const [jobData, progressData] = await Promise.all([
        ActiveJobService.getActiveJob(jobId),
        ActiveJobService.getJobProgress(jobId)
      ]);
      
      setJob(jobData);
      setProgressHistory(progressData);
    } catch (error) {
      console.error('Error loading job data:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setIsLoading(false);
    }
  };

  const isBuyer = job?.buyer_id === user?.id;
  const isSeller = job?.seller_id === user?.id;

  const handleAddProgress = async () => {
    if (!newProgressMessage.trim() || !job) return;

    setIsSubmitting(true);
    try {
      const success = await ActiveJobService.updateJobProgress(
        job.id!,
        newProgressPercentage,
        newProgressMessage.trim(),
        user?.id || ''
      );

      if (success) {
        // Reload progress data
        await loadJobData();
        
        // Send notification to the other party
        const notificationData = {
          participantId: isBuyer ? job.seller_id : job.buyer_id,
          participantName: userProfile?.full_name || user?.email?.split('@')[0] || 'User',
          participantImage: userProfile?.avatar_url || '',
          jobId: job.id!,
          jobTitle: job.title,
          progressPercentage: newProgressPercentage,
          progressMessage: newProgressMessage.trim(),
          isUpdatedByBuyer: isBuyer,
        };

        await notificationService.addJobProgressNotification(notificationData);

        setShowAddProgressModal(false);
        setNewProgressMessage('');
        setNewProgressPercentage(0);
        
        Alert.alert('Success', 'Progress update added successfully!');
      } else {
        Alert.alert('Error', 'Failed to add progress update');
      }
    } catch (error) {
      console.error('Error adding progress:', error);
      Alert.alert('Error', 'Failed to add progress update');
    } finally {
      setIsSubmitting(false);
    }
  };

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

    try {
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
    const otherPartyId = isBuyer ? job?.seller_id : job?.buyer_id;
    if (otherPartyId) {
      router.push(`/chat/${otherPartyId}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
          <Text style={styles.loadingText}>Loading job progress...</Text>
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
        <Text style={styles.headerTitle}>Job Progress</Text>
        <TouchableOpacity onPress={handleReportJob}>
          <Flag size={24} color={Colors.status.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Job Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Overview</Text>
          <View style={styles.jobCard}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobDescription}>{job.description}</Text>
            
            <View style={styles.jobStats}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Status:</Text>
                <Text style={[styles.statValue, { color: getStatusColor(job.status) }]}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Progress:</Text>
                <Text style={styles.statValue}>{job.progress_percentage}%</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Price:</Text>
                <Text style={styles.statValue}>{job.currency} {job.price}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${job.progress_percentage}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{job.progress_percentage}% Complete</Text>
          </View>
        </View>

        {/* Progress History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Progress Updates</Text>
            {job.status === 'in_progress' && (
              <TouchableOpacity 
                style={styles.addProgressButton}
                onPress={() => setShowAddProgressModal(true)}
              >
                <Plus size={20} color={Colors.primary.main} />
              </TouchableOpacity>
            )}
          </View>
          
          {progressHistory.length > 0 ? (
            <View style={styles.progressList}>
              {progressHistory.map((progress, index) => (
                <View key={index} style={styles.progressItem}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>Update #{index + 1}</Text>
                    <Text style={styles.progressDate}>
                      {progress.created_at ? formatDate(progress.created_at) : 'N/A'}
                    </Text>
                  </View>
                  <Text style={styles.progressMessage}>{progress.message}</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[styles.progressFill, { width: `${progress.progress_percentage}%` }]}
                    />
                  </View>
                  <Text style={styles.progressPercentage}>{progress.progress_percentage}% Complete</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyProgress}>
              <Clock size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyProgressText}>No progress updates yet</Text>
              <Text style={styles.emptyProgressSubtext}>
                {job.status === 'in_progress' 
                  ? 'Add the first progress update to keep the other party informed.'
                  : 'Progress updates will appear here once the job begins.'
                }
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
            <MessageCircle size={20} color={Colors.primary.main} />
            <Text style={styles.actionButtonText}>Message {isBuyer ? 'Seller' : 'Buyer'}</Text>
          </TouchableOpacity>

          {job.status === 'in_progress' && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.extendButton]} 
                onPress={handleExtendJob}
              >
                <Clock size={20} color={Colors.status.warning} />
                <Text style={styles.extendButtonText}>Extend Job</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.completeButton]} 
                onPress={handleCompleteJob}
              >
                <CheckCircle size={20} color={Colors.status.success} />
                <Text style={styles.completeButtonText}>Complete Job</Text>
              </TouchableOpacity>
            </>
          )}

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
      </ScrollView>

      {/* Add Progress Modal */}
      <Modal
        visible={showAddProgressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddProgressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Progress Update</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Progress Message</Text>
              <TextInput
                style={styles.textInput}
                value={newProgressMessage}
                onChangeText={setNewProgressMessage}
                placeholder="Describe the progress made..."
                placeholderTextColor={Colors.text.tertiary}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Progress Percentage</Text>
              <View style={styles.percentageContainer}>
                {[0, 25, 50, 75, 100].map((percentage) => (
                  <TouchableOpacity
                    key={percentage}
                    style={[
                      styles.percentageButton,
                      newProgressPercentage === percentage && styles.percentageButtonSelected
                    ]}
                    onPress={() => setNewProgressPercentage(percentage)}
                  >
                    <Text style={[
                      styles.percentageButtonText,
                      newProgressPercentage === percentage && styles.percentageButtonTextSelected
                    ]}>
                      {percentage}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddProgressModal(false);
                  setNewProgressMessage('');
                  setNewProgressPercentage(0);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  (!newProgressMessage.trim() || isSubmitting) && styles.modalSubmitButtonDisabled
                ]}
                onPress={handleAddProgress}
                disabled={!newProgressMessage.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalSubmitText}>Add Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  addProgressButton: {
    padding: 8,
    backgroundColor: Colors.primary.light,
    borderRadius: 8,
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
  jobStats: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  statValue: {
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
  },
  progressList: {
    gap: 16,
  },
  progressItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  progressDate: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  progressMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary.main,
    textAlign: 'right',
  },
  emptyProgress: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  emptyProgressText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyProgressSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
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
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
    textAlignVertical: 'top',
  },
  percentageContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  percentageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  percentageButtonSelected: {
    backgroundColor: Colors.primary.main,
    borderColor: Colors.primary.main,
  },
  percentageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  percentageButtonTextSelected: {
    color: 'white',
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
    backgroundColor: Colors.primary.main,
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
}); 