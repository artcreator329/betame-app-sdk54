import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Share, Alert, ActivityIndicator, ActionSheetIOS, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Heart, Wallet, Trophy, Camera, Star, MapPin, Calendar, User, Shield, Moon, Sun, Heart as HeartFilled, Settings as SettingsFilled, Sun as SunFilled, Moon as MoonFilled, Wallet as WalletFilled, Trophy as TrophyFilled } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useColors, useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ImageService } from '@/lib/image-service';
import { JobService, JobListing } from '@/lib/job-service';
import { Service as DBService, ServiceService } from '@/lib/service-service';
import { Service as UIService } from '@/types/service';
import ServiceCard from '@/components/ServiceCard';
import { adminService } from '@/lib/admin-service';
import { LinearGradient } from 'expo-linear-gradient';
import ProfileShareModal from '@/components/ProfileShareModal';
import { ReferralModal } from '@/components/ReferralModal';
import { ReferralStatsInline } from '@/components/ReferralStatsInline';
import { JobProposalNotifications } from '@/components/JobProposalNotifications';
import { JobNotificationService, JobNotificationPayload } from '@/lib/job-notification-service';




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
  const [activeTab, setActiveTab] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [jobListings, setJobListings] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdjustingPhoto, setIsAdjustingPhoto] = useState(false);
  const [photoType, setPhotoType] = useState<'cover' | 'profile'>('profile');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [unreadJobNotifications, setUnreadJobNotifications] = useState(0);
  const [jobNotificationService] = useState(() => JobNotificationService.getInstance());
  const router = useRouter();
  const { user, userProfile, updateProfile } = useAuth();
  const colors = useColors();
  const { isDarkMode, toggleTheme } = useTheme();

  // Calculate average rating from reviews
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  // Fetch user's services and reviews from Supabase
  const handleProfileVisibilityChange = useCallback(async (serviceId: string, isVisible: boolean) => {
    // Update the local state immediately for better UX
    setServices(prevServices =>
      prevServices.map(service =>
        service.id === serviceId
          ? { ...service, show_on_profile: isVisible }
          : service
      )
    );
  }, []);

  const fetchProfileData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    let userServices = [];
    let userJobs = [];
    let reviewsWithProfiles = [];

    try {
      setLoading(true);

      // Fetch user's services
      try {
        // Get all services and filter for current user to include variants
        const allServices = await ServiceService.getAllServices();
        userServices = allServices.filter(service => service.user_id === user.id);
        setServices(userServices);
      } catch (error) {
        console.error('Error fetching services:', error);
        setServices([]);
      }

      // Fetch reviews for this user (as reviewee)
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch reviewer profiles separately
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

      // Fetch user's job listings
      userJobs = await JobService.getUserJobs(user.id);
      setJobListings(userJobs);

    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);

      // Set default active tab based on available content
      if (!activeTab) {
        if (userJobs.length > 0) {
          setActiveTab('I\'m Hiring');
        } else if (userServices.length > 0) {
          setActiveTab('My Services');
        } else {
          setActiveTab('Reviews');
        }
      }
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user) {
      fetchProfileData();
      checkAdminStatus();
      setupJobNotifications();
    }
  }, [user]);

  const setupJobNotifications = async () => {
    if (!user) return;

    try {
      // Load initial unread count
      const unreadCount = await JobService.getUnreadActivityCount(user.id);
      setUnreadJobNotifications(unreadCount);

      // Subscribe to real-time updates (only if tables exist)
      if (unreadCount >= 0) { // If we got a valid response, tables exist
        const unsubscribe = await jobNotificationService.subscribeToJobProposalUpdates(
          user.id,
          (activity) => {
            console.log('New job activity received:', activity);
            
            // Update unread count
            setUnreadJobNotifications(prev => prev + 1);
            
            // Refresh job listings to show updated proposal counts
            fetchProfileData();
          }
        );

        // Cleanup subscription on unmount
        return () => {
          unsubscribe();
        };
      } else {
        console.log('ℹ️  Job proposal notifications not available - database migration needed');
      }
    } catch (error) {
      console.error('Error setting up job notifications:', error);
      console.log('ℹ️  Job proposal features will be limited until database migration is applied');
    }
  };

  const handleJobNotificationPress = (activity: any) => {
    // Mark notification as read and navigate to job details
    if (activity.job_listing_id) {
      router.push(`/job/${activity.job_listing_id}`);
    }
  };

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const adminStatus = await adminService.isAdmin(user.id);
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // Refetch profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchProfileData();
      }
    }, [user])
  );

  const handleShareProfile = () => {
    setShareModalVisible(true);
  };

  const handleCameraPress = () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to upload a photo.');
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Change Profile Photo', 'Change Cover Photo'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setPhotoType('profile');
            handlePhotoOptions('profile');
          } else if (buttonIndex === 2) {
            setPhotoType('cover');
            handlePhotoOptions('cover');
          }
        }
      );
    } else {
      // For Android, show a simple alert with options
      Alert.alert(
        'Update Photo',
        'Choose which photo to update',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Change Profile Photo', onPress: () => {
              setPhotoType('profile');
              handlePhotoOptions('profile');
            }
          },
          {
            text: 'Change Cover Photo', onPress: () => {
              setPhotoType('cover');
              handlePhotoOptions('cover');
            }
          },
        ]
      );
    }
  };

  const handlePhotoOptions = (type: 'cover' | 'profile') => {
    const photoTypeText = type === 'cover' ? 'Cover Photo' : 'Profile Photo';

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery', 'Remove Photo'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleTakePhoto(type);
          } else if (buttonIndex === 2) {
            handleChoosePhoto(type);
          } else if (buttonIndex === 3) {
            handleRemovePhoto(type);
          }
        }
      );
    } else {
      // For Android, show a simple alert with options
      Alert.alert(
        `Update ${photoTypeText}`,
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: () => handleTakePhoto(type) },
          { text: 'Choose from Gallery', onPress: () => handleChoosePhoto(type) },
          { text: 'Remove Photo', onPress: () => handleRemovePhoto(type) },
        ]
      );
    }
  };

  const handleTakePhoto = async (type: 'cover' | 'profile' = 'profile') => {
    try {
      setUploadingPhoto(true);
      const result = await ImageService.takeProfilePhoto(user!.id);

      if (result.success && result.url) {
        // Update the correct field based on photo type
        const updateData = type === 'cover' 
          ? { cover_photo_url: result.url }
          : { avatar_url: result.url };
        
        await updateProfile(updateData);
        const photoTypeText = type === 'cover' ? 'Cover photo' : 'Profile photo';
        Alert.alert('Success', `${photoTypeText} updated successfully!`);
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

  const handleChoosePhoto = async (type: 'cover' | 'profile' = 'profile') => {
    try {
      setUploadingPhoto(true);
      const result = await ImageService.uploadProfilePhoto(user!.id);

      if (result.success && result.url) {
        // Update the correct field based on photo type
        const updateData = type === 'cover' 
          ? { cover_photo_url: result.url }
          : { avatar_url: result.url };
        
        await updateProfile(updateData);
        const photoTypeText = type === 'cover' ? 'Cover photo' : 'Profile photo';
        Alert.alert('Success', `${photoTypeText} updated successfully!`);
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

  const handleRemovePhoto = async (type: 'cover' | 'profile' = 'profile') => {
    try {
      setUploadingPhoto(true);
      // Update the correct field based on photo type
      const updateData = type === 'cover' 
        ? { cover_photo_url: null }
        : { avatar_url: null };
      
      await updateProfile(updateData);
      const photoTypeText = type === 'cover' ? 'Cover photo' : 'Profile photo';
      Alert.alert('Success', `${photoTypeText} removed successfully!`);
    } catch (error) {
      console.error('Error removing photo:', error);
      Alert.alert('Error', 'Failed to remove photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAdjustPhoto = async () => {
    if (!userProfile?.avatar_url) {
      Alert.alert('Error', 'No profile photo to adjust. Please add a photo first.');
      return;
    }

    setIsAdjustingPhoto(true);
  };

  const handleSaveAdjustment = async () => {
    try {
      setUploadingPhoto(true);
      // Here you would implement the actual photo adjustment logic
      // For now, we'll simulate the adjustment process
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

      Alert.alert('Success', 'Profile photo position adjusted successfully!');
      setIsAdjustingPhoto(false);
    } catch (error) {
      console.error('Error adjusting photo:', error);
      Alert.alert('Error', 'Failed to adjust photo position. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCancelAdjustment = () => {
    setIsAdjustingPhoto(false);
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
      case 'I\'m Hiring':
        if (loading) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading job listings...</Text>
            </View>
          );
        }
        return (
          <View style={styles.tabSectionContainer}>
            <Text style={[styles.availableListings, { color: colors.text.secondary }]}>Job Postings ({jobListings.length})</Text>
            
            {/* Job Proposal Notifications */}
            {user && unreadJobNotifications > 0 && (
              <View style={[styles.notificationsContainer, { backgroundColor: colors.background.secondary }]}>
                <Text style={[styles.notificationsTitle, { color: colors.text.primary }]}>
                  Recent Activity
                </Text>
                <JobProposalNotifications
                  userId={user.id}
                  onNotificationPress={handleJobNotificationPress}
                  limit={5}
                />
              </View>
            )}
            {jobListings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>You do not have any job postings</Text>
                <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>Why don't you post your first job?</Text>
              </View>
            ) : (
              jobListings.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobItem}
                  onPress={() => {
                    if (!user) {
                      Alert.alert(
                        'Sign In Required',
                        'Please sign in to view job details.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Sign In', onPress: () => router.push('/auth/login') }
                        ]
                      );
                      return;
                    }
                    router.push(`/job/${job.id}`);
                  }}
                  activeOpacity={0.7}
                >
                  {job.cover_photo && (
                    <Image source={{ uri: job.cover_photo }} style={styles.jobImage} />
                  )}
                  <View style={[styles.jobInfo, { backgroundColor: colors.background.secondary }]}>
                    <View style={styles.jobHeader}>
                      <Text style={[styles.jobTitle, { color: colors.text.primary }]}>{job.title}</Text>
                      {/* Show proposal indicators */}
                      {job.pending_proposals && job.pending_proposals > 0 && (
                        <View style={[styles.proposalBadge, { backgroundColor: colors.primary.main }]}>
                          <Text style={[styles.proposalBadgeText, { color: colors.text.white }]}>
                            {job.pending_proposals} new
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={[styles.jobDescription, { color: colors.text.secondary }]} numberOfLines={2}>
                      {job.description}
                    </Text>
                    
                    {/* Enhanced proposal stats */}
                    {job.total_proposals && job.total_proposals > 0 && (
                      <View style={styles.proposalStats}>
                        <View style={styles.proposalStatItem}>
                          <Text style={[styles.proposalStatNumber, { color: colors.primary.main }]}>
                            {job.total_proposals}
                          </Text>
                          <Text style={[styles.proposalStatLabel, { color: colors.text.secondary }]}>
                            {job.total_proposals === 1 ? 'Proposal' : 'Proposals'}
                          </Text>
                        </View>
                        {job.unique_sellers && job.unique_sellers > 0 && (
                          <View style={styles.proposalStatItem}>
                            <Text style={[styles.proposalStatNumber, { color: colors.text.primary }]}>
                              {job.unique_sellers}
                            </Text>
                            <Text style={[styles.proposalStatLabel, { color: colors.text.secondary }]}>
                              {job.unique_sellers === 1 ? 'Applicant' : 'Applicants'}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                    
                    {job.location_address && (
                      <View style={styles.jobLocation}>
                        <MapPin size={14} color={colors.text.secondary} />
                        <Text style={[styles.jobLocationText, { color: colors.text.secondary }]}>{job.location_address}</Text>
                      </View>
                    )}
                    <View style={styles.jobDetails}>
                      <View style={styles.jobBudget}>
                        <Text style={[styles.jobBudgetText, { color: colors.text.primary }]}>
                          {job.payment_type === 'negotiable' ? 'Negotiable' : `${job.currency}${job.budget_amount} (${job.payment_type})`}
                        </Text>
                      </View>
                      <View style={styles.jobStatus}>
                        <Text style={[styles.jobStatusText, { color: job.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.jobMeta}>
                      <Calendar size={12} color={colors.text.secondary} />
                      <Text style={[styles.jobDate, { color: colors.text.secondary }]}>
                        {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Date not available'}
                      </Text>
                      {job.last_activity_date && (
                        <>
                          <Text style={[styles.jobDateSeparator, { color: colors.text.secondary }]}> • </Text>
                          <Text style={[styles.jobLastActivity, { color: colors.primary.main }]}>
                            Last activity: {new Date(job.last_activity_date).toLocaleDateString()}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary.main }]}
              onPress={() => router.push('/create-job-listing')}
            >
              <Text style={[styles.addButtonText, { color: colors.text.white }]}>Hire Someone Now</Text>
            </TouchableOpacity>
          </View>
        );
      case 'My Services':
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
            <Text style={[styles.availableListings, { color: colors.text.secondary }]}>Available Listings ({services.length})</Text>
            {services.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>You don't have any services yet</Text>
                <Text style={[styles.emptyStateSuggestion, { color: colors.text.secondary }]}>Create your first service listing!</Text>
              </View>
            ) : (
              services
                .filter(service => service.id) // Only include services with valid IDs
                .map((service, index) => {
                  const uiService: UIService = {
                    id: service.id!, // Non-null assertion since we filtered above
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
                    provider_name: 'You',
                    provider_avatar: undefined,
                    latitude: service.latitude,
                    longitude: service.longitude,
                    parent_service_id: service.parent_service_id,
                    show_on_profile: service.show_on_profile ?? true
                  };

                  return (
                    <ServiceCard
                      key={service.id}
                      service={uiService}
                      showEditButton={true}
                      showProfileToggle={true}
                      userProfileAvatar={userProfile?.avatar_url}
                      onProfileVisibilityChange={handleProfileVisibilityChange}
                    />
                  );
                })
            )}
            <TouchableOpacity
              style={[styles.addServiceButton, { backgroundColor: colors.primary.main }]}
              onPress={() => router.push('/create-service-listing')}
            >
              <Text style={[styles.addServiceButtonIcon, { color: colors.text.white }]}>+</Text>
              <Text style={[styles.addServiceButtonText, { color: colors.text.white }]}>Offer Your Best Service/Product Now</Text>
            </TouchableOpacity>
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
                <Text style={[styles.emptyStateSuggestion, { color: colors.text.secondary }]}>Complete some services to get your first review!</Text>
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

  // Show login prompt for non-authenticated users
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={[styles.loginPromptContainer, { backgroundColor: colors.background.primary }]}>
          <Text style={[styles.loginPromptTitle, { color: colors.text.primary }]}>Welcome to Your Profile</Text>
          <Text style={[styles.loginPromptText, { color: colors.text.secondary }]}>
            Sign in to view your profile, manage your services, and track your job listings.
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary.main }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={[styles.loginButtonText, { color: colors.text.white }]}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={[styles.skipButtonText, { color: colors.text.secondary }]}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={['left', 'right', 'bottom']}
    >
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: colors.background.primary }}
      >




        {/* Profile Section */}
        <View style={styles.profileHeader}>
          <View style={styles.profileBackgroundContainer}>
            {/* Cover Photo */}
            {userProfile?.cover_photo_url ? (
              <Image
                source={{ uri: userProfile.cover_photo_url }}
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

            {/* Circular Profile Photo */}
            <View style={styles.profilePhotoContainer}>
              {userProfile?.avatar_url ? (
                <Image
                  source={{ uri: userProfile.avatar_url }}
                  style={styles.profilePhoto}
                />
              ) : (
                <View style={[styles.profilePhotoPlaceholder, { backgroundColor: colors.background.secondary }]}>
                  <User size={40} color={colors.text.secondary} />
                </View>
              )}
              {/* Only show camera button when viewing own profile */}
              {user && userProfile && user.id === userProfile.id && (
                <TouchableOpacity
                  style={[styles.profilePhotoEditButton, { backgroundColor: colors.primary.main }]}
                  onPress={handleCameraPress}
                  disabled={uploadingPhoto}
                  activeOpacity={0.8}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Camera size={16} color="white" />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Left Side Icons - Vertical Stack */}
            <View style={styles.leftIconsContainer}>
              <TouchableOpacity
                style={styles.leftIcon}
                onPress={() => router.push('/wallet')}
              >
                <WalletFilled size={24} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.leftIcon}
                onPress={() => router.push('/check-in')}
              >
                <TrophyFilled size={24} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            {/* Right Side Icons - Horizontal Row */}
            <View style={styles.rightIconsContainer}>
              <TouchableOpacity
                style={styles.rightIcon}
                onPress={() => router.push('/favorites')}
              >
                <HeartFilled size={24} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rightIcon}
                onPress={toggleTheme}
              >
                {isDarkMode ? (
                  <SunFilled size={24} color="#3B82F6" />
                ) : (
                  <MoonFilled size={24} color="#3B82F6" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rightIcon}
                onPress={() => router.push('/settings')}
              >
                <SettingsFilled size={24} color="#3B82F6" />
              </TouchableOpacity>
            </View>



            {isAdjustingPhoto ? (
              <View style={styles.adjustmentOverlay}>
                <View style={styles.adjustmentContent}>
                  <Text style={[styles.adjustmentTitle, { color: isDarkMode ? 'white' : 'black' }]}>
                    Adjust Photo Position
                  </Text>
                  <Text style={[styles.adjustmentSubtitle, { color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }]}>
                    Drag to move, pinch to zoom
                  </Text>

                  <View style={styles.adjustmentButtons}>
                    <TouchableOpacity
                      style={[styles.adjustmentButton, styles.cancelButton]}
                      onPress={handleCancelAdjustment}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.adjustmentButton, styles.saveButton]}
                      onPress={handleSaveAdjustment}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.profileContent}>
                <View style={styles.profileInfo}>
                  <Text style={[styles.userName, { color: isDarkMode ? 'white' : 'black' }]}>
                    {userProfile?.full_name || 'User'}
                  </Text>
                  {userProfile?.bio && (
                    <Text style={[styles.userBio, { color: isDarkMode ? 'white' : 'black' }]}>{userProfile.bio}</Text>
                  )}
                  <View style={styles.ratingContainer}>
                    <Text style={[styles.ratingText, { color: isDarkMode ? 'white' : 'black' }]}>{averageRating > 0 ? averageRating.toFixed(1) : 'No rating'}</Text>
                    {averageRating > 0 && renderStars(averageRating)}
                    <Text style={[styles.reviewText, { color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }]}>({reviews.length} reviews)</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionButtons, { backgroundColor: colors.background.primary }]}>
          <TouchableOpacity
            style={[styles.chatButton, { backgroundColor: colors.primary.main }]}
            onPress={() => {
              // If viewing own profile, go to messages dashboard
              // If viewing someone else's profile, start a chat with them
              if (userProfile?.id === user?.id) {
                router.push('/messages');
              } else {
                router.push(`/chat/${userProfile?.id || user?.id}`);
              }
            }}
          >
            <Text style={[styles.chatButtonText, { color: colors.text.white }]}>
              {userProfile?.id === user?.id ? 'View Chat' : 'Chat to enquire'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.editShareContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.background.secondary }]}
              onPress={() => router.push('/edit-profile')}
            >
              <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.background.secondary }]}
              onPress={handleShareProfile}
            >
              <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Share Profile</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.referralButton, { backgroundColor: colors.background.secondary }]}
            onPress={() => setReferralModalVisible(true)}
          >
            <View style={styles.referralButtonContent}>
              <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Referral Program</Text>
              <ReferralStatsInline userId={user?.id} />
            </View>
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
              <View style={styles.tabContent}>
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === tab ? colors.primary.main : colors.text.secondary },
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
                {/* Show notification badge for I'm Hiring tab */}
                {tab === 'I\'m Hiring' && unreadJobNotifications > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: colors.primary.main }]}>
                    <Text style={[styles.notificationBadgeText, { color: colors.text.white }]}>
                      {unreadJobNotifications > 99 ? '99+' : unreadJobNotifications}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={[styles.tabContentArea, { backgroundColor: colors.background.primary }]}>
          {renderTabContent()}
        </View>


      </ScrollView>

      {/* Profile Share Modal */}
      <ProfileShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        userId={user?.id || ''}
        userName={userProfile?.full_name}
        userBio={userProfile?.bio}
        userAvatar={userProfile?.avatar_url}
      />

      {/* Referral Modal */}
      <ReferralModal
        visible={referralModalVisible}
        onClose={() => setReferralModalVisible(false)}
        userId={user?.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 0,
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

  profileHeader: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginTop: 0,
  },
  profileBackgroundContainer: {
    position: 'relative',
    width: '100%',
    height: 280,
    overflow: 'hidden',
    marginTop: 60,
    marginLeft: 0,
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
  profilePhotoContainer: {
    position: 'absolute',
    top: 180, // Adjust based on cover photo height
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'visible', // Changed from 'hidden' to 'visible' to show the edit button
    zIndex: 10,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  profilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoEditButton: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  coverPhotoEditButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 15,
  },
  leftIconsContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'column',
    zIndex: 15,
  },
  leftIcon: {
    marginVertical: 8,
  },
  rightIconsContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    zIndex: 15,
  },
  rightIcon: {
    marginHorizontal: 6,
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
    paddingBottom: 20,
  },
  profileInfo: {
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
  userBio: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'right',
    color: 'white',
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
  reviewText: {
    fontSize: 14,
    marginLeft: 8,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'left',
  },
  userTagline: {
    fontSize: 16,
    textAlign: 'left',
    marginTop: 4,
    color: 'rgba(255,255,255,0.8)',
  },
  sellerBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  sellerBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  sellerBadgeSubtext: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 8,
  },
  chatButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  editShareContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  referralButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  referralButtonContent: {
    alignItems: 'center',
  },
  tabNavigation: {
    flexDirection: 'row',
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
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabContentArea: {
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
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSuggestion: {
    fontSize: 14,
    textAlign: 'center',
  },
  reviewsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  reviewCard: {
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
    marginBottom: 16,
  },
  serviceItem: {
    flexDirection: 'row',
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
  },
  seeOfferButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  seeOfferText: {
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
  },
  tabSectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 20,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addServiceButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  addServiceButtonIcon: {
    fontSize: 24,
    fontWeight: '600',
    marginRight: 12,
  },
  addServiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  jobItem: {
    flexDirection: 'row',
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
  jobImage: {
    width: 80,
    height: 80,
    margin: 12,
    borderRadius: 8,
  },
  jobInfo: {
    flex: 1,
    padding: 12,
    paddingLeft: 0,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  jobDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  jobLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobLocationText: {
    fontSize: 12,
    marginLeft: 4,
  },
  jobDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobBudget: {
    flex: 1,
  },
  jobBudgetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  jobStatus: {
    alignItems: 'flex-end',
  },
  jobStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobDate: {
    fontSize: 11,
    marginLeft: 4,
  },
  jobDateSeparator: {
    fontSize: 11,
  },
  jobLastActivity: {
    fontSize: 11,
    fontWeight: '500',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  proposalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  proposalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  proposalStats: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 16,
  },
  proposalStatItem: {
    alignItems: 'center',
  },
  proposalStatNumber: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  proposalStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  notificationsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  notificationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loginPromptTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  loginPromptText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loginButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  adminIcon: {
    borderWidth: 1,
  },
  adjustmentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  adjustmentContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    minWidth: 280,
  },
  adjustmentTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  adjustmentSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  adjustmentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  adjustmentButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});