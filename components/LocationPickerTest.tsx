import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_PLACES_API_KEY } from '../config/maps';

interface LocationData {
  address: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

export default function LocationPickerTest() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  const handleLocationSelect = (data: any, details: any) => {
    try {
      console.log('Location data:', data);
      console.log('Location details:', details);
      
      if (data && details?.geometry?.location) {
        const locationData: LocationData = {
          address: data.description || data.structured_formatting?.main_text || 'Unknown location',
          coordinate: {
            latitude: details.geometry.location.lat,
            longitude: details.geometry.location.lng,
          },
        };
        setSelectedLocation(locationData);
        Alert.alert('Location Selected', `Address: ${locationData.address}`);
      } else {
        console.warn('Invalid location data received');
      }
    } catch (error) {
      console.error('Error selecting location:', error);
      Alert.alert('Error', 'Failed to select location');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Picker Test</Text>
      
      <GooglePlacesAutocomplete
        placeholder="Search for a location..."
        onPress={handleLocationSelect}
        query={{
          key: GOOGLE_PLACES_API_KEY,
          language: 'en',
          components: 'country:my',
        }}
        fetchDetails={true}
        enablePoweredByContainer={false}
        predefinedPlaces={[]}
        predefinedPlacesAlwaysVisible={false}
        listViewDisplayed={false}
        styles={{
          textInputContainer: styles.searchInputContainer,
          textInput: styles.searchInput,
          listView: styles.searchResults,
        }}
      />
      
      {selectedLocation && (
        <View style={styles.selectedLocation}>
          <Text style={styles.selectedTitle}>Selected Location:</Text>
          <Text style={styles.selectedAddress}>{selectedLocation.address}</Text>
          <Text style={styles.selectedCoords}>
            Lat: {selectedLocation.coordinate.latitude.toFixed(6)}, 
            Lng: {selectedLocation.coordinate.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F2F2F7',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchInputContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchInput: {
    backgroundColor: 'transparent',
    fontSize: 16,
    color: '#1D1D1F',
  },
  searchResults: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedLocation: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  selectedAddress: {
    fontSize: 14,
    color: '#1D1D1F',
    marginBottom: 5,
  },
  selectedCoords: {
    fontSize: 12,
    color: '#8E8E93',
  },
});