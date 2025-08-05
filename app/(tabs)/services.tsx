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
import IndustrySelectionModal from '@/components/IndustrySelectionModal';
import { Service } from '@/types/service';
import { ServiceService, Service as DBService } from '@/lib/service-service';
import { useColors } from '@/contexts/ThemeContext';

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
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(['all']);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colors = useColors();

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

  const getIndustryDisplayText = () => {
    if (selectedIndustries.includes('all') || selectedIndustries.length === 0) {
      return 'All Industries';
    }
    if (selectedIndustries.length === 1) {
      const industryName = selectedIndustries[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return industryName;
    }
    return `${selectedIndustries.length} Industries`;
  };

  const filteredServices = services.filter((service: Service) => {
    const matchesCategory = selectedCategories.includes('all') || 
                           selectedCategories.length === 0 ||
                           selectedCategories.some(cat => 
                             service.category_name?.toLowerCase().includes(cat.toLowerCase())
                           );
    const matchesIndustry = selectedIndustries.includes('all') ||
                           selectedIndustries.some(ind => {
                             const industryName = ind.replace(/-/g, ' ');
                             return service.industry?.toLowerCase().includes(industryName.toLowerCase());
                           });
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (service.provider_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesIndustry && matchesSearch;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Services</Text>
        <TouchableOpacity>
          <Search size={24} color={colors.text.primary} />
        </TouchableOpacity>
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
        <TouchableOpacity
          style={[styles.filterDropdown, { backgroundColor: colors.background.secondary }]}
          onPress={() => setShowIndustryModal(true)}
        >
          <Text style={[styles.filterText, { color: colors.text.primary }]}>{getIndustryDisplayText()}</Text>
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
        contentContainerStyle={styles.scrollContent}
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
          <View style={styles.servicesGrid}>
            {filteredServices.map((service: Service) => (
              <View key={service.id} style={styles.serviceCardContainer}>
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

      {/* Industry Selection Modal */}
      <IndustrySelectionModal
        visible={showIndustryModal}
        onClose={() => setShowIndustryModal(false)}
        selectedIndustries={selectedIndustries}
        onIndustriesChange={setSelectedIndustries}
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