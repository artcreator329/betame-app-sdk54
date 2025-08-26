import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, XCircle, Eye, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { bankStatementService } from '@/lib/bank-statement-service';
import { BankStatement, BankStatementWithUser } from '@/types/bank-statement';



export default function AdminBankStatementsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, isAdmin } = useAuth();
  const [bankStatements, setBankStatements] = useState<BankStatementWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatement, setSelectedStatement] = useState<BankStatementWithUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!user || !isAdmin) {
      Alert.alert('Access Denied', 'You need admin privileges to access this page.');
      router.back();
      return;
    }
  }, [user, isAdmin, router]);

  // Load bank statements
  useEffect(() => {
    if (user && isAdmin) {
      loadBankStatements();
    }
  }, [user, isAdmin]);

  const loadBankStatements = async () => {
    setLoading(true);
    try {
      const result = await bankStatementService.getAllBankStatements();
      if (result.success && result.data) {
        setBankStatements(result.data);
      } else {
        console.error('Failed to load bank statements:', result.error);
      }
    } catch (error) {
      console.error('Error loading bank statements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'pending':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} color="#34C759" />;
      case 'rejected':
        return <XCircle size={16} color="#FF3B30" />;
      case 'pending':
        return <Clock size={16} color="#FF9500" />;
      default:
        return <Clock size={16} color="#8E8E93" />;
    }
  };

  const handleViewStatement = (statement: BankStatementWithUser) => {
    setSelectedStatement(statement);
    setShowModal(true);
  };

  const handleApprove = async () => {
    if (!selectedStatement) return;

    setProcessing(true);
    try {
      const result = await bankStatementService.updateBankStatementStatus(
        selectedStatement.id,
        'approved',
        adminNotes,
        user?.id
      );

      if (result.success) {
        Alert.alert('Success', 'Bank statement approved successfully.');
        setShowModal(false);
        setSelectedStatement(null);
        setAdminNotes('');
        loadBankStatements(); // Refresh the list
      } else {
        Alert.alert('Error', result.error || 'Failed to approve bank statement.');
      }
    } catch (error) {
      console.error('Error approving bank statement:', error);
      Alert.alert('Error', 'Failed to approve bank statement.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedStatement) return;

    setProcessing(true);
    try {
      const result = await bankStatementService.updateBankStatementStatus(
        selectedStatement.id,
        'rejected',
        adminNotes,
        user?.id
      );

      if (result.success) {
        Alert.alert('Success', 'Bank statement rejected successfully.');
        setShowModal(false);
        setSelectedStatement(null);
        setAdminNotes('');
        loadBankStatements(); // Refresh the list
      } else {
        Alert.alert('Error', result.error || 'Failed to reject bank statement.');
      }
    } catch (error) {
      console.error('Error rejecting bank statement:', error);
      Alert.alert('Error', 'Failed to reject bank statement.');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Statements</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading bank statements...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {bankStatements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No bank statements found</Text>
            </View>
          ) : (
            bankStatements.map((statement) => (
              <TouchableOpacity
                key={statement.id}
                style={[styles.statementCard, { backgroundColor: colors.background.secondary }]}
                onPress={() => handleViewStatement(statement)}
              >
                <View style={styles.statementHeader}>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text.primary }]}>
                      {statement.user_profiles?.full_name || statement.name}
                    </Text>
                    <Text style={[styles.userEmail, { color: colors.text.secondary }]}>
                      {statement.user_profiles?.email || 'No email'}
                    </Text>
                  </View>
                  <View style={styles.statusContainer}>
                    {getStatusIcon(statement.status)}
                    <Text style={[styles.statusText, { color: getStatusColor(statement.status) }]}>
                      {statement.status.charAt(0).toUpperCase() + statement.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.statementDetails}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Bank:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>
                    {statement.bank_name}
                  </Text>
                </View>

                <View style={styles.statementDetails}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Account:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>
                    {statement.bank_account_number}
                  </Text>
                </View>

                {/* Nomad Visa Indicator */}
                {statement.nomad_visa_required && (
                  <View style={styles.statementDetails}>
                    <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Nomad Visa:</Text>
                    <Text style={[styles.detailValue, { color: statement.nomad_visa_uploaded ? '#34C759' : '#FF9500' }]}>
                      {statement.nomad_visa_uploaded ? 'Uploaded' : 'Required'}
                    </Text>
                  </View>
                )}

                <View style={styles.statementFooter}>
                  <Text style={[styles.dateText, { color: colors.text.tertiary }]}>
                    Submitted: {formatDate(statement.created_at)}
                  </Text>
                  <View style={styles.viewButton}>
                    <Eye size={16} color={colors.primary.main} />
                    <Text style={[styles.viewButtonText, { color: colors.primary.main }]}>View</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal for viewing statement details */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCloseButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Bank Statement Details</Text>
            <View style={{ width: 50 }} />
          </View>

          {selectedStatement && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>User Information</Text>
                <View style={styles.modalDetail}>
                  <Text style={styles.modalDetailLabel}>Name:</Text>
                  <Text style={styles.modalDetailValue}>{selectedStatement.name}</Text>
                </View>
                <View style={styles.modalDetail}>
                  <Text style={styles.modalDetailLabel}>IC Number:</Text>
                  <Text style={styles.modalDetailValue}>{selectedStatement.ic_number}</Text>
                </View>
                <View style={styles.modalDetail}>
                  <Text style={styles.modalDetailLabel}>Email:</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedStatement.user_profiles?.email || 'Not available'}
                  </Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Bank Information</Text>
                <View style={styles.modalDetail}>
                  <Text style={styles.modalDetailLabel}>Bank Name:</Text>
                  <Text style={styles.modalDetailValue}>{selectedStatement.bank_name}</Text>
                </View>
                <View style={styles.modalDetail}>
                  <Text style={styles.modalDetailLabel}>Account Number:</Text>
                  <Text style={styles.modalDetailValue}>{selectedStatement.bank_account_number}</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Bank Statement</Text>
                <Image
                  source={{ uri: selectedStatement.statement_file_url }}
                  style={styles.statementImage}
                  resizeMode="contain"
                />
              </View>

              {/* Nomad Visa Section - Only show if required */}
              {selectedStatement.nomad_visa_required && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Nomad Visa Document {selectedStatement.nomad_visa_uploaded ? '(Uploaded)' : '(Required)'}
                  </Text>
                  {selectedStatement.nomad_visa_uploaded && selectedStatement.nomad_visa_file_url ? (
                    <Image
                      source={{ uri: selectedStatement.nomad_visa_file_url }}
                      style={styles.statementImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.missingDocument}>
                      <Text style={styles.missingDocumentText}>Nomad Visa document not uploaded</Text>
                    </View>
                  )}
                </View>
              )}

              {selectedStatement.status === 'pending' && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Admin Notes (Optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    placeholder="Add notes about this submission..."
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              {selectedStatement.status === 'pending' && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={handleReject}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.actionButtonText}>Reject</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={handleApprove}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.actionButtonText}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {selectedStatement.admin_notes && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Admin Notes</Text>
                  <Text style={styles.adminNotes}>{selectedStatement.admin_notes}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  statementCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
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
  statementDetails: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  statementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  dateText: {
    fontSize: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCloseButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  modalDetail: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  modalDetailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    width: 100,
  },
  modalDetailValue: {
    fontSize: 14,
    color: '#1D1D1F',
    fontWeight: '500',
    flex: 1,
  },
  statementImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  adminNotes: {
    fontSize: 14,
    color: '#1D1D1F',
    lineHeight: 20,
  },
  missingDocument: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  missingDocumentText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
