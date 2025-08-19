import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  verified?: boolean;
  onPress?: () => void;
}

function FormField({ label, value, onChangeText, placeholder, editable = true, verified = false, onPress }: FormFieldProps) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity 
        style={[styles.fieldContainer, !editable && styles.disabledField]} 
        onPress={onPress}
        disabled={editable}
      >
        <TextInput
          style={[styles.fieldInput, !editable && styles.disabledInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          editable={editable}
          placeholderTextColor="#8E8E93"
        />
        {verified && (
          <View style={styles.verifiedBadge}>
            <Check size={12} color="white" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

interface DropdownFieldProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
}

function DropdownField({ label, value, options, onSelect }: DropdownFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity 
        style={styles.dropdownContainer} 
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
          {value || 'Select...'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownOptions}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.dropdownOption}
              onPress={() => {
                onSelect(option);
                setIsOpen(false);
              }}
            >
              <Text style={styles.dropdownOptionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

interface DatePickerFieldProps {
  label: string;
  day: string;
  month: string;
  year: string;
  onDayChange: (day: string) => void;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
}

function DatePickerField({ label, day, month, year, onDayChange, onMonthChange, onYearChange }: DatePickerFieldProps) {
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = Array.from({ length: 50 }, (_, i) => (2024 - i).toString());

  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.datePickerContainer}>
        <View style={styles.dateColumn}>
          <DropdownField
            label=""
            value={day}
            options={days}
            onSelect={onDayChange}
          />
        </View>
        <View style={styles.dateColumn}>
          <DropdownField
            label=""
            value={month}
            options={months}
            onSelect={onMonthChange}
          />
        </View>
        <View style={styles.dateColumn}>
          <DropdownField
            label=""
            value={year}
            options={years}
            onSelect={onYearChange}
          />
        </View>
      </View>
    </View>
  );
}

export default function MyAccountScreen() {
  const router = useRouter();
  const { user, userProfile, updateProfile, refreshProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    mobile: '',
    gender: '',
    day: '',
    month: '',
    year: '',
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    contactNumber: '',
  });
  
  const [ekycSubmission, setEkycSubmission] = useState<any>(null);
  const [loadingEkyc, setLoadingEkyc] = useState(true);
  const [profileDataLoaded, setProfileDataLoaded] = useState(false);

  // Load eKYC submission status
  const loadEkycSubmission = async () => {
    try {
      if (!user) return;
      
      console.log('🔍 Loading eKYC submission for user:', user.id);
      
      const { data, error } = await supabase
        .from('ekyc_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error loading eKYC submission:', error);
      } else {
        console.log('✅ eKYC submission loaded:', data);
        setEkycSubmission(data);
      }
    } catch (error) {
      console.error('Error loading eKYC submission:', error);
    } finally {
      setLoadingEkyc(false);
    }
  };

  useEffect(() => {
    // Load user data when component mounts
    if (userProfile) {
      console.log('👤 Loading user profile data:', userProfile);
      
      // Parse date of birth if available
      let day = '', month = '', year = '';
      if (userProfile.date_of_birth) {
        const date = new Date(userProfile.date_of_birth);
        const months = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        day = date.getDate().toString();
        month = months[date.getMonth()]; // Convert to month name
        year = date.getFullYear().toString();
      }

      setFormData(prev => {
        const newData = {
          ...prev,
          email: user?.email || '',
          mobile: userProfile.phone || '',
          gender: userProfile.gender ? userProfile.gender.charAt(0).toUpperCase() + userProfile.gender.slice(1) : '',
          day,
          month,
          year,
          // Bank details are not stored in database, keeping as empty for now
          bankName: '',
          accountHolderName: userProfile.full_name || '',
          accountNumber: '',
          contactNumber: userProfile.phone || '',
        };
        console.log('📝 Initial form data from profile:', newData);
        return newData;
      });
      setProfileDataLoaded(true);
    }
    
    // Load eKYC submission status
    loadEkycSubmission();
  }, [user, userProfile]);

  const handleSave = async () => {
    try {
      // Format date of birth if all parts are provided
      let dateOfBirth = null;
      if (formData.day && formData.month && formData.year) {
        // Convert month name to number
        const months = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthNumber = months.indexOf(formData.month) + 1;
        dateOfBirth = `${formData.year}-${monthNumber.toString().padStart(2, '0')}-${formData.day.padStart(2, '0')}`;
      }

      const updates = {
        full_name: userProfile?.full_name, // Keep existing full name
        avatar_url: userProfile?.avatar_url, // Preserve existing avatar
        phone: formData.mobile,
        gender: formData.gender,
        date_of_birth: dateOfBirth,
      };

      const result = await updateProfile(updates);
      
      if (result.error) {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      } else {
        Alert.alert(
          'Success',
          'Your account information has been updated successfully.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleRegisterMobile = () => {
    Alert.alert(
      'Register Mobile',
      'Please verify your mobile number to complete registration.',
      [{ text: 'OK' }]
    );
  };

  // Refresh eKYC status when returning to this page
  const handleRefreshEkyc = () => {
    loadEkycSubmission();
  };

  // Refresh eKYC status when page comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshProfile(); // Refresh user profile data
      loadEkycSubmission();
    }, [user, refreshProfile])
  );

  // Remove the problematic real-time subscription for now
  // useEffect(() => {
  //   if (!user) return;
  //   console.log('🔄 Setting up real-time subscription for my-account page');
  //   // ... subscription code removed
  // }, [user]);

  // Also load eKYC data when component mounts
  useEffect(() => {
    if (user) {
      loadEkycSubmission();
    }
  }, [user]);

  // Update form data when eKYC submission is loaded
  useEffect(() => {
    if (ekycSubmission && (profileDataLoaded || !userProfile)) {
      console.log('📋 Loading eKYC data into form:', ekycSubmission);
      
      // Parse date of birth from eKYC submission
      let day = '', month = '', year = '';
      if (ekycSubmission.date_of_birth) {
        const date = new Date(ekycSubmission.date_of_birth);
        const months = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        day = date.getDate().toString();
        month = months[date.getMonth()];
        year = date.getFullYear().toString();
      }

      setFormData(prev => {
        const newData = {
          ...prev,
          email: ekycSubmission.email || user?.email || '',
          mobile: ekycSubmission.phone_number || userProfile?.phone || '',
          gender: userProfile?.gender ? userProfile.gender.charAt(0).toUpperCase() + userProfile.gender.slice(1) : '', // Keep gender from profile
          day,
          month,
          year,
          accountHolderName: ekycSubmission.full_name || userProfile?.full_name || '',
          contactNumber: ekycSubmission.phone_number || userProfile?.phone || '',
        };
        console.log('📝 Updated form data:', newData);
        return newData;
      });
    }
  }, [ekycSubmission, user, userProfile, profileDataLoaded]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Account</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Form Content */}
        <View style={styles.formContainer}>
          <FormField
            label="Log in email"
            value={formData.email}
            onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
            verified={userProfile?.is_verified || false}
            editable={false}
          />

          <FormField
            label="Mobile"
            value={formData.mobile}
            onChangeText={(text) => setFormData(prev => ({ ...prev, mobile: text }))}
            verified={userProfile?.phone ? true : false}
            onPress={handleRegisterMobile}
            editable={!ekycSubmission} // Make read-only if eKYC submission exists
          />

          <DropdownField
            label="Gender"
            value={formData.gender}
            options={['Male', 'Female']}
            onSelect={(value) => setFormData(prev => ({ ...prev, gender: value.toLowerCase() }))}
          />

          <DatePickerField
            label="Date of Birth"
            day={formData.day}
            month={formData.month}
            year={formData.year}
            onDayChange={(day) => setFormData(prev => ({ ...prev, day }))}
            onMonthChange={(month) => setFormData(prev => ({ ...prev, month }))}
            onYearChange={(year) => setFormData(prev => ({ ...prev, year }))}
          />

          {/* Identity Verification Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Identity Verification</Text>
          </View>

          <View style={styles.verificationContainer}>
            <View style={styles.verificationStatus}>
              <Text style={styles.verificationLabel}>Verification Status:</Text>
              <View style={[
                styles.verificationBadge,
                (ekycSubmission?.status === 'approved' || userProfile?.verification_status === 'verified') && styles.verifiedBadge,
                (ekycSubmission?.status === 'rejected' || userProfile?.verification_status === 'rejected') && styles.rejectedBadge,
                (ekycSubmission?.status === 'pending' || userProfile?.verification_status === 'in_progress') && styles.pendingBadge,
              ]}>
                <Text style={[
                  styles.verificationBadgeText,
                  (ekycSubmission?.status === 'approved' || userProfile?.verification_status === 'verified') && styles.verifiedBadgeText,
                  (ekycSubmission?.status === 'rejected' || userProfile?.verification_status === 'rejected') && styles.rejectedBadgeText,
                  (ekycSubmission?.status === 'pending' || userProfile?.verification_status === 'in_progress') && styles.pendingBadgeText,
                ]}>
                  {ekycSubmission?.status === 'approved' || userProfile?.verification_status === 'verified' ? 'Verified' :
                   ekycSubmission?.status === 'rejected' || userProfile?.verification_status === 'rejected' ? 'Rejected' :
                   ekycSubmission?.status === 'pending' ? 'Pending' :
                   userProfile?.verification_status === 'in_progress' ? 'In Progress' :
                   'Not Started'}
                </Text>
              </View>
            </View>
            
            {(ekycSubmission?.status !== 'approved' && userProfile?.verification_status !== 'verified') && (
              <TouchableOpacity 
                style={styles.verificationButton}
                onPress={() => router.push('/ekyc-verification')}
              >
                <Text style={styles.verificationButtonText}>
                  {ekycSubmission?.status === 'rejected' || userProfile?.verification_status === 'rejected' ? 'Resubmit Verification' :
                   ekycSubmission?.status === 'pending' ? 'Check Verification Status' :
                   userProfile?.verification_status === 'in_progress' ? 'Check Verification Status' :
                   'Start Verification'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* eKYC Submission Details Section - Show when eKYC submission exists */}
          {ekycSubmission && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>eKYC Submission Details</Text>
                <Text style={styles.ekycNote}>
                  The information below is from your eKYC verification submission and cannot be edited here.
                </Text>
              </View>

              <View style={[styles.ekycDetailsContainer, { backgroundColor: '#F8F9FA', borderColor: '#E9ECEF' }]}>
                <View style={styles.ekycDetailItem}>
                  <Text style={styles.ekycDetailLabel}>Full Name:</Text>
                  <Text style={styles.ekycDetailValue}>{ekycSubmission.full_name}</Text>
                </View>
                
                <View style={styles.ekycDetailItem}>
                  <Text style={styles.ekycDetailLabel}>Nationality:</Text>
                  <Text style={styles.ekycDetailValue}>{ekycSubmission.nationality}</Text>
                </View>
                
                {ekycSubmission.ic_number && (
                  <View style={styles.ekycDetailItem}>
                    <Text style={styles.ekycDetailLabel}>IC Number:</Text>
                    <Text style={styles.ekycDetailValue}>{ekycSubmission.ic_number}</Text>
                  </View>
                )}
                
                {ekycSubmission.passport_number && (
                  <View style={styles.ekycDetailItem}>
                    <Text style={styles.ekycDetailLabel}>Passport Number:</Text>
                    <Text style={styles.ekycDetailValue}>{ekycSubmission.passport_number}</Text>
                  </View>
                )}
                
                <View style={styles.ekycDetailItem}>
                  <Text style={styles.ekycDetailLabel}>Date of Birth:</Text>
                  <Text style={styles.ekycDetailValue}>
                    {ekycSubmission.date_of_birth ? new Date(ekycSubmission.date_of_birth).toLocaleDateString() : 'Not provided'}
                  </Text>
                </View>
                
                <View style={styles.ekycDetailItem}>
                  <Text style={styles.ekycDetailLabel}>Phone Number:</Text>
                  <Text style={styles.ekycDetailValue}>{ekycSubmission.phone_number}</Text>
                </View>
                
                <View style={styles.ekycDetailItem}>
                  <Text style={styles.ekycDetailLabel}>Email:</Text>
                  <Text style={styles.ekycDetailValue}>{ekycSubmission.email}</Text>
                </View>
                
                <View style={styles.ekycDetailItem}>
                  <Text style={styles.ekycDetailLabel}>Address Type:</Text>
                  <Text style={styles.ekycDetailValue}>{ekycSubmission.address_type}</Text>
                </View>
                
                <View style={styles.ekycDetailItem}>
                  <Text style={styles.ekycDetailLabel}>Address:</Text>
                  <Text style={styles.ekycDetailValue}>
                    {ekycSubmission.address}, {ekycSubmission.city}, {ekycSubmission.postcode}, {ekycSubmission.state}
                  </Text>
                </View>
                
                <View style={styles.ekycDetailItem}>
                  <Text style={styles.ekycDetailLabel}>Submission Date:</Text>
                  <Text style={styles.ekycDetailValue}>
                    {new Date(ekycSubmission.created_at).toLocaleDateString()}
                  </Text>
                </View>
                
                {ekycSubmission.admin_notes && (
                  <View style={styles.ekycDetailItem}>
                    <Text style={styles.ekycDetailLabel}>Admin Notes:</Text>
                    <Text style={styles.ekycDetailValue}>{ekycSubmission.admin_notes}</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Bank Account Details Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bank Account details</Text>
          </View>

          <FormField
            label="Bank Name"
            value={formData.bankName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, bankName: text }))}
          />

          <FormField
            label="Bank Account Holder Name"
            value={formData.accountHolderName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, accountHolderName: text }))}
          />

          <FormField
            label="Bank Account Number"
            value={formData.accountNumber}
            onChangeText={(text) => setFormData(prev => ({ ...prev, accountNumber: text }))}
          />

          <FormField
            label="Contact Number"
            value={formData.contactNumber}
            onChangeText={(text) => setFormData(prev => ({ ...prev, contactNumber: text }))}
          />

          <TouchableOpacity style={styles.updateLink}>
            <Text style={styles.updateLinkText}>Click here to update your banking details</Text>
          </TouchableOpacity>

          {/* Save Button - Hide when eKYC submission exists since data is read-only */}
          {!ekycSubmission && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  formContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    paddingVertical: 20,
  },
  formField: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#1D1D1F',
    marginBottom: 8,
    fontWeight: '500',
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingBottom: 8,
  },
  disabledField: {
    backgroundColor: '#F8F8F8',
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
    paddingVertical: 4,
  },
  disabledInput: {
    color: '#8E8E93',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingBottom: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1D1D1F',
    flex: 1,
  },
  placeholderText: {
    color: '#8E8E93',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#8E8E93',
  },
  dropdownOptions: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  updateLink: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  updateLinkText: {
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  verificationContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  verificationLabel: {
    fontSize: 14,
    color: '#1D1D1F',
    fontWeight: '500',
  },
  verificationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
  },
  verificationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  verifiedBadge: {
    backgroundColor: '#34C759',
  },
  verifiedBadgeText: {
    color: '#FFFFFF',
  },
  rejectedBadge: {
    backgroundColor: '#FF3B30',
  },
  rejectedBadgeText: {
    color: '#FFFFFF',
  },
  pendingBadge: {
    backgroundColor: '#FF9500',
  },
  pendingBadgeText: {
    color: '#FFFFFF',
  },
  verificationButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  verificationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ekycDetailsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  ekycDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  ekycDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6C757D',
    flex: 1,
  },
  ekycDetailValue: {
    fontSize: 14,
    color: '#1D1D1F',
    flex: 2,
    textAlign: 'right',
  },
  ekycNote: {
    fontSize: 12,
    color: '#6C757D',
    fontStyle: 'italic',
    marginTop: 4,
  },
});