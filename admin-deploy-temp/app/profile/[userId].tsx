import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, MapPin, Calendar, User, Share2, MessageCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useColors, useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ServiceService } from '@/lib/service-service';
import ServiceCard from '@/components/ServiceCard';
import ProfileShareModal from '@/components/ProfileShareModal';
import { LinearGradient } from 'expo-linear-gradient';

interface UserProfile {
  id: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  cover_photo_url?: string;
  created_at: string;
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
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const { isDarkMode } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Calculate average rating from reviews
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        Alert.alert('Error', 'Unable to load profile. Please try again.');
        router.back();
        return;
      }

      setProfile(profileData);

      // Fetch user's services (only visible ones)
      try {
        const allServices = await ServiceService.getAllServices();
        const userServices = allServices.filter(
          service => service.user_id === userId && service.show_on_profile !== false
        );
        setServices(userServices);
      } catch (error) {
        console.error('Error fetching services:', error);
        setServices([]);
      }

      // Fetch reviews for this user
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

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

        setReviews(reviewsWithProfiles);
      } else {
        setReviews([]);
      }

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
      }

    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Unable to load profile. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to start a conversation.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }

    if (user.id === userId) {
      Alert.alert('Info', 'You cannot start a chat with yourself.');
      return;
    }

    router.push(`/chat/${userId}`);
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text.primary }]}>
            Profile not found
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary.main }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: colors.text.white }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Profile
        </Text>
        <TouchableOpacity 
          onPress={() => setShareModalVisible(true)} 
          style={styles.headerButton}
        >
          <Share2 size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileBackgroundContainer}>
            {/* Cover Photo */}
            {profile.cover_photo_url ? (
              <Image
                source={{ uri: profile.cover_photo_url }}
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

            {/* Profile Photo */}
            <View style={styles.profilePhotoContainer}>
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.profilePhoto}
                />
              ) : (
                <View style={[styles.profilePhotoPlaceholder, { backgroundColor: colors.background.secondary }]}>
                  <User size={40} color={colors.text.secondary} />
                </View>
              )}
            </View>

            <View style={styles.profileContent}>
              <View style={styles.profileInfo}>
                <Text style={[styles.userName, { color: isDarkMode ? 'white' : 'black' }]}>
                  {profile.full_name}
                </Text>
                {profile.bio && (
                  <Text style={[styles.userBio, { color: isDarkMode ? 'white' : 'black' }]}>
                    {profile.bio}
                  </Text>
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
        {user?.id !== userId && (
          <View style={[styles.actionButtons, { backgroundColor: colors.background.primary }]}>
            <TouchableOpacity
              style={[styles.chatButton, { backgroundColor: colors.primary.main }]}
              onPress={handleStartChat}
            >
              <MessageCircle size={20} color="white" />
              <Text style={[styles.chatButtonText, { color: colors.text.white }]}>
                Start Chat
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Services Section */}
        {services.length > 0 && (
          <View style={styles.servicesSection}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Services ({services.length})
            </Text>
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={{
                  id: service.id,
                  title: service.title,
                  description: service.description,
                  price: service.price,
                  currency: service.currency,
                  image_url: service.image_url,
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
                  provider_name: profile.full_name,
                  provider_avatar: profile.avatar_url,
                  latitude: service.latitude,
                  longitude: service.longitude,
                  parent_service_id: service.parent_service_id,
                  show_on_profile: service.show_on_profile ?? true
                }}
                showEditButton={false}
                showProfileToggle={false}
              />
            ))}
          </View>
        )}

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <View style={styles.reviewsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Reviews ({reviews.length})
            </Text>
            {reviews.map((review) => (
              <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.background.secondary }]}>
                <View style={styles.reviewHeader}>
                  <Image
                    source={{ uri: review.reviewer_profile?.avatar_url || undefined }}
                    style={styles.reviewerImage}
                  />
                  <View style={styles.reviewerInfo}>
                    <Text style={[styles.reviewerName, { color: colors.text.primary }]}>
                      {review.reviewer_profile?.full_name || 'Anonymous User'}
                    </Text>
                    <View style={styles.reviewRatingContainer}>
                      <Text style={[styles.reviewRatingText, { color: colors.text.primary }]}>
                        {review.rating.toFixed(1)}
                      </Text>
                      {renderStars(review.rating)}
                    </View>
                  </View>
                </View>
                <Text style={[styles.reviewComment, { color: colors.text.secondary }]}>
                  {review.comment || 'No comment provided'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Share Modal */}
      <ProfileShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        userId={profile.id}
        userName={profile.full_name}
        userBio={profile.bio}
        userAvatar={profile.avatar_url}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileHeader: {
    marginBottom: 20,
  },
  profileBackgroundContainer: {
    height: 300,
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
    backgroundColor: '#f0f0f0',
  },
  profileBackgroundGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  profilePhotoContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  profilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  profileInfo: {
    marginLeft: 100,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 16,
    marginBottom: 8,
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
  reviewText: {
    fontSize: 14,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  chatButton: {
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
  servicesSection: {
    padding: 20,
  },
  reviewsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  reviewRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewRatingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
});