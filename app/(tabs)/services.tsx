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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronDown, SlidersHorizontal } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import ServiceCard from '@/components/ServiceCard';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import { Service } from '@/types/service';
import { ServiceService, Service as DBService } from '@/lib/service-service';
import { Colors } from '@/constants/Colors';

// Convert DB service to UI service
const convertToUIService = (dbService: DBService): Service => ({
  id: dbService.id || '',
  title: dbService.title,
  description: dbService.description,
  price: dbService.price,
  currency: dbService.currency,
  category_name: dbService.category_name || 'General',
  image_url: dbService.image_url || 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=400',
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
  parent_service_id: dbService.parent_service_id,
  service_variants: dbService.service_variants?.map(convertToUIService) || [],
});

export default function ServicesScreen() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      const allServices = await ServiceService.getAllServices();
      console.log('📋 ServicesScreen: Fetched services from DB:', allServices.length);
      const uiServices = allServices.map(convertToUIService);
      console.log('🎨 ServicesScreen: Converted to UI services:', uiServices.map(s => ({ id: s.id, title: s.title })));
      setServices(uiServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const allServices = await ServiceService.getAllServices();
      setServices(allServices.map(convertToUIService));
    } catch (error) {
      console.error('Error refreshing services:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Refetch services when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchServices();
    }, [fetchServices])
  );

  const getCategoryDisplayText = () => {
    if (selectedCategories.includes('all') || selectedCategories.length === 0) {
      return 'All Categories';
    }
    if (selectedCategories.length === 1) {
      // Map category IDs to display names
      const categoryMap: { [key: string]: string } = {
        'fitness': 'Fitness',
        'digital': 'Digital Marketing',
        'education': 'Education',
        'sports': 'Sports',
        'beauty': 'Beauty',
        'healthcare': 'Healthcare',
        // Add more mappings as needed
      };
      return categoryMap[selectedCategories[0]] || selectedCategories[0];
    }
    return `${selectedCategories.length} Categories`;
  };

  const filteredServices = services.filter((service: Service) => {
    const matchesCategory = selectedCategories.includes('all') || 
                           selectedCategories.length === 0 ||
                           selectedCategories.some(cat => 
                             service.category_name?.toLowerCase().includes(cat.toLowerCase())
                           );
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (service.provider_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity>
          <Search size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.text.secondary}
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={styles.categoryDropdown}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={styles.categoryText}>{getCategoryDisplayText()}</Text>
          <ChevronDown size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <SlidersHorizontal size={20} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Services Grid */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary.main} />
            <Text style={styles.loadingText}>Loading services...</Text>
          </View>
        ) : filteredServices.length > 0 ? (
          <View style={styles.servicesGrid}>
            {filteredServices.map((service: Service) => (
              <View key={service.id} style={styles.serviceCardContainer}>
                <ServiceCard service={service} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No services available</Text>
            <Text style={styles.emptySubtext}>Check back later for new services</Text>
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
    backgroundColor: Colors.background.primary,
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
    backgroundColor: Colors.background.tertiary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.tertiary,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.tertiary,
    marginTop: 1,
  },
  categoryDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  filterButton: {
    padding: 12,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
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
  },
  serviceCardContainer: {
    width: '48%',
    marginBottom: 16,
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
    color: Colors.text.secondary,
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
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});