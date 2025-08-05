import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapPin, Plus, Minus, Search } from 'lucide-react-native';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_PLACES_API_KEY } from '../config/maps';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

interface ServiceAreaPickerProps {
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
    radius: number;
    description: string;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    radius: number;
    description: string;
  };
}

export default function ServiceAreaPicker({ onLocationSelect, initialLocation }: ServiceAreaPickerProps) {
  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude || 3.1478,
    longitude: initialLocation?.longitude || 101.6953,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: initialLocation?.latitude || 3.1478,
    longitude: initialLocation?.longitude || 101.6953,
  });
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [radius, setRadius] = useState(initialLocation?.radius || 10);
  const [description, setDescription] = useState(initialLocation?.description || '');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchText, setSearchText] = useState(initialLocation?.address || '');

  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      });
      setRegion({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
    setSearchText(initialLocation?.address || '');
  }, [initialLocation]);

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      
      setRegion(newRegion);
      setSelectedLocation({ latitude, longitude });
      
      // Get address from coordinates
      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const formattedAddress = `${addr.street || ''} ${addr.city || ''} ${addr.region || ''} ${addr.country || ''}`.trim();
        setAddress(formattedAddress);
        setSearchText(formattedAddress);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const formattedAddress = `${addr.street || ''} ${addr.city || ''} ${addr.region || ''} ${addr.country || ''}`.trim();
        setAddress(formattedAddress);
        setSearchText(formattedAddress);
      }
    } catch (error) {
      console.error('Error getting address:', error);
    }
  };

  const handleLocationSelect = (data: any, details: any) => {
    try {
      if (data && details?.geometry?.location) {
        const { lat, lng } = details.geometry.location;
        const newLocation = { latitude: lat, longitude: lng };
        const selectedAddress = data.description || data.structured_formatting?.main_text || 'Unknown location';
        
        setSelectedLocation(newLocation);
        setAddress(selectedAddress);
        setSearchText(selectedAddress);
        
        // Update map region to show selected location
        setRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } catch (error) {
      console.error('Error selecting location:', error);
      Alert.alert('Error', 'Failed to select location');
    }
  };

  const adjustRadius = (increment: number) => {
    const newRadius = Math.max(1, Math.min(100, radius + increment));
    setRadius(newRadius);
  };

  const handleConfirm = () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Please select a location or enter an address');
      return;
    }
    
    onLocationSelect({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      address: address.trim(),
      radius,
      description: description.trim(),
    });
  };

  return (
    <View style={styles.container}>
      {/* Header with Current Location Button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.currentLocationButton} 
          onPress={getCurrentLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color={Colors.primary.main} />
          ) : (
            <MapPin size={20} color={Colors.primary.main} />
          )}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tap on map to select location</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={region}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          <Marker
            coordinate={selectedLocation}
            title="Service Location"
            description={address}
          >
            <View style={styles.markerContainer}>
              <View style={styles.marker}>
                <MapPin size={20} color={Colors.text.white} />
              </View>
            </View>
          </Marker>
          
          <Circle
            center={selectedLocation}
            radius={radius * 1000} // Convert km to meters
            strokeColor="rgba(0, 122, 255, 0.5)"
            fillColor="rgba(0, 122, 255, 0.1)"
            strokeWidth={2}
          />
        </MapView>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* Address Input with Autocomplete */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service Location</Text>
          <View style={styles.searchContainer}>
            <View style={styles.searchWrapper}>
              <Search size={16} color={Colors.text.secondary} style={styles.searchIcon} />
              <GooglePlacesAutocomplete
                placeholder="Search for your service location..."
                onPress={handleLocationSelect}
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
                debounce={300}
                textInputProps={{
                  value: searchText,
                  onChangeText: (text: string) => {
                    setSearchText(text);
                    setAddress(text);
                  },
                  autoCorrect: false,
                  autoCapitalize: 'none',
                  placeholder: "Search for your service location...",
                  placeholderTextColor: Colors.text.secondary,
                  style: styles.searchInput,
                }}
                styles={{
                  textInputContainer: styles.searchInputContainer,
                  listView: styles.searchResults,
                  row: {
                    backgroundColor: Colors.background.tertiary,
                    padding: 12,
                    minHeight: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                  },
                  separator: {
                    height: 0.5,
                    backgroundColor: Colors.border.light,
                  },
                  description: {
                    fontWeight: 'normal',
                    color: Colors.text.primary,
                    fontSize: 14,
                    flex: 1,
                  },
                }}
              />
            </View>
          </View>
        </View>

        {/* Service Area Radius */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service Area Radius</Text>
          <View style={styles.radiusContainer}>
            <TouchableOpacity 
              style={styles.radiusButton} 
              onPress={() => adjustRadius(-1)}
            >
              <Minus size={16} color={Colors.primary.main} />
            </TouchableOpacity>
            <Text style={styles.radiusText}>{radius} km</Text>
            <TouchableOpacity 
              style={styles.radiusButton} 
              onPress={() => adjustRadius(1)}
            >
              <Plus size={16} color={Colors.primary.main} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Area Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service Area Description (Optional)</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g., Covers Kuala Lumpur and surrounding areas"
            placeholderTextColor={Colors.text.secondary}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Confirm Button */}
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm Service Area</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.tertiary,
    minHeight: 500,
  },
  headerContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    textAlign: 'center',
    flex: 1,
  },

  currentLocationButton: {
    padding: 8,
  },
  mapContainer: {
    height: 250,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlsContainer: {
    backgroundColor: Colors.background.tertiary,
    padding: 16,
    maxHeight: 300,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  addressInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1D1D1F',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  radiusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusButton: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  radiusText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginHorizontal: 20,
    minWidth: 60,
    textAlign: 'center',
  },
  descriptionInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1D1D1F',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    height: 60,
    textAlignVertical: 'top',
  },
  confirmButton: {
    backgroundColor: Colors.primary.main,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    position: 'relative',
    zIndex: 1,
  },
  searchWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  searchInputContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  searchInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 40,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1D1D1F',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    height: 44,
  },
  searchResults: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});