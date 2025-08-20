import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, Switch, Platform, Dimensions } from 'react-native';
import { Star, ChevronDown, ChevronUp, Edit3, Eye, EyeOff, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Service } from '@/types/service';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { ServiceService } from '@/lib/service-service';
import { FavoritesService } from '@/lib/favorites-service';
import { supabase } from '@/lib/supabase';
import { FeatureService, ServiceFeatureApplication } from '@/lib/feature-service';
import FeatureIcons from './FeatureIcons';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface ServiceCardProps {
  service: Service;
  hideVariants?: boolean;
  showEditButton?: boolean;
  showProfileToggle?: boolean;
  userProfileAvatar?: string;
  onProfileVisibilityChange?: (serviceId: string, isVisible: boolean) => void;
  onPress?: () => void;
  style?: any;
  disableFavorites?: boolean; // New prop to disable favorites functionality
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
            From {variant.currency}{String(variant.price)}
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

export default function ServiceCard({ service, hideVariants = false, showEditButton = false, showProfileToggle = false, userProfileAvatar, onProfileVisibilityChange, onPress, style, disableFavorites = false }: ServiceCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const [showVariants, setShowVariants] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(service.show_on_profile ?? true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [userCoverPhoto, setUserCoverPhoto] = useState<string | null>(null);

  const hasVariants = service.service_variants && service.service_variants.length > 0;

  // Check if service is favorited on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (disableFavorites) {
        setIsFavorited(false);
        return;
      }
      
      if (!user || !service.id) {
        // For unauthenticated users, set favorite status to false and don't make API calls
        setIsFavorited(false);
        return;
      }
      
      try {
        const favorited = await FavoritesService.isFavorited(user.id, service.id);
        setIsFavorited(favorited);
      } catch (error) {
        console.error('ServiceCard: Error checking favorite status:', error);
        // Set to false on error to avoid UI issues
        setIsFavorited(false);
      }
    };

    checkFavoriteStatus();
  }, [user, service.id, disableFavorites]);

  const handleToggleFavorite = async () => {
    if (disableFavorites) {
      return;
    }
    
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

  // Fetch user's cover photo when service has no image
  useEffect(() => {
    const fetchUserCoverPhoto = async () => {
      if (!service.image_url && service.user_id) {
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
  }, [service.image_url, service.user_id]);

  const getServiceImage = () => {
    if (service.image_url) {
      return service.image_url;
    }
    if (userCoverPhoto) {
      return userCoverPhoto;
    }
    if (userProfileAvatar) {
      return userProfileAvatar;
    }
    // Return null to show no image instead of placeholder
    return null;
  };

  const handleMainCardPress = () => {
    // Always navigate to service detail page
    if (onPress) {
      onPress();
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
          <Edit3 size={16} color={colors.background.primary} />
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
          color={isFavorited ? '#FFFFFF' : colors.text.secondary}
          fill={isFavorited ? '#FFFFFF' : "transparent"}
        />
      </TouchableOpacity>
      
      {showProfileToggle && (
        <View style={styles.profileToggleContainer}>
          <View style={styles.profileToggleContent}>
            {isProfileVisible ? (
              <Eye size={14} color={colors.text.secondary} />
            ) : (
              <EyeOff size={14} color={colors.text.secondary} />
            )}
            <Text style={styles.profileToggleLabel}>
              {isProfileVisible ? 'Visible on profile' : 'Hidden from profile'}
            </Text>
          </View>
          <Switch
            value={isProfileVisible}
            onValueChange={handleProfileVisibilityToggle}
            disabled={isUpdating}
            trackColor={{ false: colors.border.light, true: colors.primary.light }}
            thumbColor={isProfileVisible ? colors.primary.main : colors.background.secondary}
            ios_backgroundColor={colors.border.light}
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
            {service.active_features && service.active_features.length > 0 && (
              <FeatureIcons 
                features={service.active_features} 
                size={16} 
                style={styles.featureIcons}
              />
            )}
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

            </View>
          ) : (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsLabel}>View Details</Text>
              <Text style={styles.categoryText}>{service.category_name}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>


    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    ...(isWeb && {
      maxWidth: 400,
      alignSelf: 'flex-start',
      width: '100%',
    }),
  },
  editButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000000',
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
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  favoriteButtonActive: {
    backgroundColor: '#FF3B30',
  },
  image: {
    width: '100%',
    height: isWeb ? 100 : 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    resizeMode: 'cover',
  },
  content: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
    ...(isWeb && {
      padding: 8,
    }),
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 3,
  },
  reviewCount: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 2,
  },
  featureIcons: {
    marginLeft: 'auto',
  },
  provider: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
    ...(isWeb && {
      fontSize: 12,
      marginBottom: 1,
    }),
  },
  title: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 16,
    ...(isWeb && {
      fontSize: 11,
      lineHeight: 14,
      marginBottom: 6,
    }),
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    ...(isWeb && {
      fontSize: 12,
    }),
  },
  variantIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  variantCount: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
  },
  variantsContainer: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  variantCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  variantContent: {
    flex: 1,
  },
  variantTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  variantDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 6,
  },
  variantPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  variantMainService: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  detailsContainer: {
    alignItems: 'flex-start',
  },
  detailsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  expandedDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  profileToggleContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 140,
    zIndex: 1,
    shadowColor: '#000000',
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
    color: '#6B7280',
    fontWeight: '500',
  },
});