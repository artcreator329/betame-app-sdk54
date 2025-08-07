import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, MapPin, Star, Filter, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { FavoritesService, FavoriteService } from '@/lib/favorites-service';
import { Service } from '@/lib/service-service';
import { UserFavoritesService, UserFavorite } from '@/lib/user-favorites-service';

const { width } = Dimensions.get('window');

interface FavoriteServiceWithDetails extends FavoriteService {
  service: Service;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteServiceWithDetails[]>([]);
  const [userFavorites, setUserFavorites] = useState<UserFavorite[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [userSavedCount, setUserSavedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'users'>('services');

  const loadFavorites = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Load service favorites
      const favoriteServices = await FavoritesService.getUserFavorites(user.id);
      setFavorites(favoriteServices as FavoriteServiceWithDetails[]);
      setSavedCount(favoriteServices.length);

      // Load user favorites
      const favoriteUsers = await UserFavoritesService.getUserFavorites(user.id);
      setUserFavorites(favoriteUsers);
      setUserSavedCount(favoriteUsers.length);
    } catch (error) {
      console.error('Error loading favorites:', error);
      Alert.alert('Error', 'Failed to load favorites. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [user]);

  const handleBack = () => {
    router.back();
  };

  const handleServicePress = (serviceId: string) => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to view service details.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }
    router.push(`/service/${serviceId}`);
  };

  const toggleFavorite = async (serviceId: string) => {
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

    try {
      const result = await FavoritesService.toggleFavorite(user.id, serviceId);
      if (result.success) {
        // Refresh the favorites list
        await loadFavorites();
      } else {
        Alert.alert('Error', result.error || 'Failed to update favorite');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    }
  };

  const toggleUserFavorite = async (favoritedUserId: string) => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to manage user favorites.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }

    try {
      const result = await UserFavoritesService.toggleFavorite(user.id, favoritedUserId);
      if (result.success) {
        // Refresh the favorites list
        await loadFavorites();
      } else {
        Alert.alert('Error', result.error || 'Failed to update user favorite');
      }
    } catch (error) {
      console.error('Error toggling user favorite:', error);
      Alert.alert('Error', 'Failed to update user favorite. Please try again.');
    }
  };

