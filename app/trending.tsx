import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Search, 
  ChevronDown, 
  SlidersHorizontal, 
  ArrowLeft, 
  TrendingUp, 
  Flame, 
  Star, 
  Eye,
  Heart
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import ServiceCard from '@/components/ServiceCard';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import LayoutToggle from '@/components/LayoutToggle';
import { Service } from '@/types/service';
import { ServiceService, Service as DBService } from '@/lib/service-service';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

// Convert DB service to UI service
const convertToUIService = (dbService: DBService): Service => ({
  id: dbService.id || '',
  title: dbService.title,
  description: dbService.description,
  price: dbService.price,
  currency: dbService.currency,
  category_name: dbService.category_name || 'General',
  image_url: dbService.image_url || undefined, // Remove hardcoded fallback, let ServiceCard handle it
  latitude: dbService.latitude,
  longitude: dbService.longitude,
  location: dbService.location,
  rating: dbService.rating || 0,
  review_count: dbService.review_count || 0,
  user_id: dbService.user_id,
  is_nearby: dbService.is_nearby,
  is_trending: dbService.is_trending,
  created_at: dbService.created_at,
  updated_at: dbService.updated_at,
  provider_name: dbService.provider_name || 'Service Provider',
  provider_avatar: dbService.provider_avatar,
  provider_created_at: dbService.provider_created_at,
});

