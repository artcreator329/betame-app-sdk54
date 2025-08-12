import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Share, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, User, MessageCircle, Settings } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColors, useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ServiceService, Service } from '@/lib/service-service';
import { Service as UIService } from '@/types/service';
import ServiceCard from '@/components/ServiceCard';
import { LinearGradient } from 'expo-linear-gradient';

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

interface UserProfile {
  id: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  created_at: string;
}

export default function UserProfileScreen() {
  const [activeTab, setActiveTab] = useState('Services');
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const { user } = useAuth();
  const colors = useColors();
  const { isDarkMode } = useTheme();

  const targetUserId = Array.isArray(userId) ? userId[0] : userId;

  // Calculate average rating from reviews
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  const fetchUserProfile = useCallback(async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        Alert.alert('Error', 'User profile not found');
        router.back();
        return;
      }

      setUserProfile(profileData);

      // Fetch user's services (only visible ones)
      const allServices = await ServiceService.getAllServices();
      const userServices = allServices.filter(service => 
        service.user_id === targetUserId && service.show_on_profile !== false
      );
      setServices(userServices);

      // Fetch reviews for this user (as reviewee)
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', targetUserId)
        .order('created_at', { ascending: false });

      // Fetch reviewer profiles separately
      if (reviewsData && reviewsData.length > 0) {
        const reviewerIds = reviewsData.map(review => review.reviewer_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', reviewerIds);

        const reviewsWithProfiles = reviewsData.map(review => ({
          ...review,
          reviewer_profile: profilesData?.find(profile => profile.id === review.reviewer_id)
        }));
        setReviews(reviewsWithProfiles || []);
      }

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, router]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleSettings = () => {
    // Navigate to settings or show settings modal
    router.push('/settings');
  };

  const handleStartChat = () => {
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
    
    if (!targetUserId) return;
    router.push(`/chat/${targetUserId}`);
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={12}
            color="#FFD700"
            fill={star <= rating ? "#FFD700" : "transparent"}
          />
        ))}
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Services':
        if (loading) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading services...</Text>
            </View>
          );
        }
        return (
          <View style={styles.servicesContent}>
            <Text style={[styles.availableListings, { color: colors.text.secondary }]}>Available Services ({services.length})</Text>
            {services.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>No services available</Text>
              </View>
            ) : (
              services
                .filter(service => service.id)
                .map((service) => {
                  const uiService: UIService = {
                    id: service.id!,
                    title: service.title,
                    description: service.description,
                    price: service.price,
                    currency: service.currency,
                    image_url: service.image_url || undefined,
                    category_name: service.category_name || 'General',
                    location: service.location || '',
                    is_nearby: service.is_nearby || false,
                    is_trending: service.is_trending || false,
                    rating: service.rating || 0,
                    review_count: service.review_count || 0,
                    created_at: service.created_at || '',
                    updated_at: service.updated_at || '',
                    user_id: service.user_id,
                    service_variants: service.service_variants || [],
                    provider_name: userProfile?.full_name || 'User',
                    provider_avatar: userProfile?.avatar_url,
                    latitude: service.latitude,
                    longitude: service.longitude,
                    parent_service_id: service.parent_service_id,
                    show_on_profile: service.show_on_profile ?? true
                  };
                  
                  return (
                    <ServiceCard
                      key={service.id}
                      service={uiService}
                      showEditButton={false}
                      showProfileToggle={false}
                      userProfileAvatar={userProfile?.avatar_url}
                    />
                  );
                })
            )}
          </View>
        );
      case 'Reviews':
        if (loading) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading reviews...</Text>
            </View>
          );
        }
        return (
          <View style={styles.reviewsContainer}>
            {reviews.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>No reviews yet</Text>
              </View>
            ) : (
              reviews.map((review) => (
                <TouchableOpacity key={review.id} style={[styles.reviewCard, { backgroundColor: colors.background.secondary }]}>
                  <View style={styles.reviewHeader}>
                    <Image
                      source={{ uri: review.reviewer_profile?.avatar_url || undefined }}
                      style={styles.reviewerImage}
                    />
                    <View style={styles.reviewerInfo}>
                      <Text style={[styles.reviewerName, { color: colors.text.primary }]}>
                        {review.reviewer_profile?.full_name || 'Anonymous User'}
                      </Text>
                      <View style={styles.ratingContainer}>
                        <Text style={[styles.ratingText, { color: colors.text.primary }]}>{review.rating.toFixed(1)}</Text>
                        {renderStars(review.rating)}
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.reviewText, { color: colors.text.secondary }]}>{review.comment || 'No comment provided'}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        );
      default:
        return null;
    }
  };

  if (loading && !userProfile) {
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
          <Text style={[styles.errorText, { color: colors.text.primary }]}>Profile not found</Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.primary.main }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: colors.text.white }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.primary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Profile</Text>
        <TouchableOpacity onPress={handleShareProfile}>
          <Text style={[styles.shareText, { color: colors.primary.main }]}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: colors.background.primary }}
      >
        {/* Profile Section */}
        <View style={styles.profileHeader}>
          <View style={styles.profileBackgroundContainer}>
            {userProfile.avatar_url ? (
              <Image
                source={{ uri: userProfile.avatar_url }}
                style={styles.profileBackgroundImage}
              />
            ) : (
              <View style={styles.profileBackgroundPlaceholder}>
                <User size={80} color={isDarkMode ? "white" : "black"} />
              </View>
            )}
            <LinearGradient
              colors={isDarkMode 
                ? ['transparent', 'transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,1.0)']
                : ['transparent', 'transparent', 'rgba(241,248,255,0.4)', 'rgba(255,255,255,1.0)']
              }
              style={styles.profileBackgroundGradient}
            />
            
            <View style={styles.profileContent}>
              <View style={styles.profileInfo}>
                <Text style={[styles.userName, { color: isDarkMode ? 'white' : 'black' }]}>
                  {userProfile.full_name || 'User'}
                </Text>
                {userProfile.bio && (
                  <Text style={[styles.userBio, { color: isDarkMode ? 'white' : 'black' }]}>{userProfile.bio}</Text>
                )}
                <View style={styles.ratingContainer}>
                  <Text style={[styles.ratingText, { color: isDarkMode ? 'white' : 'black' }]}>
                    {averageRating > 0 ? averageRating.toFixed(1) : 'No rating'}
                  </Text>
                  {averageRating > 0 && renderStars(averageRating)}
                  <Text style={[styles.reviewText, { color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }]}>
                    ({reviews.length} reviews)
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionButtons, { backgroundColor: colors.background.primary }]}>
          <TouchableOpacity 
            style={[styles.chatButton, { backgroundColor: colors.primary.main }]}
            onPress={handleStartChat}
          >
            <MessageCircle size={20} color={colors.text.white} />
            <Text style={[styles.chatButtonText, { color: colors.text.white }]}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabNavigation, { backgroundColor: colors.background.primary }]}>
          {['Services', 'Reviews'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: colors.primary.main },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.primary.main : colors.text.secondary },
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={[styles.tabContent, { backgroundColor: colors.background.primary }]}>
          {renderTabContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  shareText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileHeader: {
    height: 300,
    position: 'relative',
  },
  profileBackgroundContainer: {
    flex: 1,
    position: 'relative',
  },
  profileBackgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileBackgroundPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  profileBackgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  profileContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingTop: 20,
  },
  servicesContent: {
    paddingHorizontal: 20,
  },
  availableListings: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  reviewsContainer: {
    paddingHorizontal: 20,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});