  const renderServiceCard = (favorite: FavoriteServiceWithDetails) => {
    const service = favorite.service;
    const isFavorited = true; // Since this is in favorites list, it's always favorited

    return (
      <TouchableOpacity
        key={favorite.id}
        style={styles.serviceCard}
        onPress={() => handleServicePress(service.id!)}
      >
        <Image 
          source={{ 
            uri: service.image_url || 'https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=400' 
          }} 
          style={styles.serviceImage} 
        />
        <View style={styles.serviceInfo}>
          <View style={styles.serviceHeader}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <View style={styles.ratingContainer}>
              <Star size={14} color="#FFD700" fill="#FFD700" />
              <Text style={styles.ratingText}>{service.rating || 0}</Text>
              <Text style={styles.reviewCount}>({service.review_count || 0})</Text>
            </View>
          </View>
          
          <Text style={styles.serviceProvider} numberOfLines={2}>
            {service.provider_name || 'Unknown Provider'}
          </Text>
          
          <View style={styles.locationContainer}>
            <MapPin size={12} color={Colors.text.secondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {service.location || 'Location not specified'}
            </Text>
          </View>
          
          <View style={styles.serviceFooter}>
            <Text style={styles.servicePrice}>
              From {service.currency}{service.price}
            </Text>
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={() => toggleFavorite(service.id!)}
            >
              <Heart 
                size={20} 
                color={isFavorited ? Colors.status.error : Colors.text.secondary}
                fill={isFavorited ? Colors.status.error : "transparent"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderUserCard = (favorite: UserFavorite) => {
    return (
      <TouchableOpacity
        key={favorite.id}
        style={styles.serviceCard}
        onPress={() => router.push(`/user-profile/${favorite.favorited_user_id}`)}
      >
        <View style={styles.userCardContent}>
          <View style={styles.userInfo}>
            {favorite.favorited_user?.avatar_url ? (
              <Image
                source={{ uri: favorite.favorited_user.avatar_url }}
                style={styles.userAvatar}
              />
            ) : (
              <View style={styles.defaultUserAvatar}>
                <User size={24} color={Colors.text.secondary} />
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {favorite.favorited_user?.full_name || 'Unknown User'}
              </Text>
              {favorite.favorited_user?.bio && (
                <Text style={styles.userBio} numberOfLines={2}>
                  {favorite.favorited_user.bio}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => toggleUserFavorite(favorite.favorited_user_id)}
          >
            <Heart 
              size={20} 
              color={Colors.status.error}
              fill={Colors.status.error}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Favorite Lists</Text>
            <Text style={styles.headerSubtitle}>({savedCount} saved)</Text>
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Favorite Lists</Text>
          <Text style={styles.headerSubtitle}>({savedCount} saved)</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileInfo}>
          <TouchableOpacity 
            onPress={() => {
              if (user) {
                router.push(`/user-profile/${user.id}`);
              } else {
                Alert.alert(
                  'Sign In Required',
                  'Please sign in to view your profile.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign In', onPress: () => router.push('/auth/login') }
                  ]
                );
              }
            }}
            style={styles.profileImageContainer}
          >
            <Image 
              source={{ 
                uri: userProfile?.avatar_url || 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400' 
              }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>
              {userProfile?.full_name || 'User'}
            </Text>
            <Text style={styles.profileBio}>
              {userProfile?.bio || 'Welcome to BetaMe!'}
            </Text>
          </View>
        </View>
        <View style={styles.profileActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Share Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Favorites List */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadFavorites();
            }}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
      >
        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'services' && styles.activeTab]}
            onPress={() => setActiveTab('services')}
          >
            <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
              Services ({savedCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              Users ({userSavedCount})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {activeTab === 'services' ? 'Favorite Services' : 'Favorite Users'}
          </Text>
          <View style={styles.sortContainer}>
            <Filter size={16} color={Colors.text.secondary} />
            <Text style={styles.sortText}>Sort</Text>
          </View>
        </View>

        <View style={styles.servicesList}>
          {activeTab === 'services' ? (
            favorites.length === 0 ? (
              <View style={styles.emptyState}>
                <Heart size={48} color={Colors.text.secondary} />
                <Text style={styles.emptyStateTitle}>No service favorites yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Start exploring services and add them to your favorites!
                </Text>
                <TouchableOpacity 
                  style={styles.exploreButton}
                  onPress={() => router.push('/')}
                >
                  <Text style={styles.exploreButtonText}>Explore Services</Text>
                </TouchableOpacity>
              </View>
            ) : (
              favorites.map(renderServiceCard)
            )
          ) : (
            userFavorites.length === 0 ? (
              <View style={styles.emptyState}>
                <Heart size={48} color={Colors.text.secondary} />
                <Text style={styles.emptyStateTitle}>No user favorites yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Start exploring user profiles and add them to your favorites!
                </Text>
                <TouchableOpacity 
                  style={styles.exploreButton}
                  onPress={() => router.push('/')}
                >
                  <Text style={styles.exploreButtonText}>Explore Users</Text>
                </TouchableOpacity>
              </View>
            ) : (
              userFavorites.map(renderUserCard)
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  filterButton: {
    padding: 4,
  },
  profileSection: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  profileBio: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.text.secondary,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  actionButtonText: {
    color: Colors.text.white,
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  servicesList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  serviceCard: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceImage: {
    width: '100%',
    height: 160,
  },
  serviceInfo: {
    padding: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  reviewCount: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  serviceProvider: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: Colors.text.secondary,
    flex: 1,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  favoriteButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.text.secondary,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 20,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  exploreButton: {
    backgroundColor: Colors.primary.main,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  defaultUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: Colors.background.tertiary,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: Colors.primary.main,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  activeTabText: {
    color: Colors.text.white,
    fontWeight: '600',
  },
});