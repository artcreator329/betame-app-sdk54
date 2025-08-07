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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, MessageCircle, Flag } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { ActiveJobService, ActiveJob } from '../../lib/active-job-service';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../lib/notification-service';

interface JobReviewProps {
  jobId: string;
}

export default function JobReviewScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<JobReviewProps>();
  const { user, userProfile } = useAuth();
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
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

      await notificationService.addJobReviewedNotification(notificationData);

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

  if (job.status !== 'completed') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Job Not Completed</Text>
          <Text style={styles.errorDescription}>
            You can only review a job after it has been completed.
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
        <Text style={styles.headerTitle}>Rate & Review</Text>
        <TouchableOpacity onPress={handleReportUser}>
          <Flag size={24} color={Colors.status.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <View style={styles.jobCard}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobDescription}>{job.description}</Text>
            
            <View style={styles.jobDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Price:</Text>
                <Text style={styles.detailValue}>{job.currency} {job.price}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Completed:</Text>
                <Text style={styles.detailValue}>
                  {job.completed_at ? formatDate(job.completed_at) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Review Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Rate {isBuyer ? 'Seller' : 'Buyer'}
          </Text>
          
          {/* Rating Stars */}
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>How would you rate your experience?</Text>
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

          {/* Review Text */}
          <View style={styles.reviewContainer}>
            <Text style={styles.reviewLabel}>Write your review (optional)</Text>
            <TextInput
              style={styles.reviewInput}
              value={review}
              onChangeText={setReview}
              placeholder="Share your experience with this job..."
              placeholderTextColor={Colors.text.tertiary}
              multiline
              numberOfLines={6}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{review.length}/500</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
            <MessageCircle size={20} color={Colors.primary.main} />
            <Text style={styles.actionButtonText}>Message {isBuyer ? 'Seller' : 'Buyer'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.submitButton, (rating === 0 || isSubmitting) && styles.submitButtonDisabled]}
            onPress={handleSubmitReview}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Star size={20} color="white" />
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Guidelines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Review Guidelines</Text>
          <View style={styles.guidelinesCard}>
            <Text style={styles.guidelineText}>• Be honest and constructive in your review</Text>
            <Text style={styles.guidelineText}>• Focus on the work quality and communication</Text>
            <Text style={styles.guidelineText}>• Avoid personal attacks or inappropriate language</Text>
            <Text style={styles.guidelineText}>• Your review will be visible to the community</Text>
          </View>
        </View>
      </ScrollView>

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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  ratingContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
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
  reviewContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginTop: 12,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  reviewInput: {
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.status.success,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.interactive.disabled,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  guidelinesCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  guidelineText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
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