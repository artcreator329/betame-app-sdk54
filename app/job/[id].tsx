import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Calendar, DollarSign, User, Phone, Mail, MessageCircle } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { JobService, JobListing } from '../../lib/job-service';
import { useAuth } from '../../contexts/AuthContext';

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [job, setJob] = useState<JobListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (id) {
      loadJobDetails();
    }
  }, [id]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const jobData = await JobService.getJob(id!);
      if (jobData) {
        setJob(jobData);
        setIsOwner(user?.id === jobData.user_id);
      } else {
        Alert.alert('Error', 'Job not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading job details:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = () => {
    if (isOwner) {
      Alert.alert('Info', 'This is your own job posting');
      return;
    }
    // TODO: Implement contact functionality (chat, email, etc.)
    Alert.alert('Contact', 'Contact functionality will be implemented soon');
  };

  const handleApply = () => {
    if (isOwner) {
      Alert.alert('Info', 'This is your own job posting');
      return;
    }
    // TODO: Implement apply functionality
    Alert.alert('Apply', 'Application functionality will be implemented soon');
  };

  const handleEdit = () => {
    if (!isOwner) return;
    // TODO: Navigate to edit job page
    Alert.alert('Edit', 'Edit functionality will be implemented soon');
  };

  const handleDelete = () => {
    if (!isOwner) return;
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this job posting?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await JobService.deleteJob(id!);
            if (success) {
              Alert.alert('Success', 'Job deleted successfully');
              router.back();
            } else {
              Alert.alert('Error', 'Failed to delete job');
            }
          },
        },
      ]
    );
  };

  const formatBudget = (job: JobListing) => {
    if (job.payment_type === 'negotiable') {
      return 'Negotiable';
    }
    return `${job.currency} ${job.budget_amount} (${job.payment_type})`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'paused':
        return '#FF9800';
      case 'completed':
        return '#2196F3';
      case 'cancelled':
        return '#F44336';
      default:
        return '#8E8E93';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Job not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        {isOwner && (
          <TouchableOpacity onPress={handleEdit}>
            <Text style={styles.editButton}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cover Photo */}
        {job.cover_photo && (
          <View style={styles.coverPhotoContainer}>
            <Image source={{ uri: job.cover_photo }} style={styles.coverPhoto} />
          </View>
        )}

        {/* Job Info */}
        <View style={styles.jobInfoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
              <Text style={styles.statusText}>
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Budget */}
          <View style={styles.infoRow}>
            <DollarSign size={20} color="#007AFF" />
            <Text style={styles.budgetText}>{formatBudget(job)}</Text>
          </View>

          {/* Location */}
          {job.location_address && (
            <View style={styles.infoRow}>
              <MapPin size={20} color="#007AFF" />
              <Text style={styles.locationText}>{job.location_address}</Text>
            </View>
          )}

          {/* Date Posted */}
          <View style={styles.infoRow}>
            <Calendar size={20} color="#007AFF" />
            <Text style={styles.dateText}>
              Posted on {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Unknown date'}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>Job Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {/* Owner Actions */}
        {isOwner && (
          <View style={styles.ownerActionsContainer}>
            <Text style={styles.sectionTitle}>Manage Job</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete Job Posting</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {!isOwner && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
            <MessageCircle size={20} color="#007AFF" />
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  editButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#8E8E93',
  },
  content: {
    flex: 1,
  },
  coverPhotoContainer: {
    height: 200,
    backgroundColor: 'white',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  jobInfoContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  jobTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 12,
  },
  locationText: {
    fontSize: 16,
    color: '#1D1D1F',
    marginLeft: 12,
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 12,
  },
  descriptionContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1D1D1F',
  },
  ownerActionsContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 12,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: 'white',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  applyButton: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});