import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { X, MapPin, Search } from 'lucide-react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_PLACES_API_KEY } from '../config/maps';
import Colors from '../constants/Colors';

// Conditional import for MapView to handle native module availability
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const MapsModule = require('react-native-maps');
  MapView = MapsModule.default || MapsModule.MapView;
  Marker = MapsModule.Marker;
  PROVIDER_GOOGLE = MapsModule.PROVIDER_GOOGLE;
} catch (error) {
  console.warn('react-native-maps not available:', error);
  // Fallback components
  MapView = ({ children, style, ...props }: any) => (
    <View style={[style, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]} {...props}>
      <Text>Map not available</Text>
      {children}
    </View>
  );
  Marker = ({ children }: any) => <View>{children}</View>;
  PROVIDER_GOOGLE = 'google';
}

interface LocationShareModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationShare: (location: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
  serviceTitle: string;
  buyerName: string;
}

export function LocationShareModal({
  visible,
  onClose,
  onLocationShare,
  serviceTitle,
  buyerName,
}: LocationShareModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  
  const [mapRegion, setMapRegion] = useState({
    latitude: 3.139, // Kuala Lumpur center
    longitude: 101.6869,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const handleShareLocation = () => {
    if (!selectedLocation) {
      Alert.alert('No Location Selected', 'Please select a location on the map first.');
      return;
    }

    Alert.alert(
      'Share Location',
      `Share this location with ${buyerName} for the job "${serviceTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: () => {
            onLocationShare(selectedLocation);
            onClose();
          },
        },
      ]
    );
  };

  const handleClose = () => {
    setSelectedLocation(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Share Job Location</Text>
          <TouchableOpacity 
            onPress={handleShareLocation}
            disabled={!selectedLocation}
          >
            <Text style={[
              styles.shareText,
              !selectedLocation && styles.shareTextDisabled
            ]}>Share</Text>
          </TouchableOpacity>
        </View>
        
        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Job: {serviceTitle}</Text>
          <Text style={styles.infoSubtitle}>
            Select the location where {buyerName} should meet you for this on-site job.
          </Text>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Search size={20} color={Colors.text.secondary} style={styles.searchIcon} />
            <GooglePlacesAutocomplete
              placeholder="Search for a location..."
              onPress={(data: any, details: any) => {
                try {
                  if (data && details?.geometry?.location) {
                    const locationData = {
                      latitude: details.geometry.location.lat,
                      longitude: details.geometry.location.lng,
                      address: data.description || data.structured_formatting?.main_text || 'Unknown location',
                    };
                    setSelectedLocation(locationData);
                    setMapRegion({
                      latitude: details.geometry.location.lat,
                      longitude: details.geometry.location.lng,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    });
                  } else {
                    console.warn('LocationShareModal - Invalid location data received');
                  }
                } catch (error) {
                  console.error('LocationShareModal - Error selecting location:', error);
                }
              }}
              query={{
                key: GOOGLE_PLACES_API_KEY,
                language: 'en',
                components: 'country:my', // Restrict to Malaysia
              }}
              fetchDetails={true}
              enablePoweredByContainer={false}
              predefinedPlaces={[]}
              predefinedPlacesAlwaysVisible={false}
              listViewDisplayed={true}
              minLength={2}
              debounce={200}
              onFail={(error: any) => {
                console.error('LocationShareModal - GooglePlacesAutocomplete error:', error);
              }}
              onNotFound={() => {
                console.warn('LocationShareModal - GooglePlacesAutocomplete: No results found');
              }}
              textInputProps={{
                onFocus: () => {},
                onBlur: () => {},
                autoCorrect: false,
                autoCapitalize: 'none',
                placeholder: "Search for a location...",
                placeholderTextColor: Colors.text.secondary,
              }}
              styles={{
                textInputContainer: styles.searchInputContainer,
                textInput: styles.searchInput,
                listView: styles.searchResults,
                row: {
                  backgroundColor: Colors.background.tertiary,
                  padding: 13,
                  height: 44,
                  flexDirection: 'row',
                },
                separator: {
                  height: 0.5,
                  backgroundColor: Colors.border.light,
                },
                description: {
                  fontWeight: 'normal',
                  color: Colors.text.primary,
                  fontSize: 15,
                },
              }}
            />
          </View>
        </View>
        
        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={mapRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
            onPress={(event: any) => {
              try {
                const coordinate = event.nativeEvent.coordinate;
                
                const locationData = {
                  latitude: coordinate.latitude,
                  longitude: coordinate.longitude,
                  address: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
                };
                setSelectedLocation(locationData);
                setMapRegion({
                  latitude: coordinate.latitude,
                  longitude: coordinate.longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                });
              } catch (error) {
                console.error('LocationShareModal - Error in map press:', error);
              }
            }}
          >
            {selectedLocation && (
              <Marker
                coordinate={{
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                }}
                title="Job Location"
                description={selectedLocation.address}
              />
            )}
          </MapView>
        </View>
        
        {/* Selected Location Display */}
        {selectedLocation && (
          <View style={styles.selectedLocationContainer}>
            <MapPin size={20} color={Colors.primary.main} />
            <Text style={styles.selectedLocationText}>
              {selectedLocation.address}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  shareText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.main,
  },
  shareTextDisabled: {
    color: Colors.text.secondary,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.background.primary,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
  },
  searchInput: {
    fontSize: 16,
    color: Colors.text.primary,
    paddingVertical: 0,
  },
  searchResults: {
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 200,
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  selectedLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  selectedLocationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text.primary,
  },
});