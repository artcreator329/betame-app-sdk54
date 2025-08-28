import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Share, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, MessageCircle, User, Heart, Share as ShareIcon, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LightTheme } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { ServiceService } from '@/lib/service-service';
import { UserFavoritesService } from '@/lib/user-favorites-service';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  tagline?: string;
  created_at: string;
  verification_status?: string;
  is_verified?: boolean;
}

interface Service {
  id?: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category_name?: string;
  image_url?: string;
  location?: string;
  rating?: number;
  review_count?: number;
  created_at?: string;
  service_variants?: Service[];
}

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_profile?: {
    full_name: string;
    avatar_url: string;
  };
}

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

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const { user } = useAuth();
  
  // Add fallback for theme context
  let colors;
  let isDarkMode = false;
  
  try {
    const themeContext = useTheme();
    colors = themeContext.theme;
    isDarkMode = themeContext.isDarkMode;
  } catch (error) {
    // Fallback to light theme if theme context is not available
    colors = LightTheme;
    isDarkMode = false;
  }
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('My Services');
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Calculate average rating from reviews
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  // Set initial active tab based on whether user is viewing their own profile
  useEffect(() => {
    if (user && userId) {
      if (user.id === userId) {
        // User is viewing their own profile - can show "I'm Hiring" tab
        setActiveTab('My Services'); // Default to "My Services" for own profile
      } else {
        // User is viewing another user's profile - hide "I'm Hiring" tab
        setActiveTab('My Services'); // Default to "My Services" for other users
      }
    }
  }, [user, userId]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId || typeof userId !== 'string') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch user profile from both tables
        const [profileResult, userProfileResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle(),
          supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
        ]);

        if (profileResult.error && profileResult.error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', profileResult.error);
          Alert.alert('Error', 'User profile not found');
          router.back();
          return;
        }

        if (userProfileResult.error && userProfileResult.error.code !== 'PGRST116') {
          console.error('Error fetching user profile data:', userProfileResult.error);
        }

        // Merge profile data, prioritizing profiles table but falling back to user_profiles
        const mergedProfileData = {
          // Start with profile data (if exists)
          ...profileResult.data,
          // If no profile data, use user_profile data as fallback for basic fields
          ...(profileResult.data ? {} : {
            id: userId,
            full_name: userProfileResult.data?.full_name || 'User',
            avatar_url: userProfileResult.data?.avatar_url,
            bio: userProfileResult.data?.bio,
            phone: userProfileResult.data?.phone,
            location: userProfileResult.data?.location,
            date_of_birth: userProfileResult.data?.date_of_birth,
            gender: userProfileResult.data?.gender,
            created_at: userProfileResult.data?.created_at,
            updated_at: userProfileResult.data?.updated_at,
          }),
          // Include service provider fields from user_profiles
          is_service_provider: profileResult.data?.is_service_provider || userProfileResult.data?.is_service_provider || userProfileResult.data?.is_seller || false,
          service_provider_badge: profileResult.data?.service_provider_badge || userProfileResult.data?.seller_badge,
          service_provider_badge_subtitle: profileResult.data?.service_provider_badge_subtitle || userProfileResult.data?.seller_badge_subtitle,
          service_provider_description: profileResult.data?.service_provider_description || userProfileResult.data?.seller_description,
          rating: profileResult.data?.rating || userProfileResult.data?.rating || 0,
          review_count: profileResult.data?.review_count || userProfileResult.data?.review_count || 0,
          verification_status: profileResult.data?.verification_status || userProfileResult.data?.verification_status || 'not_started',
        };

        setUserProfile(mergedProfileData);

        // Fetch user's services
        try {
          // Get all services and filter for current user to include variants
          const allServices = await ServiceService.getAllServices();
          const userServices = allServices.filter(service => service.user_id === userId);
          setServices(userServices);
        } catch (error) {
          console.error('Error fetching services:', error);
          setServices([]);
        }

        // Fetch reviews for this user (as reviewee)
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('reviewee_id', userId)
          .order('created_at', { ascending: false });

        if (reviewsError) {
          console.error('Error fetching reviews:', reviewsError);
          setReviews([]);
        } else {
          // Fetch reviewer profiles for reviews
          if (reviewsData && reviewsData.length > 0) {
            const reviewerIds = reviewsData.map(review => review.reviewer_id);
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .in('id', reviewerIds);

            const reviewsWithProfiles = reviewsData.map(review => ({
              ...review,
              reviewer_profile: profilesData?.find(p => p.id === review.reviewer_id)
            }));
            setReviews(reviewsWithProfiles);
          } else {
            setReviews([]);
          }
        }

        // Check if current user has favorited this user
        if (user && user.id !== userId) {
          const favorited = await UserFavoritesService.isFavorited(user.id, userId);
          setIsFavorited(favorited);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId, router, user]);

  const handleChatWithUser = () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to chat with this user.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }
    router.push(`/chat/${userId}`);
  };

  const handleShareProfile = async () => {
    if (!userProfile) return;

    try {
      const shareUrl = `https://betame.app/user/${userProfile.id}`;
      await Share.share({
        message: `Check out ${userProfile.full_name}'s profile on BetaMe: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to add users to your favorites.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }

    if (!userId || typeof userId !== 'string') return;

    try {
      setFavoriteLoading(true);
      const result = await UserFavoritesService.toggleFavorite(user.id, userId);
      
      if (result.success) {
        setIsFavorited(result.isFavorited);
        Alert.alert(
          result.isFavorited ? 'Added to Favorites' : 'Removed from Favorites',
          result.isFavorited 
            ? `${userProfile?.full_name} has been added to your favorites.`
            : `${userProfile?.full_name} has been removed from your favorites.`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={12}
            color={star <= rating ? "#FFD700" : "#E5E5EA"}
            fill={star <= rating ? "#FFD700" : "transparent"}
          />
        ))}
      </View>
    );
  };

  const renderVerificationTick = () => {
    if (!userProfile?.verification_status && !userProfile?.is_verified) return null;

    const getTickColor = (status: string, isVerified: boolean) => {
      // Check if user has services (service provider)
      const hasServiceListing = services.length > 0;
      
      if (isVerified) {
        return hasServiceListing ? '#10B981' : '#3B82F6'; // Green for service providers, blue for verified users
      }
      
      switch (status) {
        case 'verified':
          return hasServiceListing ? '#10B981' : '#3B82F6'; // Green for service providers, blue for verified users
        case 'in_progress':
          return '#F59E0B'; // Orange for in progress
        case 'rejected':
          return '#EF4444'; // Red for rejected
        default:
          return '#9CA3AF'; // Gray for not started
      }
    };

    const getTickIcon = (status: string, isVerified: boolean) => {
      if (isVerified) {
        return <CheckCircle size={16} color={getTickColor(status, isVerified)} />;
      }
      
      switch (status) {
        case 'verified':
          return <CheckCircle size={16} color={getTickColor(status, isVerified)} />;
        case 'in_progress':
          return <Clock size={16} color={getTickColor(status, isVerified)} />;
        case 'rejected':
          return <XCircle size={16} color={getTickColor(status, isVerified)} />;
        default:
          return <CheckCircle size={16} color={getTickColor(status, isVerified)} />;
      }
    };

    const getTooltipText = (status: string, isVerified: boolean) => {
      const hasServiceListing = services.length > 0;
      
      if (isVerified) {
        return hasServiceListing ? 'Verified Service Provider' : 'Verified User';
      }
      
      switch (status) {
        case 'verified':
          return hasServiceListing ? 'Verified Service Provider' : 'Verified User';
        case 'in_progress':
          return 'Verification In Progress';
        case 'rejected':
          return 'Verification Rejected';
        default:
          return 'Verification Not Started';
      }
    };

    const verificationStatus = userProfile?.verification_status || (userProfile?.is_verified ? 'verified' : 'not_started');
    const isVerified = userProfile?.is_verified || userProfile?.verification_status === 'verified';

    return (
      <TouchableOpacity 
        style={styles.verificationTick}
        onPress={() => {
          Alert.alert(
            'Verification Status',
            getTooltipText(verificationStatus, isVerified),
            [{ text: 'OK' }]
          );
        }}
        activeOpacity={0.7}
      >
        {getTickIcon(verificationStatus, isVerified)}
      </TouchableOpacity>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'I\'m Hiring':
        return (
          <View style={styles.tabContentContainer}>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              No job listings yet
            </Text>
          </View>
        );
      case 'My Services':
        return (
          <View style={styles.tabContentContainer}>
            {services.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                No services listed yet
              </Text>
            ) : (
              services.map((service) => {
                // Check if this service has variants
                const hasVariants = service.service_variants && service.service_variants.length > 0;
                
                return (
                  <View key={service.id}>
                    {/* Main Service Header */}
                    <View style={[styles.mainServiceHeader, { backgroundColor: colors.background.secondary }]}>
                      <Text style={[styles.mainServiceTitle, { color: colors.text.primary }]}>
                        {service.title}
                      </Text>
                      <Text style={[styles.mainServiceDescription, { color: colors.text.primary }]} numberOfLines={2}>
                        {service.description}
                      </Text>
                    </View>
                    
                    {/* Service Variants */}
                    {hasVariants && service.service_variants!.map((variant) => (
                      <View key={variant.id} style={[styles.serviceCard, { backgroundColor: colors.background.secondary }]}>
                        <Text style={[styles.serviceTitle, { color: colors.text.primary }]}>
                          {variant.title}
                        </Text>
                        <Text style={[styles.serviceDescription, { color: colors.text.primary }]} numberOfLines={2}>
                          {variant.description}
                        </Text>
                        <Text style={[styles.servicePrice, { color: colors.primary.main }]}>
                          From {variant.currency}{variant.price}
                        </Text>
                      </View>
                    ))}
                    
                    {/* If no variants, show the main service as a regular card */}
                    {!hasVariants && (
                      <View style={[styles.serviceCard, { backgroundColor: colors.background.secondary }]}>
                        <Text style={[styles.serviceTitle, { color: colors.text.primary }]}>
                          {service.title}
                        </Text>
                        <Text style={[styles.serviceDescription, { color: colors.text.primary }]} numberOfLines={2}>
                          {service.description}
                        </Text>
                        <Text style={[styles.servicePrice, { color: colors.primary.main }]}>
                          From {service.currency}{service.price}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        );
      case 'Reviews':
        return (
          <View style={styles.tabContentContainer}>
            {reviews.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                No reviews yet
              </Text>
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.background.secondary }]}>
                  <View style={styles.reviewHeader}>
                    <Image
                      source={{ 
                        uri: review.reviewer_profile?.avatar_url || undefined,
                      }}
                      style={styles.reviewerAvatar}
                    />
                    <View style={styles.reviewerInfo}>
                      <Text style={[styles.reviewerName, { color: colors.text.primary }]}>
                        {review.reviewer_profile?.full_name || 'Anonymous'}
                      </Text>
                      {renderStars(review.rating)}
                    </View>
                  </View>
                  <Text style={[styles.reviewComment, { color: colors.text.primary }]}>
                    {review.comment}
                  </Text>
                </View>
              ))
            )}
          </View>
        );
      default:
        return null;
    }
  };

  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth > 768;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text.primary }]}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
      >
        {/* Desktop Container */}
        <View style={[isDesktop && styles.desktopContainer]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.background.primary }, isDesktop && styles.headerDesktop]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: colors.text.primary }, isDesktop && styles.headerTitleDesktop]}>Profile</Text>
            </View>
            <View style={styles.headerRight}>
              {user && user.id !== userId && (
                <TouchableOpacity 
                  style={[styles.headerIcon, isDesktop && styles.headerIconDesktop]}
                  onPress={handleToggleFavorite}
                  disabled={favoriteLoading}
                >
                  <Heart 
                    size={24} 
                    color={isFavorited ? '#FF6B6B' : colors.text.primary}
                    fill={isFavorited ? '#FF6B6B' : 'transparent'}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.headerIcon, isDesktop && styles.headerIconDesktop]}
                onPress={handleShareProfile}
              >
                <ShareIcon size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Section */}
          <View style={[styles.profileHeader, isDesktop && styles.profileHeaderDesktop]}>
            <View style={[styles.profileBackgroundContainer, isDesktop && styles.profileBackgroundContainerDesktop]}>
              {userProfile.avatar_url ? (
                <Image
                  source={{ uri: userProfile.avatar_url }}
                  style={styles.profileBackgroundImage}
                />
              ) : (
                <View style={styles.profileBackgroundPlaceholder}>
                  <User size={isDesktop ? 120 : 80} color={isDarkMode ? "white" : "black"} />
                </View>
              )}
              <LinearGradient
                colors={isDarkMode 
                  ? ['transparent', 'transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,1.0)']
                  : ['transparent', 'transparent', 'rgba(241,248,255,0.4)', 'rgba(255,255,255,1.0)']
                }
                style={styles.profileBackgroundGradient}
              />
              
              <View style={[styles.profileContent, isDesktop && styles.profileContentDesktop]}>
                <BlurView intensity={20} style={[styles.blurContainer, isDesktop && styles.blurContainerDesktop]}>
                  <View style={[styles.profileInfo, isDesktop && styles.profileInfoDesktop]}>
                    <Text style={[styles.userName, { color: 'white' }, isDesktop && styles.userNameDesktop]}>
                      {userProfile.full_name || 'User'}
                    </Text>
                    {userProfile.bio && (
                      <Text style={[styles.userBio, { color: '#3B82F6' }, isDesktop && styles.userBioDesktop]}>{userProfile.bio}</Text>
                    )}
                    <Text style={[styles.joinedDate, { color: 'white' }, isDesktop && styles.joinedDateDesktop]}>
                      {formatJoinedDate(userProfile.created_at)}
                    </Text>
                    <View style={styles.ratingContainer}>
                      <Text style={[styles.ratingText, { color: 'black' }]}>{averageRating > 0 ? averageRating.toFixed(1) : 'No rating'}</Text>
                      {renderVerificationTick()}
                      {averageRating > 0 && renderStars(averageRating)}
                      <Text style={[styles.reviewText, { color: 'black' }]}>({reviews.length} reviews)</Text>
                    </View>
                  </View>
                </BlurView>
              </View>
            </View>
          </View>

          {/* Two Column Layout for Desktop */}
          {isDesktop ? (
            <View style={styles.desktopTwoColumnLayout}>
              {/* Left Column - Action Buttons */}
              <View style={styles.desktopLeftColumn}>
                {/* Action Buttons */}
                <View style={[styles.actionButtons, { backgroundColor: colors.background.primary }, isDesktop && styles.actionButtonsDesktop]}>
                  {user && user.id !== userId ? (
                    <TouchableOpacity 
                      style={[styles.chatButton, { backgroundColor: colors.primary.main }, isDesktop && styles.chatButtonDesktop]}
                      onPress={handleChatWithUser}
                    >
                      <MessageCircle size={20} color={colors.text.white} />
                      <Text style={[styles.chatButtonText, { color: colors.text.white }]}>Chat to enquire</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.chatButton, { backgroundColor: colors.primary.main }, isDesktop && styles.chatButtonDesktop]}
                      onPress={() => router.push('/messages')}
                    >
                      <Text style={[styles.chatButtonText, { color: colors.text.white }]}>View Chat</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: colors.background.secondary, borderWidth: 1, borderColor: colors.border.main }, isDesktop && styles.actionButtonDesktop]}
                    onPress={handleShareProfile}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Share Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Right Column - Content */}
              <View style={styles.desktopRightColumn}>
                {/* Tab Navigation */}
                <View style={[styles.tabNavigation, { backgroundColor: colors.background.primary }, isDesktop && styles.tabNavigationDesktop]}>
                  {(() => {
                    // Show all tabs for own profile, hide "I'm Hiring" for other users
                    const tabs = user && user.id === userId 
                      ? ['I\'m Hiring', 'My Services', 'Reviews']
                      : ['My Services', 'Reviews'];
                    
                    // If current active tab is "I'm Hiring" but we're viewing another user, switch to "My Services"
                    if (activeTab === 'I\'m Hiring' && user && user.id !== userId) {
                      setActiveTab('My Services');
                    }
                    
                    return tabs.map((tab) => (
                      <TouchableOpacity
                        key={tab}
                        style={[
                          styles.tab,
                          activeTab === tab && { borderBottomColor: colors.primary.main },
                          isDesktop && styles.tabDesktop,
                        ]}
                        onPress={() => setActiveTab(tab)}
                      >
                        <Text
                          style={[
                            styles.tabText,
                            { 
                              color: activeTab === tab 
                                ? colors.text.primary  // Use primary text color for better contrast
                                : colors.text.secondary 
                            },
                            activeTab === tab && styles.activeTabText,
                            isDesktop && styles.tabTextDesktop,
                          ]}
                        >
                          {tab}
                        </Text>
                      </TouchableOpacity>
                    ));
                  })()}
                </View>

                {/* Tab Content */}
                <View style={[styles.tabContent, { backgroundColor: colors.background.primary }, isDesktop && styles.tabContentDesktop]}>
                  {renderTabContent()}
                </View>
              </View>
            </View>
          ) : (
            /* Mobile Layout - Single Column */
            <>
              {/* Action Buttons */}
              <View style={[styles.actionButtons, { backgroundColor: colors.background.primary }, isDesktop && styles.actionButtonsDesktop]}>
                {user && user.id !== userId ? (
                  <TouchableOpacity 
                    style={[styles.chatButton, { backgroundColor: colors.primary.main }, isDesktop && styles.chatButtonDesktop]}
                    onPress={handleChatWithUser}
                  >
                    <MessageCircle size={20} color={colors.text.white} />
                    <Text style={[styles.chatButtonText, { color: colors.text.white }]}>Chat to enquire</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.chatButton, { backgroundColor: colors.primary.main }, isDesktop && styles.chatButtonDesktop]}
                    onPress={() => router.push('/messages')}
                  >
                    <Text style={[styles.chatButtonText, { color: colors.text.white }]}>View Chat</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: colors.background.secondary, borderWidth: 1, borderColor: colors.border.main }, isDesktop && styles.actionButtonDesktop]}
                  onPress={handleShareProfile}
                >
                  <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Share Profile</Text>
                </TouchableOpacity>
              </View>

              {/* Tab Navigation */}
              <View style={[styles.tabNavigation, { backgroundColor: colors.background.primary }, isDesktop && styles.tabNavigationDesktop]}>
                {(() => {
                  // Show all tabs for own profile, hide "I'm Hiring" for other users
                  const tabs = user && user.id === userId 
                    ? ['I\'m Hiring', 'My Services', 'Reviews']
                    : ['My Services', 'Reviews'];
                  
                  // If current active tab is "I'm Hiring" but we're viewing another user, switch to "My Services"
                  if (activeTab === 'I\'m Hiring' && user && user.id !== userId) {
                    setActiveTab('My Services');
                  }
                  
                  return tabs.map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.tab,
                        activeTab === tab && { borderBottomColor: colors.primary.main },
                        isDesktop && styles.tabDesktop,
                      ]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          { 
                            color: activeTab === tab 
                              ? colors.text.primary  // Use primary text color for better contrast
                              : colors.text.secondary 
                          },
                          activeTab === tab && styles.activeTabText,
                          isDesktop && styles.tabTextDesktop,
                        ]}
                      >
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ));
                })()}
              </View>

              {/* Tab Content */}
              <View style={[styles.tabContent, { backgroundColor: colors.background.primary }, isDesktop && styles.tabContentDesktop]}>
                {renderTabContent()}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  scrollContentDesktop: {
    maxWidth: 1000,
    marginHorizontal: 'auto',
    paddingBottom: 20,
  },
  desktopContainer: {
    maxWidth: 1000,
    marginHorizontal: 'auto',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerDesktop: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 0,
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    width: 80,
    justifyContent: 'flex-end',
  },
  headerIcon: {
    marginLeft: 15,
  },
  headerIconDesktop: {
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitleDesktop: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileHeader: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginTop: 0,
  },
  profileHeaderDesktop: {
    marginTop: 10,
  },
  profileBackgroundContainer: {
    position: 'relative',
    width: '100%',
    height: 280,
    overflow: 'hidden',
    marginTop: 0,
    marginLeft: 0,
  },
  profileBackgroundContainerDesktop: {
    height: 200,
  },
  profileBackgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileBackgroundPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBackgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  profileContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileContentDesktop: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  blurContainer: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: -50,
    overflow: 'hidden',
  },
  blurContainerDesktop: {
    marginHorizontal: 20,
    marginBottom: -30,
  },
  profileInfo: {
    alignItems: 'flex-end',
    width: '100%',
  },
  profileInfoDesktop: {
    alignItems: 'flex-end',
    width: '100%',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
    color: 'white',
  },
  userNameDesktop: {
    fontSize: 28,
    marginBottom: 8,
  },
  userBio: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'right',
    color: 'white',
  },
  userBioDesktop: {
    fontSize: 16,
    marginBottom: 8,
  },
  joinedDate: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 8,
    textAlign: 'right',
    color: 'rgba(255,255,255,0.8)',
  },
  joinedDateDesktop: {
    fontSize: 14,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    color: 'white',
    textAlign: 'left',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  reviewText: {
    fontSize: 14,
    marginLeft: 8,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'left',
  },
  actionButtons: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButtonsDesktop: {
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
  },
  chatButtonDesktop: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDesktop: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabNavigation: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tabNavigationDesktop: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabDesktop: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextDesktop: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: '700',
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  tabContentDesktop: {
    paddingHorizontal: 20,
  },
  tabContentContainer: {
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  mainServiceHeader: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mainServiceTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  mainServiceDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  serviceCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginLeft: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
  },
  desktopTwoColumnLayout: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
  },
  desktopLeftColumn: {
    width: 300,
    flexShrink: 0,
  },
  desktopRightColumn: {
    flex: 1,
  },
  verificationTick: {
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 5,
  },
});