// Trending Service Card Component
const TrendingServiceCard = ({ service, index }: { service: Service; index: number }) => {
  const colors = useColors();
  const router = useRouter();
  const [userCoverPhoto, setUserCoverPhoto] = useState<string | null>(null);

  // Fetch user's cover photo when service has no image
  useEffect(() => {
    const fetchUserCoverPhoto = async () => {
      if (!service.image_url && service.user_id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('cover_photo_url')
            .eq('id', service.user_id)
            .single();

          if (!error && data?.cover_photo_url) {
            setUserCoverPhoto(data.cover_photo_url);
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
      return service.image_url;
    }
    if (userCoverPhoto) {
      return userCoverPhoto;
    }
    return null;
  };
  
  const getTrendingBadge = () => {
    if (index < 3) {
      return (
        <View style={[styles.trendingBadge, { backgroundColor: colors.status.success }]}>
          <Flame size={12} color={colors.text.white} />
          <Text style={[styles.trendingBadgeText, { color: colors.text.white }]}>
            #{index + 1} Trending
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <TouchableOpacity
      style={[styles.trendingCard, { backgroundColor: colors.background.secondary }]}
      onPress={() => router.push(`/service/${service.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.trendingCardHeader}>
        {getTrendingBadge()}
        <TouchableOpacity style={styles.favoriteButton}>
          <Heart size={16} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
      
      {getServiceImage() && (
        <Image 
          source={{ uri: getServiceImage()! }} 
          style={styles.trendingCardImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.trendingCardContent}>
        <View style={styles.trendingCardTitleRow}>
          <Text style={[styles.trendingCardTitle, { color: colors.text.primary }]} numberOfLines={2}>
            {service.title}
          </Text>
          <View style={styles.trendingCardRating}>
            <Star size={12} color={colors.status.warning} fill={colors.status.warning} />
            <Text style={[styles.trendingCardRatingText, { color: colors.text.secondary }]}>
              {service.rating.toFixed(1)}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.trendingCardDescription, { color: colors.text.secondary }]} numberOfLines={2}>
          {service.description}
        </Text>
        
        <View style={styles.trendingCardFooter}>
          <View style={styles.trendingCardProvider}>
            {service.provider_avatar && (
              <Image 
                source={{ uri: service.provider_avatar }} 
                style={styles.providerAvatar}
              />
            )}
            <Text style={[styles.providerName, { color: colors.text.secondary }]} numberOfLines={1}>
              {service.provider_name}
            </Text>
          </View>
          
          <View style={styles.trendingCardPrice}>
            <Text style={[styles.priceText, { color: colors.primary.main }]}>
              {service.currency} {service.price}
            </Text>
          </View>
        </View>
        
        <View style={styles.popularityIndicator}>
          <Eye size={12} color={colors.text.secondary} />
          <Text style={[styles.popularityText, { color: colors.text.secondary }]}>
            {Math.floor(Math.random() * 1000 + 100).toLocaleString()} views
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function TrendingScreen() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGridLayout, setIsGridLayout] = useState(true);
  const router = useRouter();
  const colors = useColors();

  // Debug refreshing state changes
  useEffect(() => {
    console.log('🔄 TrendingScreen: refreshing state changed to:', refreshing);
  }, [refreshing]);

  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      const [trending, nearby] = await Promise.all([
        ServiceService.getTrendingServices(),
        ServiceService.getNearbyServices(),
      ]);
      
      const allServices = [...trending, ...nearby];
      const uniqueServices = allServices.filter((service, index, self) => 
        index === self.findIndex(s => s.id === service.id)
      );
      
      setServices(uniqueServices.map(convertToUIService));
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    console.log('🔄 TrendingScreen: Starting refresh');
    setRefreshing(true);
    await fetchServices();
    console.log('🔄 TrendingScreen: Finishing refresh');
    setRefreshing(false);
  }, [fetchServices]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 TrendingScreen: useFocusEffect triggered');
      if (!refreshing) {
        fetchServices();
      }
    }, [fetchServices, refreshing])
  );

  const getCategoryDisplayText = () => {
    if (selectedCategories.length === 0) {
      return 'All Categories';
    }
    if (selectedCategories.length === 1) {
      return selectedCategories[0];
    }
    return `${selectedCategories.length} Categories`;
  };

  const filteredServices = services.filter((service: Service) => {
    const matchesCategory = selectedCategories.length === 0 ||
                           selectedCategories.some(cat => 
                             service.category_name?.toLowerCase().includes(cat.toLowerCase())
                           );
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (service.provider_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Trending</Text>
        <View style={styles.headerActions}>
          <LayoutToggle 
            isGridLayout={isGridLayout} 
            onToggle={() => setIsGridLayout(!isGridLayout)} 
          />
          <TouchableOpacity style={styles.searchButton}>
            <Search size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* Trending Header */}
        <View style={[styles.trendingHeader, { backgroundColor: colors.background.tertiary }]}>
          <View style={styles.trendingHeaderContent}>
            <View style={styles.trendingTitleRow}>
              <TrendingUp size={24} color={colors.primary.main} />
              <Text style={[styles.trendingTitle, { color: colors.text.primary }]}>
                Trending Now
              </Text>
            </View>
            <Text style={[styles.trendingSubtitle, { color: colors.text.secondary }]}>
              Discover the most popular services this week
            </Text>
          </View>
          
          <View style={styles.trendingStats}>
            <View style={[styles.statItem, { backgroundColor: colors.background.secondary }]}>
              <Text style={[styles.statNumber, { color: colors.primary.main }]}>
                {filteredServices.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Services
              </Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.background.secondary }]}>
              <Text style={[styles.statNumber, { color: colors.status.success }]}>
                +12%
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Growth
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
          <Search size={20} color={colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Search trending services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text.secondary}
          />
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterDropdown, { backgroundColor: colors.background.secondary }]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={[styles.filterText, { color: colors.text.primary }]}>{getCategoryDisplayText()}</Text>
            <ChevronDown size={16} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.background.secondary }]}>
            <SlidersHorizontal size={20} color={colors.primary.main} />
          </TouchableOpacity>
        </View>

        {/* Trending Services */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading trending services...</Text>
          </View>
        ) : filteredServices.length > 0 ? (
          <View style={isGridLayout ? styles.trendingServicesContainer : styles.trendingServicesList}>
            {filteredServices.map((service, index) => (
              <View key={service.id} style={isGridLayout ? styles.trendingCardWrapper : styles.trendingListItem}>
                <TrendingServiceCard service={service} index={index} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Flame size={48} color={colors.text.secondary} />
            <Text style={[styles.emptyText, { color: colors.text.primary }]}>No trending services found</Text>
            <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
              Check back later for trending services
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Category Selection Modal */}
      <CategorySelectionModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
      />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  trendingHeader: {
    padding: 20,
    marginBottom: 16,
  },
  trendingHeaderContent: {
    marginBottom: 16,
  },
  trendingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  trendingSubtitle: {
    fontSize: 14,
    marginLeft: 32,
  },
  trendingStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterButton: {
    padding: 12,
    borderRadius: 12,
  },
  trendingServicesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  trendingServicesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  trendingCardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  trendingListItem: {
    marginBottom: 12,
    width: '100%',
  },
  trendingCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  trendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingCardImage: {
    width: '100%',
    height: 160,
  },
  trendingCardContent: {
    padding: 16,
  },
  trendingCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  trendingCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  trendingCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendingCardRatingText: {
    fontSize: 12,
    marginLeft: 4,
  },
  trendingCardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  trendingCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendingCardProvider: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  providerName: {
    fontSize: 12,
    flex: 1,
  },
  trendingCardPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  popularityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularityText: {
    fontSize: 11,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 