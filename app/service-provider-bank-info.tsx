import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, AlertCircle, Shield, ChevronDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/auth-service';

interface BankInfoFormData {
  real_name: string;
  id_type: 'IC' | 'Passport';
  ic_passport_number: string;
  country_code: 'MY' | 'SG';
  phone_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postcode: string;
  state: string;
  bank_name: string;
  bank_account_number: string;
  swift_code: string;
  responsibility_acknowledged: boolean;
}

// Malaysian banks list
const MALAYSIAN_BANKS = [
  'Affin Bank Berhad',
  'Alliance Bank Malaysia Berhad',
  'AmBank (M) Berhad',
  'Bank Islam Malaysia Berhad',
  'Bank Muamalat Malaysia Berhad',
  'Bank of America Malaysia Berhad',
  'Bank of China (Malaysia) Berhad',
  'Bank Rakyat',
  'CIMB Bank Berhad',
  'Citibank Berhad',
  'Deutsche Bank (Malaysia) Berhad',
  'Hong Leong Bank Berhad',
  'HSBC Bank Malaysia Berhad',
  'Industrial and Commercial Bank of China (Malaysia) Berhad',
  'J.P. Morgan Chase Bank Berhad',
  'Kuwait Finance House (Malaysia) Berhad',
  'Malayan Banking Berhad (Maybank)',
  'Mizuho Bank (Malaysia) Berhad',
  'MUFG Bank (Malaysia) Berhad',
  'OCBC Bank (Malaysia) Berhad',
  'Public Bank Berhad',
  'RHB Bank Berhad',
  'Standard Chartered Bank Malaysia Berhad',
  'Sumitomo Mitsui Banking Corporation Malaysia Berhad',
  'The Bank of Tokyo-Mitsubishi UFJ (Malaysia) Berhad',
  'United Overseas Bank (Malaysia) Berhad',
];

// Malaysian states
const MALAYSIAN_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Kuala Lumpur',
  'Labuan',
  'Malacca',
  'Negeri Sembilan',
  'Pahang',
  'Penang',
  'Perak',
  'Perlis',
  'Putrajaya',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
];

export default function ServiceProviderBankInfoScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasAcceptedAgreement, setHasAcceptedAgreement] = useState(false);
  const [existingBankInfo, setExistingBankInfo] = useState<any>(null);
  const [formData, setFormData] = useState<BankInfoFormData>({
    real_name: '',
    id_type: 'IC',
    ic_passport_number: '',
    country_code: 'MY',
    phone_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    state: '',
    bank_name: '',
    bank_account_number: '',
    swift_code: '',
    responsibility_acknowledged: false,
  });

  // Modal states
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);

  // Utility functions
  const formatICNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Format as XXXXXX-XX-XXXX
    if (cleaned.length <= 6) {
      return cleaned;
    } else if (cleaned.length <= 8) {
      return `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`;
    } else {
      return `${cleaned.slice(0, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8, 12)}`;
    }
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    return cleaned;
  };

  const formatPostcode = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    return cleaned;
  };

  useEffect(() => {
    checkAgreementAndLoadData();
  }, []);

  const checkAgreementAndLoadData = async () => {
    await checkAgreementAcceptance();
    await loadExistingBankInfo();
  };

  const checkAgreementAcceptance = async () => {
    try {
      if (!user) return;

      const { data: agreementData, error } = await supabase
        .from('service_provider_agreement_acceptance')
        .select('id, accepted_at')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking agreement acceptance:', error);
        return;
      }

      if (agreementData) {
        setHasAcceptedAgreement(true);
      } else {
        // User hasn't accepted the agreement, redirect them back
        Alert.alert(
          'Agreement Required',
          'You must accept the Service Provider Agreement before providing bank information.',
          [
            {
              text: 'Go Back',
              onPress: () => router.push('/service-provider-agreement'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error checking agreement acceptance:', error);
    }
  };

  const loadExistingBankInfo = async () => {
    try {
      if (!user) return;

      const { data: bankInfo, error } = await supabase
        .from('service_provider_bank_info')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading bank info:', error);
        return;
      }

      if (bankInfo) {
        setExistingBankInfo(bankInfo);
        setFormData({
          real_name: bankInfo.real_name || '',
          id_type: bankInfo.id_type || 'IC',
          ic_passport_number: bankInfo.ic_passport_number || '',
          country_code: bankInfo.country_code || 'MY',
          phone_number: bankInfo.phone_number || '',
          address_line1: bankInfo.address_line1 || '',
          address_line2: bankInfo.address_line2 || '',
          city: bankInfo.city || '',
          postcode: bankInfo.postcode || '',
          state: bankInfo.state || '',
          bank_name: bankInfo.bank_name || '',
          bank_account_number: bankInfo.bank_account_number || '',
          swift_code: bankInfo.swift_code || '',
          responsibility_acknowledged: bankInfo.responsibility_acknowledged || false,
        });
      }
    } catch (error) {
      console.error('Error loading bank info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.real_name.trim()) {
      Alert.alert('Validation Error', 'Name per IC/Passport is required');
      return false;
    }

    if (!formData.ic_passport_number.trim()) {
      Alert.alert('Validation Error', `${formData.id_type} number is required`);
      return false;
    }

    if (!formData.phone_number.trim()) {
      Alert.alert('Validation Error', 'Phone number is required');
      return false;
    }

    if (!formData.address_line1.trim()) {
      Alert.alert('Validation Error', 'Address line 1 is required');
      return false;
    }

    if (!formData.city.trim()) {
      Alert.alert('Validation Error', 'City is required');
      return false;
    }

    if (!formData.postcode.trim()) {
      Alert.alert('Validation Error', 'Postcode is required');
      return false;
    }

    if (!formData.state.trim()) {
      Alert.alert('Validation Error', 'State is required');
      return false;
    }

    if (!formData.bank_name.trim()) {
      Alert.alert('Validation Error', 'Bank name is required');
      return false;
    }

    if (!formData.bank_account_number.trim()) {
      Alert.alert('Validation Error', 'Bank account number is required');
      return false;
    }

    if (!formData.responsibility_acknowledged) {
      Alert.alert('Acknowledgment Required', 'You must acknowledge responsibility for the information provided');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!user) return;

    if (!validateForm()) return;

    // Show final confirmation
    Alert.alert(
      'Confirm Bank Information',
      'IMPORTANT: Once you submit this information, it CANNOT be changed. Please review all details carefully.\n\nAre you sure all information is correct?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'destructive',
          onPress: () => submitBankInfo(),
        },
      ]
    );
  };

  const submitBankInfo = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const bankInfoData = {
        user_id: user.id,
        real_name: formData.real_name.trim(),
        id_type: formData.id_type,
        ic_passport_number: formData.ic_passport_number.trim(),
        country_code: formData.country_code,
        phone_number: formData.phone_number.trim(),
        address_line1: formData.address_line1.trim(),
        address_line2: formData.address_line2.trim(),
        city: formData.city.trim(),
        postcode: formData.postcode.trim(),
        state: formData.state.trim(),
        bank_name: formData.bank_name.trim(),
        bank_account_number: formData.bank_account_number.trim(),
        swift_code: formData.swift_code.trim() || null,
        responsibility_acknowledged: formData.responsibility_acknowledged,
        responsibility_acknowledged_at: new Date().toISOString(),
        is_immutable: true,
      };

      if (existingBankInfo && !existingBankInfo.is_immutable) {
        // Update existing non-immutable record
        const { error } = await supabase
          .from('service_provider_bank_info')
          .update(bankInfoData)
          .eq('user_id', user.id);

        if (error) throw error;
      } else if (!existingBankInfo) {
        // Create new record
        const { error } = await supabase
          .from('service_provider_bank_info')
          .insert(bankInfoData);

        if (error) throw error;
      } else {
        // Existing immutable record - should not reach here
        throw new Error('Bank information is already submitted and cannot be changed');
      }

      // After saving bank info, register user as service provider
      const { data: serviceProviderData, error: serviceProviderError } = await authService.becomeServiceProvider();
      
      if (serviceProviderError) {
        console.error('Error becoming service provider:', serviceProviderError);
        throw new Error(serviceProviderError.message || 'Failed to register as service provider');
      }

      // Refresh user profile to get updated service provider status
      await refreshProfile();

      Alert.alert(
        'Bank Information Saved',
        'Your bank information has been saved successfully. You are now registered as a service provider!',
        [
          {
            text: 'OK',
            onPress: () => router.push('/(tabs)/profile'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error saving bank info:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to save bank information. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isFormDisabled = existingBankInfo?.is_immutable;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.primary }]}>
            Loading bank information...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Don't show the form if user hasn't accepted the agreement
  if (!hasAcceptedAgreement) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text.primary }]}>
            Redirecting to Service Provider Agreement...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.main }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Bank Information
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Information Status */}
        {isFormDisabled && (
          <View style={[styles.statusCard, { backgroundColor: colors.primary.main + '15', borderColor: colors.primary.main }]}>
            <Shield size={20} color={colors.primary.main} />
            <Text style={[styles.statusText, { color: colors.primary.main }]}>
              Your bank information has been submitted and is now locked for security.
            </Text>
          </View>
        )}

        {/* Responsibility Warning */}
        <View style={[styles.warningCard, { backgroundColor: '#FFF3CD', borderColor: '#FFEAA7' }]}>
          <AlertCircle size={20} color="#F39C12" />
          <View style={styles.warningContent}>
            <Text style={[styles.warningTitle, { color: '#E17E00' }]}>
              Important Notice
            </Text>
            <Text style={[styles.warningText, { color: '#E17E00' }]}>
              You take full responsibility for all information provided. Once submitted, this information cannot be changed. Please ensure all details are accurate. This banking information will be used for service payment payouts, so accuracy is crucial for receiving your earnings.
            </Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Personal Information
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              Name Per IC/Passport <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.background.tertiary, color: colors.text.primary, borderColor: colors.border.main },
                isFormDisabled && styles.disabledInput,
              ]}
              value={formData.real_name}
              onChangeText={(text) => setFormData({ ...formData, real_name: text })}
              placeholder="Enter your name as per IC/Passport"
              placeholderTextColor={colors.placeholder}
              editable={!isFormDisabled}
            />
          </View>

          {/* ID Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              ID Type <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setFormData({ ...formData, id_type: 'IC', ic_passport_number: '' })}
                disabled={isFormDisabled}
              >
                <View style={[
                  styles.radioButton,
                  { borderColor: colors.border.main },
                  formData.id_type === 'IC' && { backgroundColor: colors.primary.main }
                ]}>
                  {formData.id_type === 'IC' && <View style={[styles.radioButtonInner, { backgroundColor: colors.text }]} />}
                </View>
                <Text style={[styles.radioLabel, { color: colors.text }]}>IC</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setFormData({ ...formData, id_type: 'Passport', ic_passport_number: '' })}
                disabled={isFormDisabled}
              >
                <View style={[
                  styles.radioButton,
                  { borderColor: colors.border.main },
                  formData.id_type === 'Passport' && { backgroundColor: colors.primary.main }
                ]}>
                  {formData.id_type === 'Passport' && <View style={[styles.radioButtonInner, { backgroundColor: colors.text }]} />}
                </View>
                <Text style={[styles.radioLabel, { color: colors.text }]}>Passport</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              {formData.id_type} Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.background.tertiary, color: colors.text.primary, borderColor: colors.border.main },
                isFormDisabled && styles.disabledInput,
              ]}
              value={formData.ic_passport_number}
              onChangeText={(text) => {
                const formatted = formData.id_type === 'IC' ? formatICNumber(text) : text;
                setFormData({ ...formData, ic_passport_number: formatted });
              }}
              placeholder={formData.id_type === 'IC' ? 'Enter IC number (e.g., 123456-78-9012)' : 'Enter passport number'}
              placeholderTextColor={colors.placeholder}
              maxLength={formData.id_type === 'IC' ? 14 : undefined}
              editable={!isFormDisabled}
            />
          </View>

          {/* Phone Number with Country Code */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.phoneInputContainer}>
              <TouchableOpacity
                style={[styles.countryCodeSelector, { backgroundColor: colors.background.tertiary, borderColor: colors.border.main }]}
                onPress={() => {
                  setFormData({ 
                    ...formData, 
                    country_code: formData.country_code === 'MY' ? 'SG' : 'MY',
                    phone_number: ''
                  });
                }}
                disabled={isFormDisabled}
              >
                <Text style={[styles.countryCodeText, { color: colors.text.primary }]}>
                  {formData.country_code}
                </Text>
                <ChevronDown size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
              <View style={[styles.countryCodeContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.main }]}>
                <Text style={[styles.countryCodeText, { color: colors.text.primary }]}>
                  {formData.country_code === 'MY' ? '+60' : '+65'}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.phoneInput,
                  { backgroundColor: colors.background.tertiary, color: colors.text.primary, borderColor: colors.border.main },
                  isFormDisabled && styles.disabledInput,
                ]}
                value={formData.phone_number}
                onChangeText={(text) => {
                  const formatted = formatPhoneNumber(text);
                  setFormData({ ...formData, phone_number: formatted });
                }}
                placeholder="Enter phone number"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
                editable={!isFormDisabled}
              />
            </View>
          </View>

          {/* Address Fields */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              Address Line 1 <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.background.tertiary, color: colors.text.primary, borderColor: colors.border.main },
                isFormDisabled && styles.disabledInput,
              ]}
              value={formData.address_line1}
              onChangeText={(text) => setFormData({ ...formData, address_line1: text })}
              placeholder="Enter address line 1"
              placeholderTextColor={colors.placeholder}
              editable={!isFormDisabled}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              Address Line 2
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.background.tertiary, color: colors.text.primary, borderColor: colors.border.main },
                isFormDisabled && styles.disabledInput,
              ]}
              value={formData.address_line2}
              onChangeText={(text) => setFormData({ ...formData, address_line2: text })}
              placeholder="Enter address line 2 (optional)"
              placeholderTextColor={colors.placeholder}
              editable={!isFormDisabled}
            />
          </View>

          <View style={styles.addressRow}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={[styles.label, { color: colors.text.primary }]}>
                City <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background.tertiary, color: colors.text.primary, borderColor: colors.border.main },
                  isFormDisabled && styles.disabledInput,
                ]}
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                placeholder="Enter city"
                placeholderTextColor={colors.placeholder}
                editable={!isFormDisabled}
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={[styles.label, { color: colors.text.primary }]}>
                Postcode <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background.tertiary, color: colors.text.primary, borderColor: colors.border.main },
                  isFormDisabled && styles.disabledInput,
                ]}
                value={formData.postcode}
                onChangeText={(text) => {
                  const formatted = formatPostcode(text);
                  setFormData({ ...formData, postcode: formatted });
                }}
                placeholder="Enter postcode"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
                maxLength={5}
                editable={!isFormDisabled}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              State <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                  { backgroundColor: colors.background.tertiary, borderColor: colors.border.main },
                isFormDisabled && styles.disabledInput,
              ]}
              onPress={() => setStateModalVisible(true)}
              disabled={isFormDisabled}
            >
              <Text style={[
                styles.dropdownButtonText,
                { color: formData.state ? colors.text.primary : colors.text.tertiary }
              ]}>
                {formData.state || 'Select state'}
              </Text>
              <ChevronDown size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bank Information */}
        <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Bank Information
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              Bank Name <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                  { backgroundColor: colors.background.tertiary, borderColor: colors.border.main },
                isFormDisabled && styles.disabledInput,
              ]}
              onPress={() => setBankModalVisible(true)}
              disabled={isFormDisabled}
            >
              <Text style={[
                styles.dropdownButtonText,
                { color: formData.bank_name ? colors.text.primary : colors.text.tertiary }
              ]}>
                {formData.bank_name || 'Select bank'}
              </Text>
              <ChevronDown size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              Bank Account Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.background.tertiary, color: colors.text.primary, borderColor: colors.border.main },
                isFormDisabled && styles.disabledInput,
              ]}
              value={formData.bank_account_number}
              onChangeText={(text) => setFormData({ ...formData, bank_account_number: text })}
              placeholder="Enter your bank account number"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              editable={!isFormDisabled}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              SWIFT Code (Optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.background.tertiary, color: colors.text.primary, borderColor: colors.border.main },
                isFormDisabled && styles.disabledInput,
              ]}
              value={formData.swift_code}
              onChangeText={(text) => setFormData({ ...formData, swift_code: text })}
              placeholder="Enter SWIFT code if applicable"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="characters"
              editable={!isFormDisabled}
            />
          </View>
        </View>

        {/* Responsibility Acknowledgment */}
        {!isFormDisabled && (
          <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Acknowledgment
            </Text>

            <View style={[styles.acknowledgmentCard, { backgroundColor: '#FFF3CD', borderColor: '#FFEAA7' }]}>
              <View style={styles.acknowledgmentHeader}>
                <Switch
                  value={formData.responsibility_acknowledged}
                  onValueChange={(value) =>
                    setFormData({ ...formData, responsibility_acknowledged: value })
                  }
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={formData.responsibility_acknowledged ? '#fff' : '#f4f3f4'}
                />
                <Text style={[styles.acknowledgmentLabel, { color: '#E17E00' }]}>
                  I acknowledge responsibility
                </Text>
              </View>
              <Text style={[styles.acknowledgmentText, { color: '#E17E00' }]}>
                By enabling this option, I confirm that:
                {'\n'}• All information provided is accurate and truthful
                {'\n'}• I understand this information cannot be changed once submitted
                {'\n'}• I take full responsibility for the accuracy of this information
                {'\n'}• I understand that false information may result in account suspension
              </Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        {!isFormDisabled && (
          <View style={styles.submitSection}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary.main },
                (!formData.responsibility_acknowledged || isSaving) && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={!formData.responsibility_acknowledged || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {existingBankInfo ? 'Update Information' : 'Submit Information'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bank Selection Modal */}
      <Modal
        visible={bankModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBankModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background.secondary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.main }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Select Bank</Text>
              <TouchableOpacity
                onPress={() => setBankModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={[styles.modalCloseText, { color: colors.primary.main }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={MALAYSIAN_BANKS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { borderBottomColor: colors.border.main },
                    formData.bank_name === item && { backgroundColor: colors.primary.main + '15' }
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, bank_name: item });
                    setBankModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    { color: colors.text.primary },
                    formData.bank_name === item && { color: colors.primary.main, fontWeight: '600' }
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* State Selection Modal */}
      <Modal
        visible={stateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setStateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background.secondary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.main }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Select State</Text>
              <TouchableOpacity
                onPress={() => setStateModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={[styles.modalCloseText, { color: colors.primary.main }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={MALAYSIAN_STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { borderBottomColor: colors.border.main },
                    formData.state === item && { backgroundColor: colors.primary.main + '15' }
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, state: item });
                    setStateModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    { color: colors.text.primary },
                    formData.state === item && { color: colors.primary.main, fontWeight: '600' }
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  warningContent: {
    marginLeft: 12,
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: '#E74C3C',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  disabledInput: {
    opacity: 0.6,
  },
  acknowledgmentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  acknowledgmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  acknowledgmentLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  acknowledgmentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  submitSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for enhanced form
  radioGroup: {
    flexDirection: 'row',
    gap: 24,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  countryCodeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    minWidth: 50,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  dropdownButtonText: {
    fontSize: 16,
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
  },
});
