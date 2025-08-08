import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Upload, Camera, ImageIcon, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceService } from '@/lib/service-service';
import { ImageService } from '@/lib/image-service';
import ServiceAreaPicker from '@/components/ServiceAreaPicker';

function getPriceUnitLabel(priceUnit: string): string {
  const unitLabels: { [key: string]: string } = {
    'per_hour': ' per hour',
    'per_day': ' per day',
    'per_week': ' per week',
    'per_month': ' per month',
    'per_item': ' per item',
    'per_project': ' per project',
    'per_session': ' per session',
    'one_time': '',
  };
  return unitLabels[priceUnit] || '';
}

// TODO: Replace with dynamic industry list from database
const INDUSTRIES: string[] = [
  'Professional Services',
  'Construction & Maintenance',
  'Technology & IT',
  'Healthcare & Medical',
  'Education & Training',
  'Finance & Banking',
  'Retail & E-commerce',
  'Hospitality & Tourism',
  'Manufacturing',
  'Transportation & Logistics',
  'Real Estate',
  'Media & Entertainment',
  'Agriculture & Farming',
  'Automotive',
  'Beauty & Wellness',
  'Food & Beverage',
  'Sports & Recreation',
  'Non-Profit & Social Services',
  'Government & Public Sector',
];

export default function CreateServiceListingScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [serviceArea, setServiceArea] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    radius: number;
    description: string;
  } | null>(null);

  const router = useRouter();
  const { user } = useAuth();

  const handleIndustrySelect = (selectedIndustry: string) => {
    setIndustry(selectedIndustry);
    setShowIndustryDropdown(false);
  };

  const handleTitleChange = (text: string) => {
    if (text.length <= 100) {
      setTitle(text);
    }
  };

  const handleDescriptionChange = (text: string) => {
    if (text.length <= 1000) {
      setDescription(text);
    }
  };

  const handlePhotoUpload = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await takePhoto();
          } else if (buttonIndex === 2) {
            await pickImage();
          }
        }
      );
    } else {
      Alert.alert(
        'Select Photo',
        'Choose how you want to add a photo',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickImage },
        ]
      );
    }
  };

  const takePhoto = async () => {
    if (!user) return;
    
    setIsUploading(true);
    try {
      const result = await ImageService.takePhoto();
      if (result && !result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const uploadResult = await ImageService.uploadImage(
            asset.uri,
            asset.base64,
            user.id,
            'service-images'
          );
          
          if (uploadResult.success && uploadResult.url) {
            setImageUri(uploadResult.url);
          } else {
            Alert.alert('Error', uploadResult.error || 'Failed to upload image');
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsUploading(false);
    }
  };

  const pickImage = async () => {
    if (!user) return;
    
    setIsUploading(true);
    try {
      const result = await ImageService.pickImage();
      if (result && !result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const uploadResult = await ImageService.uploadImage(
            asset.uri,
            asset.base64,
            user.id,
            'service-images'
          );
          
          if (uploadResult.success && uploadResult.url) {
            setImageUri(uploadResult.url);
          } else {
            Alert.alert('Error', uploadResult.error || 'Failed to upload image');
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a service');
        return;
      }

      if (!title.trim()) {
        Alert.alert('Error', 'Please enter a service title');
        return;
      }
      if (!description.trim()) {
        Alert.alert('Error', 'Please enter a service description');
        return;
      }
      if (!industry.trim()) {
        Alert.alert('Error', 'Please select an industry');
        return;
      }

      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleServiceAreaSelect = (area: {
    latitude: number;
    longitude: number;
    address: string;
    radius: number;
    description: string;
  }) => {
    setServiceArea(area);
  };

  const handleProceedToDetails = () => {
    if (!serviceArea) {
      Alert.alert('Error', 'Please select a service area');
      return;
    }

    // Navigate to detailed service listing with the complete service data
    const serviceData = {
      title: title.trim(),
      description: description.trim(),
      industry: industry.trim(),
      imageUri: imageUri || undefined,
      serviceArea: serviceArea,
    };

    router.push({
      pathname: '/detailed-service-listing',
      params: {
        serviceData: JSON.stringify(serviceData)
      }
    });
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepContainer}>
        <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
          <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
        </View>
        <Text style={styles.stepLabel}>Basic Info</Text>
      </View>
      <View style={styles.stepLine} />
      <View style={styles.stepContainer}>
        <View style={[styles.stepCircle, currentStep >= 2 && styles.stepCircleActive]}>
          <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
        </View>
        <Text style={styles.stepLabel}>Service Area</Text>
      </View>
    </View>
  );

  const renderBasicInfoStep = () => (
     <ScrollView showsVerticalScrollIndicator={false}>
       <View style={styles.content}>
         <Text style={styles.sectionTitle}>Main Service</Text>

         {/* Service Title */}
         <View style={styles.compactFieldContainer}>
           <Text style={styles.compactFieldLabel}>Service Title *</Text>
           <TextInput
             style={styles.compactTextInput}
             value={title}
             onChangeText={handleTitleChange}
             placeholder="What service do you offer?"
             placeholderTextColor="#8E8E93"
             maxLength={100}
           />
         </View>

         {/* Description */}
         <View style={styles.compactFieldContainer}>
           <Text style={styles.compactFieldLabel}>Description *</Text>
           <TextInput
             style={[styles.compactTextInput, styles.compactTextArea]}
             value={description}
             onChangeText={handleDescriptionChange}
             placeholder="Brief description of your service"
             placeholderTextColor="#8E8E93"
             multiline={true}
             numberOfLines={3}
             textAlignVertical="top"
             maxLength={500}
           />
         </View>

         {/* Industry Selection */}
         <View style={styles.compactFieldContainer}>
           <Text style={styles.compactFieldLabel}>Industry *</Text>
           <TouchableOpacity 
             style={styles.compactDropdownButton} 
             onPress={() => setShowIndustryDropdown(!showIndustryDropdown)}
           >
             <Text style={[
               styles.compactDropdownText,
               !industry && styles.compactDropdownPlaceholder
             ]}>
               {industry || 'Select Industry'}
             </Text>
             <Text style={styles.compactDropdownArrow}>
               {showIndustryDropdown ? '▲' : '▼'}
             </Text>
           </TouchableOpacity>
           
           {showIndustryDropdown && (
             <View style={styles.compactDropdownList}>
               <ScrollView style={styles.compactDropdownScrollView} nestedScrollEnabled>
                 {INDUSTRIES.map((industryOption, index) => (
                   <TouchableOpacity
                     key={index}
                     style={[
                       styles.compactDropdownItem,
                       industry === industryOption && styles.compactDropdownItemSelected
                     ]}
                     onPress={() => handleIndustrySelect(industryOption)}
                   >
                     <Text style={[
                       styles.compactDropdownItemText,
                       industry === industryOption && styles.compactDropdownItemTextSelected
                     ]}>
                       {industryOption}
                     </Text>
                   </TouchableOpacity>
                 ))}
               </ScrollView>
             </View>
           )}
         </View>

         {/* Continue Button */}
         <TouchableOpacity 
           style={[
             styles.continueButton, 
             (title.trim() && description.trim() && industry.trim()) 
               ? styles.continueButtonActive 
               : styles.continueButtonDisabled
           ]} 
           onPress={handleNextStep}
           disabled={!title.trim() || !description.trim() || !industry.trim()}
         >
           <Text style={[
             styles.continueButtonText,
             (title.trim() && description.trim() && industry.trim()) 
               ? styles.continueButtonTextActive 
               : {}
           ]}>
             Next: Service Area
           </Text>
         </TouchableOpacity>
       </View>
     </ScrollView>
   );

   const renderServiceAreaStep = () => (
     <View style={styles.serviceAreaContainer}>
       <ScrollView 
         style={styles.serviceAreaScrollView}
         contentContainerStyle={styles.serviceAreaScrollContent}
         showsVerticalScrollIndicator={false}
       >
         <ServiceAreaPicker
            onLocationSelect={handleServiceAreaSelect}
            initialLocation={serviceArea || undefined}
          />
       </ScrollView>
       <View style={styles.serviceAreaButtons}>
         <TouchableOpacity 
           style={styles.backButton}
           onPress={handlePreviousStep}
           activeOpacity={0.8}
         >
           <Text style={styles.backButtonText}>Back</Text>
         </TouchableOpacity>
         <TouchableOpacity 
           style={[
             styles.continueButton,
             serviceArea ? styles.continueButtonActive : styles.continueButtonDisabled
           ]}
           onPress={handleProceedToDetails}
           disabled={!serviceArea}
           activeOpacity={0.8}
         >
           <Text style={[
             styles.continueButtonText,
             serviceArea ? styles.continueButtonTextActive : styles.continueButtonTextDisabled
           ]}>
             Continue to Details
           </Text>
         </TouchableOpacity>
       </View>
     </View>
   );

   return (
     <SafeAreaView style={styles.container}>
       {/* Header */}
       <View style={styles.header}>
         <TouchableOpacity onPress={currentStep === 1 ? () => router.back() : handlePreviousStep}>
           <ArrowLeft size={24} color="#1D1D1F" />
         </TouchableOpacity>
         <Text style={styles.headerTitle}>Create Service</Text>
         <View style={{ width: 24 }} />
       </View>

       {/* Step Indicator */}
       {renderStepIndicator()}

       {/* Content */}
       {currentStep === 1 ? renderBasicInfoStep() : renderServiceAreaStep()}
     </SafeAreaView>
   );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  characterCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  textInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1D1D1F',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  photoUploadContainer: {
    height: 150,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 16,
    color: '#1D1D1F',
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  listButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  listButtonActive: {
    backgroundColor: '#007AFF',
  },
  listButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  listButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listButtonTextActive: {
    color: 'white',
  },

  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#000',
  },
  dropdownPlaceholder: {
    color: '#8E8E93',
  },
  dropdownArrow: {
    fontSize: 14,
    color: '#8E8E93',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  dropdownItemSelected: {
    backgroundColor: '#007AFF10',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#000',
  },
  dropdownItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  // Compact styles for minimized form
  compactFieldContainer: {
    marginBottom: 16,
  },
  compactFieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
    marginBottom: 6,
  },
  compactTextInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1D1D1F',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  compactTextArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  compactDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  compactDropdownText: {
    fontSize: 15,
    color: '#1D1D1F',
  },
  compactDropdownPlaceholder: {
    color: '#8E8E93',
  },
  compactDropdownArrow: {
    fontSize: 12,
    color: '#8E8E93',
  },
  compactDropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  compactDropdownScrollView: {
    maxHeight: 150,
  },
  compactDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  compactDropdownItemSelected: {
    backgroundColor: '#007AFF10',
  },
  compactDropdownItemText: {
    fontSize: 15,
    color: '#1D1D1F',
  },
  compactDropdownItemTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  continueButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonActive: {
    backgroundColor: '#007AFF',
  },
  continueButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextActive: {
    color: '#FFFFFF',
  },
  continueButtonTextDisabled: {
    color: '#8E8E93',
  },
  // Step indicator styles
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#007AFF',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  stepNumberActive: {
    color: 'white',
  },
  stepLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 10,
  },
  // Header styles
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  // Service area styles
  serviceAreaContainer: {
    flex: 1,
    position: 'relative',
  },
  serviceAreaScrollView: {
    flex: 1,
  },
  serviceAreaScrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  serviceAreaButtons: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});