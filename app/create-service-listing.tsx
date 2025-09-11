import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, Upload, Camera, ImageIcon, MapPin, Sparkles } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceService } from '@/lib/service-service';
import { ImageService } from '@/lib/image-service';
import { Colors } from '@/constants/Colors';
import ServiceAreaPicker from '@/components/ServiceAreaPicker';
import AIDescriptionModal from '@/components/AIDescriptionModal';
import AIServiceTypeSelector from '@/components/AIServiceTypeSelector';
import AIImageGenerationModal from '@/components/AIImageGenerationModal';

function getPriceUnitLabel(priceUnit: string): string {
  const unitLabels: { [key: string]: string } = {
    'per_hour': ' per hour',
    'per_day': ' per day',
    'per_week': ' per week',
    'per_month': ' per month',
    'per_year': ' per year',
    'per_item': ' per item',
    'per_project': ' per project',
    'per_session': ' per session',
    'one_time': '',
  };
  return unitLabels[priceUnit] || '';
}



export default function CreateServiceListingScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('');
  const [isDigitalService, setIsDigitalService] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [serviceArea, setServiceArea] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    radius: number;
    description: string;
  } | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showAIImageModal, setShowAIImageModal] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { draftData } = useLocalSearchParams();

  // Load draft data if continuing from draft
  useEffect(() => {
    if (draftData && typeof draftData === 'string') {
      try {
        const parsedDraftData = JSON.parse(draftData);
        setTitle(parsedDraftData.title || '');
        setDescription(parsedDraftData.description || '');
        setSelectedServiceType(parsedDraftData.serviceType || '');
        setIsDigitalService(parsedDraftData.isDigitalService || false);
        setImageUri(parsedDraftData.imageUri || null);
        setServiceArea(parsedDraftData.serviceArea || null);
        setDraftId(parsedDraftData.draftId || null);
        
        // If service area is complete, go to step 2
        if (!parsedDraftData.isDigitalService && parsedDraftData.serviceArea) {
          setCurrentStep(2);
        }
      } catch (error) {
        console.error('Error parsing draft data:', error);
      }
    }
  }, [draftData]);

  // Check verification status on component mount
  useEffect(() => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to create service listings. Would you like to sign in now?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }

    if (!userProfile?.is_service_provider) {
      Alert.alert(
        'Service Provider Registration Required',
        'You need to be a registered service provider to create service listings. Would you like to register now?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          { text: 'Register', onPress: () => router.push('/become-service-provider') }
        ]
      );
      return;
    }

    if (userProfile?.verification_status !== 'verified') {
      const statusMessages = {
        'not_started': 'You need to complete eKYC verification to create service listings.',
        'in_progress': 'Your eKYC verification is still being processed. Please wait for approval before creating service listings.',
        'rejected': 'Your eKYC verification was rejected. Please retry the verification process to create service listings.'
      };

      const actionText = userProfile?.verification_status === 'not_started' ? 'Start Verification' : 'View Status';
      
      Alert.alert(
        'Verification Required',
        statusMessages[userProfile?.verification_status as keyof typeof statusMessages] || 'Verification required to create service listings.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          { text: actionText, onPress: () => router.push('/become-service-provider') }
        ]
      );
      return;
    }
  }, [user, userProfile, router]);

  const handleServiceTypeSelect = (serviceType: string) => {
    setSelectedServiceType(serviceType);
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

  const handleAIDescriptionSelect = (aiDescription: string) => {
    setDescription(aiDescription);
  };

  const handleAIImageGenerated = (imageUrl: string) => {
    setImageUri(imageUrl);
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
          const uploadResult = await ImageService.uploadServiceImage(
            asset.uri,
            asset.base64,
            user.id
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
          const uploadResult = await ImageService.uploadServiceImage(
            asset.uri,
            asset.base64,
            user.id
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
      if (!selectedServiceType.trim()) {
        Alert.alert('Error', 'Please select a service type');
        return;
      }

      // If it's a digital service, skip service area and go directly to details
      if (isDigitalService) {
        handleProceedToDetailsDirectly();
      } else {
        setCurrentStep(2);
      }
    }
  };

  const handleProceedToDetailsDirectly = () => {
    // Navigate to detailed service listing without service area for digital services
    const serviceData = {
      title: title.trim(),
      description: description.trim(),
      serviceType: selectedServiceType.trim(),
      isDigitalService: isDigitalService,
      imageUri: imageUri || undefined,
      serviceArea: null, // No service area needed for digital services
    };

    router.push({
      pathname: '/detailed-service-listing',
      params: {
        serviceData: JSON.stringify(serviceData)
      }
    });
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
      serviceType: selectedServiceType.trim(),
      isDigitalService: isDigitalService,
      imageUri: imageUri || undefined,
      serviceArea: serviceArea,
      draftId: draftId, // Pass draft ID if continuing from draft
    };

    router.push({
      pathname: '/detailed-service-listing',
      params: {
        serviceData: JSON.stringify(serviceData)
      }
    });
  };

  const handleSaveAsDraft = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save drafts');
      return;
    }

    // Validate minimum required fields for draft
    if (!title.trim()) {
      Alert.alert('Draft Save Error', 'Please enter a service title before saving as draft');
      return;
    }

    setIsSavingDraft(true);

    try {
      const draftData = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || '',
        category_name: selectedServiceType.trim() || '',
        is_digital_service: isDigitalService,
        image_url: imageUri || '',
        price: 0, // Default price for draft
        currency: 'RM',
        // Service area data (only if not digital service and area is selected)
        ...(serviceArea && !isDigitalService && {
          latitude: serviceArea.latitude,
          longitude: serviceArea.longitude,
          location: serviceArea.address,
          service_area_radius: serviceArea.radius,
          service_area_description: serviceArea.description,
        }),
      };

      let result;
      if (draftId) {
        // Update existing draft
        result = await ServiceService.updateDraft(draftId, draftData);
      } else {
        // Create new draft
        result = await ServiceService.saveDraft(draftData);
      }

      if (result) {
        setDraftId(result.id);
        Alert.alert(
          'Draft Saved',
          'Your service has been saved as a draft. You can continue editing it later from your profile.',
          [
            { text: 'Continue Editing', style: 'default' },
            { 
              text: 'Go to Profile', 
              onPress: () => router.push('/(tabs)/profile'),
              style: 'default'
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save draft. Please try again.');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepContainer}>
        <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
          <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
        </View>
        <Text style={styles.stepLabel}>Basic Info</Text>
      </View>
      {!isDigitalService && (
        <>
          <View style={styles.stepLine} />
          <View style={styles.stepContainer}>
            <View style={[styles.stepCircle, currentStep >= 2 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
            </View>
            <Text style={styles.stepLabel}>Service Area</Text>
          </View>
        </>
      )}
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
           <View style={styles.descriptionHeader}>
             <Text style={styles.compactFieldLabel}>Description *</Text>
             <TouchableOpacity
               style={[
                 styles.aiButton,
                 !title.trim() && styles.aiButtonDisabled
               ]}
               onPress={() => {
                 if (!title.trim()) {
                   Alert.alert('AI Tool', 'Please enter a service title first to generate descriptions');
                   return;
                 }
                 setShowAIModal(true);
               }}
             >
               <Text style={[
                 styles.aiButtonText,
                 !title.trim() && styles.aiButtonTextDisabled
               ]}>
                 ✨ AI Tool
               </Text>
             </TouchableOpacity>
           </View>
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

         {/* Service Type Selection */}
         <View style={styles.compactFieldContainer}>
           <Text style={styles.compactFieldLabel}>Service Type *</Text>
           <TouchableOpacity 
             style={styles.compactDropdownButton} 
             onPress={() => setShowServiceTypeModal(true)}
           >
             <Text style={[
               styles.compactDropdownText,
               !selectedServiceType && styles.compactDropdownPlaceholder
             ]}>
               {selectedServiceType || 'Select Service Type'}
             </Text>
             <Text style={styles.compactDropdownArrow}>▼</Text>
           </TouchableOpacity>
         </View>

         {/* Digital Service Checkbox */}
         <View style={styles.compactFieldContainer}>
           <TouchableOpacity 
             style={styles.checkboxContainer}
             onPress={() => setIsDigitalService(!isDigitalService)}
             activeOpacity={0.7}
           >
             <View style={[
               styles.checkbox,
               isDigitalService && styles.checkboxChecked
             ]}>
               {isDigitalService && (
                 <Text style={styles.checkmark}>✓</Text>
               )}
             </View>
             <Text style={styles.checkboxLabel}>Digital Service</Text>
           </TouchableOpacity>
           <Text style={styles.checkboxDescription}>
             Check this if your service is delivered digitally (online, remote work, digital products, etc.)
           </Text>
         </View>

         {/* Service Image */}
         <View style={styles.compactFieldContainer}>
           <View style={styles.imageHeader}>
             <Text style={styles.compactFieldLabel}>Service Image</Text>
             <TouchableOpacity
               style={[
                 styles.aiButton,
                 (!title.trim() || !description.trim()) && styles.aiButtonDisabled
               ]}
               onPress={() => {
                 if (!title.trim() || !description.trim()) {
                   Alert.alert('AI Image Generation', 'Please enter service title and description first to generate an image');
                   return;
                 }
                 setShowAIImageModal(true);
               }}
             >
               <Text style={[
                 styles.aiButtonText,
                 (!title.trim() || !description.trim()) && styles.aiButtonTextDisabled
               ]}>
                 🎨 AI Generate
               </Text>
             </TouchableOpacity>
           </View>
           
           {imageUri ? (
             <View style={styles.imagePreviewContainer}>
               <Image source={{ uri: imageUri }} style={styles.imagePreview} />
               <TouchableOpacity
                 style={styles.removeImageButton}
                 onPress={() => setImageUri(null)}
               >
                 <Text style={styles.removeImageButtonText}>Remove</Text>
               </TouchableOpacity>
             </View>
           ) : (
             <TouchableOpacity
               style={styles.imageUploadButton}
               onPress={handlePhotoUpload}
               disabled={isUploading}
             >
               {isUploading ? (
                 <Text style={styles.imageUploadButtonText}>Uploading...</Text>
               ) : (
                 <>
                   <ImageIcon size={24} color={Colors.primary.main} />
                   <Text style={styles.imageUploadButtonText}>Upload Image</Text>
                 </>
               )}
             </TouchableOpacity>
           )}
         </View>

         {/* Action Buttons */}
         <View style={styles.actionButtonsContainer}>
           {/* Save as Draft Button */}
           <TouchableOpacity 
             style={[
               styles.draftButton,
               title.trim() ? styles.draftButtonActive : styles.draftButtonDisabled
             ]} 
             onPress={handleSaveAsDraft}
             disabled={!title.trim() || isSavingDraft}
           >
             <Text style={[
               styles.draftButtonText,
               title.trim() ? styles.draftButtonTextActive : styles.draftButtonTextDisabled
             ]}>
               {isSavingDraft ? 'Saving...' : 'Save as Draft'}
             </Text>
           </TouchableOpacity>

           {/* Continue Button */}
           <TouchableOpacity 
             style={[
               styles.continueButton, 
               (title.trim() && description.trim() && selectedServiceType.trim()) 
                 ? styles.continueButtonActive 
                 : styles.continueButtonDisabled
             ]} 
             onPress={handleNextStep}
             disabled={!title.trim() || !description.trim() || !selectedServiceType.trim()}
           >
             <Text style={[
               styles.continueButtonText,
               (title.trim() && description.trim() && selectedServiceType.trim()) 
                 ? styles.continueButtonTextActive 
                 : {}
             ]}>
               {isDigitalService ? 'Continue to Details' : 'Next: Service Area'}
             </Text>
           </TouchableOpacity>
         </View>
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
             styles.draftButton,
             styles.draftButtonSmall
           ]} 
           onPress={handleSaveAsDraft}
           disabled={isSavingDraft}
           activeOpacity={0.8}
         >
           <Text style={styles.draftButtonTextSmall}>
             {isSavingDraft ? 'Saving...' : 'Save Draft'}
           </Text>
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

       {/* AI Description Modal */}
       <AIDescriptionModal
         visible={showAIModal}
         onClose={() => setShowAIModal(false)}
         serviceTitle={title}
         onSelectDescription={handleAIDescriptionSelect}
       />

       {/* AI Service Type Selection Modal */}
       <AIServiceTypeSelector
         visible={showServiceTypeModal}
         onClose={() => setShowServiceTypeModal(false)}
         selectedServiceType={selectedServiceType}
         onServiceTypeChange={handleServiceTypeSelect}
         serviceTitle={title}
         serviceDescription={description}
       />

       {/* AI Image Generation Modal */}
       <AIImageGenerationModal
         visible={showAIImageModal}
         onClose={() => setShowAIImageModal(false)}
         onImageGenerated={handleAIImageGenerated}
         serviceTitle={title}
         serviceDescription={description}
         serviceCategory={selectedServiceType}
       />
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
  // AI Tool styles
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  aiButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  aiButtonTextDisabled: {
    color: '#8E8E93',
  },
  aiButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  // Image section styles
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  removeImageButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  imageUploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  // Checkbox styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  checkboxDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 32,
    lineHeight: 18,
  },
  // Action buttons container
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  // Draft button styles
  draftButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  draftButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#FFFFFF',
  },
  draftButtonDisabled: {
    borderColor: '#E5E5EA',
    backgroundColor: '#F8F9FA',
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  draftButtonTextActive: {
    color: '#007AFF',
  },
  draftButtonTextDisabled: {
    color: '#8E8E93',
  },
  // Small draft button for service area step
  draftButtonSmall: {
    flex: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 100,
  },
  draftButtonTextSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },

});