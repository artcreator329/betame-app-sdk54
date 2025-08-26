import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Upload, FileText, CheckCircle, XCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { bankStatementService } from '@/lib/bank-statement-service';
import { BankStatementFormData } from '@/types/bank-statement';
import { EKYCService, EKYCSubmission } from '@/lib/ekyc-service';

interface BankStatementData {
  name: string;
  ic_number: string;
  bank_name: string;
  bank_account_number: string;
  nomad_visa_required?: boolean;
}

export default function BankStatementUploadScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedNomadVisa, setSelectedNomadVisa] = useState<string | null>(null);
  const [formData, setFormData] = useState<BankStatementData>({
    name: userProfile?.full_name || '',
    ic_number: '',
    bank_name: '',
    bank_account_number: '',
    nomad_visa_required: false,
  });
  const [ekycData, setEkycData] = useState<EKYCSubmission | null>(null);
  const [ekycLoading, setEkycLoading] = useState(true);

  // Check if user is authenticated and has completed eKYC
  useEffect(() => {
    const checkUserAndEKYC = async () => {
      if (!user) {
        Alert.alert(
          'Sign In Required',
          'You need to sign in to upload bank statement. Would you like to sign in now?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
            { text: 'Sign In', onPress: () => router.push('/auth/login') }
          ]
        );
        return;
      }

      try {
        setEkycLoading(true);
        const ekycSubmission = await EKYCService.getUserEKYCSubmission();
        
        if (!ekycSubmission) {
          Alert.alert(
            'eKYC Verification Required',
            'You must complete eKYC verification before uploading bank statements. This ensures your identity is verified.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
              { text: 'Complete eKYC', onPress: () => router.push('/ekyc-verification') }
            ]
          );
          return;
        }

        if (ekycSubmission.status !== 'approved') {
          Alert.alert(
            'eKYC Verification Pending',
            `Your eKYC verification is currently ${ekycSubmission.status}. You must have an approved eKYC before uploading bank statements.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
              { text: 'Check Status', onPress: () => router.push('/ekyc-verification') }
            ]
          );
          return;
        }

        // eKYC is approved, auto-fill the form
        setEkycData(ekycSubmission);
        
        // Determine if nomad visa is required based on document type
        const isPassportUser = Boolean(ekycSubmission.passport_number && !ekycSubmission.ic_number);
        
        setFormData(prev => ({
          ...prev,
          name: ekycSubmission.full_name,
          ic_number: ekycSubmission.ic_number || ekycSubmission.passport_number || '',
          nomad_visa_required: isPassportUser,
        }));

      } catch (error) {
        console.error('Error checking eKYC status:', error);
        Alert.alert(
          'Error',
          'Failed to verify your eKYC status. Please try again.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
            { text: 'Retry', onPress: () => checkUserAndEKYC() }
          ]
        );
      } finally {
        setEkycLoading(false);
      }
    };

    checkUserAndEKYC();
  }, [user, router]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  };

  const pickNomadVisa = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedNomadVisa(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking nomad visa file:', error);
      Alert.alert('Error', 'Failed to pick nomad visa file. Please try again.');
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your full name as shown on IC');
      return false;
    }
    if (!formData.ic_number.trim()) {
      Alert.alert('Error', 'Please enter your IC number');
      return false;
    }
    if (!formData.bank_name.trim()) {
      Alert.alert('Error', 'Please enter your bank name');
      return false;
    }
    if (!formData.bank_account_number.trim()) {
      Alert.alert('Error', 'Please enter your bank account number');
      return false;
    }
    if (!selectedImage) {
      Alert.alert('Error', 'Please upload your bank statement image');
      return false;
    }
    if (formData.nomad_visa_required && !selectedNomadVisa) {
      Alert.alert('Error', 'Please upload your Nomad Visa document');
      return false;
    }
    return true;
  };

  const uploadBankStatement = async () => {
    if (!validateForm() || !user) return;

    setIsUploading(true);
    try {
      const result = await bankStatementService.uploadBankStatement(
        user.id,
        formData as BankStatementFormData,
        selectedImage!,
        selectedNomadVisa || undefined
      );

      if (result.success) {
        Alert.alert(
          'Success',
          'Your bank statement has been uploaded successfully. We will review it and get back to you soon.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/(tabs)/profile')
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to upload bank statement. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading bank statement:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (field: keyof BankStatementData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading || ekycLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.primary }]}>
            {ekycLoading ? 'Verifying eKYC status...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Bank Statement Upload
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
                      {/* Info Section */}
            <View style={[styles.infoContainer, { backgroundColor: colors.background.secondary }]}>
              <Text style={[styles.infoTitle, { color: colors.text.primary }]}>
                Bank Statement Verification
              </Text>
              <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                Your eKYC verification is complete. Now please upload a clear image of your bank statement showing your name and account number to complete service provider verification.
                {formData.nomad_visa_required && ' As you are using a passport, you will also need to upload your Nomad Visa document.'}
              </Text>
              {ekycData && (
                <View style={[styles.ekycVerifiedContainer, { backgroundColor: colors.background.primary }]}>
                  <CheckCircle size={16} color={colors.status.success} />
                  <Text style={[styles.ekycVerifiedText, { color: colors.text.secondary }]}>
                    ✓ eKYC verified: {ekycData.full_name} ({ekycData.ic_number || ekycData.passport_number})
                    {formData.nomad_visa_required && ' • Passport user - Nomad Visa required'}
                  </Text>
                </View>
              )}
            </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Bank Account Details
            </Text>

            {/* Name */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
                Full Name (as shown on IC)
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.background.tertiary,
                  color: colors.text.secondary,
                  borderColor: colors.border.main
                }]}
                value={formData.name}
                editable={false}
                placeholder="Auto-filled from eKYC"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            {/* IC Number */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
                IC Number
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.background.tertiary,
                  color: colors.text.secondary,
                  borderColor: colors.border.main
                }]}
                value={formData.ic_number}
                editable={false}
                placeholder="Auto-filled from eKYC"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
              />
            </View>

            {/* Bank Name */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
                Bank Name
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.background.secondary,
                  color: colors.text.primary,
                  borderColor: colors.border.main
                }]}
                value={formData.bank_name}
                onChangeText={(value) => handleInputChange('bank_name', value)}
                placeholder="Enter your bank name"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            {/* Bank Account Number */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
                Bank Account Number
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.background.secondary,
                  color: colors.text.primary,
                  borderColor: colors.border.main
                }]}
                value={formData.bank_account_number}
                onChangeText={(value) => handleInputChange('bank_account_number', value)}
                placeholder="Enter your bank account number"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
              />
            </View>

            {/* Upload Section */}
            <View style={styles.uploadSection}>
              <Text style={[styles.uploadTitle, { color: colors.text.primary }]}>
                Upload Bank Statement File
              </Text>
              <Text style={[styles.uploadSubtitle, { color: colors.text.secondary }]}>
                Please upload a clear image or PDF of your bank statement showing your name and account number
              </Text>

              <TouchableOpacity
                style={[styles.uploadButton, { borderColor: colors.border.main }]}
                onPress={pickImage}
                disabled={isUploading}
              >
                {selectedImage ? (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                    <View style={styles.imageOverlay}>
                      <CheckCircle size={24} color="white" />
                      <Text style={styles.imageText}>File Selected</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadContent}>
                    <Upload size={32} color={colors.text.secondary} />
                    <Text style={[styles.uploadText, { color: colors.text.primary }]}>
                      Tap to select file
                    </Text>
                    <Text style={[styles.uploadHint, { color: colors.text.secondary }]}>
                      JPG, PNG, PDF up to 10MB
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Nomad Visa Upload Section - Only show for passport users */}
            {formData.nomad_visa_required && (
              <View style={styles.uploadSection}>
                <Text style={[styles.uploadTitle, { color: colors.text.primary }]}>
                  Upload Nomad Visa Document
                </Text>
                <Text style={[styles.uploadSubtitle, { color: colors.text.secondary }]}>
                  As you are using a passport for verification, please upload your Nomad Visa document
                </Text>

                <TouchableOpacity
                  style={[styles.uploadButton, { borderColor: colors.border.main }]}
                  onPress={pickNomadVisa}
                  disabled={isUploading}
                >
                  {selectedNomadVisa ? (
                    <View style={styles.imagePreview}>
                      <Image source={{ uri: selectedNomadVisa }} style={styles.previewImage} />
                      <View style={styles.imageOverlay}>
                        <CheckCircle size={24} color="white" />
                        <Text style={styles.imageText}>Nomad Visa Selected</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.uploadContent}>
                      <Upload size={32} color={colors.text.secondary} />
                      <Text style={[styles.uploadText, { color: colors.text.primary }]}>
                        Tap to select Nomad Visa
                      </Text>
                      <Text style={[styles.uploadHint, { color: colors.text.secondary }]}>
                        JPG, PNG, PDF up to 10MB
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary.main },
                isUploading && { opacity: 0.6 }
              ]}
              onPress={uploadBankStatement}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Submit for Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
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
  formContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  uploadSection: {
    marginBottom: 30,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 20,
  },
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    minHeight: 120,
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 14,
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  submitButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    minHeight: 56,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ekycVerifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  ekycVerifiedText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
});
