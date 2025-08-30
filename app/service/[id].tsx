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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, MessageCircle, X, Package, ShoppingCart, FileText, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { ServiceService, Service } from '@/lib/service-service';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { authService } from '@/lib/auth-service';
import { DirectOrderModal } from '@/components/DirectOrderModal';
import { supabase } from '@/lib/supabase';
import { VerificationService } from '@/lib/verification-service';

// Helper function to format joined date
const formatJoinedDate = (createdAt: string): string => {
  try {
    const date = new Date(createdAt);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `Joined ${month} ${year}`;
  } catch (error) {
    return 'Joined recently';
  }
};

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
  const { smartBack } = useSmartNavigation();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const colors = useColors();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [serviceOwnerProfile, setServiceOwnerProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceVariants, setServiceVariants] = useState<Service[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedServiceForOrder, setSelectedServiceForOrder] = useState<Service | null>(null);
  const [serviceInquiryModalVisible, setServiceInquiryModalVisible] = useState(false);
  const [inquiryMode, setInquiryMode] = useState<'text' | 'structured' | null>(null);
  const [userCoverPhoto, setUserCoverPhoto] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

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
      
      // Use variants from serviceData if available (from updated getServiceById)
      if (serviceData.service_variants && serviceData.service_variants.length > 0) {
        variants.push(...serviceData.service_variants);
      } else if (serviceData.id) {
        // Fallback: Load child variants from database if not already included
        const childVariants = await ServiceService.getServiceVariants(serviceData.id);
        if (childVariants && childVariants.length > 0) {
          variants.push(...childVariants);
        }
      }
      
      setServiceVariants(variants);
      console.log('🔍 ServiceDetailsScreen: Loaded', variants.length - 1, 'service variants');
    } catch (error) {
      console.error('Error loading service variants:', error);
    } finally {
      setLoadingVariants(false);
    }
  };

  // Fetch user's cover photo when service has no image
  useEffect(() => {
    const fetchUserCoverPhoto = async () => {
      if (service && !service.image_url && service.user_id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('cover_photo_url')
            .eq('id', service.user_id)
            .single();

          if (!error && data?.cover_photo_url) {
            setUserCoverPhoto(data.cover_photo_url);
          }
        } catch (error) {
          console.error('Error fetching user cover photo:', error);
        }
      }
    };

    fetchUserCoverPhoto();
  }, [service?.image_url, service?.user_id]);

  const getServiceImage = () => {
    if (service?.image_url) {
      return service.image_url;
    }
    if (userCoverPhoto) {
      return userCoverPhoto;
    }
    return null;
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

  const handleServiceInquiry = () => {
    // Check if user is authenticated
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to contact service providers. Would you like to sign in now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }

    // Show service inquiry options modal
    setServiceInquiryModalVisible(true);
  };

  const handleChatWithSeller = (selectedService?: Service) => {
    // Check if user is authenticated
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to contact sellers. Would you like to sign in now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }

    // Use selected service or default to main service
    const serviceToUse = selectedService || service;
    const participantId = getParticipantId();
    const defaultMessage = `Hi! I'm interested in your "${serviceToUse.title}" service (${serviceToUse.currency} ${serviceToUse.price})${serviceToUse.category_name ? ` in the ${serviceToUse.category_name} category` : ''}. Could you tell me more about it and what's included?`;
    router.push({
      pathname: '/chat/[participantId]' as any,
      params: {
        participantId,
        prefilledMessage: defaultMessage,
        selectedServiceId: serviceToUse.id,
        selectedServiceTitle: serviceToUse.title,
        selectedServicePrice: serviceToUse.price.toString(),
        selectedServiceCurrency: serviceToUse.currency,
        selectedServiceDescription: serviceToUse.description,
        selectedServiceImage: serviceToUse.image_url || '',
        selectedServiceCategory: serviceToUse.category_name || ''
      }
    });
  };

  const handleVariantSelection = (selectedVariant: Service) => {
    const participantId = getParticipantId();
    
    // Handle different inquiry modes
    if (inquiryMode === 'text') {
      // Navigate to chat with selected variant information and default message
      const defaultMessage = `Hi! I'm interested in your "${selectedVariant.title}" service (${selectedVariant.currency} ${selectedVariant.price})${selectedVariant.category_name ? ` in the ${selectedVariant.category_name} category` : ''}. Could you tell me more about it and what's included?`;
      router.push({
        pathname: '/chat/[participantId]' as any,
        params: {
          participantId,
          prefilledMessage: defaultMessage,
          selectedServiceId: selectedVariant.id,
          selectedServiceTitle: selectedVariant.title,
          selectedServicePrice: selectedVariant.price.toString(),
          selectedServiceCurrency: selectedVariant.currency,
          selectedServiceDescription: selectedVariant.description,
          selectedServiceImage: selectedVariant.image_url || '',
          selectedServiceCategory: selectedVariant.category_name || ''
        }
      });
    } else if (inquiryMode === 'structured') {
      // Navigate to chat with structured inquiry
      router.push({
        pathname: '/chat/[participantId]' as any,
        params: {
          participantId,
          structuredInquiry: 'true',
          selectedServiceId: selectedVariant.id,
          selectedServiceTitle: selectedVariant.title,
          selectedServicePrice: selectedVariant.price.toString(),
          selectedServiceCurrency: selectedVariant.currency,
          selectedServiceDescription: selectedVariant.description,
          selectedServiceImage: selectedVariant.image_url || '',
          selectedServiceCategory: selectedVariant.category_name || ''
        }
      });
    } else {
      // Default behavior (for backward compatibility)
      const defaultMessage = `Hi! I'm interested in your "${selectedVariant.title}" service (${selectedVariant.currency} ${selectedVariant.price})${selectedVariant.category_name ? ` in the ${selectedVariant.category_name} category` : ''}. Could you tell me more about it and what's included?`;
      router.push({
        pathname: '/chat/[participantId]' as any,
        params: {
          participantId,
          prefilledMessage: defaultMessage,
          selectedServiceId: selectedVariant.id,
          selectedServiceTitle: selectedVariant.title,
          selectedServicePrice: selectedVariant.price.toString(),
          selectedServiceCurrency: selectedVariant.currency,
          selectedServiceDescription: selectedVariant.description,
          selectedServiceImage: selectedVariant.image_url || '',
          selectedServiceCategory: selectedVariant.category_name || ''
        }
      });
    }
    
    // Reset inquiry mode
    setInquiryMode(null);
  };

  const handleTextInquiry = (selectedService?: Service) => {
    setServiceInquiryModalVisible(false);
    setInquiryMode('text');
    
    // Use selected service or default to main service
    const serviceToUse = selectedService || service;
    const participantId = getParticipantId();
    const defaultMessage = `Hi! I'm interested in your "${serviceToUse.title}" service (${serviceToUse.currency} ${serviceToUse.price})${serviceToUse.category_name ? ` in the ${serviceToUse.category_name} category` : ''}. Could you tell me more about it and what's included?`;
    router.push({
      pathname: '/chat/[participantId]' as any,
      params: {
        participantId,
        prefilledMessage: defaultMessage,
        selectedServiceId: serviceToUse.id,
        selectedServiceTitle: serviceToUse.title,
        selectedServicePrice: serviceToUse.price.toString(),
        selectedServiceCurrency: serviceToUse.currency,
        selectedServiceDescription: serviceToUse.description,
        selectedServiceImage: serviceToUse.image_url || '',
        selectedServiceCategory: serviceToUse.category_name || ''
      }
    });
  };

  const handleStructuredInquiry = (selectedService?: Service) => {
    setServiceInquiryModalVisible(false);
    setInquiryMode('structured');
    
    // Use selected service or default to main service
    const serviceToUse = selectedService || service;
    const participantId = getParticipantId();
    router.push({
      pathname: '/chat/[participantId]' as any,
      params: {
        participantId,
        structuredInquiry: 'true',
        selectedServiceId: serviceToUse.id,
        selectedServiceTitle: serviceToUse.title,
        selectedServicePrice: serviceToUse.price.toString(),
        selectedServiceCurrency: serviceToUse.currency,
        selectedServiceDescription: serviceToUse.description,
        selectedServiceImage: serviceToUse.image_url || '',
        selectedServiceCategory: serviceToUse.category_name || ''
      }
    });
  };

  const handleOrderNow = async () => {
    // Check if user is authenticated
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to order services. Would you like to sign in now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }

    // Check verification status before allowing order placement
    const canPlaceOrder = await VerificationService.checkVerificationForAction(
      'place_order',
      () => {
        router.push('/ekyc-verification');
      }
    );

    if (!canPlaceOrder) {
      return; // Verification check will show appropriate alert
    }

    // Proceed directly to direct order
    setSelectedServiceForOrder(service);
    setPaymentModalVisible(true);
  };

  const handleVariantSelectionForOrder = async (selectedVariant: Service) => {
    // Check verification status before allowing order placement
    const canPlaceOrder = await VerificationService.checkVerificationForAction(
      'place_order',
      () => {
        router.push('/ekyc-verification');
      }
    );

    if (!canPlaceOrder) {
      return; // Verification check will show appropriate alert
    }

    setSelectedServiceForOrder(selectedVariant);
    setPaymentModalVisible(true);
  };

  const handlePaymentSuccess = (activeJobId: string) => {
    setPaymentModalVisible(false);
    setSelectedServiceForOrder(null);
    Alert.alert(
      'Order Successful!',
      'Your order has been placed successfully. The service provider will be notified to confirm your order.',
      [
        { text: 'View Orders', onPress: () => router.push('/(tabs)/orders') },
        { text: 'OK', onPress: () => router.back() }
      ]
    );
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
          {getServiceImage() && (
            <Image
              source={{ 
                uri: getServiceImage()!
              }}
              style={styles.heroImage}
            />
          )}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={smartBack}
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
                  <View style={styles.providerNameContainer}>
                    <Text style={[styles.providerName, { color: colors.text.primary }]}>
                      {serviceOwnerProfile?.full_name || 'Service Provider'}
                    </Text>
                    {serviceOwnerProfile?.created_at && (
                      <Text style={[styles.joinedDate, { color: colors.text.secondary }]}>
                        {formatJoinedDate(serviceOwnerProfile.created_at)}
                      </Text>
                    )}
                  </View>
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
            
            {/* Truncated Description with More Button */}
            <View style={styles.descriptionContainer}>
              <Text 
                style={[styles.serviceSubtitle, { color: colors.text.secondary }]}
                numberOfLines={isDescriptionExpanded ? undefined : 4}
              >
                {serviceDetails.subtitle}
              </Text>
              {serviceDetails.subtitle && serviceDetails.subtitle.length > 200 && (
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                >
                  <Text style={[styles.moreButtonText, { color: colors.primary.main }]}>
                    {isDescriptionExpanded ? 'Show less' : 'Read more'}
                  </Text>
                  {isDescriptionExpanded ? (
                    <ChevronUp size={16} color={colors.primary.main} />
                  ) : (
                    <ChevronDown size={16} color={colors.primary.main} />
                  )}
                </TouchableOpacity>
              )}
            </View>
            
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

          {/* Service Variants Section */}
          {serviceVariants.length > 1 && (
            <View style={styles.variantsSection}>
              <Text style={[styles.variantsSectionTitle, { color: colors.text.primary }]}>Available Options</Text>
              <Text style={[styles.variantsSectionSubtitle, { color: colors.text.secondary }]}>Choose from the following service options:</Text>
              
              {serviceVariants.filter((_, index) => index !== 0).map((variant, index) => (
                <View
                  key={variant.id || `variant-${index + 1}`}
                  style={[
                    styles.variantCard,
                    { backgroundColor: colors.background.secondary, borderColor: colors.border.light }
                  ]}
                >
                  <View style={styles.variantCardHeader}>
                    <View style={styles.variantCardTitleRow}>
                      <Package size={20} color={colors.text.secondary} />
                      <Text style={[
                        styles.variantCardTitle,
                        { color: colors.text.primary }
                      ]}>
                        {variant.title}
                      </Text>
                    </View>
                    <Text style={[
                      styles.variantCardPrice,
                      { color: colors.text.primary }
                    ]}>
                      {variant.currency} {variant.price}
                    </Text>
                  </View>
                  
                  <Text style={[
                    styles.variantCardDescription,
                    { color: colors.text.secondary }
                  ]}>
                    {variant.description}
                  </Text>
                  
                  {!isOwnService && (
                    <View style={styles.variantCardActions}>
                      <TouchableOpacity
                        style={[styles.variantActionButton, { backgroundColor: colors.status.success }]}
                        onPress={() => handleVariantSelectionForOrder(variant)}
                      >
                        <ShoppingCart size={16} color={colors.text.white} />
                        <Text style={[styles.variantActionButtonText, { color: colors.text.white }]}>Order</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.variantActionButton, { backgroundColor: colors.primary.main }]}
                        onPress={() => handleChatWithSeller(variant)}
                      >
                        <MessageCircle size={16} color={colors.text.white} />
                        <Text style={[styles.variantActionButtonText, { color: colors.text.white }]}>Chat</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons - Only show Edit button for own services */}
          {isOwnService && (
            <View style={styles.actionButtonsSection}>
              <TouchableOpacity 
                style={[styles.editButton, { backgroundColor: colors.primary.main }]} 
                onPress={() => router.push(`/edit-service/${id}`)}
              >
                <Ionicons name="pencil" size={20} color={colors.text.white} />
                <Text style={[styles.editButtonText, { color: colors.text.white }]}>Edit Service</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Helper text for non-owners */}
          {!isOwnService && (
            <View style={styles.helperTextSection}>
              <Text style={[styles.helperText, { color: colors.text.secondary }]}>
                Choose a service option above to order or chat with the provider
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      


      {/* Direct Order Modal */}
      {selectedServiceForOrder && (
        <DirectOrderModal
          visible={paymentModalVisible}
          orderData={{
            id: selectedServiceForOrder.id || '',
            title: selectedServiceForOrder.title,
            description: selectedServiceForOrder.description,
            price: selectedServiceForOrder.price,
            currency: selectedServiceForOrder.currency,
          }}
          buyerId={user?.id || ''}
          serviceProviderId={selectedServiceForOrder.user_id}
          onClose={() => {
            setPaymentModalVisible(false);
            setSelectedServiceForOrder(null);
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Service Inquiry Options Modal */}
      <Modal
        visible={serviceInquiryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setServiceInquiryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.inquiryModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Service Inquiry Options</Text>
              <TouchableOpacity
                onPress={() => setServiceInquiryModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inquiryOptions}>
              <TouchableOpacity
                style={styles.inquiryOption}
                onPress={() => handleTextInquiry()}
              >
                <View style={styles.inquiryOptionIcon}>
                  <MessageCircle size={24} color={colors.primary.main} />
                </View>
                <View style={styles.inquiryOptionContent}>
                  <Text style={styles.inquiryOptionTitle}>Text Message</Text>
                  <Text style={styles.inquiryOptionDescription}>
                    Send a simple text message with your inquiry
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.inquiryOption}
                onPress={() => handleStructuredInquiry()}
              >
                <View style={styles.inquiryOptionIcon}>
                  <FileText size={24} color={colors.primary.main} />
                </View>
                <View style={styles.inquiryOptionContent}>
                  <Text style={styles.inquiryOptionTitle}>Structured Inquiry</Text>
                  <Text style={styles.inquiryOptionDescription}>
                    Send a formatted inquiry that appears as a special message
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  providerNameContainer: {
    marginBottom: 4,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  joinedDate: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 2,
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
    alignItems: 'center',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    minWidth: 200,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  chatProviderImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
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
  actionButtonsSection: {
    marginTop: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  orderButtonText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  chatHelperText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  inquiryModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 20,
  },
  inquiryOptions: {
    padding: 20,
    gap: 16,
  },
  inquiryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inquiryOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  inquiryOptionContent: {
    flex: 1,
  },
  inquiryOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inquiryOptionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  variantsSection: {
    marginBottom: 24,
  },
  variantsSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  variantsSectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  variantCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  variantCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  variantCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  variantCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  variantCardPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  variantCardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  variantCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  variantActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  variantActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  helperTextSection: {
    marginTop: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  helperText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  moreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
});