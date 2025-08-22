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

interface BankStatementData {
  name: string;
  ic_number: string;
  bank_name: string;
  bank_account_number: string;
}

export default function BankStatementUploadScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<BankStatementData>({
    name: userProfile?.full_name || '',
    ic_number: '',
    bank_name: '',
    bank_account_number: '',
  });

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to upload bank statement. Would you like to sign in now?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
    }
  }, [user, router]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
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
      Alert.alert('Error', 'Please upload your bank statement');
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
        selectedImage!
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

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.primary }]}>Loading...</Text>
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
              Verification Required
            </Text>
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              To become a service provider, we need to verify your bank account details. Please upload a clear bank statement showing your name and account number.
            </Text>
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
                  backgroundColor: colors.background.secondary,
                  color: colors.text.primary,
                  borderColor: colors.border.main
                }]}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Enter your full name"
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
                  backgroundColor: colors.background.secondary,
                  color: colors.text.primary,
                  borderColor: colors.border.main
                }]}
                value={formData.ic_number}
                onChangeText={(value) => handleInputChange('ic_number', value)}
                placeholder="Enter your IC number"
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
                Upload Bank Statement
              </Text>
              <Text style={[styles.uploadSubtitle, { color: colors.text.secondary }]}>
                Please upload a clear image of your bank statement showing your name and account number
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
                      <Text style={styles.imageText}>Image Selected</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadContent}>
                    <Upload size={32} color={colors.text.secondary} />
                    <Text style={[styles.uploadText, { color: colors.text.primary }]}>
                      Tap to upload
                    </Text>
                    <Text style={[styles.uploadHint, { color: colors.text.secondary }]}>
                      JPG, PNG up to 10MB
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

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
});
