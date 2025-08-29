import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, useColors } from '@/contexts/ThemeContext';
import { bankInfoService } from '@/lib/bank-info-service';

interface BankInfoFormData {
  name: string;
  ic_number: string;
  bank_name: string;
  bank_account_number: string;
}

export default function UpdateBankInfoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<BankInfoFormData>({
    name: '',
    ic_number: '',
    bank_name: '',
    bank_account_number: '',
  });

  useEffect(() => {
    loadBankStatement();
  }, []);

  const loadBankStatement = async () => {
    try {
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        router.back();
        return;
      }

      const result = await bankInfoService.getBankInfo(user.id);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to load bank information');
        return;
      }

      if (result.data) {
        setFormData({
          name: result.data.name || '',
          ic_number: result.data.ic_number || '',
          bank_name: result.data.bank_name || '',
          bank_account_number: result.data.bank_account_number || '',
        });
      } else {
        Alert.alert(
          'No Bank Statement Found',
          'You need to have a verified bank statement to update bank information. Please upload a bank statement first.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upload Statement', onPress: () => router.push('/bank-statement-upload') }
          ]
        );
        router.back();
        return;
      }
    } catch (error) {
      console.error('Error loading bank statement:', error);
      Alert.alert('Error', 'Failed to load bank information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Validate form data
    if (!formData.bank_name.trim()) {
      Alert.alert('Validation Error', 'Please enter a bank name');
      return;
    }

    if (!formData.bank_account_number.trim()) {
      Alert.alert('Validation Error', 'Please enter a bank account number');
      return;
    }

    setIsSaving(true);

    try {
      const result = await bankInfoService.updateBankInfo(user.id, {
        bank_name: formData.bank_name.trim(),
        bank_account_number: formData.bank_account_number.trim(),
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to update bank information. Please try again.');
        return;
      }

      Alert.alert(
        'Success',
        'Bank information updated successfully. Your updated information has been submitted for review and your account status has been reset to pending until approved.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error updating bank information:', error);
      Alert.alert('Error', 'Failed to update bank information. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Loading bank information...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Update Bank Information
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Info Alert */}
        <View style={[styles.infoAlert, { backgroundColor: colors.background.secondary }]}>
          <AlertCircle size={20} color={colors.primary.main} />
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            You can only update your bank name and account number. Name and ID number cannot be modified for security reasons. After updating, your account will be reset to pending status until the changes are reviewed.
          </Text>
        </View>

        {/* Form */}
        <View style={[styles.formContainer, { backgroundColor: colors.background.tertiary }]}>
          {/* Read-only fields */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
              Full Name (Read-only)
            </Text>
            <View style={[styles.readOnlyInput, { backgroundColor: colors.background.secondary }]}>
              <Text style={[styles.readOnlyText, { color: colors.text.tertiary }]}>
                {formData.name || 'Not provided'}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
              IC Number (Read-only)
            </Text>
            <View style={[styles.readOnlyInput, { backgroundColor: colors.background.secondary }]}>
              <Text style={[styles.readOnlyText, { color: colors.text.tertiary }]}>
                {formData.ic_number || 'Not provided'}
              </Text>
            </View>
          </View>

          {/* Editable fields */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
              Bank Name *
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.background.secondary,
                color: colors.text.primary,
                borderColor: colors.border.main
              }]}
              value={formData.bank_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bank_name: text }))}
              placeholder="Enter bank name"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
              Bank Account Number *
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.background.secondary,
                color: colors.text.primary,
                borderColor: colors.border.main
              }]}
              value={formData.bank_account_number}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bank_account_number: text }))}
              placeholder="Enter bank account number"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary.main },
              isSaving && { opacity: 0.6 }
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Save size={20} color="white" />
            )}
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Updating...' : 'Update Bank Information'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 24,
  },
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  formContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  readOnlyInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 40,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
