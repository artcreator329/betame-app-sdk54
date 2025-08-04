import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Star, ChevronDown, ChevronUp, Edit3 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Service } from '@/types/service';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';

interface ServiceCardProps {
  service: Service;
  hideVariants?: boolean;
  showEditButton?: boolean;
  userProfileAvatar?: string;
}

interface ServiceVariantCardProps {
  variant: Service;
  onPress: () => void;
}

function ServiceVariantCard({ variant, onPress }: ServiceVariantCardProps) {
  const isMainServiceVariant = !variant.parent_service_id;
  
  return (
    <TouchableOpacity style={styles.variantCard} onPress={onPress}>
      <View style={styles.variantContent}>
        <Text style={styles.variantTitle} numberOfLines={1}>
          {variant.title}
        </Text>
        <Text style={styles.variantDescription} numberOfLines={2}>
          {variant.description}
        </Text>
        {!isMainServiceVariant ? (
          <Text style={styles.variantPrice}>
            From {variant.currency}{variant.price}
          </Text>
        ) : (
          <Text style={styles.variantMainService}>
            Main Service - View Details
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ServiceCard({ service, hideVariants = false, showEditButton = false, userProfileAvatar }: ServiceCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [showVariants, setShowVariants] = useState(false);

  const hasVariants = service.service_variants && service.service_variants.length > 0;

  const handlePress = (serviceId: string = service.id) => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to view service details.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }
    console.log('🔗 ServiceCard: Navigating to service with ID:', serviceId);
    router.push(`/service/${serviceId}`);
  };

  const handleEditPress = () => {
    router.push(`/edit-service/${service.id}`);
  };

  const getServiceImage = () => {
    if (service.image_url && service.image_url !== 'https://via.placeholder.com/80') {
      return service.image_url;
    }
    if (userProfileAvatar) {
      return userProfileAvatar;
    }
    return 'https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=400';
  };

  const handleMainCardPress = () => {
    if (hasVariants && !hideVariants) {
      setShowVariants(!showVariants);
    } else {
      handlePress();
    }
  };

  const getLowestPrice = () => {
    if (!hasVariants) return service.price;
    
    // Get all variant prices
    const variantPrices = service.service_variants!.map(v => v.price).filter(price => price > 0);
    
    // If main service has a valid price (> 0), include it
    const validPrices = service.price > 0 ? [service.price, ...variantPrices] : variantPrices;
    
    return validPrices.length > 0 ? Math.min(...validPrices) : 0;
  };

  const isMainService = !service.parent_service_id;
  const shouldShowPricing = !isMainService || hasVariants;

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity style={styles.card} onPress={handleMainCardPress}>
        {showEditButton && (
          <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
            <Edit3 size={16} color="white" />
          </TouchableOpacity>
        )}
        <Image 
          source={{ 
            uri: getServiceImage()
          }} 
          style={styles.image} 
        />
        <View style={styles.content}>
          <View style={styles.ratingContainer}>
            <Star size={12} color="#FFD700" fill="#FFD700" />
            <Text style={styles.rating}>{service.rating}</Text>
            <Text style={styles.reviewCount}>({service.review_count})</Text>
          </View>
          <Text style={styles.provider}>{service.provider_name || 'Unknown Provider'}</Text>
          <Text style={styles.title} numberOfLines={showVariants ? undefined : 2}>
            {service.title}
          </Text>
          {showVariants && (
            <Text style={styles.expandedDescription} numberOfLines={undefined}>
              {service.description}
            </Text>
          )}
          {shouldShowPricing ? (
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                From {service.currency}{getLowestPrice()}
              </Text>
              {hasVariants && !hideVariants && (
                <View style={styles.variantIndicator}>
                  <Text style={styles.variantCount}>
                    {service.service_variants!.length} option{service.service_variants!.length !== 1 ? 's' : ''}
                  </Text>
                  {showVariants ? (
                    <ChevronUp size={16} color={Colors.primary.main} />
                  ) : (
                    <ChevronDown size={16} color={Colors.primary.main} />
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsLabel}>View Details</Text>
              <Text style={styles.categoryText}>{service.category_name}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Service Variants */}
      {hasVariants && showVariants && !hideVariants && (
        <View style={styles.variantsContainer}>
          {/* Only show actual service variants, not the main service */}
          {service.service_variants!.map((variant, index) => (
            <ServiceVariantCard
              key={variant.id}
              variant={variant}
              onPress={() => handlePress(variant.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    shadowColor: Colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  content: {
    padding: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 3,
  },
  reviewCount: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginLeft: 2,
  },
  provider: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  variantIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  variantCount: {
    fontSize: 11,
    color: Colors.primary.main,
    fontWeight: '500',
  },
  variantsContainer: {
    backgroundColor: Colors.background.secondary,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  variantCard: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  variantContent: {
    flex: 1,
  },
  variantTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  variantDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  variantPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary.main,
  },
  variantMainService: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  detailsContainer: {
    alignItems: 'flex-start',
  },
  detailsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary.main,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  expandedDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
    marginBottom: 8,
    marginTop: 4,
  },
});