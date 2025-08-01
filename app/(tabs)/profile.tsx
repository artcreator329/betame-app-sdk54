import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Share, Alert, ActivityIndicator, ActionSheetIOS, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Heart, Wallet, Trophy, Camera, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ImageService } from '@/lib/image-service';

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  rating: number;
  review_count: number;
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

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('Services');
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const router = useRouter();
  const { user, userProfile, updateProfile } = useAuth();

  // Calculate average rating from reviews
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  // Fetch user's services and reviews from Supabase
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (servicesError) {
          console.error('Error fetching services:', servicesError);
        } else {
          setServices(servicesData || []);
        }

        // Fetch reviews for this user (as reviewee)
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('reviewee_id', user.id)
          .order('created_at', { ascending: false });

        // Fetch reviewer profiles separately
        let reviewsWithProfiles = [];
        if (reviewsData && reviewsData.length > 0) {
          const reviewerIds = reviewsData.map(review => review.reviewer_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', reviewerIds);

          reviewsWithProfiles = reviewsData.map(review => ({
            ...review,
            reviewer_profile: profilesData?.find(profile => profile.id === review.reviewer_id)
          }));
        }

        if (reviewsError) {
          console.error('Error fetching reviews:', reviewsError);
        } else {
          setReviews(reviewsWithProfiles || []);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleShareProfile = async () => {
    try {
      const result = await Share.share({
        message: "Check out Anvenia Tan's profile on BetaMe!\n\nBelieve in God ❤️\n\nDownload the app to connect with amazing service providers!",
        title: "Anvenia Tan's Profile",
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share profile. Please try again.');
    }
  };

  const handleCameraPress = () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to upload a profile photo.');
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleTakePhoto();
          } else if (buttonIndex === 2) {
            handleChoosePhoto();
          }
        }
      );
    } else {
      // For Android, show a simple alert with options
      Alert.alert(
        'Update Profile Photo',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: handleTakePhoto },
          { text: 'Choose from Gallery', onPress: handleChoosePhoto },
        ]
      );
    }
  };

  const handleTakePhoto = async () => {
    try {
      setUploadingPhoto(true);
      const result = await ImageService.takeProfilePhoto(user!.id);
      
      if (result.success && result.url) {
        // Update the user profile with the new avatar URL
        await updateProfile({ avatar_url: result.url });
        Alert.alert('Success', 'Profile photo updated successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to upload photo. Please try again.');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChoosePhoto = async () => {
    try {
      setUploadingPhoto(true);
      const result = await ImageService.uploadProfilePhoto(user!.id);
      
      if (result.success && result.url) {
        // Update the user profile with the new avatar URL
        await updateProfile({ avatar_url: result.url });
        Alert.alert('Success', 'Profile photo updated successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to upload photo. Please try again.');
      }
    } catch (error) {
      console.error('Error choosing photo:', error);
      Alert.alert('Error', 'Failed to choose photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const mockReviews = [
    {
      id: '1',
      reviewerName: 'Syafiqah',
      reviewerImage: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5.0,
      reviewText: 'Great teacher, always love to attend her class',
    },
    {
      id: '2',
      reviewerName: 'Rosli Yahya',
      reviewerImage: 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5.0,
      reviewText: 'Your dedication to your students and your hard work do not go unnoticed. Thank you for going the extra mile to ensure we succeed.',
    },
    {
      id: '3',
      reviewerName: 'Kimberly Yap',
      reviewerImage: 'https://images.pexels.com/photos/3807738/pexels-photo-3807738.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5.0,
      reviewText: 'Thank you very much for the effort you have put into teaching me, I have enjoyed and learned from every lesson you have taught me',
    },
    {
      id: '4',
      reviewerName: 'Anvenia Tan',
      reviewerImage: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5.0,
      reviewText: 'Thank you Ms. Jeslina! It was wonderful to attend your class',
    },
  ];

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
      case 'Jobs (Hiring)':
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>You do not have any job postings</Text>
            <Text style={styles.emptyStateSuggestion}>Why don't you post your first job?</Text>
          </View>
        );
      case 'Services':
        if (loading) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1D1D1F" />
              <Text style={styles.loadingText}>Loading services...</Text>
            </View>
          );
        }
        return (
          <View style={styles.servicesContent}>
            <Text style={styles.availableListings}>Available Listings ({services.length})</Text>
            {services.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>You don't have any services yet</Text>
                <Text style={styles.emptyStateSuggestion}>Create your first service listing!</Text>
              </View>
            ) : (
              services.map((service) => (
                <View key={service.id} style={styles.serviceItem}>
                  <Image source={{ uri: service.image_url || 'https://via.placeholder.com/80' }} style={styles.serviceImage} />
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceTitle}>{service.title}</Text>
                    <Text style={styles.serviceDescription} numberOfLines={3}>
                      {service.description}
                    </Text>
                    <View style={styles.servicePricing}>
                      <Text style={styles.servicePrice}>From {service.currency}{service.price}</Text>
                      <TouchableOpacity style={styles.seeOfferButton}>
                        <Text style={styles.seeOfferText}>See Offer!</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        );
      case 'Reviews':
        if (loading) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1D1D1F" />
              <Text style={styles.loadingText}>Loading reviews...</Text>
            </View>
          );
        }
        return (
          <View style={styles.reviewsContainer}>
            {reviews.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No reviews yet</Text>
                <Text style={styles.emptyStateSuggestion}>Complete some services to get your first review!</Text>
              </View>
            ) : (
              reviews.map((review) => (
                <TouchableOpacity key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Image
                      source={{ uri: review.reviewer_profile?.avatar_url || 'https://via.placeholder.com/40' }}
                      style={styles.reviewerImage}
                    />
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>
                        {review.reviewer_profile?.full_name || 'Anonymous User'}
                      </Text>
                      <View style={styles.ratingContainer}>
                        <Text style={styles.ratingText}>{review.rating.toFixed(1)}</Text>
                        {renderStars(review.rating)}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{review.comment || 'No comment provided'}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.headerIcon}>
              <Wallet size={24} color="#1D1D1F" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIcon}
              onPress={() => router.push('/check-in')}
            >
              <Trophy size={24} color="#1D1D1F" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon}>
              <Heart size={24} color="#1D1D1F" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIcon}
              onPress={() => router.push('/settings')}
            >
              <Settings size={24} color="#1D1D1F" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {userProfile?.bio && (
            <View style={styles.sellerBadge}>
              <Text style={styles.sellerBadgeText}>{userProfile.bio}</Text>
            </View>
          )}
          
          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri: userProfile?.avatar_url || 'https://via.placeholder.com/100',
              }}
              style={styles.profileImage}
            />
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={handleCameraPress}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Camera size={16} color="white" />
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>
            {userProfile?.full_name || 'User'}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{averageRating > 0 ? averageRating.toFixed(1) : 'No rating'}</Text>
            {averageRating > 0 && renderStars(averageRating)}
            <Text style={styles.reviewText}>({reviews.length} reviews)</Text>
          </View>
          {userProfile?.tagline && (
            <Text style={styles.userTagline}>{userProfile.tagline}</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={() => router.push('/chat/jeslina-kong')}
          >
            <Text style={styles.chatButtonText}>Chat to enquire</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShareProfile}
          >
            <Text style={styles.actionButtonText}>Share Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          {['Jobs (Hiring)', 'Services', 'Reviews'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: 'white',
  },
  headerLeft: {
    flexDirection: 'row',
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginHorizontal: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'white',
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
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1D1D1F',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginRight: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  userTagline: {
    fontSize: 16,
    color: '#8E8E93',
  },
  sellerBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  sellerBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 2,
  },
  sellerBadgeSubtext: {
    fontSize: 12,
    color: '#1976D2',
  },
  actionButtons: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    gap: 8,
  },
  chatButton: {
    backgroundColor: '#1D1D1F',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editShareContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1D1D1F',
  },
  tabText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1D1D1F',
    fontWeight: '600',
  },
  tabContent: {
    backgroundColor: 'white',
    minHeight: 400,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSuggestion: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  reviewsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  reviewCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    color: '#1D1D1F',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  servicesContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  availableListings: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 16,
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
  serviceInfo: {
    flex: 1,
    padding: 12,
    paddingLeft: 0,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 8,
  },
  servicePricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  seeOfferButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  seeOfferText: {
    color: '#1D1D1F',
    fontSize: 12,
    fontWeight: '600',
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
});