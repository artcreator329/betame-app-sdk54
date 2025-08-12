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
import { ArrowLeft, CheckCircle, Camera } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { JobCompletionPhotoUpload } from '../../components/JobCompletionPhotoUpload';
import { JobCompletionService } from '../../lib/job-completion-service';
import { supabase } from '../../lib/supabase';

interface JobCompletionPhoto {
  photo_url: string;
  photo_description?: string;
}

interface JobStatus {
  id: string;
  service_offer_id: string;
  buyer_id: string;
  seller_id: string;
  current_status: string;
  work_started_at?: string;
  work_completed_at?: string;
  notes?: string;
}

export default function JobCompletionScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { user } = useAuth();
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<JobCompletionPhoto[]>([]);
  const [completionMessage, setCompletionMessage] = useState('');

  useEffect(() => {
    if (jobId) {
      loadJobStatus();
    }
  }, [jobId]);

  const loadJobStatus = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('job_status')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error loading job status:', error);
        Alert.alert('Error', 'Failed to load job details');
        router.back();
        return;
      }

      setJobStatus(data);
    } catch (error) {
      console.error('Error loading job status:', error);
      Alert.alert('Error', 'Failed to load job details');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!jobStatus || !user) return;

    // Validate that user is the seller
    if (jobStatus.seller_id !== user.id) {
      Alert.alert('Error', 'Only the seller can complete this job');
      return;
    }

    // Require at least one photo
    if (photos.length === 0) {
      Alert.alert('Photo Required', 'Please upload at least one photo showing the completed work.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await JobCompletionService.completeJobWithPhotos(
        jobStatus.id,
        user.id,
        photos,
        completionMessage.trim() || undefined
      );

      if (success) {
        Alert.alert(
          'Job Completed Successfully',
          'The job has been marked as completed with photos. The buyer will be notified.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to complete job. Please try again.');
      }
    } catch (error) {
      console.error('Error completing job:', error);
      Alert.alert('Error', 'Failed to complete job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSeller = jobStatus?.seller_id === user?.id;

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

  if (!jobStatus) {
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

  if (!isSeller) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorDescription}>
            Only the seller can complete this job.
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
        <Text style={styles.headerTitle}>Complete Job</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Job Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Information</Text>
          <View style={styles.jobCard}>
            <Text style={styles.jobId}>Job ID: {jobStatus.id.slice(0, 8)}...</Text>
            <Text style={styles.statusText}>
              Status: {jobStatus.current_status.replace('_', ' ').toUpperCase()}
            </Text>
            {jobStatus.work_started_at && (
              <Text style={styles.dateText}>
                Started: {new Date(jobStatus.work_started_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {/* Photo Upload */}
        <View style={styles.section}>
          <JobCompletionPhotoUpload
            userId={user?.id || ''}
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={5}
          />
        </View>

        {/* Completion Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completion Message (Optional)</Text>
          <TextInput
            style={styles.messageInput}
            value={completionMessage}
            onChangeText={setCompletionMessage}
            placeholder="Add a message describing the completed work..."
            placeholderTextColor={Colors.text.tertiary}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {completionMessage.length}/500 characters
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionText}>
              • Upload clear photos showing the completed work
            </Text>
            <Text style={styles.instructionText}>
              • Include before/after photos if applicable
            </Text>
            <Text style={styles.instructionText}>
              • Add descriptions to help the buyer understand the work
            </Text>
            <Text style={styles.instructionText}>
              • At least one photo is required to complete the job
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Complete Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            (photos.length === 0 || isSubmitting) && styles.completeButtonDisabled,
          ]}
          onPress={handleCompleteJob}
          disabled={photos.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <CheckCircle size={20} color="white" />
              <Text style={styles.completeButtonText}>Complete Job</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    marginBottom: 24,
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
  jobId: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: 'white',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  instructionsCard: {
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: 'white',
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
  completeButtonDisabled: {
    backgroundColor: Colors.interactive.disabled,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
