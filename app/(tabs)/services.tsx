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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronDown, SlidersHorizontal } from 'lucide-react-native';
import LayoutToggle from '@/components/LayoutToggle';
import { useFocusEffect } from '@react-navigation/native';
import ServiceCard from '@/components/ServiceCard';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import DesktopWrapper from '@/components/DesktopWrapper';
import ResponsiveGrid, { GridCard } from '@/components/ResponsiveGrid';
import { Service } from '@/types/service';
import { ServiceService, Service as DBService } from '@/lib/service-service';
import { useColors } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  provider_name: dbService.provider_name || 'Unknown Provider',
  provider_avatar: dbService.provider_avatar,
  provider_created_at: dbService.provider_created_at,
  parent_service_id: dbService.parent_service_id,
  service_variants: dbService.service_variants?.map(convertToUIService) || [],
});

export default function ServicesScreen() {
  console.log('🚀 ServicesScreen: Component rendered');
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGridLayout, setIsGridLayout] = useState(true);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Calculate adaptive bottom padding for Android devices
  const getAdaptiveBottomPadding = () => {
    if (Platform.OS === 'android') {
      // Account for floating tab bar + safe area + extra padding
      const tabBarHeight = 70; // Height of the floating tab bar
      const tabBarMargin = Math.max(insets.bottom + 16, 25); // Adaptive margin from tab layout
      const extraPadding = 20; // Additional padding for content
      return tabBarHeight + tabBarMargin + extraPadding;
    }
    // For iOS, use standard padding
    return 100;
  };

  // Debug refreshing state changes
  useEffect(() => {
    console.log('🔄 ServicesScreen: refreshing state changed to:', refreshing);
  }, [refreshing]);

  const fetchServices = useCallback(async () => {
    console.log('🔍 ServicesScreen: fetchServices called');
    try {
      setIsLoading(true);
      console.log('🔍 ServicesScreen: Calling ServiceService.getAllServices()');
      const allServices = await ServiceService.getAllServices();
      console.log('📋 ServicesScreen: Fetched services from DB:', allServices.length);
      const uiServices = allServices.map(convertToUIService);
      console.log('🎨 ServicesScreen: Converted to UI services:', uiServices.map(s => ({ id: s.id, title: s.title })));
      setServices(uiServices);
    } catch (error) {
      console.error('❌ ServicesScreen: Error fetching services:', error);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    console.log('🔄 ServicesScreen: Starting refresh');
    setRefreshing(true);
    try {
      const allServices = await ServiceService.getAllServices();
      console.log('🔄 ServicesScreen: Fetched services:', allServices.length);
      setServices(allServices.map(convertToUIService));
    } catch (error) {
      console.error('Error refreshing services:', error);
    } finally {
      console.log('🔄 ServicesScreen: Finishing refresh');
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Refetch services when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 ServicesScreen: useFocusEffect triggered');
      if (!refreshing) {
        fetchServices();
      }
    }, [fetchServices, refreshing])
  );

  const getCategoryDisplayText = () => {
    if (selectedCategories.length === 0) {
      return 'All Service Types';
    }
    if (selectedCategories.length === 1) {
      return selectedCategories[0];
    }
    return `${selectedCategories.length} Service Types`;
  };

  const filteredServices = services.filter((service: Service) => {
    const matchesCategory = selectedCategories.length === 0 ||
                           selectedCategories.some(cat => {
                             // Exact match or partial match for service category
                             return service.category_name === cat || 
                                    service.category_name?.toLowerCase().includes(cat.toLowerCase());
                           });
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (service.provider_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (service.category_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <DesktopWrapper scrollable={false} className="services-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Services</Text>
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

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
        <Search size={20} color={colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text.primary }]}
          placeholder="Search services..."
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

      {/* Services Grid */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getAdaptiveBottomPadding() }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading services...</Text>
          </View>
        ) : filteredServices.length > 0 ? (
          <View style={isGridLayout ? styles.servicesGrid : styles.servicesList}>
            {filteredServices.map((service: Service) => (
              <View key={service.id} style={isGridLayout ? styles.serviceCardContainer : styles.serviceListItem}>
                <ServiceCard service={service} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.text.primary }]}>No services available</Text>
            <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>Check back later for new services</Text>
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

      
    </DesktopWrapper>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
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
    marginRight: 12,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  filterButton: {
    padding: 12,
    borderRadius: 12,
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' && {
      justifyContent: 'flex-start',
    }),
  },
  serviceCardContainer: {
    width: '48%',
    marginBottom: 16,
    ...(Platform.OS === 'web' && {
      width: '18%',
      marginBottom: 16,
      marginRight: '2%',
    }),
  },
  servicesList: {
    paddingHorizontal: 20,
  },
  serviceListItem: {
    marginBottom: 12,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});