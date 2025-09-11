import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import { Star, Edit3, Eye, EyeOff, Heart, Share2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Service } from '@/types/service';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { ServiceService } from '@/lib/service-service';
import { FavoritesService } from '@/lib/favorites-service';
import { supabase } from '@/lib/supabase';

import { AnalyticsService } from '@/lib/analytics-service';
import FeatureIcons from './FeatureIcons';
import OptimizedImage from './OptimizedImage';
import { imageCacheService } from '@/lib/image-cache-service';
import ServiceShareModal from './ServiceShareModal';

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


const isWeb = Platform.OS === 'web';

interface ServiceCardProps {
  service: Service;
  showEditButton?: boolean;
  showProfileToggle?: boolean;
  userProfileAvatar?: string;
  onProfileVisibilityChange?: (serviceId: string, isVisible: boolean) => void;
  onPress?: () => void;
  style?: any;
  disableFavorites?: boolean; // New prop to disable favorites functionality
  layout?: 'vertical' | 'horizontal'; // New prop to control layout direction
  viewSource?: 'service_card' | 'search' | 'trending' | 'category' | 'nearby' | 'other'; // Track where the view came from
}



export default function ServiceCard({ service, showEditButton = false, showProfileToggle = false, userProfileAvatar, onProfileVisibilityChange, onPress, style, disableFavorites = false, layout = 'vertical', viewSource = 'service_card' }: ServiceCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [isProfileVisible, setIsProfileVisible] = useState(service.show_on_profile ?? true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [userCoverPhoto, setUserCoverPhoto] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

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

  const handlePress = async (serviceId: string = service.id) => {
    // Track the service view
    try {
      await AnalyticsService.trackServiceView({
        service_id: serviceId,
        user_id: user?.id,
        view_source: viewSource,
      });
    } catch (error) {
      console.error('Error tracking service view:', error);
    }

    router.push(`/service/${serviceId}`);
  };

  const handleEditPress = () => {
    router.push(`/edit-service/${service.id}`);
  };

  const handleSharePress = (e: any) => {
    e.stopPropagation();
    setShowShareModal(true);
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
        layout === 'horizontal' && styles.horizontalCard,
        service.status === 'draft' && styles.draftCard
      ]} onPress={handleMainCardPress}>
        {showEditButton && (
          <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
            <Edit3 size={16} color={colors.background.primary} />
          </TouchableOpacity>
        )}

        {/* Draft Badge */}
        {service.status === 'draft' && (
          <View style={[styles.draftBadge, { backgroundColor: '#FF9500' }]}>
            <Text style={styles.draftBadgeText}>DRAFT</Text>
          </View>
        )}

        {/* Favorite Button - Hidden when disableFavorites is true */}
        {!disableFavorites && (
          <TouchableOpacity
            style={[
              styles.favoriteButton,
              { backgroundColor: isFavorited ? '#FF3B30' : colors.background.tertiary },
              isFavorited && styles.favoriteButtonActive,
              // Adjust position if draft badge is present
              service.status === 'draft' && styles.favoriteButtonWithDraft
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
        )}

        {/* Share Button */}
        <TouchableOpacity
          style={[
            styles.shareButton,
            // Position based on whether edit button is present
            showEditButton ? styles.shareButtonWithEdit : styles.shareButtonWithoutEdit,
            // Adjust position if draft badge is present
            service.status === 'draft' && styles.shareButtonWithDraft
          ]}
          onPress={handleSharePress}
        >
          <Share2
            size={16}
            color="white"
          />
        </TouchableOpacity>

        {/* Profile Toggle Button - positioned beside share button */}
        {showProfileToggle && (
          <TouchableOpacity
            style={[
              styles.profileToggleButton,
              { backgroundColor: colors.background.tertiary },
              showEditButton ? styles.profileToggleWithEdit : styles.profileToggleWithoutEdit,
              service.status === 'draft' && styles.profileToggleWithDraft
            ]}
            onPress={handleProfileVisibilityToggle}
            disabled={isUpdating}
          >
            {isProfileVisible ? (
              <Eye size={16} color={colors.text.secondary} />
            ) : (
              <EyeOff size={16} color={colors.text.secondary} />
            )}
          </TouchableOpacity>
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
              {service.status === 'draft' && (
                <Text style={[styles.draftIndicatorText, { color: '#FF9500' }]}>
                  • Draft - Not visible to public
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
              <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={2}>
                {service.title}
              </Text>
              {service.description && (
                <Text style={[styles.description, { color: colors.text.primary }]} numberOfLines={2}>
                  {service.description}
                </Text>
              )}
              {service.status === 'draft' && (
                <Text style={[styles.draftIndicatorText, { color: '#FF9500' }]}>
                  • Draft - Not visible to public
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

      {/* Share Modal */}
      <ServiceShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        service={service}
      />
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
  favoriteButtonWithDraft: {
    left: 60, // Move right to avoid overlapping with draft badge
  },
  shareButton: {
    position: 'absolute',
    top: 8,
    right: 8, // Simple positioning at the right edge
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Higher z-index to ensure visibility
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  draftBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 2,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  draftBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  draftCard: {
    opacity: 0.85,
    borderWidth: 1,
    borderColor: '#FF9500',
    borderStyle: 'dashed',
  },
  draftIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: 4,
    ...(isWeb && {
      fontSize: 10,
      marginBottom: 3,
    }),
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
  profileToggleButton: {
    position: 'absolute',
    top: 8,
    right: 44, // Reduced gap - closer to share button
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileToggleWithEdit: {
    right: 84, // Adjust position when edit button is present
  },
  profileToggleWithoutEdit: {
    right: 44, // Reduced gap - closer to share button
  },
  profileToggleWithDraft: {
    right: 84, // Adjust position when draft badge is present
  },
});