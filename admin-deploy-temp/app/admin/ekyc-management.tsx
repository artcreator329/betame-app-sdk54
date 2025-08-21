import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  ArrowLeft,
  Filter,
  Search,
  Download,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { EKYCService, EKYCSubmission } from '@/lib/ekyc-service';
import { adminService } from '@/lib/admin-service';
import { useColors } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface EKYCStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function EKYCManagement() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<EKYCSubmission[]>([]);
  const [stats, setStats] = useState<EKYCStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [selectedSubmission, setSelectedSubmission] = useState<EKYCSubmission | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'view' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    console.log('🔍 EKYC Management: Checking admin access...');
    console.log('🔍 EKYC Management: Current user:', user);
    
    if (!user) {
      console.log('❌ EKYC Management: No user found, redirecting to login');
      router.replace('/auth/login');
      return;
    }

    console.log('🔍 EKYC Management: User ID:', user.id);
    console.log('🔍 EKYC Management: User email:', user.email);

    try {
      console.log('🔍 EKYC Management: Checking admin status...');
      const adminStatus = await adminService.isAdmin(user.id);
      console.log('🔍 EKYC Management: Admin status result:', adminStatus);
      
      if (!adminStatus) {
        console.log('❌ EKYC Management: User is not admin');
        Alert.alert(
          'Access Denied',
          'You do not have permission to access eKYC management.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      console.log('✅ EKYC Management: Admin access confirmed, loading data...');
      await loadEKYCData();
    } catch (error) {
      console.error('❌ EKYC Management: Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    }
  };

  const loadEKYCData = async () => {
    try {
      console.log('🔍 EKYC Management: Loading eKYC data...');
      setIsLoading(true);
      
      console.log('🔍 EKYC Management: Calling EKYCService.getAllEKYCSubmissions()...');
      const data = await EKYCService.getAllEKYCSubmissions();
      console.log('✅ EKYC Management: Received data:', data);
      console.log('✅ EKYC Management: Data length:', data?.length || 0);
      
      setSubmissions(data);
      
      // Calculate stats
      const newStats = {
        total: data.length,
        pending: data.filter(s => s.status === 'pending').length,
        approved: data.filter(s => s.status === 'approved').length,
        rejected: data.filter(s => s.status === 'rejected').length,
      };
      console.log('📊 EKYC Management: Calculated stats:', newStats);
      setStats(newStats);
    } catch (error) {
      console.error('❌ EKYC Management: Error loading eKYC data:', error);
      console.error('❌ EKYC Management: Error details:', error);
      Alert.alert('Error', 'Failed to load eKYC submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEKYCData();
    setRefreshing(false);
  };

  const handleReviewSubmission = (submission: EKYCSubmission, action: 'approve' | 'reject') => {
    setSelectedSubmission(submission);
    setReviewAction(action);
    setAdminNotes('');
    setImageErrors({});
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedSubmission || !reviewAction) return;

    try {
      setIsProcessing(true);
      await EKYCService.updateEKYCStatus(
        selectedSubmission.id,
        reviewAction === 'approve' ? 'approved' : 'rejected',
        adminNotes.trim() || undefined
      );

      Alert.alert(
        'Success',
        `eKYC submission has been ${reviewAction}d successfully.`,
        [{ text: 'OK' }]
      );

      setShowReviewModal(false);
      setSelectedSubmission(null);
      setReviewAction(null);
      setAdminNotes('');
      await loadEKYCData();
    } catch (error) {
      console.error('Error updating eKYC status:', error);
      Alert.alert('Error', 'Failed to update eKYC status');
    } finally {
      setIsProcessing(false);
    }
  };

  const getFilteredSubmissions = () => {
    let filtered = submissions;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.full_name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.ic_number?.toLowerCase().includes(query) ||
        s.passport_number?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.status.warning;
      case 'approved':
        return colors.status.success;
      case 'rejected':
        return colors.status.error;
      default:
        return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} color={colors.status.warning} />;
      case 'approved':
        return <CheckCircle size={16} color={colors.status.success} />;
      case 'rejected':
        return <XCircle size={16} color={colors.status.error} />;
      default:
        return <Clock size={16} color={colors.text.secondary} />;
    }
  };

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statCard, { backgroundColor: colors.background.secondary }]}>
        <Users size={24} color={colors.primary.main} />
        <Text style={[styles.statNumber, { color: colors.text.primary }]}>{stats.total}</Text>
        <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Total</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.background.secondary }]}>
        <Clock size={24} color={colors.status.warning} />
        <Text style={[styles.statNumber, { color: colors.text.primary }]}>{stats.pending}</Text>
        <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Pending</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.background.secondary }]}>
        <CheckCircle size={24} color={colors.status.success} />
        <Text style={[styles.statNumber, { color: colors.text.primary }]}>{stats.approved}</Text>
        <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Approved</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.background.secondary }]}>
        <XCircle size={24} color={colors.status.error} />
        <Text style={[styles.statNumber, { color: colors.text.primary }]}>{stats.rejected}</Text>
        <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Rejected</Text>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={[styles.searchContainer, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
        <Search size={20} color={colors.text.secondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text.primary }]}
          placeholder="Search by name, email, or ID..."
          placeholderTextColor={colors.text.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              {
                backgroundColor: filterStatus === status ? colors.primary.main : colors.background.secondary,
                borderColor: colors.border.light,
              },
            ]}
            onPress={() => setFilterStatus(status as any)}
          >
            <Text
              style={[
                styles.filterTabText,
                {
                  color: filterStatus === status ? colors.text.white : colors.text.primary,
                },
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSubmissionCard = (submission: EKYCSubmission) => (
    <View key={submission.id} style={[styles.submissionCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
      <View style={styles.submissionHeader}>
        <View style={styles.submissionInfo}>
          <Text style={[styles.submissionName, { color: colors.text.primary }]}>{submission.full_name}</Text>
          <Text style={[styles.submissionEmail, { color: colors.text.secondary }]}>{submission.email}</Text>
          <View style={styles.submissionMeta}>
            <Text style={[styles.submissionDate, { color: colors.text.tertiary }]}>
              {submission.created_at ? new Date(submission.created_at).toLocaleDateString() : 'N/A'}
            </Text>
            <View style={styles.statusContainer}>
              {getStatusIcon(submission.status)}
              <Text style={[styles.statusText, { color: getStatusColor(submission.status) }]}>
                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.submissionDetails}>
        <View style={styles.detailRow}>
          <User size={16} color={colors.text.secondary} />
          <Text style={[styles.detailText, { color: colors.text.secondary }]}>
            {submission.nationality} • {submission.ic_number || submission.passport_number}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Phone size={16} color={colors.text.secondary} />
          <Text style={[styles.detailText, { color: colors.text.secondary }]}>{submission.phone_number}</Text>
        </View>
        <View style={styles.detailRow}>
          <MapPin size={16} color={colors.text.secondary} />
          <Text style={[styles.detailText, { color: colors.text.secondary }]} numberOfLines={1}>
            {submission.city}, {submission.state}
          </Text>
        </View>
      </View>

      <View style={styles.submissionActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton, { borderColor: colors.primary.main }]}
          onPress={() => {
            setSelectedSubmission(submission);
            setReviewAction('view');
            setImageErrors({});
            setShowReviewModal(true);
          }}
        >
          <Eye size={16} color={colors.primary.main} />
          <Text style={[styles.actionButtonText, { color: colors.primary.main }]}>View</Text>
        </TouchableOpacity>
        
        {submission.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton, { backgroundColor: colors.status.success }]}
              onPress={() => handleReviewSubmission(submission, 'approve')}
            >
              <CheckCircle size={16} color={colors.text.white} />
              <Text style={[styles.actionButtonText, { color: colors.text.white }]}>Approve</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton, { backgroundColor: colors.status.error }]}
              onPress={() => handleReviewSubmission(submission, 'reject')}
            >
              <XCircle size={16} color={colors.text.white} />
              <Text style={[styles.actionButtonText, { color: colors.text.white }]}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderReviewModal = () => (
    <Modal
      visible={showReviewModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowReviewModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background.primary }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border.light }]}>
          <TouchableOpacity onPress={() => setShowReviewModal(false)}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
            {reviewAction === 'view' ? 'View eKYC Details' : `${reviewAction === 'approve' ? 'Approve' : 'Reject'} eKYC`}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedSubmission && (
            <>
              <View style={[styles.reviewCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
                <Text style={[styles.reviewCardTitle, { color: colors.text.primary }]}>Personal Information</Text>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Full Name:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.full_name}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Email:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.email}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Phone:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.phone_number}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Nationality:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.nationality}</Text>
                </View>
                {selectedSubmission.ic_number && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>IC Number:</Text>
                    <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.ic_number}</Text>
                  </View>
                )}
                {selectedSubmission.passport_number && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Passport Number:</Text>
                    <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.passport_number}</Text>
                  </View>
                )}
                {selectedSubmission.country && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Country:</Text>
                    <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.country}</Text>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Date of Birth:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.date_of_birth}</Text>
                </View>
              </View>

              <View style={[styles.reviewCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
                <Text style={[styles.reviewCardTitle, { color: colors.text.primary }]}>Address Information</Text>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Address Type:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.address_type}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Address:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.address}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>City:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.city}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Postcode:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.postcode}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>State:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.state}</Text>
                </View>
              </View>

              <View style={[styles.reviewCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
                <Text style={[styles.reviewCardTitle, { color: colors.text.primary }]}>Submission Details</Text>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Status:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>
                    {selectedSubmission.status.charAt(0).toUpperCase() + selectedSubmission.status.slice(1)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Submitted:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>
                    {selectedSubmission.created_at ? new Date(selectedSubmission.created_at).toLocaleString() : 'N/A'}
                  </Text>
                </View>
                {selectedSubmission.reviewed_at && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Reviewed:</Text>
                    <Text style={[styles.detailValue, { color: colors.text.primary }]}>
                      {new Date(selectedSubmission.reviewed_at).toLocaleString()}
                    </Text>
                  </View>
                )}
                {selectedSubmission.admin_notes && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Admin Notes:</Text>
                    <Text style={[styles.detailValue, { color: colors.text.primary }]}>{selectedSubmission.admin_notes}</Text>
                  </View>
                )}
              </View>

              {((selectedSubmission.identity_document_url || selectedSubmission.proof_of_address_url || selectedSubmission.additional_document_url)) && (
                <View style={[styles.reviewCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
                  <Text style={[styles.reviewCardTitle, { color: colors.text.primary }]}>Uploaded Documents</Text>
                  {console.log('🔍 Document URLs:', {
                    identity: selectedSubmission.identity_document_url,
                    address: selectedSubmission.proof_of_address_url,
                    additional: selectedSubmission.additional_document_url
                  })}
                  
                  {selectedSubmission.identity_document_url && (
                    <View style={styles.documentItem}>
                      <Text style={[styles.documentLabel, { color: colors.text.secondary }]}>Identity Document (IC Front):</Text>
                      <View style={styles.documentPreviewContainer}>
                        {imageErrors['identity'] ? (
                          <View style={[styles.documentPreview, { backgroundColor: colors.background.tertiary, justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={[styles.documentErrorText, { color: colors.text.secondary }]}>Image not available</Text>
                          </View>
                        ) : (
                          <Image 
                            source={{ uri: selectedSubmission.identity_document_url }} 
                            style={styles.documentPreview}
                            resizeMode="cover"
                            onError={(error) => {
                              console.error('Image load error (IC Front):', error.nativeEvent);
                              console.error('Failed URL:', selectedSubmission.identity_document_url);
                              setImageErrors(prev => ({ ...prev, identity: true }));
                            }}
                            onLoad={() => console.log('Image loaded successfully (IC Front):', selectedSubmission.identity_document_url)}
                          />
                        )}
                        <TouchableOpacity
                          style={[styles.documentLink, { borderColor: colors.primary.main }]}
                          onPress={() => {
                            console.log('Opening URL:', selectedSubmission.identity_document_url);
                            Linking.openURL(selectedSubmission.identity_document_url!);
                          }}
                        >
                          <Text style={[styles.documentLinkText, { color: colors.primary.main }]}>Open Full Size</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  
                  {selectedSubmission.proof_of_address_url && (
                    <View style={styles.documentItem}>
                      <Text style={[styles.documentLabel, { color: colors.text.secondary }]}>Proof of Address (IC Back):</Text>
                      <View style={styles.documentPreviewContainer}>
                        {imageErrors['address'] ? (
                          <View style={[styles.documentPreview, { backgroundColor: colors.background.tertiary, justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={[styles.documentErrorText, { color: colors.text.secondary }]}>Image not available</Text>
                          </View>
                        ) : (
                          <Image 
                            source={{ uri: selectedSubmission.proof_of_address_url }} 
                            style={styles.documentPreview}
                            resizeMode="cover"
                            onError={(error) => {
                              console.error('Image load error (IC Back):', error.nativeEvent);
                              console.error('Failed URL:', selectedSubmission.proof_of_address_url);
                              setImageErrors(prev => ({ ...prev, address: true }));
                            }}
                            onLoad={() => console.log('Image loaded successfully (IC Back):', selectedSubmission.proof_of_address_url)}
                          />
                        )}
                        <TouchableOpacity
                          style={[styles.documentLink, { borderColor: colors.primary.main }]}
                          onPress={() => Linking.openURL(selectedSubmission.proof_of_address_url!)}
                        >
                          <Text style={[styles.documentLinkText, { color: colors.primary.main }]}>Open Full Size</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  
                  {selectedSubmission.additional_document_url && (
                    <View style={styles.documentItem}>
                      <Text style={[styles.documentLabel, { color: colors.text.secondary }]}>Additional Document (Selfie with IC):</Text>
                      <View style={styles.documentPreviewContainer}>
                        {imageErrors['additional'] ? (
                          <View style={[styles.documentPreview, { backgroundColor: colors.background.tertiary, justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={[styles.documentErrorText, { color: colors.text.secondary }]}>Image not available</Text>
                          </View>
                        ) : (
                          <Image 
                            source={{ uri: selectedSubmission.additional_document_url }} 
                            style={styles.documentPreview}
                            resizeMode="cover"
                            onError={(error) => {
                              console.error('Image load error (Selfie):', error.nativeEvent);
                              console.error('Failed URL:', selectedSubmission.additional_document_url);
                              setImageErrors(prev => ({ ...prev, additional: true }));
                            }}
                            onLoad={() => console.log('Image loaded successfully (Selfie):', selectedSubmission.additional_document_url)}
                          />
                        )}
                        <TouchableOpacity
                          style={[styles.documentLink, { borderColor: colors.primary.main }]}
                          onPress={() => Linking.openURL(selectedSubmission.additional_document_url!)}
                        >
                          <Text style={[styles.documentLinkText, { color: colors.primary.main }]}>Open Full Size</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {reviewAction !== 'view' && (
            <View style={[styles.notesContainer, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
              <Text style={[styles.notesLabel, { color: colors.text.primary }]}>Admin Notes</Text>
              <TextInput
                style={[styles.notesInput, { color: colors.text.primary, borderColor: colors.border.light }]}
                placeholder={`Add notes for this ${reviewAction}...`}
                placeholderTextColor={colors.text.secondary}
                value={adminNotes}
                onChangeText={setAdminNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}
        </ScrollView>

        <View style={[styles.modalActions, { borderTopColor: colors.border.light }]}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border.light }]}
            onPress={() => setShowReviewModal(false)}
            disabled={isProcessing}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text.primary }]}>
              {reviewAction === 'view' ? 'Close' : 'Cancel'}
            </Text>
          </TouchableOpacity>
          
          {reviewAction !== 'view' && (
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.confirmButton,
                {
                  backgroundColor: reviewAction === 'approve' ? colors.status.success : colors.status.error,
                },
              ]}
              onPress={handleSubmitReview}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.text.white} />
              ) : (
                <Text style={[styles.confirmButtonText, { color: colors.text.white }]}>
                  {reviewAction === 'approve' ? 'Approve' : 'Reject'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading eKYC submissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.secondary, borderBottomColor: colors.border.light }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>eKYC Management</Text>
        <TouchableOpacity onPress={onRefresh}>
          <FileText size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {renderStatsCards()}
        {renderFilters()}
        
        <View style={styles.submissionsContainer}>
          {getFilteredSubmissions().length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText size={48} color={colors.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>No submissions found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.text.tertiary }]}>
                {filterStatus === 'all' ? 'No eKYC submissions yet' : `No ${filterStatus} submissions`}
              </Text>
            </View>
          ) : (
            getFilteredSubmissions().map(renderSubmissionCard)
          )}
        </View>
      </ScrollView>

      {renderReviewModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterTabs: {
    flexDirection: 'row',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submissionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  submissionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  submissionInfo: {
    flex: 1,
  },
  submissionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  submissionEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  submissionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submissionDate: {
    fontSize: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  submissionDetails: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
  submissionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  viewButton: {
    borderWidth: 1,
  },
  approveButton: {
    flex: 1,
  },
  rejectButton: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  reviewCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  reviewCardSubtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  notesContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  documentLink: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  documentLinkText: {
    fontSize: 12,
    fontWeight: '500',
  },
  documentItem: {
    marginBottom: 20,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  documentPreviewContainer: {
    alignItems: 'center',
    gap: 8,
  },
  documentPreview: {
    width: 200,
    height: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  documentErrorText: {
    fontSize: 12,
    textAlign: 'center',
  },
});