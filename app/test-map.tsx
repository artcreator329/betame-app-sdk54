import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlatformMapView as MapView, PlatformMarker as Marker, PLATFORM_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/PlatformMapView';
import { GOOGLE_PLACES_API_KEY } from '../config/maps';

export default function TestMapScreen() {
  const [mapVisible, setMapVisible] = useState(false);

  const testMap = () => {
    setMapVisible(true);
    Alert.alert(
      'Map Test',
      `Google Maps API Key: ${GOOGLE_PLACES_API_KEY ? 'Configured' : 'Not configured'}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Google Maps Test</Text>
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity style={styles.button} onPress={testMap}>
          <Text style={styles.buttonText}>Test Google Maps</Text>
        </TouchableOpacity>
        
        {mapVisible && (
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
              <Marker
                coordinate={{
                  latitude: 3.1478,
                  longitude: 101.6953,
                }}
                title="Kuala Lumpur"
                description="Test marker"
              />
            </MapView>
          </View>
        )}
        
        <View style={styles.info}>
          <Text style={styles.infoText}>
            API Key Status: {GOOGLE_PLACES_API_KEY ? '✅ Configured' : '❌ Not configured'}
          </Text>
          <Text style={styles.infoText}>
            Provider: {PROVIDER_GOOGLE}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    height: 300,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  info: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
  },
}); 