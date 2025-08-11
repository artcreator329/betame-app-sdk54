import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { Star, ChevronDown, ChevronUp, Edit3, Eye, EyeOff, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Service } from '@/types/service';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { ServiceService } from '@/lib/service-service';
import { FavoritesService } from '@/lib/favorites-service';

interface ServiceCardProps {
  service: Service;
  hideVariants?: boolean;
  showEditButton?: boolean;
  showProfileToggle?: boolean;
  userProfileAvatar?: string;
  onProfileVisibilityChange?: (serviceId: string, isVisible: boolean) => void;
  style?: any;
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

export default function ServiceCard({ service, hideVariants = false, showEditButton = false, showProfileToggle = false, userProfileAvatar, onProfileVisibilityChange, style }: ServiceCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [showVariants, setShowVariants] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(service.show_on_profile ?? true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  const hasVariants = service.service_variants && service.service_variants.length > 0;

  // Check if service is favorited on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user || !service.id) return;
      
      try {
        const favorited = await FavoritesService.isFavorited(user.id, service.id);
        setIsFavorited(favorited);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [user, service.id]);

  const handleToggleFavorite = async () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to manage favorites.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }

    if (!service.id || isFavoriteLoading) return;

    setIsFavoriteLoading(true);
    try {
      const result = await FavoritesService.toggleFavorite(user.id, service.id);
      if (result.success) {
        setIsFavorited(result.isFavorited);
      } else {
        Alert.alert('Error', result.error || 'Failed to update favorite');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const handlePress = (serviceId: string = service.id) => {
    console.log('🔗 ServiceCard: Navigating to service with ID:', serviceId);
    router.push(`/service/${serviceId}`);
  };

  const handleEditPress = () => {
    router.push(`/edit-service/${service.id}`);
  };

  const handleProfileVisibilityToggle = async (value: boolean) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      const success = await ServiceService.toggleServiceProfileVisibility(service.id, value);
      if (success) {
        setIsProfileVisible(value);
        onProfileVisibilityChange?.(service.id, value);
      } else {
        Alert.alert('Error', 'Failed to update profile visibility. Please try again.');
      }
    } catch (error) {
      console.error('Error toggling profile visibility:', error);
      Alert.alert('Error', 'Failed to update profile visibility. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getServiceImage = () => {
    if (service.image_url) {
      return service.image_url;
    }
    if (userProfileAvatar) {
      return userProfileAvatar;
    }
    // Return null to show no image instead of placeholder
    return null;
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
    const variantPrices = (service.service_variants || []).map(v => v.price).filter(price => price > 0);
    
    // If main service has a valid price (> 0), include it
    const validPrices = service.price > 0 ? [service.price, ...variantPrices] : variantPrices;
    
    return validPrices.length > 0 ? Math.min(...validPrices) : 0;
  };

  const isMainService = !service.parent_service_id;
  const shouldShowPricing = !isMainService || hasVariants;

  return (
    <View style={[styles.cardContainer, style]}>
      <TouchableOpacity style={styles.card} onPress={handleMainCardPress}>
        {showEditButton && (
        <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
          <Edit3 size={16} color={Colors.background.primary} />
        </TouchableOpacity>
      )}
      
      {/* Favorite Button */}
      <TouchableOpacity 
        style={[styles.favoriteButton, isFavorited && styles.favoriteButtonActive]} 
        onPress={handleToggleFavorite}
        disabled={isFavoriteLoading}
      >
        <Heart 
          size={16} 
          color={isFavorited ? Colors.text.white : Colors.text.secondary}
          fill={isFavorited ? Colors.text.white : "transparent"}
        />
      </TouchableOpacity>
      
      {showProfileToggle && (
        <View style={styles.profileToggleContainer}>
          <View style={styles.profileToggleContent}>
            {isProfileVisible ? (
              <Eye size={14} color={Colors.text.secondary} />
            ) : (
              <EyeOff size={14} color={Colors.text.secondary} />
            )}
            <Text style={styles.profileToggleLabel}>
              {isProfileVisible ? 'Visible on profile' : 'Hidden from profile'}
            </Text>
          </View>
          <Switch
            value={isProfileVisible}
            onValueChange={handleProfileVisibilityToggle}
            disabled={isUpdating}
            trackColor={{ false: Colors.border.light, true: Colors.primary.light }}
            thumbColor={isProfileVisible ? Colors.primary.main : Colors.background.tertiary}
            ios_backgroundColor={Colors.border.light}
          />
        </View>
      )}
        {getServiceImage() && (
          <Image 
            source={{ 
              uri: getServiceImage()!
            }} 
            style={styles.image} 
          />
        )}
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
                    {service.service_variants?.length || 0} option{(service.service_variants?.length || 0) !== 1 ? 's' : ''}
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
          {service.service_variants?.map((variant, index) => (
            <ServiceVariantCard
              key={variant.id}
              variant={variant}
              onPress={() => handlePress(variant.id)}
            />
          )) || []}
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
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.primary.main,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: Colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: Colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  favoriteButtonActive: {
    backgroundColor: Colors.status.error,
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
  profileToggleContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.background.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 140,
    zIndex: 1,
    shadowColor: Colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  profileToggleLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
});