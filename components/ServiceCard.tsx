import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, Platform, Dimensions } from 'react-native';
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
import OptimizedImage from './OptimizedImage';
import { imageCacheService } from '@/lib/image-cache-service';

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
  layout?: 'vertical' | 'horizontal'; // New prop to control layout direction
}

interface ServiceVariantCardProps {
  variant: Service;
  onPress: () => void;
}

function ServiceVariantCard({ variant, onPress }: ServiceVariantCardProps) {
  const colors = useColors();
  const isMainServiceVariant = !variant.parent_service_id;
  
  return (
    <TouchableOpacity style={[styles.variantCard, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]} onPress={onPress}>
      <View style={styles.variantContent}>
        <Text style={[styles.variantTitle, { color: colors.text.primary }]} numberOfLines={1}>
          {variant.title}
        </Text>
        <Text style={[styles.variantDescription, { color: colors.text.primary }]} numberOfLines={2}>
          {variant.description}
        </Text>
        {!isMainServiceVariant ? (
          <Text style={[styles.variantPrice, { color: colors.primary.main }]}>
            From {variant.currency}{String(variant.price)}
          </Text>
        ) : (
          <Text style={[styles.variantMainService, { color: colors.text.secondary }]}>
            Main Service - View Details
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ServiceCard({ service, hideVariants = false, showEditButton = false, showProfileToggle = false, userProfileAvatar, onProfileVisibilityChange, onPress, style, disableFavorites = false, layout = 'vertical' }: ServiceCardProps) {
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
          // Try to get cover photo from profiles table first
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('cover_photo_url')
            .eq('id', service.user_id)
            .single();

          if (!profileError && profileData?.cover_photo_url) {
            setUserCoverPhoto(profileData.cover_photo_url);
            return;
          }

          // If no cover photo in profiles table, try user_profiles table
          const { data: userProfileData, error: userProfileError } = await supabase
            .from('user_profiles')
            .select('avatar_url')
            .eq('user_id', service.user_id)
            .single();

          if (!userProfileError && userProfileData?.avatar_url) {
            // Use avatar as fallback if no cover photo
            setUserCoverPhoto(userProfileData.avatar_url);
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
      return imageCacheService.getMediumUrl(service.image_url);
    }
    if (userCoverPhoto) {
      return imageCacheService.getMediumUrl(userCoverPhoto);
    }
    if (userProfileAvatar) {
      return imageCacheService.getThumbnailUrl(userProfileAvatar);
    }
    // Return a default placeholder image if no images are available
    return 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400';
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
      <TouchableOpacity style={[
        styles.card, 
        { backgroundColor: colors.background.secondary },
        layout === 'horizontal' && styles.horizontalCard
      ]} onPress={handleMainCardPress}>
        {showEditButton && (
        <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
          <Edit3 size={16} color={colors.background.primary} />
        </TouchableOpacity>
      )}
      
      {/* Favorite Button */}
      <TouchableOpacity 
        style={[
          styles.favoriteButton, 
          { backgroundColor: isFavorited ? '#FF3B30' : colors.background.tertiary },
          isFavorited && styles.favoriteButtonActive
        ]} 
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
        <View style={[styles.profileToggleContainer, { backgroundColor: colors.background.secondary }]}>
          <View style={styles.profileToggleContent}>
            {isProfileVisible ? (
              <Eye size={14} color={colors.text.secondary} />
            ) : (
              <EyeOff size={14} color={colors.text.secondary} />
            )}
            <Text style={[styles.profileToggleLabel, { color: colors.text.secondary }]}>
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
        
        {layout === 'horizontal' ? (
          <View style={styles.horizontalContent}>
            <OptimizedImage
              source={getServiceImage()}
              style={styles.horizontalImage}
              priority="normal"
              cachePolicy="memory-disk"
              showLoadingIndicator={false}
            />
            <View style={styles.horizontalDetails}>
              <View style={styles.ratingContainer}>
                <Star size={10} color="#FFD700" fill="#FFD700" />
                <Text style={[styles.horizontalRating, { color: colors.text.primary }]}>{service.rating}</Text>
                <Text style={[styles.horizontalReviewCount, { color: colors.text.secondary }]}>({service.review_count})</Text>
                {service.active_features && service.active_features.length > 0 && (
                  <FeatureIcons 
                    features={service.active_features} 
                    size={12} 
                    style={styles.featureIcons}
                  />
                )}
              </View>
              <View style={styles.providerContainer}>
                <Text style={[styles.horizontalProvider, { color: colors.text.primary }]} numberOfLines={1}>
                  {service.provider_name || 'Unknown Provider'}
                </Text>
                {service.provider_created_at && (
                  <Text style={[styles.horizontalJoinedDate, { color: colors.text.secondary }]} numberOfLines={1}>
                    {formatJoinedDate(service.provider_created_at)}
                  </Text>
                )}
              </View>
              <Text style={[styles.horizontalTitle, { color: colors.text.primary }]} numberOfLines={2}>
                {service.title}
              </Text>
              {service.description && (
                <Text style={[styles.horizontalDescription, { color: colors.text.primary }]} numberOfLines={2}>
                  {service.description}
                </Text>
              )}
              {shouldShowPricing ? (
                <View style={styles.priceContainer}>
                  <Text style={[styles.horizontalPrice, { color: colors.text.primary }]} numberOfLines={1}>
                    From {service.currency}{getLowestPrice()}
                  </Text>
                </View>
              ) : (
                <View style={styles.detailsContainer}>
                  <Text style={[styles.detailsLabel, { color: colors.primary.main }]} numberOfLines={1}>View Details</Text>
                  <Text style={[styles.categoryText, { color: colors.text.primary }]} numberOfLines={1}>{service.category_name}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <>
            <OptimizedImage
              source={getServiceImage()}
              style={styles.image}
              priority="normal"
              cachePolicy="memory-disk"
              showLoadingIndicator={false}
            />
            <View style={styles.content}>
              <View style={styles.ratingContainer}>
                <Star size={12} color="#FFD700" fill="#FFD700" />
                <Text style={[styles.rating, { color: colors.text.primary }]}>{service.rating}</Text>
                <Text style={[styles.reviewCount, { color: colors.text.secondary }]}>({service.review_count})</Text>
                {service.active_features && service.active_features.length > 0 && (
                  <FeatureIcons 
                    features={service.active_features} 
                    size={16} 
                    style={styles.featureIcons}
                  />
                )}
              </View>
              <View style={styles.providerContainer}>
                <Text style={[styles.provider, { color: colors.text.primary }]}>{service.provider_name || 'Unknown Provider'}</Text>
                {service.provider_created_at && (
                  <Text style={[styles.joinedDate, { color: colors.text.secondary }]}>
                    {formatJoinedDate(service.provider_created_at)}
                  </Text>
                )}
              </View>
              <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={showVariants ? undefined : 2}>
                {service.title}
              </Text>
              {!showVariants && service.description && (
                <Text style={[styles.description, { color: colors.text.primary }]} numberOfLines={2}>
                  {service.description}
                </Text>
              )}
              {showVariants && (
                <Text style={[styles.expandedDescription, { color: colors.text.primary }]} numberOfLines={undefined}>
                  {service.description}
                </Text>
              )}
              {shouldShowPricing ? (
                <View style={styles.priceContainer}>
                  <Text style={[styles.price, { color: colors.text.primary }]}>
                    From {service.currency}{getLowestPrice()}
                  </Text>

                </View>
              ) : (
                <View style={styles.detailsContainer}>
                  <Text style={[styles.detailsLabel, { color: colors.primary.main }]}>View Details</Text>
                  <Text style={[styles.categoryText, { color: colors.text.primary }]}>{service.category_name}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </TouchableOpacity>


    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 8,
  },
  card: {
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
    marginLeft: 3,
  },
  reviewCount: {
    fontSize: 11,
    marginLeft: 2,
  },
  featureIcons: {
    marginLeft: 'auto',
  },
  providerContainer: {
    marginBottom: 2,
  },
  provider: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1,
    ...(isWeb && {
      fontSize: 12,
      marginBottom: 1,
    }),
  },
  joinedDate: {
    fontSize: 11,
    fontWeight: '400',
    ...(isWeb && {
      fontSize: 10,
    }),
  },
  title: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
    ...(isWeb && {
      fontSize: 11,
      lineHeight: 14,
      marginBottom: 6,
    }),
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
    ...(isWeb && {
      fontSize: 10,
      lineHeight: 13,
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
    fontWeight: '500',
  },
  variantsContainer: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  variantCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  variantContent: {
    flex: 1,
  },
  variantTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  variantDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  variantPrice: {
    fontSize: 13,
    fontWeight: '600',
  },
  variantMainService: {
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  detailsContainer: {
    alignItems: 'flex-start',
  },
  detailsLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  expandedDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  profileToggleContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
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
    fontWeight: '500',
  },
  
  // Horizontal layout styles
  horizontalCard: {
    flexDirection: 'row',
    height: 140,
    ...(isWeb && {
      height: 120,
    }),
  },
  horizontalContent: {
    flex: 1,
    flexDirection: 'row',
  },
  horizontalImage: {
    width: 140,
    height: '100%',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    resizeMode: 'cover',
    ...(isWeb && {
      width: 120,
    }),
  },
  horizontalDetails: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 0, // Allow flex shrinking
    ...(isWeb && {
      padding: 10,
    }),
  },
  horizontalTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
    lineHeight: 16,
    flexShrink: 1,
    ...(isWeb && {
      fontSize: 12,
      lineHeight: 14,
      marginBottom: 2,
    }),
  },
  horizontalDescription: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 4,
    flexShrink: 1,
    ...(isWeb && {
      fontSize: 10,
      lineHeight: 12,
      marginBottom: 3,
    }),
  },
  
  // Horizontal layout specific text styles
  horizontalRating: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
    ...(isWeb && {
      fontSize: 9,
    }),
  },
  horizontalReviewCount: {
    fontSize: 10,
    marginLeft: 1,
    ...(isWeb && {
      fontSize: 9,
    }),
  },
  horizontalProvider: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 1,
    ...(isWeb && {
      fontSize: 10,
    }),
  },
  horizontalJoinedDate: {
    fontSize: 9,
    fontWeight: '400',
    ...(isWeb && {
      fontSize: 8,
    }),
  },
  horizontalPrice: {
    fontSize: 12,
    fontWeight: '600',
    ...(isWeb && {
      fontSize: 11,
    }),
  },
});