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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2, Edit3 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceService } from '@/lib/service-service';
import AIDescriptionModal from '@/components/AIDescriptionModal';

interface ServiceVariant {
  id: string;
  title: string;
  description: string;
  price: number;
  priceType: 'fixed' | 'starting';
  priceUnit: 'per_hour' | 'per_day' | 'per_week' | 'per_month' | 'per_item' | 'per_project' | 'per_session' | 'one_time';
}

interface BasicServiceData {
  title: string;
  description: string;
  price?: number;
  priceType?: 'fixed' | 'starting';
  priceUnit?: 'per_hour' | 'per_day' | 'per_week' | 'per_month' | 'per_item' | 'per_project' | 'per_session' | 'one_time';
  currency?: string;
  imageUri?: string;
  industry?: string;
  serviceArea?: {
    latitude: number;
    longitude: number;
    address: string;
    radius: number;
    description: string;
  };
}

export default function DetailedServiceListingScreen() {
  const [serviceVariants, setServiceVariants] = useState<ServiceVariant[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [mainService, setMainService] = useState<BasicServiceData | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [currentVariantId, setCurrentVariantId] = useState<string | null>(null);
  const router = useRouter();
  const { serviceData } = useLocalSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    if (serviceData && typeof serviceData === 'string') {
      try {
        const parsedData = JSON.parse(serviceData) as BasicServiceData;
        setMainService(parsedData);
        
        // Initialize with the main service as the first variant
        const initialVariant: ServiceVariant = {
          id: '1',
          title: parsedData.title,
          description: parsedData.description,
          price: parsedData.price || 0,
          priceType: parsedData.priceType || 'starting',
          priceUnit: parsedData.priceUnit || 'one_time',
        };
        setServiceVariants([initialVariant]);
      } catch (error) {
        console.error('Error parsing service data:', error);
        Alert.alert('Error', 'Invalid service data received');
        router.back();
      }
    }
  }, [serviceData]);

  const addServiceVariant = () => {
    const newVariant: ServiceVariant = {
      id: Date.now().toString(),
      title: '',
      description: '',
      price: 0,
      priceType: 'starting',
      priceUnit: 'per_hour',
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
    
    setServiceVariants(variants => variants.filter(variant => variant.id !== id));
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

  const getPriceUnitLabel = (unit: string): string => {
    const unitLabels: { [key: string]: string } = {
      'per_hour': 'per hour',
      'per_day': 'per day',
      'per_week': 'per week',
      'per_month': 'per month',
      'per_item': 'per item',
      'per_project': 'per project',
      'per_session': 'per session',
      'one_time': '',
    };
    return unitLabels[unit] || '';
  };

  const validateVariants = (): boolean => {
    // Skip validation for main service (index 0) as it's pre-filled and non-editable
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

  const handleCreateService = async () => {
    if (!user || !mainService) {
      Alert.alert('Error', 'Unable to create service. Please try again.');
      return;
    }

    if (!validateVariants()) {
      return;
    }

    setIsCreating(true);
    try {
      // Create the main service with the first variant as the base
      const firstVariant = serviceVariants[0];
      const mainServiceData = {
        user_id: user.id,
        title: firstVariant.title.trim(),
        description: firstVariant.description.trim(),
        price: firstVariant.price,
        currency: mainService.currency || 'RM',
        image_url: mainService.imageUri || undefined,
        category_name: mainService.industry || 'General',
        location: mainService.serviceArea?.address,
        latitude: mainService.serviceArea?.latitude,
        longitude: mainService.serviceArea?.longitude,
        service_area_radius: mainService.serviceArea?.radius,
        service_area_description: mainService.serviceArea?.description,
        rating: 0,
        review_count: 0,
        is_nearby: true, // Make new services appear in nearby section
        is_trending: false, // New services start as non-trending
      };

      const createdService = await ServiceService.createService(mainServiceData);
      
      if (!createdService) {
        Alert.alert('Error', 'Failed to create service listing. Please try again.');
        return;
      }

      // If there are additional variants, create them as separate services linked to the main one
      if (serviceVariants.length > 1) {
        const additionalVariants = serviceVariants.slice(1);
        for (const variant of additionalVariants) {
          const variantData = {
            user_id: user.id,
            title: `${mainService.title} - ${variant.title.trim()}`,
            description: variant.description.trim(),
            price: variant.price,
            currency: mainService.currency || 'RM',
            image_url: mainService.imageUri || undefined,
            category_name: mainService.industry || 'General',
            location: mainService.serviceArea?.address,
            latitude: mainService.serviceArea?.latitude,
            longitude: mainService.serviceArea?.longitude,
            service_area_radius: mainService.serviceArea?.radius,
            service_area_description: mainService.serviceArea?.description,
            rating: 0,
            review_count: 0,
            parent_service_id: createdService.id, // Link to main service
            is_nearby: true, // Make new service variants appear in nearby section
            is_trending: false, // New service variants start as non-trending
          };

          await ServiceService.createService(variantData);
        }
      }

      Alert.alert(
        'Success', 
        `Service listing created successfully with ${serviceVariants.length} variant${serviceVariants.length > 1 ? 's' : ''}!`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error) {
      console.error('Error creating service:', error);
      Alert.alert('Error', 'Failed to create service listing. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!mainService) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="#000" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detailed Service Setup</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Main Service Info */}
        <View style={styles.mainServiceInfo}>
          <Text style={styles.mainServiceTitle}>{mainService.title}</Text>
          <Text style={styles.mainServiceDescription}>{mainService.description}</Text>
          {mainService.imageUri && (
            <Image source={{ uri: mainService.imageUri }} style={styles.mainServiceImage} />
          )}
        </View>

        {/* Service Variants Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Service Variants</Text>
            <Text style={styles.sectionSubtitle}>
              Create different service options with specific details and pricing
            </Text>
          </View>

          {serviceVariants.map((variant, index) => {
            const isMainService = index === 0;
            return (
              <View key={variant.id} style={[
                styles.variantCard,
                isMainService && styles.mainServiceCard
              ]}>
                <View style={styles.variantHeader}>
                  <Text style={[
                    styles.variantNumber,
                    isMainService && styles.mainServiceNumber
                  ]}>
                    {isMainService ? 'Main Service' : `Service Variant ${index}`}
                  </Text>
                  {!isMainService && (
                    <TouchableOpacity
                      onPress={() => removeServiceVariant(variant.id)}
                      style={styles.removeButton}
                    >
                      <Trash2 color="#ff4444" size={20} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Variant Title */}
                <View style={styles.inputGroup}>
                  <Text style={[
                    styles.label,
                    isMainService && styles.disabledLabel
                  ]}>Service Title *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      isMainService && styles.disabledInput
                    ]}
                    value={variant.title}
                    onChangeText={isMainService ? undefined : (text) => updateServiceVariant(variant.id, 'title', text)}
                    placeholder="e.g., Legal Consultation, Financial Planning"
                    maxLength={100}
                    editable={!isMainService}
                  />
                </View>

                {/* Variant Description */}
                <View style={styles.inputGroup}>
                  <View style={styles.descriptionHeader}>
                    <Text style={[
                      styles.label,
                      isMainService && styles.disabledLabel
                    ]}>Description *</Text>
                    {!isMainService && (
                      <TouchableOpacity
                        style={[
                          styles.aiButton,
                          !variant.title.trim() && styles.aiButtonDisabled
                        ]}
                        onPress={() => {
                          if (!variant.title.trim()) {
                            Alert.alert('AI Tool', 'Please enter a service title first to generate descriptions');
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
                      styles.input,
                      styles.textArea,
                      isMainService && styles.disabledInput
                    ]}
                    value={variant.description}
                    onChangeText={isMainService ? undefined : (text) => updateServiceVariant(variant.id, 'description', text)}
                    placeholder="Describe this specific service variant in detail..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                    editable={!isMainService}
                  />
                </View>

                {/* Only show pricing for service variants, not main service */}
                {!isMainService && (
                  <>
                    {/* Price Type Selection */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Pricing Type</Text>
                      <View style={styles.priceTypeContainer}>
                        <TouchableOpacity
                          style={[
                            styles.priceTypeButton,
                            variant.priceType === 'starting' && styles.priceTypeButtonActive
                          ]}
                          onPress={() => updateServiceVariant(variant.id, 'priceType', 'starting')}
                        >
                          <Text style={[
                            styles.priceTypeButtonText,
                            variant.priceType === 'starting' && styles.priceTypeButtonTextActive
                          ]}>
                            Starting from
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.priceTypeButton,
                            variant.priceType === 'fixed' && styles.priceTypeButtonActive
                          ]}
                          onPress={() => updateServiceVariant(variant.id, 'priceType', 'fixed')}
                        >
                          <Text style={[
                            styles.priceTypeButtonText,
                            variant.priceType === 'fixed' && styles.priceTypeButtonTextActive
                          ]}>
                            Fixed price
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Price Unit Selection */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Price Unit</Text>
                      <View style={styles.priceUnitContainer}>
                        {[
                          { value: 'per_hour', label: 'Per Hour' },
                          { value: 'per_day', label: 'Per Day' },
                          { value: 'per_week', label: 'Per Week' },
                          { value: 'per_month', label: 'Per Month' },
                          { value: 'per_item', label: 'Per Item' },
                          { value: 'per_project', label: 'Per Project' },
                          { value: 'per_session', label: 'Per Session' },
                          { value: 'one_time', label: 'One Time' },
                        ].map((unit) => (
                          <TouchableOpacity
                            key={unit.value}
                            style={[
                              styles.priceUnitButton,
                              variant.priceUnit === unit.value && styles.priceUnitButtonActive
                            ]}
                            onPress={() => updateServiceVariant(variant.id, 'priceUnit', unit.value)}
                          >
                            <Text style={[
                              styles.priceUnitButtonText,
                              variant.priceUnit === unit.value && styles.priceUnitButtonTextActive
                            ]}>
                              {unit.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Price Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Price (RM) *</Text>
                      <TextInput
                        style={styles.input}
                        value={variant.price > 0 ? variant.price.toString() : ''}
                        onChangeText={(text) => handlePriceChange(variant.id, text)}
                        placeholder="0.00"
                        keyboardType="numeric"
                      />
                      {variant.price > 0 && (
                        <Text style={styles.pricePreview}>
                          {variant.priceType === 'starting' ? 'Starting from ' : ''}
                          RM {variant.price.toFixed(2)} {getPriceUnitLabel(variant.priceUnit)}
                        </Text>
                      )}
                    </View>
                  </>
                )}
              </View>
            );
          })}

          {/* Add Variant Button */}
          <TouchableOpacity style={styles.addVariantButton} onPress={addServiceVariant}>
            <Plus color="#007AFF" size={20} />
            <Text style={styles.addVariantText}>Add Service Variant</Text>
          </TouchableOpacity>
        </View>

        {/* Create Service Button */}
        <TouchableOpacity
          style={[
            styles.createButton,
            // Main service is always valid, only check additional variants
            serviceVariants.slice(1).every(v => v.title.trim() && v.description.trim() && v.price > 0)
              ? styles.createButtonActive
              : styles.createButtonDisabled
          ]}
          onPress={handleCreateService}
          disabled={
            isCreating ||
            !serviceVariants.slice(1).every(v => v.title.trim() && v.description.trim() && v.price > 0)
          }
        >
          <Text style={[
            styles.createButtonText,
            serviceVariants.slice(1).every(v => v.title.trim() && v.description.trim() && v.price > 0)
              ? styles.createButtonTextActive
              : {}
          ]}>
            {isCreating ? 'Creating Services...' : 
              serviceVariants.length === 1 
                ? 'Create Service Listing'
                : `Create Service Listing (1 main + ${serviceVariants.length - 1} variant${serviceVariants.length > 2 ? 's' : ''})`
            }
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  mainServiceInfo: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    marginBottom: 20,
  },
  mainServiceTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  mainServiceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  mainServiceImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  variantCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  variantNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  removeButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  priceTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priceTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  priceTypeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  priceTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  priceTypeButtonTextActive: {
    color: '#fff',
  },
  priceUnitContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceUnitButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    minWidth: 80,
  },
  priceUnitButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  priceUnitButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  priceUnitButtonTextActive: {
    color: '#fff',
  },
  pricePreview: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 4,
  },
  addVariantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f8f9ff',
    marginBottom: 30,
  },
  addVariantText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
  },
  createButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 30,
  },
  createButtonActive: {
    backgroundColor: '#007AFF',
  },
  createButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  createButtonTextActive: {
    color: '#fff',
  },
  mainServiceCard: {
    backgroundColor: '#f5f5f5',
    opacity: 0.8,
  },
  mainServiceNumber: {
    color: '#666',
  },
  disabledLabel: {
    color: '#999',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  disabledButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  disabledButtonText: {
    color: '#999',
  },
  disabledText: {
    color: '#999',
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
});