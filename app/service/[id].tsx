import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, MessageCircle, X, Package } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ServiceService, Service } from '@/lib/service-service';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { authService } from '@/lib/auth-service';

interface SubPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  details: string[];
}

const getServicePlans = (serviceId: string): SubPlan[] => {
  // Subscription plans feature not yet implemented
  return [];
};

export default function ServiceDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const colors = useColors();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [serviceOwnerProfile, setServiceOwnerProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceVariantModalVisible, setServiceVariantModalVisible] = useState(false);
  const [serviceVariants, setServiceVariants] = useState<Service[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  console.log('🔍 ServiceDetailsScreen: Component mounted with ID:', id);
  console.log('🔍 ServiceDetailsScreen: ID type:', typeof id);
  console.log('🔍 ServiceDetailsScreen: ID value:', id);
  console.log('🔍 ServiceDetailsScreen: ID array check:', Array.isArray(id));
  console.log('🔍 ServiceDetailsScreen: User authenticated:', !!user);

  useEffect(() => {
    // Temporarily remove auth check for debugging
    // if (!user) {
    //   console.log('❌ ServiceDetailsScreen: User not authenticated, redirecting to login');
    //   router.replace('/auth/login');
    //   return;
    // }

    const fetchService = async () => {
      // Handle case where id might be an array from Expo Router
      const serviceId = Array.isArray(id) ? id[0] : id;
      
      if (typeof serviceId === 'string' && serviceId.trim() !== '') {
        console.log('🔍 ServiceDetailsScreen: Fetching service with ID:', serviceId);
        
        try {
          const serviceData = await ServiceService.getServiceById(serviceId);
          console.log('📦 ServiceDetailsScreen: Service data received:', serviceData);
          
          if (serviceData) {
            setService(serviceData);
            setError(null);
            
            // Fetch service owner's profile
            if (serviceData?.user_id) {
              const ownerProfile = await authService.getUserProfile(serviceData.user_id);
              setServiceOwnerProfile(ownerProfile);
            }
            
            // Load service variants
            await loadServiceVariants(serviceData);
          } else {
            console.error('❌ ServiceDetailsScreen: No service found with ID:', serviceId);
            setError(`Service with ID "${serviceId}" not found in database`);
          }
        } catch (error) {
          console.error('❌ ServiceDetailsScreen: Error fetching service:', error);
          setError(`Error fetching service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('❌ ServiceDetailsScreen: Invalid ID type or empty ID:', typeof serviceId, serviceId);
        setError('Invalid service ID provided');
        setIsLoading(false);
      }
    };

    fetchService();
  }, [id]);

  const loadServiceVariants = async (serviceData: Service) => {
    try {
      setLoadingVariants(true);
      
      // Create array with main service and its variants
      const variants: Service[] = [serviceData]; // Main service first
      
      // Load child variants from database if service has variants
      if (serviceData.id) {
        const childVariants = await ServiceService.getServiceVariants(serviceData.id);
        if (childVariants && childVariants.length > 0) {
          variants.push(...childVariants);
        }
      }
      
      setServiceVariants(variants);
    } catch (error) {
      console.error('Error loading service variants:', error);
    } finally {
      setLoadingVariants(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading service...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!service || error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text.primary }]}>
            {error || 'Service not found'}
          </Text>
          <Text style={[styles.errorDetails, { color: colors.text.secondary }]}>
            Service ID: {Array.isArray(id) ? id[0] : id}
          </Text>
          <TouchableOpacity style={[styles.backToServicesButton, { backgroundColor: colors.primary.main }]} onPress={() => router.push('/services')}>
            <Text style={[styles.backToServicesText, { color: colors.text.white }]}>Back to Services</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getParticipantId = () => {
    return service?.user_id || 'service-provider';
  };

  // Check if current user owns this service
  const isOwnService = user?.id === service?.user_id;

  const handleChatWithSeller = () => {
    // If service has variants, show selection modal
    if (serviceVariants.length > 1) {
      setServiceVariantModalVisible(true);
    } else {
      // If no variants, proceed directly to chat
      const participantId = getParticipantId();
      router.push(`/chat/${participantId}`);
    }
  };

  const handleVariantSelection = (selectedVariant: Service) => {
    setServiceVariantModalVisible(false);
    const participantId = getParticipantId();
    // Navigate to chat with selected variant information
    router.push({
      pathname: '/chat/[participantId]' as any,
      params: {
        participantId,
        selectedServiceId: selectedVariant.id,
        selectedServiceTitle: selectedVariant.title,
        selectedServicePrice: selectedVariant.price.toString(),
        selectedServiceCurrency: selectedVariant.currency,
        selectedServiceDescription: selectedVariant.description,
        selectedServiceImage: selectedVariant.image_url || '',
        selectedServiceCategory: selectedVariant.category_name || ''
      }
    });
  };

  const subPlans = getServicePlans(service.id || '');
  const selectedSubPlan = subPlans.find((plan: SubPlan) => plan.id === selectedPlan);

  const serviceDetails = {
    title: service.title,
    subtitle: service.description,
    duration: 'Flexible scheduling available',
    location: service.location || 'Location can be discussed',
    price: service.price,
    currency: service.currency || 'RM'
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.background.primary }}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={{ 
              uri: service.image_url || 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=800'
            }}
            style={styles.heroImage}
          />
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.text.white} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={[styles.content, { backgroundColor: colors.background.primary }]}>
          {/* Provider Info */}
          <View style={styles.providerSection}>
            <View style={styles.providerInfo}>
              <Image
                source={{ 
                  uri: serviceOwnerProfile?.avatar_url || 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=200' 
                }}
                style={styles.providerImage}
              />
              <View style={styles.providerDetails}>
                <Text style={[styles.listedBy, { color: colors.text.secondary }]}>Listed by</Text>
                <View style={styles.providerNameRow}>
                  <Text style={[styles.providerName, { color: colors.text.primary }]}>
                  {serviceOwnerProfile?.full_name || 'Service Provider'}
                </Text>
                  <TouchableOpacity onPress={() => service?.user_id && router.push(`/user-profile/${service.user_id}`)}>
                      <Text style={[styles.checkProfile, { color: colors.primary.main }]}>Check provider's profile!</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.ratingRow}>
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text style={[styles.rating, { color: colors.text.primary }]}>
                    {service.rating || 0} ({service.review_count || 0})
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Service Details */}
          <View style={styles.serviceSection}>
            <Text style={[styles.serviceTitle, { color: colors.text.primary }]}>{serviceDetails.title}</Text>
            <Text style={[styles.serviceSubtitle, { color: colors.text.secondary }]}>{serviceDetails.subtitle}</Text>
            <Text style={[styles.serviceDuration, { color: colors.text.secondary }]}>{serviceDetails.duration}</Text>
            
            <View style={styles.priceContainer}>
              <Text style={[styles.priceLabel, { color: colors.text.secondary }]}>Starting from</Text>
              <Text style={[styles.priceAmount, { color: colors.text.primary }]}>
                {serviceDetails.currency}{serviceDetails.price}
              </Text>
            </View>
            
            {serviceDetails.location ? (
              <Text style={[styles.serviceDetail, { color: colors.text.secondary }]}>{serviceDetails.location}</Text>
            ) : null}
            
            {service.category_name && (
              <View style={styles.categoryContainer}>
                <Text style={[styles.categoryLabel, { color: colors.text.secondary }]}>Category:</Text>
                <Text style={[styles.categoryName, { color: colors.primary.main }]}>{service.category_name}</Text>
              </View>
            )}
          </View>

          {/* Pricing Plans */}
          {subPlans.length > 0 && (
            <View style={styles.pricingSection}>
              <View style={styles.pricingTabs}>
                {subPlans.map((plan: SubPlan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.pricingTab,
                      selectedPlan === plan.id && styles.selectedPricingTab
                    ]}
                    onPress={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
                  >
                    <Text style={[
                      styles.pricingTabText,
                      selectedPlan === plan.id && styles.selectedPricingTabText
                    ]}>
                      RM{plan.price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sub-plan Details */}
              {selectedSubPlan && (
                <View style={styles.subPlanDetails}>
                  <Text style={styles.subPlanTitle}>{selectedSubPlan.description}</Text>
                  {selectedSubPlan.details.map((detail: string, index: number) => (
                    <Text key={index} style={styles.subPlanDetail}>{detail}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Action Button - Chat or Edit based on ownership */}
          <View style={styles.chatSection}>
            {!isOwnService ? (
              <TouchableOpacity style={[styles.chatButton, { backgroundColor: colors.primary.main }]} onPress={handleChatWithSeller}>
                <MessageCircle size={20} color={colors.text.white} />
                <Text style={[styles.chatButtonText, { color: colors.text.white }]}>Chat with seller</Text>
                <Image
                  source={{ 
                    uri: serviceOwnerProfile?.avatar_url || 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=100' 
                  }}
                  style={styles.chatProviderImage}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.editButton, { backgroundColor: colors.primary.main }]} 
                onPress={() => router.push(`/edit-service/${id}`)}
              >
                <Ionicons name="pencil" size={20} color={colors.text.white} />
                <Text style={[styles.editButtonText, { color: colors.text.white }]}>Edit Service</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* Service Variant Selection Modal */}
      <Modal
        visible={serviceVariantModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setServiceVariantModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.variantModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Service Option</Text>
              <TouchableOpacity
                onPress={() => setServiceVariantModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {loadingVariants ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary.main} />
                <Text style={styles.loadingText}>Loading options...</Text>
              </View>
            ) : (
              <FlatList
                data={serviceVariants}
                keyExtractor={(item) => item.id || `variant-${Math.random()}`}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[
                      styles.variantItem,
                      index === 0 && styles.mainVariantItem
                    ]}
                    onPress={() => handleVariantSelection(item)}
                  >
                    <View style={styles.variantContent}>
                      <View style={styles.variantHeader}>
                        <Package size={20} color={colors.primary.main} />
                        <Text style={styles.variantTitle}>
                          {index === 0 ? `${item.title} (Main)` : item.title}
                        </Text>
                      </View>
                      <Text style={styles.variantDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                      <Text style={styles.variantPrice}>
                        {item.currency} {item.price}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
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
  heroContainer: {
    position: 'relative',
    height: 250,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  providerSection: {
    marginBottom: 20,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  listedBy: {
    fontSize: 12,
    marginBottom: 2,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  checkProfile: {
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    marginLeft: 4,
  },
  serviceSection: {
    marginBottom: 24,
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  serviceSubtitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  serviceDuration: {
    fontSize: 16,
    marginBottom: 8,
  },
  serviceDetail: {
    fontSize: 16,
    marginBottom: 4,
    lineHeight: 22,
  },
  pricingSection: {
    marginBottom: 24,
  },
  pricingTabs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pricingTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedPricingTab: {
  },
  pricingTabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedPricingTabText: {
  },
  subPlanDetails: {
    padding: 16,
    borderRadius: 12,
  },
  subPlanTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  subPlanDetail: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  chatSection: {
    marginTop: 20,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 25,
    position: 'relative',
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  chatProviderImage: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  backToServicesButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToServicesText: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  categoryLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  variantModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  variantItem: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  mainVariantItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  variantContent: {
    flex: 1,
  },
  variantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  variantTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  variantDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  variantPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196f3',
  },
});