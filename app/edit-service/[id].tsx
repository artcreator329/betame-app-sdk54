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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Upload, Camera, ImageIcon, Trash2 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceService, Service } from '@/lib/service-service';
import { ImageService } from '@/lib/image-service';
import { Colors } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import ServiceAreaPicker from '@/components/ServiceAreaPicker';

export default function EditServiceScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [serviceArea, setServiceArea] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    radius: number;
    description: string;
  } | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [service, setService] = useState<Service | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showServiceAreaPicker, setShowServiceAreaPicker] = useState(false);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  // Load service data
  useEffect(() => {
    const loadService = async () => {
      if (!id) {
        Alert.alert('Error', 'Service ID not found');
        router.back();
        return;
      }

      try {
        setIsLoading(true);
        const serviceData = await ServiceService.getServiceById(id);
        
        if (!serviceData) {
          Alert.alert('Error', 'Service not found');
          router.back();
          return;
        }

        // Check if user owns this service
        if (serviceData.user_id !== user?.id) {
          Alert.alert('Error', 'You can only edit your own services');
          router.back();
          return;
        }

        setService(serviceData);
        setTitle(serviceData.title);
        setDescription(serviceData.description);
        setSelectedCategories(serviceData.category_name ? [serviceData.category_name] : []);
        if (serviceData.latitude && serviceData.longitude) {
          setServiceArea({
            latitude: serviceData.latitude,
            longitude: serviceData.longitude,
            address: serviceData.location || '',
            radius: serviceData.service_area_radius || 10,
            description: serviceData.service_area_description || ''
          });
        }
        setImageUri(serviceData.image_url || null);
      } catch (error) {
        console.error('Error loading service:', error);
        Alert.alert('Error', 'Failed to load service data');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    loadService();
  }, [id, user?.id, router]);

  const getCategoryDisplayText = (): string => {
    if (selectedCategories.length === 0) {
      return 'Select Category';
    }
    if (selectedCategories.length === 1) {
      return selectedCategories[0];
    }
    return `${selectedCategories.length} Categories`;
  };

  const getServiceAreaDisplayText = (): string => {
    if (!serviceArea) {
      return 'Set Service Area';
    }
    return serviceArea.address || `${serviceArea.latitude.toFixed(4)}, ${serviceArea.longitude.toFixed(4)}`;
  };

  const handleServiceAreaSelect = (area: {
    latitude: number;
    longitude: number;
    address: string;
    radius: number;
    description: string;
  }) => {
    setServiceArea(area);
    setShowServiceAreaPicker(false);
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

  const takePhoto = async () => {
    if (!user?.id) return;
    
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }

      setIsUploading(true);
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (!asset.base64) {
          Alert.alert('Error', 'Failed to process image');
          setIsUploading(false);
          return;
        }

        // Upload image to service-images bucket
        const uploadResult = await ImageService.uploadImage(
          asset.uri,
          asset.base64,
          user.id,
          'service-images'
        );
        
        if (uploadResult.success && uploadResult.url) {
          setImageUri(uploadResult.url);
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload image. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const pickImage = async () => {
    if (!user?.id) return;
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required to select images.');
        return;
      }

      setIsUploading(true);
      
      // Use ImageService.pickImage method
      const result = await ImageService.pickImage();
      
      if (!result || result.canceled || !result.assets || result.assets.length === 0) {
        setIsUploading(false);
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Failed to process image');
        setIsUploading(false);
        return;
      }

      // Upload image to service-images bucket
      const uploadResult = await ImageService.uploadImage(
        asset.uri,
        asset.base64,
        user.id,
        'service-images'
      );
      
      if (uploadResult.success && uploadResult.url) {
        setImageUri(uploadResult.url);
      } else {
        Alert.alert('Error', uploadResult.error || 'Failed to upload image. Please try again.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user?.id) return;
    
    try {
      setIsUploading(true);
      
      // Convert URI to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        
        // Upload image to service-images bucket
        const uploadResult = await ImageService.uploadImage(
          uri,
          base64Data,
          user.id,
          'service-images'
        );
        
        if (uploadResult.success && uploadResult.url) {
          setImageUri(uploadResult.url);
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload image. Please try again.');
        }
        setIsUploading(false);
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
      setIsUploading(false);
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
            takePhoto();
          } else if (buttonIndex === 2) {
            pickImage();
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

  const handleUpdate = async () => {
    if (!service || !user?.id) return;
    
    if (!title.trim() || !description.trim() || selectedCategories.length === 0 || !serviceArea) {
      Alert.alert('Error', 'Please fill in all required fields including category and service area');
      return;
    }

    try {
      setIsUpdating(true);
      
      const updateData = {
        title: title.trim(),
        description: description.trim(),
        category_name: selectedCategories[0], // Use first selected category
        latitude: serviceArea.latitude,
        longitude: serviceArea.longitude,
        location: serviceArea.address,
        service_area_radius: serviceArea.radius,
        service_area_description: serviceArea.description,
        image_url: imageUri || undefined,
      };

      const success = await ServiceService.updateService(service.id!, updateData);
      
      if (success) {
        Alert.alert('Success', 'Service updated successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to update service. Please try again.');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!service) return;

    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const success = await ServiceService.deleteService(service.id!);
              
              if (success) {
                Alert.alert('Success', 'Service deleted successfully!', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                Alert.alert('Error', 'Failed to delete service. Please try again.');
              }
            } catch (error) {
              console.error('Error deleting service:', error);
              Alert.alert('Error', 'Failed to delete service. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1D1D1F" />
          <Text style={styles.loadingText}>Loading service...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Service</Text>
        <TouchableOpacity onPress={handleDelete} disabled={isDeleting}>
          {isDeleting ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <Trash2 size={24} color="#FF3B30" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.form}>
          {/* Photo Upload */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Photo</Text>
            <TouchableOpacity 
              style={styles.photoUploadContainer} 
              onPress={handlePhotoUpload}
              disabled={isUploading}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  {isUploading ? (
                    <ActivityIndicator size="large" color="#8E8E93" />
                  ) : (
                    <>
                      <ImageIcon size={40} color="#8E8E93" />
                      <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                    </>
                  )}
                </View>
              )}
              {isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color="white" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Title (Required)</Text>
              <Text style={styles.characterCount}>{title.length}/100</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={handleTitleChange}
              placeholder="Add a title to describe your service"
              placeholderTextColor="#8E8E93"
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Description</Text>
              <Text style={styles.characterCount}>{description.length}/1000</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={handleDescriptionChange}
              placeholder="Simple brief about your service"
              placeholderTextColor="#8E8E93"
              multiline={true}
              textAlignVertical="top"
              maxLength={1000}
            />
          </View>

          {/* Categories */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Categories</Text>
            <TouchableOpacity 
              style={styles.categoryButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategories.length === 0 && styles.categoryButtonPlaceholder
              ]}>
                {selectedCategories.length > 0 
                  ? `${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'} selected`
                  : 'Select Categories'
                }
              </Text>
              <Text style={styles.categoryButtonArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Service Area */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Service Area</Text>
            <TouchableOpacity 
              style={styles.serviceAreaButton}
              onPress={() => setShowServiceAreaPicker(true)}
            >
              <Text style={[
                styles.serviceAreaButtonText,
                !serviceArea && styles.serviceAreaButtonPlaceholder
              ]}>
                {getServiceAreaDisplayText()}
              </Text>
              <Text style={styles.serviceAreaButtonArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Update Button */}
          <TouchableOpacity 
            style={[
              styles.updateButton, 
              (title.trim() && description.trim() && selectedCategories.length > 0 && serviceArea && !isUpdating) 
                ? styles.updateButtonActive 
                : styles.updateButtonDisabled
            ]} 
            onPress={handleUpdate}
            disabled={isUpdating || !title.trim() || !description.trim() || selectedCategories.length === 0 || !serviceArea}
          >
            <Text style={[
              styles.updateButtonText,
              (title.trim() && description.trim() && selectedCategories.length > 0 && serviceArea && !isUpdating) 
                ? styles.updateButtonTextActive 
                : {}
            ]}>
              {isUpdating ? 'Updating...' : 'Update Service'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Category Selection Modal */}
      <CategorySelectionModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
      />

      {/* Service Area Picker Modal */}
      {showServiceAreaPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowServiceAreaPicker(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Service Area</Text>
              <View style={{ width: 50 }} />
            </View>
            <ServiceAreaPicker
               onLocationSelect={handleServiceAreaSelect}
               initialLocation={serviceArea || undefined}
             />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  characterCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1D1D1F',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },
  photoUploadContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    height: 200,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    overflow: 'hidden',
    position: 'relative',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceTypeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 4,
  },
  priceTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  priceTypeButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priceTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  priceTypeTextActive: {
    color: '#1D1D1F',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1D1D1F',
  },
  priceDisplayContainer: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
  },
  priceDisplayText: {
    fontSize: 14,
    color: '#34C759',
  },
  priceDisplayAmount: {
    fontWeight: '600',
  },
  priceHelperText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
    lineHeight: 16,
  },
  selectionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionButtonText: {
    fontSize: 16,
    color: '#1D1D1F',
    flex: 1,
  },
  selectionButtonPlaceholder: {
    color: '#8E8E93',
  },
  helperText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
    lineHeight: 16,
  },
  serviceAreaInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  serviceAreaText: {
    fontSize: 14,
    color: '#1D1D1F',
    marginBottom: 4,
  },
  updateButton: {
    backgroundColor: Colors.text.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  updateButtonActive: {
    backgroundColor: Colors.primary.main,
  },
  updateButtonDisabled: {
    backgroundColor: Colors.text.secondary,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.white,
  },
  updateButtonTextActive: {
    color: Colors.text.white,
  },
  categoryButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryButtonText: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  categoryButtonPlaceholder: {
    color: '#8E8E93',
  },
  categoryButtonArrow: {
    fontSize: 16,
    color: '#8E8E93',
  },
  serviceAreaButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceAreaButtonText: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  serviceAreaButtonPlaceholder: {
    color: '#8E8E93',
  },
  serviceAreaButtonArrow: {
    fontSize: 16,
    color: '#8E8E93',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
    flex: 1,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  modalCancelText: {
    fontSize: 16,
    color: Colors.primary.main,
  },
});