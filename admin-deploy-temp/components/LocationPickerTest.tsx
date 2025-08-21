import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Colors } from '../constants/Colors';
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
        Alert.alert('Error', 'Invalid location data received');
      }
    } catch (error) {
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
        onFail={(error) => {
          console.error('LocationPickerTest - GooglePlacesAutocomplete error:', error);
          Alert.alert('API Error', `Google Places API error: ${error}`);
        }}
        onNotFound={() => {
          console.warn('LocationPickerTest - GooglePlacesAutocomplete: No results found');
          Alert.alert('No Results', 'No locations found for your search');
        }}
        styles={{
          textInputContainer: styles.searchInputContainer,
          textInput: styles.searchInput,
          listView: styles.searchResults,
        }}
      />
      
      {selectedLocation && (
        <View style={styles.selectedLocation}>
          <Text style={styles.selectedLocationText}>
            Selected: {selectedLocation.address}
          </Text>
          <Text style={styles.selectedLocationText}>
            Coordinates: {selectedLocation.coordinate.latitude}, {selectedLocation.coordinate.longitude}
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
    backgroundColor: Colors.background.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  searchInputContainer: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchInput: {
    backgroundColor: 'transparent',
    fontSize: 16,
    color: Colors.text.primary,
  },
  searchResults: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 8,
    marginTop: 5,
    elevation: 3,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedLocation: {
    marginTop: 20,
    padding: 15,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  selectedLocationText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 5,
  },
});