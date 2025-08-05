import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, List, Map as MapIcon, ChevronDown } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ServiceService, Service as ServiceFromLib } from '@/lib/service-service';
import { CategoryService } from '@/lib/category-service';
import { Service } from '@/types/service';
import { useAuth } from '@/contexts/AuthContext';
import ServiceCard from '@/components/ServiceCard';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import IndustrySelectionModal from '@/components/IndustrySelectionModal';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');



export default function NearbyScreen() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [nearbyServices, setNearbyServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(['all']);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { category } = useLocalSearchParams<{ category?: string }>();

  useEffect(() => {
    loadNearbyServices();
  }, [category]);

  const getCategoryDisplayText = () => {
    if (selectedCategories.includes('all') || selectedCategories.length === 0) {
      return 'All Categories';
    }
    if (selectedCategories.length === 1) {
      const categoryMap: { [key: string]: string } = {
        'fitness': 'Fitness',
        'digital': 'Digital Marketing',
        'education': 'Education',
        'sports': 'Sports',
        'beauty': 'Beauty',
        'healthcare': 'Healthcare',
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

  const loadNearbyServices = async () => {
    try {
      setIsLoading(true);
      let services;
      
      if (category) {
        // If category is specified, get services by category
        const categoryServices = await CategoryService.getServicesByCategory(category);
        services = categoryServices;
      } else {
        // Otherwise get all nearby services
        services = await ServiceService.getNearbyServices();
      }
      
      // Filter out services without coordinates and ensure they have required fields
      const validServices = services
        .filter(service => service.id && service.latitude && service.longitude)
        .map(service => service as Service);
      setNearbyServices(validServices);
    } catch (error) {
      console.error('Error loading nearby services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter services based on selected categories and industries
  const filteredServices = nearbyServices.filter((service: Service) => {
    const matchesCategory = selectedCategories.includes('all') || 
                           selectedCategories.length === 0 ||
                           selectedCategories.some((cat: string) => 
                             service.category_name?.toLowerCase().includes(cat.toLowerCase())
                           );
    const matchesIndustry = selectedIndustries.includes('all') ||
                           selectedIndustries.some((ind: string) => {
                             const industryName = ind.replace(/-/g, ' ');
                             return service.industry?.toLowerCase().includes(industryName.toLowerCase());
                           });
    return matchesCategory && matchesIndustry;
  });

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: 3.1478,
          longitude: 101.6953,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {filteredServices.map((service: Service) => (
          <Marker
            key={service.id}
            coordinate={{
              latitude: service.latitude!,
              longitude: service.longitude!
            }}
            title={service.title}
            description={`${service.provider_name} - ${service.currency}${service.price}`}
            onPress={() => router.push(`/service/${service.id}`)}
          >
            <View style={styles.markerContainer}>
              <View style={styles.marker}>
                <MapPin size={20} color="white" />
              </View>
              <View style={styles.markerTriangle} />
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );

  const renderListView = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading nearby services...</Text>
        </View>
      );
    }

    if (filteredServices.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No nearby services found</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredServices.map((service: Service) => (
          <ServiceCard
            key={service.id}
            service={service}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.primary.main} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category ? `${category} Services` : 'Nearby Services'}</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'map' && styles.activeToggle]}
            onPress={() => setViewMode('map')}
          >
            <MapIcon size={20} color={viewMode === 'map' ? Colors.text.white : Colors.primary.main} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
            onPress={() => setViewMode('list')}
          >
            <List size={20} color={viewMode === 'list' ? Colors.text.white : Colors.primary.main} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={styles.filterDropdown}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={styles.filterText}>{getCategoryDisplayText()}</Text>
          <ChevronDown size={16} color={Colors.primary.main} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterDropdown}
          onPress={() => setShowIndustryModal(true)}
        >
          <Text style={styles.filterText}>{getIndustryDisplayText()}</Text>
          <ChevronDown size={16} color={Colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'map' ? renderMapView() : renderListView()}

      {/* Modals */}
      <CategorySelectionModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
      />
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
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: '#1D1D1F',
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
    minHeight: 400,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#007AFF',
    marginTop: -1,
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  filterDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
});