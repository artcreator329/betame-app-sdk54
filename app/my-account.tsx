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
  const { user, userProfile, updateProfile } = useAuth();
  
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

  useEffect(() => {
    // Load user data when component mounts
    if (userProfile) {
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

      setFormData(prev => ({
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
      }));
    }
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

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
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
});