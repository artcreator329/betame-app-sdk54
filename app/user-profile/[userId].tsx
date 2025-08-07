import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, MessageCircle, User, Heart, Share as ShareIcon } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LightTheme } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { ServiceService } from '@/lib/service-service';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  tagline?: string;
  created_at: string;
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

  // Calculate average rating from reviews
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId || typeof userId !== 'string') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          Alert.alert('Error', 'User profile not found');
          router.back();
          return;
        }

        setUserProfile(profileData);

        // Fetch user's services
        try {
          const userServices = await ServiceService.getUserServices(userId);
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
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId, router]);

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
              services.map((service) => (
                <View key={service.id} style={[styles.serviceCard, { backgroundColor: colors.background.secondary }]}>
                  <Text style={[styles.serviceTitle, { color: colors.text.primary }]}>
                    {service.title}
                  </Text>
                  <Text style={[styles.serviceDescription, { color: colors.text.secondary }]} numberOfLines={2}>
                    {service.description}
                  </Text>
                  <Text style={[styles.servicePrice, { color: colors.primary.main }]}>
                    From {service.currency}{service.price}
                  </Text>
                </View>
              ))
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
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background.primary }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Profile</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon}>
              <Heart size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIcon}
              onPress={handleShareProfile}
            >
              <ShareIcon size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: colors.background.primary }]}>
          <View style={styles.profileContent}>
            <View style={styles.profileImageContainer}>
              {userProfile.avatar_url ? (
                <Image
                  source={{ uri: userProfile.avatar_url }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.defaultProfileIcon, { backgroundColor: colors.background.secondary }]}>
                  <User size={50} color={colors.text.secondary} />
                </View>
              )}
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: colors.text.primary }]}>
                {userProfile.full_name || 'User'}
              </Text>
              {userProfile.bio && (
                <Text style={[styles.userBio, { color: colors.text.primary }]} numberOfLines={3}>
                  {userProfile.bio}
                </Text>
              )}
              <View style={styles.ratingContainer}>
                <Text style={[styles.ratingText, { color: colors.text.primary }]}>
                  {averageRating > 0 ? averageRating.toFixed(1) : 'No rating'}
                </Text>
                {averageRating > 0 && renderStars(averageRating)}
                <Text style={[styles.reviewText, { color: colors.text.secondary }]}>
                  ({reviews.length} reviews)
                </Text>
              </View>
              {userProfile.tagline && (
                <Text style={[styles.userTagline, { color: colors.text.secondary }]}>
                  {userProfile.tagline}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionButtons, { backgroundColor: colors.background.primary }]}>
          {user && user.id !== userId ? (
            <TouchableOpacity 
              style={[styles.chatButton, { backgroundColor: colors.primary.main }]}
              onPress={handleChatWithUser}
            >
              <MessageCircle size={20} color={colors.text.white} />
              <Text style={[styles.chatButtonText, { color: colors.text.white }]}>Chat to enquire</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.chatButton, { backgroundColor: colors.primary.main }]}
              onPress={() => router.push('/messages')}
            >
              <Text style={[styles.chatButtonText, { color: colors.text.white }]}>View Chat</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.background.secondary }]}
            onPress={handleShareProfile}
          >
            <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Share Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabNavigation, { backgroundColor: colors.background.primary }]}>
          {['I\'m Hiring', 'My Services', 'Reviews'].map((tab) => (
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
                  { 
                    color: activeTab === tab 
                      ? colors.text.primary  // Use primary text color for better contrast
                      : colors.text.secondary 
                  },
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
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  sellerBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  sellerBadgeText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  defaultProfileIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
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
    color: '#1D1D1F',
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  userTagline: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actionButtons: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  chatButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    color: 'white',
  },
  tabContent: {
    paddingHorizontal: 20,
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
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  servicesContent: {
    flex: 1,
  },
  availableListings: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  serviceItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceImage: {
    width: 80,
    height: 80,
    margin: 12,
    borderRadius: 8,
  },
  // New styles for the updated profile page
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    width: 80,
  },
  headerIcon: {
    marginLeft: 15,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  defaultProfileIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'left',
  },
  userBio: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'left',
    lineHeight: 22,
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
  },
  reviewText: {
    fontSize: 14,
    marginLeft: 8,
  },
  userTagline: {
    fontSize: 16,
    textAlign: 'left',
    marginTop: 4,
  },
  tabContentContainer: {
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  serviceCard: {
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
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabNavigation: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  },
});