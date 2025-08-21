// Web-specific version of nearby.tsx with direct map shim import
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, List, Map as MapIcon, ChevronDown, Grid3X3 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
// Direct import of map shim for web
import MapView, { Marker, PROVIDER_GOOGLE } from '../metro-shims/react-native-maps.js';
import { ServiceService, Service as ServiceFromLib } from '@/lib/service-service';
import { CategoryService } from '@/lib/category-service';
import ServiceCard from '@/components/ServiceCard';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface Service extends ServiceFromLib {
  provider_name: string;
  latitude: number;
  longitude: number;
}

export default function NearbyScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [listLayout, setListLayout] = useState<'list' | 'grid'>('grid');
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Load services on mount
  useEffect(() => {
    console.log('🔧 useEffect triggered - calling loadServices');
    loadServices();
  }, []);

  // Filter services when categories change
  useEffect(() => {
    if (selectedCategories.length === 0) {
      setFilteredServices(services);
    } else {
      const filtered = services.filter(service => 
        selectedCategories.includes(service.category)
      );
      setFilteredServices(filtered);
    }
  }, [services, selectedCategories]);

  const loadServices = async () => {
    try {
      console.log('🔧 loadServices called - starting to fetch services');
      setIsLoading(true);
      const fetchedServices = await ServiceService.getAllServices();
      console.log('🔧 ServiceService.getAllServices() returned:', fetchedServices);
      console.log('🔧 fetchedServices length:', fetchedServices?.length || 0);
      setServices(fetchedServices);
      setFilteredServices(fetchedServices);
      console.log('🔧 Services state updated');
    } catch (error) {
      console.error('❌ Error loading services:', error);
    } finally {
      setIsLoading(false);
      console.log('🔧 loadServices completed, isLoading set to false');
    }
  };

  const handleListToggle = () => {
    if (viewMode === 'list') {
      setListLayout(listLayout === 'list' ? 'grid' : 'list');
    } else {
      setViewMode('list');
      setListLayout('grid');
    }
  };

  const getCategoryDisplayText = () => {
    if (selectedCategories.length === 0) return 'All Categories';
    if (selectedCategories.length === 1) return selectedCategories[0];
    return `${selectedCategories.length} Categories`;
  };

  // Desktop layout with map and list side by side
  const renderDesktopLayout = () => {
    console.log('🔧 renderDesktopLayout called - rendering desktop layout');
    return (
    <View style={styles.desktopContainer}>
      {/* Left side - Service list */}
      <View style={styles.desktopListContainer}>
        {renderListView()}
      </View>
      
      {/* Right side - Map */}
              <View style={styles.desktopMapContainer}>
          {renderMapView()}
        </View>
    </View>
    );
  };

  const renderMapView = () => {
    console.log('🔧 renderMapView called - rendering map component');
    console.log('🔧 filteredServices count:', filteredServices.length);
    console.log('🔧 filteredServices:', filteredServices);
    
    return (
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
        {filteredServices.map((service: Service) => {
          console.log(`🔧 Rendering marker for service: ${service.title} at ${service.latitude}, ${service.longitude}`);
          return (
            <Marker
              key={service.id}
              coordinate={{
                latitude: service.latitude!,
                longitude: service.longitude!
              }}
              title={service.title}
              description={`${service.provider_name} - ${service.currency}${service.price}`}
              onPress={() => {
                if (isWeb && width >= 1024) {
                  // On desktop, select the service to highlight it in the list
                  setSelectedService(service);
                  // Scroll to the service card
                  const element = document.getElementById(`service-${service.id}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                } else {
                  // On mobile, navigate to service details
                  router.push(`/service/${service.id}`);
                }
              }}
            >
              <View style={[
                styles.markerContainer,
                selectedService?.id === service.id && isWeb && width >= 1024 && styles.selectedMarker
              ]}>
                <View style={[
                  styles.marker,
                  selectedService?.id === service.id && isWeb && width >= 1024 && styles.selectedMarkerInner
                ]}>
                  <MapPin size={20} color="white" />
                </View>
                <View style={[
                  styles.markerTriangle,
                  selectedService?.id === service.id && isWeb && width >= 1024 && styles.selectedMarkerTriangle
                ]} />
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
    );
  };

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
        <View style={listLayout === 'grid' ? styles.servicesGrid : styles.servicesList}>
          {filteredServices.map((service: Service) => (
            <View 
              key={`${service.id}-${listLayout}`} 
              id={`service-${service.id}`}
              style={[
                listLayout === 'grid' ? styles.serviceCardContainer : styles.serviceListItem,
                selectedService?.id === service.id && isWeb && width >= 1024 && styles.selectedServiceCard
              ]}
            >
              <ServiceCard
                service={service}
                style={listLayout === 'grid' ? { width: '100%' } : { width: '100%' }}
                disableFavorites={true} // Disable favorites for nearby services view
                onPress={() => {
                  if (isWeb && width >= 1024) {
                    // On desktop, select the service and center the map on it
                    setSelectedService(service);
                  } else {
                    // On mobile, navigate to service details
                    router.push(`/service/${service.id}`);
                  }
                }}
              />
            </View>
          ))}
        </View>
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
        <View style={styles.headerActions}>
          {/* Only show view toggle on mobile */}
          {!isWeb || width < 1024 ? (
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'map' && styles.activeToggle]}
                onPress={() => setViewMode('map')}
              >
                <MapIcon size={20} color={viewMode === 'map' ? Colors.text.white : Colors.primary.main} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
                onPress={handleListToggle}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {viewMode === 'list' && (listLayout === 'grid' || (isWeb && width >= 1024)) ? (
                  <Grid3X3 size={20} color={Colors.text.white} />
                ) : (
                  <List size={20} color={viewMode === 'list' ? Colors.text.white : Colors.primary.main} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.desktopHeaderInfo}>
              <Text style={styles.desktopHeaderText}>
                {filteredServices.length} services found
              </Text>
            </View>
          )}
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

      </View>

      {/* Content */}
      {isWeb && width >= 1024 ? (
        // Desktop layout - always show map and list side by side
        renderDesktopLayout()
      ) : (
        // Mobile layout - toggle between map and list
        viewMode === 'map' ? renderMapView() : renderListView()
      )}

      {/* Modals */}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 120,
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
    margin: isWeb && width >= 1024 ? 0 : 16,
    borderRadius: isWeb && width >= 1024 ? 0 : 12,
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
    padding: isWeb && width >= 1024 ? 16 : 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isWeb && width >= 1024 ? 'flex-start' : 'space-between',
    width: '100%',
    gap: 16,
  },
  serviceCardContainer: {
    width: isWeb && width >= 1440 ? 'calc(25% - 12px)' : 
           isWeb && width >= 1024 ? 'calc(33.333% - 11px)' : '48%',
    marginBottom: 16,
    maxWidth: isWeb && width >= 1440 ? 280 : 
              isWeb && width >= 1024 ? 320 : undefined,
    minWidth: isWeb && width >= 1440 ? 240 : 
              isWeb && width >= 1024 ? 280 : undefined,
  },
  servicesList: {
    flex: 1,
    width: '100%',
  },
  serviceListItem: {
    marginBottom: 12,
    width: '100%',
  },
  serviceCardWrapper: {
    width: '100%',
  },
  serviceCardFullWidth: {
    width: '100%',
  },

  // Desktop layout styles
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopListContainer: {
    flex: 1,
    maxWidth: isWeb && width >= 1024 ? '50%' : '100%',
    borderRightWidth: isWeb && width >= 1024 ? 1 : 0,
    borderRightColor: '#E5E5EA',
  },
  desktopMapContainer: {
    flex: 1,
    maxWidth: isWeb && width >= 1024 ? '50%' : '100%',
  },
  desktopHeaderInfo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopHeaderText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  selectedServiceCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    backgroundColor: '#F0F8FF',
  },
  selectedMarker: {
    transform: [{ scale: 1.2 }],
  },
  selectedMarkerInner: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF4500',
  },
  selectedMarkerTriangle: {
    borderTopColor: '#FF6B35',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  filterText: {
    fontSize: 14,
    color: '#1D1D1F',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
