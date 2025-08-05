import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Star, List, Map as MapIcon, ChevronDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ServiceLocation } from '@/types/service-location';
import { ServiceService, Service } from '@/lib/service-service';
import { useAuth } from '@/contexts/AuthContext';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import IndustrySelectionModal from '@/components/IndustrySelectionModal';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

// Helper function to convert Service to ServiceLocation
const convertServiceToLocation = (service: Service): ServiceLocation | null => {
  if (!service.latitude || !service.longitude) {
    return null; // Skip services without coordinates
  }
  
  return {
    id: service.id || '',
    title: service.title,
    provider: service.provider_name || 'Unknown Provider',
    rating: service.rating || 0,
    price: service.price,
    currency: service.currency,
    category: service.category_name || 'General',
    image: service.image_url || 'https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=400',
    coordinate: {
      latitude: service.latitude,
      longitude: service.longitude,
    },
    address: service.location || 'Location not specified',
    distance: '0 km', // We'll calculate this later if needed
  };
};

export default function NearbyScreen() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [nearbyServices, setNearbyServices] = useState<ServiceLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(['all']);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    loadNearbyServices();
  }, []);

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
      const services = await ServiceService.getNearbyServices();
      const serviceLocations = services
        .map(convertServiceToLocation)
        .filter((location): location is ServiceLocation => location !== null);
      setNearbyServices(serviceLocations);
    } catch (error) {
      console.error('Error loading nearby services:', error);
    } finally {
      setIsLoading(false);
    }
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

  // Filter services based on selected categories and industries
  const filteredServices = nearbyServices.filter((service: ServiceLocation) => {
    const matchesCategory = selectedCategories.includes('all') || 
                           selectedCategories.length === 0 ||
                           selectedCategories.some((cat: string) => 
                             service.category?.toLowerCase().includes(cat.toLowerCase())
                           );
    const matchesIndustry = selectedIndustries.includes('all') ||
                           selectedIndustries.some((ind: string) => {
                             const industryName = ind.replace(/-/g, ' ');
                             // Since ServiceLocation doesn't have industry field, we'll match against category for now
                             return service.category?.toLowerCase().includes(industryName.toLowerCase());
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
        {filteredServices.map((service) => (
          <Marker
            key={service.id}
            coordinate={service.coordinate}
            title={service.title}
            description={`${service.provider} - ${service.currency}${service.price}`}
            onPress={() => handleServicePress(service.id)}
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
        {filteredServices.map((service) => (
        <TouchableOpacity
          key={service.id}
          style={styles.listItem}
          onPress={() => handleServicePress(service.id)}
        >
          <Image source={{ uri: service.image }} style={styles.listItemImage} />
          <View style={styles.listItemInfo}>
            <View style={styles.listItemHeader}>
              <Text style={styles.listItemTitle}>{service.title}</Text>
              <Text style={styles.listItemDistance}>{service.distance}</Text>
            </View>
            <Text style={styles.listItemProvider}>{service.provider}</Text>
            <Text style={styles.listItemAddress}>{service.address}</Text>
            <View style={styles.listItemFooter}>
              <View style={styles.ratingContainer}>
                <Star size={14} color="#FFD700" fill="#FFD700" />
                <Text style={styles.ratingText}>{service.rating}</Text>
              </View>
              <Text style={styles.listItemPrice}>
                From {service.currency}{service.price}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Nearby Services</Text>
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
  listItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    flex: 1,
  },
  listItemDistance: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  listItemProvider: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  listItemAddress: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  listItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 4,
  },
  listItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
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