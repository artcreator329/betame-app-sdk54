import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Clock, CheckCircle, AlertCircle, MessageCircle, Star } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { ActiveJobService } from '../lib/active-job-service';
import { ActiveJob, JobProgress } from '../lib/active-job-service';

interface JobProgressMonitorProps {
  jobId: string;
  isVisible: boolean;
  onClose: () => void;
  onSendMessage: () => void;
}

export function JobProgressMonitor({
  jobId,
  isVisible,
  onClose,
  onSendMessage,
}: JobProgressMonitorProps) {
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [progressHistory, setProgressHistory] = useState<JobProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isVisible && jobId) {
      loadJobData();
    }
  }, [isVisible, jobId]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return Colors.status.success;
      case 'in_progress':
        return Colors.primary.main;
      case 'pending':
        return Colors.status.warning;
      case 'cancelled':
        return Colors.status.error;
      default:
        return Colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} color={Colors.status.success} />;
      case 'in_progress':
        return <Clock size={20} color={Colors.primary.main} />;
      case 'pending':
        return <AlertCircle size={20} color={Colors.status.warning} />;
      case 'cancelled':
        return <AlertCircle size={20} color={Colors.status.error} />;
      default:
        return <Clock size={20} color={Colors.text.secondary} />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCompleteJob = async () => {
    Alert.alert(
      'Complete Job',
      'Are you sure you want to mark this job as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await ActiveJobService.completeJob(jobId);
              await loadJobData();
              Alert.alert('Success', 'Job marked as completed!');
            } catch (error) {
              console.error('Error completing job:', error);
              Alert.alert('Error', 'Failed to complete job');
            }
          }
        }
      ]
    );
  };

  const handleCancelJob = async () => {
    Alert.alert(
      'Cancel Job',
      'Are you sure you want to cancel this job? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await ActiveJobService.cancelJob(jobId);
              await loadJobData();
              Alert.alert('Job Cancelled', 'The job has been cancelled.');
            } catch (error) {
              console.error('Error cancelling job:', error);
              Alert.alert('Error', 'Failed to cancel job');
            }
          }
        }
      ]
    );
  };

  if (!isVisible) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Job Header */}
      <View style={styles.header}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <View style={styles.statusContainer}>
            {getStatusIcon(job.status)}
            <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.messageButton} onPress={onSendMessage}>
          <MessageCircle size={20} color={Colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Job Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Job Details</Text>
        <View style={styles.detailsContainer}>
          <Text style={styles.description}>{job.description}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price:</Text>
            <Text style={styles.detailValue}>{job.price} {job.currency}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery Time:</Text>
            <Text style={styles.detailValue}>{job.delivery_time} days</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>{job.created_at ? formatDate(new Date(job.created_at)) : 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Progress History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Updates</Text>
        {progressHistory.length > 0 ? (
          <View style={styles.progressContainer}>
            {progressHistory.map((progress, index) => (
              <View key={index} style={styles.progressItem}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Progress Update #{index + 1}</Text>
                  <Text style={styles.progressDate}>{progress.created_at ? formatDate(new Date(progress.created_at)) : 'N/A'}</Text>
                </View>
                <Text style={styles.progressDescription}>{progress.message}</Text>
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
          <Text style={styles.noProgressText}>No progress updates yet</Text>
        )}
      </View>

      {/* Action Buttons */}
      {job.status === 'in_progress' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.completeButton} onPress={handleCompleteJob}>
            <CheckCircle size={20} color="white" />
            <Text style={styles.completeButtonText}>Mark as Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelJob}>
            <Text style={styles.cancelButtonText}>Cancel Job</Text>
          </TouchableOpacity>
        </View>
      )}

      {job.status === 'completed' && (
        <View style={styles.completedSection}>
          <View style={styles.completedHeader}>
            <CheckCircle size={24} color={Colors.status.success} />
            <Text style={styles.completedText}>Job Completed!</Text>
          </View>
          <TouchableOpacity style={styles.rateButton}>
            <Star size={20} color={Colors.status.warning} />
            <Text style={styles.rateButtonText}>Rate & Review</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
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
    backgroundColor: Colors.background.primary,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.status.error,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  messageButton: {
    padding: 12,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  detailsContainer: {
    gap: 12,
  },
  description: {
    fontSize: 16,
    color: Colors.text.primary,
    lineHeight: 24,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  progressContainer: {
    gap: 16,
  },
  progressItem: {
    padding: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
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
    fontSize: 14,
    color: Colors.text.secondary,
  },
  progressDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
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
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.main,
    textAlign: 'right',
  },
  noProgressText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.status.success,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.status.error,
  },
  cancelButtonText: {
    color: Colors.status.error,
    fontSize: 16,
    fontWeight: '600',
  },
  completedSection: {
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  completedText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.status.success,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.warning + '20',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  rateButtonText: {
    color: Colors.status.warning,
    fontSize: 16,
    fontWeight: '600',
  },
});