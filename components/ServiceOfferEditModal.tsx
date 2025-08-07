import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, DollarSign, Clock, Calendar, MapPin, Briefcase, ChevronDown, Zap, Target, FileText } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import CalendarPicker from './CalendarPicker';
import TimePicker from './TimePicker';

interface ServiceOfferEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (updatedData: {
    customPrice?: number;
    customDescription?: string;
    customDeliveryTime?: number;
    startDate?: string;
    endDate?: string;
    preferredStartTime?: string;
    preferredEndTime?: string;
    locationAddress?: string;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
    workType?: 'remote' | 'on_site' | 'hybrid';
    estimatedHours?: number;
    requirements?: string;
  }) => Promise<void>;
  initialData: {
    customPrice?: number;
    customDescription?: string;
    customDeliveryTime?: number;
    startDate?: string;
    endDate?: string;
    preferredStartTime?: string;
    preferredEndTime?: string;
    locationAddress?: string;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
    workType?: 'remote' | 'on_site' | 'hybrid';
    estimatedHours?: number;
    requirements?: string;
  };
  serviceData: {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    category_name?: string;
    image_url?: string;
  };
  isLoading?: boolean;
}

export default function ServiceOfferEditModal({
  visible,
  onClose,
  onSave,
  initialData,
  serviceData,
  isLoading = false,
}: ServiceOfferEditModalProps) {
  // Form state
  const [customPrice, setCustomPrice] = useState(initialData.customPrice?.toString() || '');
  const [customDescription, setCustomDescription] = useState(initialData.customDescription || '');
  const [customDeliveryTime, setCustomDeliveryTime] = useState(initialData.customDeliveryTime?.toString() || '');
  
  // Date and time state
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData.startDate ? new Date(initialData.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialData.endDate ? new Date(initialData.endDate) : undefined
  );
  const [preferredStartTime, setPreferredStartTime] = useState<Date | undefined>(
    initialData.preferredStartTime ? new Date(initialData.preferredStartTime) : undefined
  );
  const [preferredEndTime, setPreferredEndTime] = useState<Date | undefined>(
    initialData.preferredEndTime ? new Date(initialData.preferredEndTime) : undefined
  );
  
  // Location and job details
  const [locationAddress, setLocationAddress] = useState(initialData.locationAddress || '');
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high' | 'urgent'>(initialData.urgencyLevel || 'medium');
  const [workType, setWorkType] = useState<'remote' | 'on_site' | 'hybrid'>(initialData.workType || 'remote');
  const [estimatedHours, setEstimatedHours] = useState(initialData.estimatedHours?.toString() || '');
  const [requirements, setRequirements] = useState(initialData.requirements || '');
  
  // Modal states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      setCustomPrice(initialData.customPrice?.toString() || '');
      setCustomDescription(initialData.customDescription || '');
      setCustomDeliveryTime(initialData.customDeliveryTime?.toString() || '');
      setStartDate(initialData.startDate ? new Date(initialData.startDate) : undefined);
      setEndDate(initialData.endDate ? new Date(initialData.endDate) : undefined);
      setPreferredStartTime(initialData.preferredStartTime ? new Date(initialData.preferredStartTime) : undefined);
      setPreferredEndTime(initialData.preferredEndTime ? new Date(initialData.preferredEndTime) : undefined);
      setLocationAddress(initialData.locationAddress || '');
      setUrgencyLevel(initialData.urgencyLevel || 'medium');
      setWorkType(initialData.workType || 'remote');
      setEstimatedHours(initialData.estimatedHours?.toString() || '');
      setRequirements(initialData.requirements || '');
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    try {
      const updatedData = {
        customPrice: customPrice ? parseFloat(customPrice) : undefined,
        customDescription: customDescription.trim() || undefined,
        customDeliveryTime: customDeliveryTime ? parseInt(customDeliveryTime) : undefined,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        preferredStartTime: preferredStartTime?.toISOString(),
        preferredEndTime: preferredEndTime?.toISOString(),
        locationAddress: locationAddress.trim() || undefined,
        urgencyLevel,
        workType,
        estimatedHours: estimatedHours ? parseInt(estimatedHours) : undefined,
        requirements: requirements.trim() || undefined,
      };

      await onSave(updatedData);
      onClose();
    } catch (error) {
      console.error('Error saving offer:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Editing',
      'Are you sure you want to cancel? All changes will be lost.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: onClose },
      ]
    );
  };

  const formatPrice = (value: string): string => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].slice(0, 2);
    }
    return numericValue;
  };

  const handlePriceChange = (text: string) => {
    const formattedPrice = formatPrice(text);
    setCustomPrice(formattedPrice);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <X size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Service Offer</Text>
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.text.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Service Info */}
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceTitle}>{serviceData.title}</Text>
            <Text style={styles.servicePrice}>
              Original Price: {serviceData.currency} {serviceData.price}
            </Text>
          </View>

          {/* Custom Price */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={20} color={Colors.primary.main} />
              <Text style={styles.sectionTitle}>Custom Price</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={customPrice}
              onChangeText={handlePriceChange}
              placeholder={`Enter custom price (current: ${serviceData.currency} ${serviceData.price})`}
              placeholderTextColor={Colors.text.secondary}
              keyboardType="numeric"
            />
          </View>

          {/* Custom Description */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={20} color={Colors.primary.main} />
              <Text style={styles.sectionTitle}>Custom Description</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={customDescription}
              onChangeText={setCustomDescription}
              placeholder="Add custom details about your offer..."
              placeholderTextColor={Colors.text.secondary}
              multiline={true}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>{customDescription.length}/500</Text>
          </View>

          {/* Delivery Time */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color={Colors.primary.main} />
              <Text style={styles.sectionTitle}>Delivery Time</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={customDeliveryTime}
              onChangeText={setCustomDeliveryTime}
              placeholder="Enter delivery time in days"
              placeholderTextColor={Colors.text.secondary}
              keyboardType="numeric"
            />
          </View>

          {/* Project Timeline */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={20} color={Colors.primary.main} />
              <Text style={styles.sectionTitle}>Project Timeline</Text>
            </View>
            
            <View style={styles.dateRow}>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>Start Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={[styles.dateText, !startDate && styles.placeholderText]}>
                    {startDate ? startDate.toLocaleDateString() : 'Select start date'}
                  </Text>
                  <Calendar size={18} color={Colors.primary.main} />
                </TouchableOpacity>
              </View>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>End Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
                    {endDate ? endDate.toLocaleDateString() : 'Select end date'}
                  </Text>
                  <Calendar size={18} color={Colors.primary.main} />
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
              visible={showEndDatePicker}
              onClose={() => setShowEndDatePicker(false)}
              onDateSelect={(selectedDate) => {
                setEndDate(selectedDate);
                setShowEndDatePicker(false);
              }}
              allowRange={false}
              minDate={new Date()}
            />
          </View>

          {/* Preferred Working Hours */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color={Colors.primary.main} />
              <Text style={styles.sectionTitle}>Preferred Working Hours</Text>
            </View>
            
            <View style={styles.timeRow}>
              <View style={styles.timeInputContainer}>
                <Text style={styles.timeLabel}>Start Time</Text>
                <TouchableOpacity
                  style={styles.timeInput}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text style={[styles.timeText, !preferredStartTime && styles.placeholderText]}>
                    {preferredStartTime ? preferredStartTime.toTimeString().slice(0, 5) : 'Select start time'}
                  </Text>
                  <Clock size={18} color={Colors.primary.main} />
                </TouchableOpacity>
              </View>
              <View style={styles.timeSeparator}>
                <Text style={styles.timeSeparatorText}>to</Text>
              </View>
              <View style={styles.timeInputContainer}>
                <Text style={styles.timeLabel}>End Time</Text>
                <TouchableOpacity
                  style={styles.timeInput}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text style={[styles.timeText, !preferredEndTime && styles.placeholderText]}>
                    {preferredEndTime ? preferredEndTime.toTimeString().slice(0, 5) : 'Select end time'}
                  </Text>
                  <Clock size={18} color={Colors.primary.main} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Time Pickers */}
            <TimePicker
              visible={showStartTimePicker}
              onClose={() => setShowStartTimePicker(false)}
              onTimeSelect={(time) => {
                setPreferredStartTime(time);
                setShowStartTimePicker(false);
              }}
              initialTime={preferredStartTime || new Date()}
            />
            <TimePicker
              visible={showEndTimePicker}
              onClose={() => setShowEndTimePicker(false)}
              onTimeSelect={(time) => {
                setPreferredEndTime(time);
                setShowEndTimePicker(false);
              }}
              initialTime={preferredEndTime || new Date()}
            />
          </View>

          {/* Work Location */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color={Colors.primary.main} />
              <Text style={styles.sectionTitle}>Work Location</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={locationAddress}
              onChangeText={setLocationAddress}
              placeholder="Enter work location address"
              placeholderTextColor={Colors.text.secondary}
            />
          </View>

          {/* Work Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Briefcase size={20} color={Colors.primary.main} />
              <Text style={styles.sectionTitle}>Work Details</Text>
            </View>
            
            <View style={styles.workDetailsRow}>
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
                  <ChevronDown size={18} color={Colors.primary.main} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.workDetailItem}>
                <Text style={styles.workDetailLabel}>Urgency</Text>
                <TouchableOpacity
                  style={[styles.urgencyButton, urgencyLevel === 'urgent' && styles.urgentButton]}
                  onPress={() => {
                    Alert.alert(
                      'Select Urgency Level',
                      '',
                      [
                        { text: 'Low', onPress: () => setUrgencyLevel('low') },
                        { text: 'Medium', onPress: () => setUrgencyLevel('medium') },
                        { text: 'High', onPress: () => setUrgencyLevel('high') },
                        { text: 'Urgent', onPress: () => setUrgencyLevel('urgent') },
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    );
                  }}
                >
                  <Zap size={16} color={urgencyLevel === 'urgent' ? Colors.text.white : Colors.status.error} />
                  <Text style={[styles.urgencyButtonText, urgencyLevel === 'urgent' && styles.urgentButtonText]}>
                    {urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)}
                  </Text>
                  <ChevronDown size={16} color={urgencyLevel === 'urgent' ? Colors.text.white : Colors.status.error} />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Estimated Hours */}
            <View style={styles.estimatedHoursContainer}>
              <Text style={styles.estimatedHoursLabel}>Estimated Hours</Text>
              <TextInput
                style={styles.estimatedHoursInput}
                value={estimatedHours}
                onChangeText={setEstimatedHours}
                placeholder="Enter estimated hours"
                placeholderTextColor={Colors.text.secondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Requirements */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Target size={20} color={Colors.primary.main} />
              <Text style={styles.sectionTitle}>Requirements</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={requirements}
              onChangeText={setRequirements}
              placeholder="Enter any specific requirements or skills needed..."
              placeholderTextColor={Colors.text.secondary}
              multiline={true}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>{requirements.length}/1000</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary.main,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.background.secondary,
  },
  saveButtonText: {
    fontSize: 16,
    color: Colors.text.white,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  serviceInfo: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    marginBottom: 16,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'right',
    marginTop: 4,
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
    color: Colors.text.primary,
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.background.secondary,
  },
  dateText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  placeholderText: {
    color: Colors.text.secondary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.background.secondary,
  },
  timeText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  timeSeparator: {
    paddingVertical: 20,
  },
  timeSeparatorText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  workDetailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  workDetailItem: {
    flex: 1,
  },
  workDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  workTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.background.secondary,
  },
  workTypeButtonText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  urgencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.background.secondary,
  },
  urgentButton: {
    backgroundColor: Colors.status.error,
    borderColor: Colors.status.error,
  },
  urgencyButtonText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  urgentButtonText: {
    color: Colors.text.white,
  },
  estimatedHoursContainer: {
    marginTop: 8,
  },
  estimatedHoursLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  estimatedHoursInput: {
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
  },
}); 