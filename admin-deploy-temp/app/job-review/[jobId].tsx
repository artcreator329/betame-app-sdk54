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
import { ArrowLeft, Star, MessageCircle, Flag, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { ActiveJobService, ActiveJob } from '../../lib/active-job-service';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../lib/notification-service';
import JobCompletionPhotosViewer from '../../components/JobCompletionPhotosViewer';
import { JobCompletionService } from '../../lib/job-completion-service';
import { supabase } from '../../lib/supabase';

export default function JobReviewScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { user, userProfile } = useAuth();
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [completionPhotos, setCompletionPhotos] = useState<any[]>([]);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [actionType, setActionType] = useState<'release' | 'revision' | null>(null);

  useEffect(() => {
    if (jobId) {
      loadJobData();
    }
  }, [jobId]);

  const loadJobData = async () => {
    try {
      setIsLoading(true);
      const [jobData, photosData] = await Promise.all([
        ActiveJobService.getActiveJob(jobId),
        JobCompletionService.getCompletionPhotos(jobId)
      ]);
      setJob(jobData);
      setCompletionPhotos(photosData);
    } catch (error) {
      console.error('Error loading job data:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setIsLoading(false);
    }
  };

  const isBuyer = job?.buyer_id === user?.id;
  const isSeller = job?.seller_id === user?.id;

  const handleRatingPress = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting your review.');
      return;
    }

    if (!review.trim()) {
      Alert.alert('Review Required', 'Please write a review before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // In a real app, this would save the review to your backend
      const reviewData = {
        jobId: job?.id!,
        reviewerId: user?.id!,
        reviewedUserId: isBuyer ? job?.seller_id! : job?.buyer_id!,
        rating,
        review: review.trim(),
        jobTitle: job?.title!,
        isReviewedByBuyer: isBuyer,
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send notification to the reviewed user
      const notificationData = {
        participantId: isBuyer ? job?.seller_id! : job?.buyer_id!,
        participantName: userProfile?.full_name || user?.email?.split('@')[0] || 'User',
        participantImage: userProfile?.avatar_url || '',
        jobId: job?.id!,
        jobTitle: job?.title!,
        rating,
        review: review.trim(),
        isReviewedByBuyer: isBuyer,
      };

      await notificationService.addNotification({
        type: 'service',
        title: 'Job Review Received',
        message: `You received a ${rating}-star review for "${job?.title}"`,
        data: notificationData,
      }, isBuyer ? job?.seller_id! : job?.buyer_id!);

      Alert.alert(
        'Review Submitted',
        'Thank you for your review! It has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportUser = () => {
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim() || !job) return;

    try {
      await notificationService.addNotification({
        type: 'system',
        title: 'Job Report Submitted',
        message: `A report has been submitted for job "${job.title}"`,
        data: {
          jobId: job.id!,
          jobTitle: job.title,
          reportedBy: user?.id || '',
          reportedByName: userProfile?.full_name || user?.email?.split('@')[0] || 'User',
          reason: reportReason,
          reportedUserId: isBuyer ? job.seller_id : job.buyer_id,
        },
      }, 'admin'); // Send to admin for review

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

  const handleReleasePayment = () => {
    setActionType('release');
    setShowRevisionModal(true);
  };

  const handleRequestRevision = () => {
    console.log('🔴 REVISION BUTTON CLICKED!');
    setActionType('revision');
    setShowRevisionModal(true);
  };

  const handleConfirmAction = async () => {
    if (!job || !actionType) return;

    setIsSubmitting(true);
    try {
      if (actionType === 'release') {
        // Release payment to seller
        await ActiveJobService.completeJob(job.id!);
        
        // Send notification to seller
        await notificationService.addNotification({
          type: 'service',
          title: 'Payment Released',
          message: `Payment for "${job.title}" has been released to your account`,
          data: { jobId: job.id, jobTitle: job.title },
        }, job.seller_id);

        Alert.alert(
          'Payment Released',
          'Payment has been successfully released to the seller.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (actionType === 'revision') {
        // Request revision
        if (!revisionReason.trim()) {
          Alert.alert('Revision Reason Required', 'Please provide a reason for the revision request.');
          return;
        }

        // Update job status to revision requested
        const { error } = await supabase
          .from('active_jobs')
          .update({
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id!);

        if (error) {
          throw new Error('Failed to update job status');
        }

        // Send notification to seller
        await notificationService.addNotification({
          type: 'service',
          title: 'Revision Requested',
          message: `A revision has been requested for "${job.title}"`,
          data: { 
            jobId: job.id, 
            jobTitle: job.title, 
            revisionReason: revisionReason.trim() 
          },
        }, job.seller_id);

        Alert.alert(
          'Revision Requested',
          'Your revision request has been sent to the seller.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Error processing action:', error);
      Alert.alert('Error', 'Failed to process your request. Please try again.');
    } finally {
      setIsSubmitting(false);
      setShowRevisionModal(false);
      setRevisionReason('');
      setActionType(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  // Allow review for completed jobs and in_progress jobs (for revision requests)
  if (job.status !== 'completed' && job.status !== 'in_progress') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Job Not Available for Review</Text>
          <Text style={styles.errorDescription}>
            You can only review a job when it's in progress or completed.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  console.log('🔍 Job status:', job.status, 'Job ID:', job.id);
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerCancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm & Release Payment</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.orderCard}>
            <Text style={styles.orderTitle}>{job.title}</Text>
            <Text style={styles.orderDescription}>{job.description}</Text>
            <Text style={styles.paymentText}>
              {job.currency} {job.price} will be released to the seller
            </Text>
          </View>
        </View>

        {/* Completion Photos */}
        {completionPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completion Photos</Text>
            <JobCompletionPhotosViewer photos={completionPhotos} />
          </View>
        )}

        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rate this service</Text>
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  style={styles.starButton}
                  onPress={() => handleRatingPress(star)}
                >
                  <Star
                    size={32}
                    color={star <= rating ? Colors.status.warning : Colors.border.light}
                    fill={star <= rating ? Colors.status.warning : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingText}>
              {rating === 0 && 'Select a rating'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </Text>
          </View>
        </View>

        {/* Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback (Optional)</Text>
          <TextInput
            style={styles.feedbackInput}
            value={review}
            onChangeText={setReview}
            placeholder="Share your experience with this service..."
            placeholderTextColor={Colors.text.tertiary}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{review.length}/500</Text>
        </View>

        {/* Release Button - Centered */}
        <View style={styles.releaseButtonContainer}>
          <TouchableOpacity 
            style={[styles.releaseButton, (rating === 0 || isSubmitting) && styles.releaseButtonDisabled]}
            onPress={handleReleasePayment}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <CheckCircle size={20} color="white" />
                <Text style={styles.releaseButtonText}>Release Payment</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Revision Option */}
        <View style={styles.revisionSection}>
          <TouchableOpacity 
            style={styles.revisionButton}
            onPress={handleRequestRevision}
          >
            <RotateCcw size={20} color={Colors.status.warning} />
            <Text style={styles.revisionButtonText}>Request Revision Instead</Text>
          </TouchableOpacity>
        </View>

        {/* Warning Message */}
        <View style={styles.warningContainer}>
          <AlertTriangle size={20} color={Colors.status.warning} />
          <Text style={styles.warningText}>
            Once you confirm, the payment will be released to the seller and cannot be reversed.
          </Text>
        </View>
      </ScrollView>

      {/* Revision Modal */}
      <Modal
        visible={showRevisionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRevisionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'release' ? 'Confirm Payment Release' : 'Request Revision'}
            </Text>
            
            {actionType === 'revision' && (
              <>
                <Text style={styles.modalSubtitle}>
                  Please provide a reason for the revision request:
                </Text>
                <TextInput
                  style={styles.revisionInput}
                  value={revisionReason}
                  onChangeText={setRevisionReason}
                  placeholder="Describe what needs to be revised..."
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </>
            )}

            {actionType === 'release' && (
              <Text style={styles.modalSubtitle}>
                Are you sure you want to release the payment to the seller? This action cannot be undone.
              </Text>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowRevisionModal(false);
                  setRevisionReason('');
                  setActionType(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  actionType === 'revision' && !revisionReason.trim() && styles.modalConfirmButtonDisabled
                ]}
                onPress={handleConfirmAction}
                disabled={actionType === 'revision' && !revisionReason.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {actionType === 'release' ? 'Release' : 'Request Revision'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      {showReportModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Issue</Text>
            <Text style={styles.modalSubtitle}>
              Please describe the issue you're experiencing:
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
      )}
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
  headerCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary.main,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  orderDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  paymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.main,
  },
  ratingContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textAlign: 'right',
    marginTop: 8,
  },
  releaseButtonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  revisionSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  revisionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  revisionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.status.warning,
  },
  releaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.main,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    minWidth: 200,
  },
  releaseButtonDisabled: {
    backgroundColor: Colors.interactive.disabled,
  },
  releaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: Colors.status.warning,
    padding: 16,
    borderRadius: 8,
    gap: 12,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  revisionCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.status.warning,
    borderStyle: 'dashed',
  },
  revisionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  revisionTextContainer: {
    flex: 1,
  },
  revisionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.status.warning,
    marginBottom: 4,
  },
  revisionDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  revisionInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
    minHeight: 100,
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
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary.main,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    backgroundColor: Colors.interactive.disabled,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
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