import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, List, Map as MapIcon, ChevronDown, Grid3X3 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ServiceService, Service as ServiceFromLib } from '@/lib/service-service';
import { CategoryService } from '@/lib/category-service';
import { Service } from '@/types/service';
import { useAuth } from '@/contexts/AuthContext';
import ServiceCard from '@/components/ServiceCard';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import { getCurrentLocation, UserLocation } from '@/utils/location-utils';

import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';



export default function NearbyScreen() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>(
    isWeb && width >= 1024 ? 'map' : 'list'
  );
  const [listLayout, setListLayout] = useState<'grid' | 'list'>(
    isWeb && width >= 1024 ? 'grid' : 'list'
  );
  const [nearbyServices, setNearbyServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [hoveredService, setHoveredService] = useState<Service | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { category } = useLocalSearchParams<{ category?: string }>();

  useEffect(() => {
    loadNearbyServices();
  }, [category]);

  // Ensure grid layout on desktop web
  useEffect(() => {
    if (isWeb && width >= 1024 && listLayout !== 'grid') {
      setListLayout('grid');
    }
  }, [isWeb, width, listLayout]);

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



  const loadNearbyServices = async () => {
    try {
      setIsLoading(true);
      
      // Get user location first
      setIsLoadingLocation(true);
      const location = await getCurrentLocation();
      setUserLocation(location);
      setIsLoadingLocation(false);
      
      let services;
      
      if (category) {
        // If category is specified, get services by category
        const categoryServices = await CategoryService.getServicesByCategory(category);
        services = categoryServices;
      } else {
        // Get nearby services with location-based sorting if location is available
        if (location) {
          services = await ServiceService.getNearbyServicesSortedByLocation(location);
        } else {
          services = await ServiceService.getNearbyServices();
        }
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
      setIsLoadingLocation(false);
    }
  };

  const handleListToggle = () => {
    console.log('List button pressed!');
    console.log('Current viewMode:', viewMode);
    console.log('Current listLayout:', listLayout);
    
    if (viewMode === 'list') {
      // If already in list mode, toggle between grid and list layout
      // On desktop web, always use grid view
      if (isWeb && width >= 1024) {
        setListLayout('grid');
        return;
      }
      
      const newLayout = listLayout === 'grid' ? 'list' : 'grid';
      console.log('Toggling layout to:', newLayout);
      setListLayout(newLayout);
    } else {
      // If in map mode, switch to list mode with current layout
      console.log('Switching to list mode');
      setViewMode('list');
      // On desktop web, always use grid view
      if (isWeb && width >= 1024) {
        setListLayout('grid');
      }
    }
  };

  // Filter services based on selected categories and industries
  const filteredServices = nearbyServices.filter((service: Service) => {
    const matchesCategory = selectedCategories.length === 0 ||
                           selectedCategories.some((cat: string) => 
                             service.category_name?.toLowerCase().includes(cat.toLowerCase())
                           );

    return matchesCategory;
  });

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
        <Text style={{color: 'red', fontSize: 20}}>MAP CONTAINER RENDERED</Text>
        {renderMapView()}
      </View>
    </View>
    );
  };

  const renderMapView = () => {
    console.log('🔧 renderMapView called - rendering map component');
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
        {filteredServices.map((service: Service) => (
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
            onMouseEnter={() => {
              if (isWeb) {
                setHoveredService(service);
              }
            }}
            onMouseLeave={() => {
              if (isWeb) {
                setHoveredService(null);
              }
            }}
          >
            <View style={[
              styles.markerContainer,
              selectedService?.id === service.id && isWeb && width >= 1024 && styles.selectedMarker
            ]}>
              {/* Service name label */}
              <View style={[
                styles.serviceNameLabel,
                selectedService?.id === service.id && isWeb && width >= 1024 && styles.selectedServiceNameLabel
              ]}>
                <Text style={[
                  styles.serviceNameText,
                  selectedService?.id === service.id && isWeb && width >= 1024 && styles.selectedServiceNameText
                ]} numberOfLines={2}>
                  {service.title}
                </Text>
              </View>
              <View style={[
                styles.marker,
                selectedService?.id === service.id && isWeb && width >= 1024 && styles.selectedMarkerInner,
                hoveredService?.id === service.id && isWeb && styles.hoveredMarker
              ]}>
                <MapPin size={20} color="white" />
              </View>
              <View style={[
                styles.markerTriangle,
                selectedService?.id === service.id && isWeb && width >= 1024 && styles.selectedMarkerTriangle
              ]} />
            </View>
            
            {/* Hover Tooltip */}
            {hoveredService?.id === service.id && isWeb && (
              <View style={styles.hoverTooltip}>
                <View style={styles.tooltipContent}>
                  <Text style={styles.tooltipTitle} numberOfLines={1}>
                    {service.title}
                  </Text>
                  <Text style={styles.tooltipProvider} numberOfLines={1}>
                    {service.provider_name}
                  </Text>
                  <View style={styles.tooltipPriceRow}>
                    <Text style={styles.tooltipPrice}>
                      {service.currency}{service.price}
                    </Text>
                    {service.category_name && (
                      <Text style={styles.tooltipCategory}>
                        • {service.category_name}
                      </Text>
                    )}
                  </View>
                  {service.description && (
                    <Text style={styles.tooltipDescription} numberOfLines={2}>
                      {service.description}
                    </Text>
                  )}
                </View>
                <View style={styles.tooltipArrow} />
              </View>
            )}
          </Marker>
        ))}
      </MapView>
    </View>
    );
  };

  const renderListView = () => {
    if (isLoading || isLoadingLocation) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {isLoadingLocation ? 'Getting your location...' : 'Loading nearby services...'}
          </Text>
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
                layout={listLayout === 'grid' ? 'vertical' : 'horizontal'}
                viewSource="nearby"
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
  serviceNameLabel: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    maxWidth: 120,
    minWidth: 80,
  },
  serviceNameText: {
    fontSize: 11,
    color: '#1D1D1F',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
  selectedServiceNameLabel: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
  },
  selectedServiceNameText: {
    color: '#007AFF',
    fontWeight: '700',
  },
  hoverTooltip: {
    position: 'absolute',
    bottom: 60,
    left: -100,
    width: 200,
    zIndex: 1000,
  },
  tooltipContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  tooltipProvider: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 6,
  },
  tooltipPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tooltipPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  tooltipCategory: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  tooltipDescription: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 14,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    left: 20,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderBottomWidth: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
    borderBottomColor: 'transparent',
  },
  hoveredMarker: {
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.4,
    shadowRadius: 6,
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