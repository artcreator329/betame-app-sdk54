import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Upload, Camera, ImageIcon, Trash2, Plus } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceService, Service } from '@/lib/service-service';
import { ImageService } from '@/lib/image-service';
import { Colors } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import AIServiceTypeSelector from '@/components/AIServiceTypeSelector';
import ServiceAreaPicker from '@/components/ServiceAreaPicker';
import AIDescriptionModal from '@/components/AIDescriptionModal';
import AIPricingSuggestions from '@/components/AIPricingSuggestions';

interface ServiceVariant {
  id: string;
  title: string;
  description: string;
  price: number;
  priceType: 'fixed' | 'starting';
  priceUnit: 'per_hour' | 'per_day' | 'per_week' | 'per_month' | 'per_year' | 'per_item' | 'per_project' | 'per_session' | 'one_time';
  isExisting?: boolean; // Track if this is an existing variant or new one
  serviceId?: string; // For existing variants
}

export default function EditServiceScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  const [isDigitalService, setIsDigitalService] = useState(false);
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
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [showServiceAreaPicker, setShowServiceAreaPicker] = useState(false);
  const [showPriceUnitModal, setShowPriceUnitModal] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [serviceVariants, setServiceVariants] = useState<ServiceVariant[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [currentVariantId, setCurrentVariantId] = useState<string | null>(null);
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
        setSelectedServiceType(serviceData.category_name || '');
        setIsDigitalService(serviceData.is_digital_service || false);
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

        // Load service variants
        await loadServiceVariants(serviceData);
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

  const loadServiceVariants = async (mainService: Service) => {
    try {
      setIsLoadingVariants(true);
      
      // Create main service variant
      const mainVariant: ServiceVariant = {
        id: mainService.id || 'main',
        title: mainService.title,
        description: mainService.description,
        price: mainService.price || 0,
        priceType: 'starting', // Default, could be enhanced to store this in DB
        priceUnit: 'one_time', // Default, could be enhanced to store this in DB
        isExisting: true,
        serviceId: mainService.id,
      };

      const variants = [mainVariant];

      // Load child variants from database
      const childVariants = await ServiceService.getServiceVariants(mainService.id!);
      
      if (childVariants && childVariants.length > 0) {
        const mappedVariants = childVariants.map((variant: Service) => ({
          id: variant.id || Date.now().toString(),
          title: variant.title,
          description: variant.description,
          price: variant.price || 0,
          priceType: 'starting' as const,
          priceUnit: 'one_time' as const,
          isExisting: true,
          serviceId: variant.id,
        }));
        variants.push(...mappedVariants);
      }
      setServiceVariants(variants);
    } catch (error) {
      console.error('Error loading service variants:', error);
    } finally {
      setIsLoadingVariants(false);
    }
  };

  const addServiceVariant = () => {
    const newVariant: ServiceVariant = {
      id: Date.now().toString(),
      title: '',
      description: '',
      price: 0,
      priceType: 'starting',
      priceUnit: 'per_hour',
      isExisting: false,
    };
    setServiceVariants([...serviceVariants, newVariant]);
  };

  const updateServiceVariant = (id: string, field: keyof ServiceVariant, value: any) => {
    setServiceVariants(variants =>
      variants.map(variant =>
        variant.id === id ? { ...variant, [field]: value } : variant
      )
    );
  };

  const removeServiceVariant = (id: string) => {
    // Prevent removing the main service (first variant)
    const variantIndex = serviceVariants.findIndex(v => v.id === id);
    if (variantIndex === 0) {
      Alert.alert('Error', 'Cannot remove the main service');
      return;
    }
    
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this service variant?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setServiceVariants(variants => variants.filter(variant => variant.id !== id));
          },
        },
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
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    return numericValue;
  };

  const handlePriceChange = (id: string, text: string) => {
    const formattedPrice = formatPrice(text);
    const numPrice = parseFloat(formattedPrice) || 0;
    updateServiceVariant(id, 'price', numPrice);
  };

  const getPriceUnitLabel = (unit: string): string => {
    const unitLabels: { [key: string]: string } = {
      'per_hour': 'per hour',
      'per_day': 'per day',
      'per_week': 'per week',
      'per_month': 'per month',
      'per_year': 'per year',
      'per_item': 'per item',
      'per_project': 'per project',
      'per_session': 'per session',
      'one_time': '',
    };
    return unitLabels[unit] || '';
  };

  const handlePriceUnitSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
    setShowPriceUnitModal(true);
  };

  const handlePriceUnitChange = (unit: string) => {
    if (selectedVariantId) {
      updateServiceVariant(selectedVariantId, 'priceUnit', unit);
    }
    setShowPriceUnitModal(false);
    setSelectedVariantId(null);
  };

  const handleAIDescriptionSelect = (description: string) => {
    if (currentVariantId) {
      updateServiceVariant(currentVariantId, 'description', description);
    }
  };

  const openAIModal = (variantId: string) => {
    setCurrentVariantId(variantId);
    setShowAIModal(true);
  };

  const getCurrentVariantTitle = (): string => {
    if (!currentVariantId) return '';
    const variant = serviceVariants.find(v => v.id === currentVariantId);
    return variant?.title || '';
  };

  const getServiceTypeDisplayText = (): string => {
    return selectedServiceType || 'Select Service Type';
  };

  const handleServiceTypeSelect = (serviceType: string) => {
    setSelectedServiceType(serviceType);
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

  const validateVariants = (): boolean => {
    // Skip validation for main service (index 0) as it's managed separately
    for (let i = 1; i < serviceVariants.length; i++) {
      const variant = serviceVariants[i];
      if (!variant.title.trim()) {
        Alert.alert('Error', 'Please enter a title for all service variants');
        return false;
      }
      if (!variant.description.trim()) {
        Alert.alert('Error', 'Please enter a description for all service variants');
        return false;
      }
      if (variant.price <= 0) {
        Alert.alert('Error', 'Please enter a valid price for all service variants');
        return false;
      }
    }
    return true;
  };

  const handleUpdate = async () => {
    if (!service || !user?.id) return;
    
    if (!title.trim() || !description.trim() || !selectedServiceType.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isDigitalService && !serviceArea) {
      Alert.alert('Error', 'Please set a service area for non-digital services');
      return;
    }

    if (!validateVariants()) {
      return;
    }

    try {
      setIsUpdating(true);
      
      const updateData = {
        title: title.trim(),
        description: description.trim(),
        category_name: selectedServiceType,
        is_digital_service: isDigitalService,
        latitude: isDigitalService ? null : serviceArea?.latitude,
        longitude: isDigitalService ? null : serviceArea?.longitude,
        location: isDigitalService ? null : serviceArea?.address,
        service_area_radius: isDigitalService ? null : serviceArea?.radius,
        service_area_description: isDigitalService ? null : serviceArea?.description,
        image_url: imageUri || undefined,
      };

      const success = await ServiceService.updateService(service.id!, updateData);
      
      if (success) {
        // Handle service variants
        await handleVariantsUpdate();
        
        Alert.alert('Success', 'Service and variants updated successfully!', [
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

  const handleVariantsUpdate = async () => {
    if (!service || !user?.id) return;

    try {
      // Process variants (skip main service at index 0)
      for (let i = 1; i < serviceVariants.length; i++) {
        const variant = serviceVariants[i];
        
        if (variant.isExisting && variant.serviceId) {
          // Update existing variant
          const updateData = {
            title: variant.title.trim(),
            description: variant.description.trim(),
            price: variant.price,
            category_name: selectedServiceType,
            is_digital_service: isDigitalService,
            latitude: isDigitalService ? null : serviceArea?.latitude,
            longitude: isDigitalService ? null : serviceArea?.longitude,
            location: isDigitalService ? null : serviceArea?.address,
            service_area_radius: isDigitalService ? null : serviceArea?.radius,
            service_area_description: isDigitalService ? null : serviceArea?.description,
          };
          await ServiceService.updateService(variant.serviceId, updateData);
        } else if (!variant.isExisting) {
          // Create new variant
          const variantData = {
            user_id: user.id,
            title: variant.title.trim(),
            description: variant.description.trim(),
            price: variant.price,
            currency: 'RM',
            category_name: selectedServiceType,
            is_digital_service: isDigitalService,
            location: isDigitalService ? null : serviceArea?.address,
            latitude: isDigitalService ? null : serviceArea?.latitude,
            longitude: isDigitalService ? null : serviceArea?.longitude,
            service_area_radius: isDigitalService ? null : serviceArea?.radius,
            service_area_description: isDigitalService ? null : serviceArea?.description,
            parent_service_id: service.id,
            rating: 0,
            review_count: 0,
            is_nearby: isDigitalService ? false : true,
            is_trending: false,
          };
          await ServiceService.createService(variantData);
        }
      }

      // Handle deleted variants (variants that were removed from the UI)
      // This would require tracking which variants were deleted, which is a more complex implementation
      // For now, we'll keep it simple and only handle additions and updates
    } catch (error) {
      console.error('Error updating variants:', error);
      // Don't throw error here to avoid breaking the main update flow
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

          {/* Service Type */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Service Type</Text>
            <TouchableOpacity 
              style={styles.categoryButton}
              onPress={() => setShowServiceTypeModal(true)}
            >
              <Text style={[
                styles.categoryButtonText,
                !selectedServiceType && styles.categoryButtonPlaceholder
              ]}>
                {getServiceTypeDisplayText()}
              </Text>
              <Text style={styles.categoryButtonArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Digital Service Checkbox */}
          <View style={styles.fieldContainer}>
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

          {/* Service Area - Only show for non-digital services */}
          {!isDigitalService && (
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
          )}

          {/* Service Variants */}
          <View style={styles.fieldContainer}>
            <View style={styles.variantsHeader}>
              <Text style={styles.fieldLabel}>Service Variants</Text>
              <TouchableOpacity 
                style={styles.addVariantButton}
                onPress={addServiceVariant}
              >
                <Plus size={16} color="#007AFF" />
                <Text style={styles.addVariantText}>Add Variant</Text>
              </TouchableOpacity>
            </View>
            
            {isLoadingVariants ? (
              <View style={styles.variantsLoading}>
                <ActivityIndicator size="small" color="#8E8E93" />
                <Text style={styles.variantsLoadingText}>Loading variants...</Text>
              </View>
            ) : (
              <View style={styles.variantsList}>
                {serviceVariants.map((variant, index) => (
                  <View key={variant.id} style={styles.variantCard}>
                    <View style={styles.variantHeader}>
                      <Text style={styles.variantTitle}>
                        {index === 0 ? 'Main Service' : `Variant ${index}`}
                      </Text>
                      {index > 0 && (
                        <TouchableOpacity 
                          onPress={() => removeServiceVariant(variant.id)}
                          style={styles.removeVariantButton}
                        >
                          <Trash2 size={16} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {/* Variant Title */}
                    <View style={styles.variantFieldContainer}>
                      <Text style={styles.variantFieldLabel}>Title</Text>
                      <TextInput
                        style={[
                          styles.variantInput,
                          index === 0 && styles.variantInputDisabled
                        ]}
                        value={variant.title}
                        onChangeText={(text) => updateServiceVariant(variant.id, 'title', text)}
                        placeholder="Enter variant title"
                        placeholderTextColor="#8E8E93"
                        editable={index > 0} // Main service title is managed separately
                      />
                    </View>
                    
                    {/* Variant Description */}
                    <View style={styles.variantFieldContainer}>
                      <View style={styles.descriptionHeader}>
                        <Text style={styles.variantFieldLabel}>Description</Text>
                        {index > 0 && (
                          <TouchableOpacity
                            style={[
                              styles.aiButton,
                              !variant.title.trim() && styles.aiButtonDisabled
                            ]}
                            onPress={() => {
                              if (!variant.title.trim()) {
                                Alert.alert('AI Tool', 'Please enter a variant title first to generate descriptions');
                                return;
                              }
                              openAIModal(variant.id);
                            }}
                          >
                            <Text style={[
                              styles.aiButtonText,
                              !variant.title.trim() && styles.aiButtonTextDisabled
                            ]}>
                              ✨ AI Tool
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <TextInput
                        style={[
                          styles.variantInput,
                          styles.variantTextArea,
                          index === 0 && styles.variantInputDisabled
                        ]}
                        value={variant.description}
                        onChangeText={(text) => updateServiceVariant(variant.id, 'description', text)}
                        placeholder="Enter variant description"
                        placeholderTextColor="#8E8E93"
                        multiline={true}
                        textAlignVertical="top"
                        editable={index > 0} // Main service description is managed separately
                      />
                    </View>
                    
                    {/* Variant Price - Hidden for Main Service */}
                    {index > 0 && (
                      <View style={styles.variantPriceContainer}>
                        <View style={styles.variantFieldContainer}>
                          <Text style={styles.variantFieldLabel}>Price (RM)</Text>
                          <TextInput
                            style={styles.variantPriceInput}
                            value={variant.price.toString()}
                            onChangeText={(text) => handlePriceChange(variant.id, text)}
                            placeholder="0.00"
                            placeholderTextColor="#8E8E93"
                            keyboardType="decimal-pad"
                          />
                          
                          {/* AI Pricing Suggestions */}
                          <AIPricingSuggestions
                            serviceTitle={variant.title}
                            serviceDescription={variant.description}
                            priceUnit={variant.priceUnit}
                            industry={selectedServiceType}
                            currentPrice={variant.price}
                            onPriceSelect={(price) => updateServiceVariant(variant.id, 'price', price)}
                          />
                        </View>
                        
                        <View style={styles.variantFieldContainer}>
                          <Text style={styles.variantFieldLabel}>Price Unit</Text>
                          <TouchableOpacity 
                            style={styles.priceUnitButton}
                            onPress={() => handlePriceUnitSelect(variant.id)}
                          >
                            <Text style={styles.priceUnitText}>
                              {getPriceUnitLabel(variant.priceUnit) || 'Select unit'}
                            </Text>
                            <Text style={styles.priceUnitArrow}>▼</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Update Button */}
          <TouchableOpacity 
            style={[
              styles.updateButton, 
              (title.trim() && description.trim() && selectedServiceType.trim() && (isDigitalService || serviceArea) && !isUpdating) 
                ? styles.updateButtonActive 
                : styles.updateButtonDisabled
            ]} 
            onPress={handleUpdate}
            disabled={isUpdating || !title.trim() || !description.trim() || !selectedServiceType.trim() || (!isDigitalService && !serviceArea)}
          >
            <Text style={[
              styles.updateButtonText,
              (title.trim() && description.trim() && selectedServiceType.trim() && (isDigitalService || serviceArea) && !isUpdating) 
                ? styles.updateButtonTextActive 
                : {}
            ]}>
              {isUpdating ? 'Updating...' : 'Update Service'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Service Type Selection Modal */}
      <AIServiceTypeSelector
        visible={showServiceTypeModal}
        onClose={() => setShowServiceTypeModal(false)}
        selectedServiceType={selectedServiceType}
        onServiceTypeChange={handleServiceTypeSelect}
        serviceTitle={title}
        serviceDescription={description}
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

      {/* Price Unit Selection Modal */}
      {showPriceUnitModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.priceUnitModalContainer}>
            <View style={styles.priceUnitModalHeader}>
               <Text style={styles.modalTitle}>Select Price Unit</Text>
               <TouchableOpacity 
                 onPress={() => setShowPriceUnitModal(false)}
                 style={styles.closeButton}
               >
                 <Text style={styles.closeButtonText}>✕</Text>
               </TouchableOpacity>
             </View>
            <View style={styles.priceUnitList}>
              {[
                { value: 'per_hour', label: 'Per Hour' },
                { value: 'per_day', label: 'Per Day' },
                { value: 'per_week', label: 'Per Week' },
                { value: 'per_month', label: 'Per Month' },
                { value: 'per_year', label: 'Per Year' },
                { value: 'per_item', label: 'Per Item' },
                { value: 'per_project', label: 'Per Project' },
                { value: 'per_session', label: 'Per Session' },
                { value: 'one_time', label: 'One Time' },
              ].map((unit, index, array) => (
                <TouchableOpacity
                  key={unit.value}
                  style={[
                    styles.priceUnitOption,
                    index === array.length - 1 && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => handlePriceUnitChange(unit.value)}
                >
                  <Text style={styles.priceUnitOptionText}>{unit.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* AI Description Modal */}
      <AIDescriptionModal
        visible={showAIModal}
        onClose={() => setShowAIModal(false)}
        serviceTitle={getCurrentVariantTitle()}
        onSelectDescription={handleAIDescriptionSelect}
      />
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
  // Service Variants Styles
  variantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addVariantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addVariantText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  variantsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  variantsLoadingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  variantsList: {
    gap: 16,
  },
  variantCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  variantTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  removeVariantButton: {
    padding: 4,
  },
  variantFieldContainer: {
    marginBottom: 12,
  },
  variantFieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
    marginBottom: 6,
  },
  variantInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1D1D1F',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  variantInputDisabled: {
    backgroundColor: '#F2F2F7',
    color: '#8E8E93',
  },
  variantTextArea: {
    height: 80,
    paddingTop: 10,
  },
  variantPriceContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  variantPriceInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1D1D1F',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flex: 1,
  },
  priceUnitButton: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  priceUnitText: {
    fontSize: 14,
    color: '#1D1D1F',
  },
  priceUnitArrow: {
     fontSize: 12,
     color: '#8E8E93',
   },
  priceUnitModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 20,
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  priceUnitModalHeader: {
     position: 'relative',
     justifyContent: 'center',
     alignItems: 'center',
     paddingHorizontal: 20,
     paddingVertical: 16,
     borderBottomWidth: 1,
     borderBottomColor: '#F0F0F0',
   },
   closeButton: {
     position: 'absolute',
     top: -14,
     right: -14,
     width: 28,
     height: 28,
     borderRadius: 14,
     backgroundColor: '#F0F0F0',
     justifyContent: 'center',
     alignItems: 'center',
     zIndex: 10,
     shadowColor: '#000',
     shadowOffset: {
       width: 0,
       height: 2,
     },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     elevation: 4,
   },
   closeButtonText: {
     fontSize: 16,
     color: '#666',
     fontWeight: '500',
   },
  priceUnitList: {
    paddingVertical: 8,
  },
  priceUnitOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  priceUnitOptionText: {
    fontSize: 16,
    color: '#1D1D1F',
    textAlign: 'center',
  },
  // AI Tool styles
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  aiButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  aiButtonTextDisabled: {
    color: '#8E8E93',
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
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  checkboxDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 32,
    lineHeight: 18,
  },
 });