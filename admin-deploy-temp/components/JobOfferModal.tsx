import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import CalendarPicker from './CalendarPicker';
import { X, DollarSign, Clock, FileText, Calendar, Briefcase, ChevronDown, Star, Target, User } from 'lucide-react-native';
import { JobListing } from '../lib/job-service';
import Colors from '../constants/Colors';
import { FeeService } from '../lib/fee-service';

interface JobOfferModalProps {
  visible: boolean;
  onClose: () => void;
  job: JobListing | null;
  onSendOffer: (offerData: {
    jobId: string;
    proposedPrice?: number;
    proposalDescription?: string;
    proposedTimeline?: string;
    estimatedHours?: number;
    startDate?: string;
    completionDate?: string;
    workType?: 'remote' | 'on_site' | 'hybrid';
    experience?: string;
    qualifications?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function JobOfferModal({
  visible,
  onClose,
  job,
  onSendOffer,
  isLoading = false,
}: JobOfferModalProps) {
  const [proposedPrice, setProposedPrice] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposedTimeline, setProposedTimeline] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [completionDate, setCompletionDate] = useState<Date | undefined>(undefined);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showCompletionDatePicker, setShowCompletionDatePicker] = useState(false);
  const [workType, setWorkType] = useState<'remote' | 'on_site' | 'hybrid'>('remote');
  const [experience, setExperience] = useState('');
  const [qualifications, setQualifications] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (visible && job) {
      setProposedPrice(job.budget_amount || '100');
      setProposalDescription('I am interested in this job and have the relevant experience to complete it successfully.');
      setProposedTimeline('I can complete this within the specified timeframe.');
      setEstimatedHours('8');
      setStartDate(undefined);
      setCompletionDate(undefined);
      setWorkType('remote');
      setExperience('I have relevant experience in this field.');
      setQualifications('I have the necessary skills and qualifications.');
    }
  }, [visible, job]);

  if (!job || !visible) return null;

  const originalBudget = job.budget_amount ? parseFloat(job.budget_amount) : 0;

  const handleSendOffer = async () => {
    if (!job) return;

    const price = proposedPrice ? parseFloat(proposedPrice) : undefined;
    const hours = estimatedHours ? parseFloat(estimatedHours) : undefined;

    if (proposedPrice && (isNaN(price!) || price! <= 0)) {
      Alert.alert('Invalid Price', 'Please enter a valid proposed price.');
      return;
    }

    if (estimatedHours && (isNaN(hours!) || hours! <= 0)) {
      Alert.alert('Invalid Hours', 'Please enter valid estimated hours.');
      return;
    }

    if (!proposalDescription.trim()) {
      Alert.alert('Missing Proposal', 'Please describe your proposal and approach.');
      return;
    }

    try {
      await onSendOffer({
        jobId: job.id!,
        proposedPrice: price,
        proposalDescription: proposalDescription.trim(),
        proposedTimeline: proposedTimeline.trim() || undefined,
        estimatedHours: hours,
        startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
        completionDate: completionDate ? completionDate.toISOString().split('T')[0] : undefined,
        workType,
        experience: experience.trim() || undefined,
        qualifications: qualifications.trim() || undefined,
      });

      handleClose();
    } catch (error) {
      console.error('❌ JobOfferModal: Error sending offer:', error);
      // Don't close the modal if there's an error
    }
  };

  const handleClose = () => {
    setProposedPrice('');
    setProposalDescription('');
    setProposedTimeline('');
    setEstimatedHours('');
    setStartDate(undefined);
    setCompletionDate(undefined);
    setWorkType('remote');
    setExperience('');
    setQualifications('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Submit Job Proposal</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Job Preview */}
          <View style={styles.jobPreview}>
            {job.cover_photo && (
              <Image source={{ uri: job.cover_photo }} style={styles.jobImage} />
            )}
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.originalBudget}>
                Budget: {job.payment_type === 'negotiable' ? 'Negotiable' : `${job.currency}${job.budget_amount} (${job.payment_type})`}
              </Text>
            </View>
          </View>

          {/* Fee Breakdown */}
          <View style={styles.feeBreakdown}>
            <Text style={styles.feeBreakdownTitle}>Earning Breakdown</Text>
            {(() => {
              const finalPrice = proposedPrice ? parseFloat(proposedPrice) : originalBudget;
              if (finalPrice > 0) {
                const feeCalculation = FeeService.calculateFees(finalPrice, job.currency);
                return (
                  <View style={styles.feeDetails}>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Your Proposed Price:</Text>
                      <Text style={styles.feeAmount}>{job.currency}{finalPrice.toFixed(2)}</Text>
                    </View>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Platform Fee ({FeeService.getSellerFeeRateString()} or {FeeService.getMinimumSellerFeeString(job.currency)}, whichever higher):</Text>
                      <Text style={styles.feeAmount}>-{job.currency}{feeCalculation.platformFee.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.feeRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>You'll Receive:</Text>
                      <Text style={styles.totalAmount}>{job.currency}{feeCalculation.sellerReceives.toFixed(2)}</Text>
                    </View>
                  </View>
                );
              }
              return (
                <Text style={styles.enterPriceText}>Enter your proposed price to see earnings breakdown</Text>
              );
            })()}
          </View>

          {/* Proposed Price */}
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <DollarSign size={20} color="#007AFF" />
              <Text style={styles.inputLabel}>Your Proposed Price</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder={`Current budget: ${job.currency}${job.budget_amount || '0'}`}
              value={proposedPrice}
              onChangeText={setProposedPrice}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Proposal Description */}
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <FileText size={20} color="#007AFF" />
              <Text style={styles.inputLabel}>Your Proposal</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe your approach, what you'll deliver, and why you're the best fit for this job..."
              value={proposalDescription}
              onChangeText={setProposalDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>

          {/* Project Timeline Card */}
          <View style={styles.timelineCard}>
            <View style={styles.cardHeader}>
              <Calendar size={22} color="#4CAF50" />
              <Text style={styles.cardTitle}>Project Timeline</Text>
            </View>
            
            <View style={styles.dateRow}>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>Start Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={[styles.dateText, !startDate && styles.placeholderText]}>
                    {startDate ? startDate.toLocaleDateString() : 'When can you start?'}
                  </Text>
                  <Calendar size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>Completion Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowCompletionDatePicker(true)}
                >
                  <Text style={[styles.dateText, !completionDate && styles.placeholderText]}>
                    {completionDate ? completionDate.toLocaleDateString() : 'Expected completion'}
                  </Text>
                  <Calendar size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Calendar Pickers */}
            <CalendarPicker
              visible={showStartDatePicker}
              onClose={() => setShowStartDatePicker(false)}
              onDateSelect={(selectedDate) => {
                setStartDate(selectedDate);
                setShowStartDatePicker(false);
              }}
              allowRange={false}
              minDate={new Date()}
            />
            
            <CalendarPicker
              visible={showCompletionDatePicker}
              onClose={() => setShowCompletionDatePicker(false)}
              onDateSelect={(selectedDate) => {
                setCompletionDate(selectedDate);
                setShowCompletionDatePicker(false);
              }}
              allowRange={false}
              minDate={startDate || new Date()}
            />
          </View>

          {/* Work Details Card */}
          <View style={styles.workDetailsCard}>
            <View style={styles.cardHeader}>
              <Briefcase size={22} color="#FF9800" />
              <Text style={styles.cardTitle}>Work Details</Text>
            </View>
            
            <View style={styles.workDetailItem}>
              <Text style={styles.workDetailLabel}>Work Type</Text>
              <TouchableOpacity
                style={styles.workTypeButton}
                onPress={() => {
                  Alert.alert(
                    'Select Work Type',
                    '',
                    [
                      { text: 'Remote', onPress: () => setWorkType('remote') },
                      { text: 'On-site', onPress: () => setWorkType('on_site') },
                      { text: 'Hybrid', onPress: () => setWorkType('hybrid') },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={styles.workTypeButtonText}>
                  {workType === 'on_site' ? 'On-site' : workType.charAt(0).toUpperCase() + workType.slice(1)}
                </Text>
                <ChevronDown size={18} color="#FF9800" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.workDetailItem}>
              <Text style={styles.workDetailLabel}>Estimated Hours</Text>
              <TextInput
                style={styles.hoursInput}
                placeholder="e.g., 40 hours"
                value={estimatedHours}
                onChangeText={setEstimatedHours}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.workDetailItem}>
              <Text style={styles.workDetailLabel}>Timeline Description</Text>
              <TextInput
                style={styles.timelineInput}
                placeholder="Describe your timeline and milestones..."
                value={proposedTimeline}
                onChangeText={setProposedTimeline}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Qualifications Card */}
          <View style={styles.qualificationsCard}>
            <View style={styles.cardHeader}>
              <Star size={22} color="#00BCD4" />
              <Text style={styles.cardTitle}>Your Qualifications</Text>
            </View>
            
            <View style={styles.qualificationItem}>
              <View style={styles.qualHeader}>
                <User size={18} color="#00ACC1" />
                <Text style={styles.qualLabel}>Experience</Text>
              </View>
              <TextInput
                style={styles.experienceInput}
                placeholder="Describe your relevant experience for this type of work..."
                value={experience}
                onChangeText={setExperience}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.qualificationItem}>
              <View style={styles.qualHeader}>
                <Target size={18} color="#00ACC1" />
                <Text style={styles.qualLabel}>Skills & Qualifications</Text>
              </View>
              <TextInput
                style={styles.qualificationsInput}
                placeholder="List your relevant skills, certifications, or qualifications..."
                value={qualifications}
                onChangeText={setQualifications}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
            onPress={handleSendOffer}
            disabled={isLoading}
          >
            <Text style={styles.sendButtonText}>
              {isLoading ? 'Sending...' : 'Send Proposal'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  jobPreview: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginVertical: 16,
  },
  jobImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  originalBudget: {
    fontSize: 14,
    color: '#666',
  },
  feeBreakdown: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  feeBreakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  feeDetails: {
    gap: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 14,
    color: '#666',
  },
  feeAmount: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  enterPriceText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginLeft: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  timelineCard: {
    backgroundColor: '#F0F8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
    marginBottom: 6,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  placeholderText: {
    color: '#999',
  },
  workDetailsCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  workDetailItem: {
    marginBottom: 16,
  },
  workDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F57C00',
    marginBottom: 8,
  },
  workTypeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB74D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  workTypeButtonText: {
    fontSize: 15,
    color: '#E65100',
    fontWeight: '500',
  },
  hoursInput: {
    borderWidth: 1,
    borderColor: '#FFB74D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#fff',
  },
  timelineInput: {
    borderWidth: 1,
    borderColor: '#FFB74D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#fff',
    height: 80,
    textAlignVertical: 'top',
  },
  qualificationsCard: {
    backgroundColor: '#E0F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#B2EBF2',
  },
  qualificationItem: {
    marginBottom: 16,
  },
  qualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qualLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00838F',
    marginLeft: 6,
  },
  experienceInput: {
    borderWidth: 1,
    borderColor: '#4DD0E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#fff',
    height: 80,
    textAlignVertical: 'top',
  },
  qualificationsInput: {
    borderWidth: 1,
    borderColor: '#4DD0E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#fff',
    height: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
    backgroundColor: '#FAFAFA',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575',
  },
  sendButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#B0B0B0',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
