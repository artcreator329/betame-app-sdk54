import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_PLACES_API_KEY } from '../config/maps';
import { Colors } from '@/constants/Colors';

interface LocationData {
  address: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

export default function TestMapScreen() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 3.1478,
    longitude: 101.6953,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  const router = useRouter();

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
        setMapRegion({
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        Alert.alert('Location Selected', `Address: ${locationData.address}`);
      } else {
        console.warn('TestMapScreen - Invalid location data received');
        Alert.alert('Error', 'Invalid location data received');
      }
    } catch (error) {
      console.error('TestMapScreen - Error selecting location:', error);
      Alert.alert('Error', 'Failed to select location');
    }
  };

  const handleMapPress = (event: any) => {
    try {
      const coordinate = event.nativeEvent.coordinate;
      
      const locationData: LocationData = {
        address: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
        coordinate: { latitude: coordinate.latitude, longitude: coordinate.longitude },
      };
      setSelectedLocation(locationData);
      Alert.alert('Map Location Selected', `Coordinates: ${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`);
    } catch (error) {
      console.error('TestMapScreen - Error in handleMapPress:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Map Test</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>API Key Status: {GOOGLE_PLACES_API_KEY ? 'Loaded' : 'Missing'}</Text>
        <Text style={styles.subtitle}>API Key Length: {GOOGLE_PLACES_API_KEY?.length || 0}</Text>
        
        <View style={styles.searchContainer}>
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
              console.error('TestMapScreen - GooglePlacesAutocomplete error:', error);
              Alert.alert('API Error', `Google Places API error: ${error}`);
            }}
            onNotFound={() => {
              console.warn('TestMapScreen - GooglePlacesAutocomplete: No results found');
              Alert.alert('No Results', 'No locations found for your search');
            }}
            styles={{
              textInputContainer: styles.searchInputContainer,
              textInput: styles.searchInput,
              listView: styles.searchResults,
            }}
          />
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={mapRegion}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={true}
            onMapReady={() => {
              // console.log('TestMapScreen - Map is ready');
            }}
          >
            {selectedLocation && (
              <Marker
                coordinate={selectedLocation.coordinate}
                title="Selected Location"
                description={selectedLocation.address}
              />
            )}
          </MapView>
        </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.tertiary,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInputContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchInput: {
    fontSize: 16,
    color: Colors.text.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchResults: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    maxHeight: 200,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  map: {
    flex: 1,
  },
  selectedLocation: {
    backgroundColor: Colors.background.secondary,
    padding: 16,
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