import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Share, Alert, ActivityIndicator, ActionSheetIOS, Platform, StatusBar, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Heart, Wallet, Trophy, Camera, Star, MapPin, Calendar, User, Shield, Moon, Sun, Heart as HeartFilled, Settings as SettingsFilled, Sun as SunFilled, Moon as MoonFilled, Wallet as WalletFilled, Trophy as TrophyFilled, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react-native';
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
import { BlurView } from 'expo-blur';
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
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth > 768;
  const [activeTab, setActiveTab] = useState('My Services');
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [jobListings, setJobListings] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // isAdmin is now provided by AuthContext
  const [isAdjustingPhoto, setIsAdjustingPhoto] = useState(false);
  const [photoType, setPhotoType] = useState<'cover' | 'profile'>('profile');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [unreadJobNotifications, setUnreadJobNotifications] = useState(0);
  const [jobNotificationService] = useState(() => JobNotificationService.getInstance());
  const [refreshing, setRefreshing] = useState(false);
  const [ekycSubmission, setEkycSubmission] = useState<any>(null);
  const [loadingEkyc, setLoadingEkyc] = useState(true);
  const router = useRouter();
  const { user, userProfile, updateProfile, refreshProfile, checkAdminStatus: contextCheckAdminStatus, isAdmin } = useAuth();
  const colors = useColors();
  const { isDarkMode, toggleTheme } = useTheme();

  // Calculate average rating from reviews
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  // Load eKYC submission status
  const loadEkycSubmission = useCallback(async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('ekyc_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error loading eKYC submission:', error);
      } else {
        setEkycSubmission(data);
      }
    } catch (error) {
      console.error('Error loading eKYC submission:', error);
    } finally {
      setLoadingEkyc(false);
    }
  }, [user]);

  // Set up real-time subscription to user profile changes
  // useEffect(() => {
  //   if (!user) return;

  //   console.log('🔄 Setting up real-time subscription for user profile changes');
    
  //   const channel = supabase
  //     .channel(`user_profile_${user.id}`)
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: 'UPDATE',
  //         schema: 'public',
  //         table: 'user_profiles',
  //         filter: `user_id=eq.${user.id}`
  //       },
  //       (payload) => {
  //         console.log('🔄 User profile updated:', payload.new);
  //         // Refresh the user profile data when it changes
  //         refreshProfile().catch(error => {
  //           console.error('❌ Error refreshing profile after update:', error);
  //         });
  //       }
  //     )
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: 'INSERT',
  //         schema: 'public',
  //         table: 'ekyc_submissions',
  //         filter: `user_id=eq.${user.id}`
  //       },
  //       (payload) => {
  //         console.log('🔄 New eKYC submission:', payload.new);
  //         // Refresh eKYC submission data
  //         loadEkycSubmission().catch(error => {
  //           console.error('❌ Error loading eKYC submission after insert:', error);
  //         });
  //       }
  //     )
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: 'UPDATE',
  //         schema: 'public',
  //         table: 'ekyc_submissions',
  //         filter: `user_id=eq.${user.id}`
  //       },
  //       (payload) => {
  //         console.log('🔄 eKYC submission updated:', payload.new);
  //         // Refresh both user profile and eKYC submission data
  //         Promise.all([
  //           refreshProfile(),
  //           loadEkycSubmission()
  //         ]).catch(error => {
  //           console.error('❌ Error refreshing data after eKYC update:', error);
  //         });
  //       }
  //     )
  //     .subscribe((status) => {
  //       console.log('🔄 Real-time subscription status:', status);
  //       if (status === 'SUBSCRIBED') {
  //         console.log('✅ Real-time subscription established successfully');
  //       } else if (status === 'CHANNEL_ERROR') {
  //         console.error('❌ Real-time subscription error');
  //       }
  //     });

  //   return () => {
  //     console.log('🔄 Cleaning up real-time subscription for user profile');
  //     supabase.removeChannel(channel);
  //   };
  // }, [user]); // Remove refreshProfile and loadEkycSubmission from dependencies

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
      if (activeTab === 'My Services' || activeTab === 'I\'m Hiring') {
        if (userServices.length > 0) {
          setActiveTab('My Services');
        } else {
          setActiveTab('Reviews');
        }
      }
    }
  }, [user]); // Remove activeTab from dependencies

  const setupJobNotifications = useCallback(async () => {
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
  }, [user, fetchProfileData]);

  useEffect(() => {
    if (user) {
      fetchProfileData();
      contextCheckAdminStatus();
      setupJobNotifications();
    }
  }, [user, fetchProfileData, contextCheckAdminStatus, setupJobNotifications]);

  const handleJobNotificationPress = (activity: any) => {
    // Mark notification as read and navigate to job details
    if (activity.job_listing_id) {
      router.push(`/job/${activity.job_listing_id}`);
    }
  };

  // checkAdminStatus is now provided by AuthContext

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile(); // Refresh profile from AuthContext
      await fetchProfileData(); // Refresh local data
      await loadEkycSubmission(); // Refresh eKYC submission data
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

  // Refetch profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        refreshProfile(); // Refresh user profile data (including verification status)
        fetchProfileData();
        loadEkycSubmission();
      }
    }, [user, refreshProfile])
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
            <Text style={[styles.availableListings, { color: colors.text.secondary }]}>Available Listings ({String(services.length)})</Text>
            
            {/* Show service provider status */}
            {userProfile?.is_service_provider ? (
              <View style={[styles.verifiedServiceProviderContainer, { backgroundColor: colors.background.secondary }]}>
                <Text style={[styles.verifiedServiceProviderText, { color: colors.text.primary }]}>
                  {userProfile?.full_name || 'User'} is a verified service provider
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.becomeServiceProviderButton, { backgroundColor: colors.primary.main }]}
                onPress={() => router.push('/become-service-provider')}
              >
                <Text style={[styles.becomeServiceProviderButtonText, { color: colors.text.white }]}>Become a Service Provider</Text>
                <Text style={[styles.becomeServiceProviderButtonSubtext, { color: colors.text.white }]}>Start offering your services and earn money</Text>
              </TouchableOpacity>
            )}
            
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
              style={[
                styles.addServiceButton, 
                { 
                  backgroundColor: userProfile?.is_service_provider 
                    ? colors.primary.main 
                    : colors.text.secondary,
                  opacity: userProfile?.is_service_provider ? 1 : 0.6
                }
              ]}
              onPress={() => {
                if (userProfile?.is_service_provider) {
                  router.push('/create-service-listing');
                } else {
                  Alert.alert(
                    'Verification Required',
                    'You need to be a verified service provider to create service listings. Please complete your verification first.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Get Verified', 
                        onPress: () => router.push('/become-service-provider')
                      }
                    ]
                  );
                }
              }}
              disabled={!userProfile?.is_service_provider}
            >
              <Text style={[
                styles.addServiceButtonIcon, 
                { color: userProfile?.is_service_provider ? colors.text.white : colors.text.tertiary }
              ]}>+</Text>
              <Text style={[
                styles.addServiceButtonText, 
                { color: userProfile?.is_service_provider ? colors.text.white : colors.text.tertiary }
              ]}>Offer Your Best Service/Product Now</Text>
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

  const renderVerificationTick = () => {
    if (!userProfile?.verification_status) return null;

    const getTickColor = (status: string) => {
      // Check if user has bank statement (service provider)
      const hasServiceListing = services.length > 0;
      
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

    const getTickIcon = (status: string) => {
      switch (status) {
        case 'verified':
          return <CheckCircle size={16} color={getTickColor(status)} />;
        case 'in_progress':
          return <Clock size={16} color={getTickColor(status)} />;
        case 'rejected':
          return <XCircle size={16} color={getTickColor(status)} />;
        default:
          return <CheckCircle size={16} color={getTickColor(status)} />;
      }
    };

    const getTooltipText = (status: string) => {
      const hasServiceListing = services.length > 0;
      
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

    return (
      <TouchableOpacity 
        style={styles.verificationTick}
        onPress={() => {
          Alert.alert(
            'Verification Status',
            getTooltipText(userProfile.verification_status),
            [{ text: 'OK' }]
          );
        }}
        activeOpacity={0.7}
      >
        {getTickIcon(userProfile.verification_status)}
      </TouchableOpacity>
    );
  };

  const renderVerificationStatus = () => {
    if (!userProfile?.verification_status) return null;

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'verified':
          return <CheckCircle size={20} color="#10B981" />;
        case 'in_progress':
          return <Clock size={20} color="#F59E0B" />;
        case 'rejected':
          return <XCircle size={20} color="#EF4444" />;
        default:
          return <AlertCircle size={20} color="#6B7280" />;
      }
    };

    const getStatusTitle = (status: string) => {
      switch (status) {
        case 'verified':
          return 'Verified';
        case 'in_progress':
          return 'Verification In Progress';
        case 'rejected':
          return 'Verification Rejected';
        default:
          return 'Verification Not Started';
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'verified':
          return '#10B981';
        case 'in_progress':
          return '#F59E0B';
        case 'rejected':
          return '#EF4444';
        default:
          return '#6B7280';
      }
    };

    return (
      <View style={[styles.verificationStatusContainer, { backgroundColor: colors.background.secondary }]}>
        <View style={styles.verificationStatusContent}>
          {getStatusIcon(userProfile.verification_status)}
          <Text style={[styles.verificationStatusText, { color: getStatusColor(userProfile.verification_status) }]}>
            {getStatusTitle(userProfile.verification_status)}
          </Text>
        </View>
      </View>
    );
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
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        style={{ backgroundColor: colors.background.primary }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
            colors={[colors.primary.main]}
          />
        }
      >
        {/* Desktop Container */}
        <View style={[isDesktop && styles.desktopContainer]}>
          {/* Profile Section */}
          <View style={[styles.profileHeader, isDesktop && styles.profileHeaderDesktop]}>
            <View style={[styles.profileBackgroundContainer, isDesktop && styles.profileBackgroundContainerDesktop]}>
              {/* Cover Photo */}
              {userProfile?.cover_photo_url ? (
                <Image
                  source={{ uri: userProfile.cover_photo_url }}
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

              {/* Circular Profile Photo */}
              <View style={[styles.profilePhotoContainer, isDesktop && styles.profilePhotoContainerDesktop]}>
                {userProfile?.avatar_url ? (
                  <Image
                    source={{ uri: userProfile.avatar_url }}
                    style={[styles.profilePhoto, isDesktop && styles.profilePhotoDesktop]}
                  />
                ) : (
                  <View style={[styles.profilePhotoPlaceholder, { backgroundColor: colors.background.secondary }, isDesktop && styles.profilePhotoPlaceholderDesktop]}>
                    <User size={isDesktop ? 60 : 40} color={colors.text.secondary} />
                  </View>
                )}
                {/* Only show camera button when viewing own profile */}
                {user && userProfile && user.id === userProfile.id && (
                  <TouchableOpacity
                    style={[styles.profilePhotoEditButton, { backgroundColor: colors.primary.main }, isDesktop && styles.profilePhotoEditButtonDesktop]}
                    onPress={handleCameraPress}
                    disabled={uploadingPhoto}
                    activeOpacity={0.8}
                  >
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Camera size={isDesktop ? 20 : 16} color="white" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {isAdjustingPhoto ? (
                <View style={styles.adjustmentOverlay}>
                  <View style={[styles.adjustmentContent, isDesktop && styles.adjustmentContentDesktop]}>
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
                <View style={[styles.profileContent, isDesktop && styles.profileContentDesktop]}>
                  <View style={[styles.profileInfo, isDesktop && styles.profileInfoDesktop]}>
                    <View style={styles.userNameContainer}>
                      <View style={styles.userNameTextContainer}>
                        <Text 
                          style={[styles.userName, { color: isDarkMode ? 'white' : 'black' }, isDesktop && styles.userNameDesktop]}
                          numberOfLines={2}
                        >
                          {userProfile?.full_name || 'User'}
                        </Text>
                      </View>
                    </View>
                    {userProfile?.bio && (
                      <Text style={[styles.userBio, { color: isDarkMode ? 'white' : 'black' }, isDesktop && styles.userBioDesktop]}>{userProfile.bio}</Text>
                    )}
                    <View style={styles.ratingContainer}>
                      <Text style={[styles.ratingText, { color: isDarkMode ? 'white' : 'black' }]}>{averageRating > 0 ? averageRating.toFixed(1) : 'No rating'}</Text>
                      {renderVerificationTick()}
                      {averageRating > 0 && renderStars(averageRating)}
                      <Text style={[styles.reviewText, { color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }]}>({reviews.length} reviews)</Text>
                    </View>
                    {/* Removed large verification status display */}
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Two Column Layout for Desktop */}
          {isDesktop ? (
            <View style={styles.desktopTwoColumnLayout}>
              {/* Left Column - Profile Actions */}
              <View style={styles.desktopLeftColumn}>
                {/* Action Buttons */}
                <View style={[styles.actionButtons, { backgroundColor: colors.background.primary }, isDesktop && styles.actionButtonsDesktop]}>
                  {/* Centered Icons Capsule */}
                  <View style={[styles.centeredIconsContainer, isDesktop && styles.centeredIconsContainerDesktop]}>
                    <BlurView intensity={50} style={[styles.centeredIconsCapsule, isDesktop && styles.centeredIconsCapsuleDesktop]}>
                      <TouchableOpacity
                        style={[styles.centeredIcon, isDesktop && styles.centeredIconDesktop]}
                        onPress={() => router.push('/wallet')}
                      >
                        <WalletFilled size={24} color="#1F2937" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.centeredIcon, isDesktop && styles.centeredIconDesktop]}
                        onPress={() => router.push('/check-in')}
                      >
                        <TrophyFilled size={24} color="#1F2937" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.centeredIcon, isDesktop && styles.centeredIconDesktop]}
                        onPress={() => router.push('/favorites')}
                      >
                        <HeartFilled size={24} color="#DC2626" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.centeredIcon, isDesktop && styles.centeredIconDesktop]}
                        onPress={toggleTheme}
                      >
                        {isDarkMode ? (
                          <SunFilled size={24} color="#F59E0B" />
                        ) : (
                          <MoonFilled size={24} color="#1F2937" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.centeredIcon, isDesktop && styles.centeredIconDesktop]}
                        onPress={() => router.push('/settings')}
                      >
                        <SettingsFilled size={24} color="#1F2937" />
                      </TouchableOpacity>
                      {isAdmin && (
                        <TouchableOpacity
                          style={[styles.centeredIcon, isDesktop && styles.centeredIconDesktop]}
                          onPress={() => router.push('/admin')}
                        >
                          <Shield size={24} color="#2196F3" />
                        </TouchableOpacity>
                      )}
                    </BlurView>
                  </View>

                  <TouchableOpacity
                    style={[styles.chatButton, { backgroundColor: colors.primary.main }, isDesktop && styles.chatButtonDesktop]}
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
                  
                  <View style={[styles.editShareContainer, isDesktop && styles.editShareContainerDesktop]}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.background.secondary }, isDesktop && styles.actionButtonDesktop]}
                      onPress={() => router.push('/edit-profile')}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.background.secondary }, isDesktop && styles.actionButtonDesktop]}
                      onPress={handleShareProfile}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Share Profile</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.referralButton, { backgroundColor: colors.background.secondary }, isDesktop && styles.referralButtonDesktop]}
                    onPress={() => setReferralModalVisible(true)}
                  >
                    <View style={styles.referralButtonContent}>
                      <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Referral Program</Text>
                      <ReferralStatsInline userId={user?.id} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Right Column - Content */}
              <View style={styles.desktopRightColumn}>
                {/* Tab Navigation */}
                <View style={[styles.tabNavigation, { backgroundColor: colors.background.primary }, isDesktop && styles.tabNavigationDesktop]}>
                  {['My Services', 'Reviews'].map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.tab,
                        activeTab === tab && { borderBottomColor: colors.primary.main },
                        isDesktop && styles.tabDesktop,
                      ]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <View style={styles.tabContent}>
                        <Text
                          style={[
                            styles.tabText,
                            { color: activeTab === tab ? colors.primary.main : colors.text.secondary },
                            activeTab === tab && styles.activeTabText,
                            isDesktop && styles.tabTextDesktop,
                          ]}
                        >
                          {tab}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Tab Content */}
                <View style={[styles.tabContentArea, { backgroundColor: colors.background.primary }, isDesktop && styles.tabContentAreaDesktop]}>
                  {renderTabContent()}
                </View>
              </View>
            </View>
          ) : (
            /* Mobile Layout - Single Column */
            <>
              {/* Action Buttons */}
              <View style={[styles.actionButtons, { backgroundColor: colors.background.primary }, isDesktop && styles.actionButtonsDesktop]}>
                {/* Centered Icons Capsule */}
                <View style={[styles.centeredIconsContainer, isDesktop && styles.centeredIconsContainerDesktop]}>
                  <BlurView intensity={50} style={[styles.centeredIconsCapsule, isDesktop && styles.centeredIconsCapsuleDesktop]}>
                    <TouchableOpacity
                      style={[styles.centeredIcon, isDesktop && styles.centeredIconDesktop]}
                      onPress={() => router.push('/wallet')}
                    >
                      <WalletFilled size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.centeredIcon, isDesktop && styles.centeredIconDesktop]}
                      onPress={() => router.push('/check-in')}
                    >
                      <TrophyFilled size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.centeredIcon, isDesktop && styles.centeredIconDesktop]}
                      onPress={() => router.push('/favorites')}
                    >
                      <HeartFilled size={24} color="#DC2626" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.centeredIcon, isDesktop && styles.centeredIconDesktop]}
                      onPress={toggleTheme}
                    >
                      {isDarkMode ? (
                        <SunFilled size={24} color="#F59E0B" />
                      ) : (
                        <MoonFilled size={24} color="#1F2937" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.centeredIcon, isDesktop && styles.centeredIconDesktop]}
                      onPress={() => router.push('/settings')}
                    >
                      <SettingsFilled size={24} color="#1F2937" />
                    </TouchableOpacity>
                    {isAdmin && (
                      <TouchableOpacity
                        style={[styles.centeredIcon, isDesktop && styles.centeredIconDesktop]}
                        onPress={() => router.push('/admin')}
                      >
                        <Shield size={24} color="#2196F3" />
                      </TouchableOpacity>
                    )}
                  </BlurView>
                </View>

                <TouchableOpacity
                  style={[styles.chatButton, { backgroundColor: colors.primary.main }, isDesktop && styles.chatButtonDesktop]}
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
                
                <View style={[styles.editShareContainer, isDesktop && styles.editShareContainerDesktop]}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.background.secondary }, isDesktop && styles.actionButtonDesktop]}
                    onPress={() => router.push('/edit-profile')}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Edit Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.background.secondary }, isDesktop && styles.actionButtonDesktop]}
                    onPress={handleShareProfile}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Share Profile</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.referralButton, { backgroundColor: colors.background.secondary }, isDesktop && styles.referralButtonDesktop]}
                  onPress={() => setReferralModalVisible(true)}
                >
                  <View style={styles.referralButtonContent}>
                    <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Referral Program</Text>
                    <ReferralStatsInline userId={user?.id} />
                  </View>
                </TouchableOpacity>

                {/* eKYC Verification Prompt - Show different states based on verification status */}
                {userProfile?.verification_status !== 'verified' && (
                  <TouchableOpacity
                    style={[
                      styles.ekycPromptContainer, 
                      { 
                        backgroundColor: ekycSubmission?.status === 'pending' ? '#FFD700' : colors.primary.main 
                      }, 
                      isDesktop && styles.ekycPromptContainerDesktop
                    ]}
                    onPress={() => router.push('/ekyc-verification')}
                  >
                    <View style={styles.ekycPromptContent}>
                      {ekycSubmission?.status === 'pending' ? (
                        <Clock size={24} color="white" style={styles.ekycPromptIcon} />
                      ) : (
                        <CheckCircle size={24} color="white" style={styles.ekycPromptIcon} />
                      )}
                      <View style={styles.ekycPromptTextContainer}>
                        <Text style={[styles.ekycPromptTitle, { color: 'white' }]}>
                          {ekycSubmission?.status === 'pending' ? 'Pending' : 'Complete Verification'}
                        </Text>
                        <Text style={[styles.ekycPromptSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>
                          {ekycSubmission?.status === 'pending' 
                            ? 'Your verification is under review • We\'ll notify you soon'
                            : 'Unlock all features • Become a service provider • Place service orders'
                          }
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {/* Tab Navigation */}
              <View style={[styles.tabNavigation, { backgroundColor: colors.background.primary }, isDesktop && styles.tabNavigationDesktop]}>
                {['My Services', 'Reviews'].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tab,
                      activeTab === tab && { borderBottomColor: colors.primary.main },
                      isDesktop && styles.tabDesktop,
                    ]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <View style={styles.tabContent}>
                      <Text
                        style={[
                          styles.tabText,
                          { color: activeTab === tab ? colors.primary.main : colors.text.secondary },
                          activeTab === tab && styles.activeTabText,
                          isDesktop && styles.tabTextDesktop,
                        ]}
                      >
                        {tab}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tab Content */}
              <View style={[styles.tabContentArea, { backgroundColor: colors.background.primary }, isDesktop && styles.tabContentAreaDesktop]}>
                {renderTabContent()}
              </View>
            </>
          )}
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
  scrollContentDesktop: {
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
  headerIconDesktop: {
    marginHorizontal: 12,
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
    marginTop: 60,
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
  profilePhotoContainerDesktop: {
    top: 120,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  profilePhotoDesktop: {
    borderRadius: 40,
  },
  profilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoPlaceholderDesktop: {
    borderRadius: 40,
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
  profilePhotoEditButtonDesktop: {
    width: 32,
    height: 32,
    borderRadius: 16,
    bottom: -5,
    right: -5,
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
  centeredIconsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  centeredIconsContainerDesktop: {
    marginBottom: 12,
  },
  centeredIconsCapsule: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredIconsCapsuleDesktop: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  centeredIcon: {
    marginHorizontal: 12,
    padding: 8,
  },
  centeredIconDesktop: {
    marginHorizontal: 12,
    padding: 6,
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
  profileContentDesktop: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  profileInfo: {
    alignItems: 'flex-end',
    width: '100%',
  },
  profileInfoDesktop: {
    alignItems: 'flex-end',
    width: '100%',
  },


  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    marginBottom: 8,
    width: '100%',
  },
  userNameTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'right',
    color: 'white',
    flexShrink: 1,
  },
  userNameDesktop: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
    color: 'white',
    flexShrink: 1,
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
  ratingTextDesktop: {
    fontSize: 24,
    fontWeight: '600',
    marginRight: 12,
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
  serviceProviderBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  serviceProviderBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  serviceProviderBadgeSubtext: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 8,
  },
  actionButtonsDesktop: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 8,
  },
  chatButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatButtonDesktop: {
    paddingVertical: 12,
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
  editShareContainerDesktop: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonDesktop: {
    flex: 1,
    paddingVertical: 10,
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
  referralButtonDesktop: {
    paddingVertical: 10,
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
  tabNavigationDesktop: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
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
  activeTab: {
  },
  activeTabText: {
    fontWeight: '600',
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
  tabTextDesktop: {
    fontSize: 16,
    fontWeight: '500',
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
  tabContentAreaDesktop: {
    minHeight: 300,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    ...(Platform.OS === 'web' && {
      width: '100%',
    }),
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
    ...(Platform.OS === 'web' && {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    }),
  },
  availableListings: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    ...(Platform.OS === 'web' && {
      width: '100%',
    }),
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
    ...(Platform.OS === 'web' && {
      width: '100%',
    }),
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
  adjustmentContentDesktop: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    minWidth: 300,
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
  becomeServiceProviderButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...(Platform.OS === 'web' && {
      width: '100%',
    }),
  },
  becomeServiceProviderButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  becomeServiceProviderButtonSubtext: {
    fontSize: 14,
    opacity: 0.9,
    textAlign: 'center',
  },
  verifiedServiceProviderContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    ...(Platform.OS === 'web' && {
      width: '100%',
    }),
  },
  verifiedServiceProviderText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
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
  verificationStatusContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  verificationStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  verificationTick: {
    marginLeft: 8,
    padding: 4,
  },
  ekycPromptContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...(Platform.OS === 'web' && {
      width: '100%',
    }),
  },
  ekycPromptContainerDesktop: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  ekycPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ekycPromptIcon: {
    marginRight: 12,
  },
  ekycPromptTextContainer: {
    flex: 1,
  },
  ekycPromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  ekycPromptSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});