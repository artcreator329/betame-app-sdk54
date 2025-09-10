import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

/**
 * Get the current user location with permission handling
 * @returns Promise<UserLocation | null>
 */
export async function getCurrentUserLocation(): Promise<UserLocation | null> {
  try {
    // Check if location services are enabled
    const isLocationEnabled = await Location.hasServicesEnabledAsync();
    if (!isLocationEnabled) {
      console.warn('Location services are not enabled');
      return null;
    }

    // Request location permissions
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('Location permission not granted');
      
      // Show appropriate message based on platform and permission status
      if (Platform.OS === 'ios' && !canAskAgain) {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access in Settings to see nearby services sorted by distance.',
          [{ text: 'OK' }]
        );
      } else if (Platform.OS === 'android' && !canAskAgain) {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access in App Settings to see nearby services sorted by distance.',
          [{ text: 'OK' }]
        );
      }
      
      return null;
    }

    // Get current position with timeout
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeout: 10000, // 10 second timeout
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting user location:', error);
    return null;
  }
}

/**
 * Get user location for web platform using browser geolocation API
 * @returns Promise<UserLocation | null>
 */
export async function getCurrentUserLocationWeb(): Promise<UserLocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Error getting user location:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

/**
 * Get current user location (works for both native and web)
 * @returns Promise<UserLocation | null>
 */
export async function getCurrentLocation(): Promise<UserLocation | null> {
  if (Platform.OS === 'web') {
    return getCurrentUserLocationWeb();
  } else {
    return getCurrentUserLocation();
  }
}

/**
 * Sort services by distance from user location
 * @param services Array of services with latitude and longitude
 * @param userLocation User's current location
 * @returns Sorted array of services (nearest first)
 */
export function sortServicesByDistance<T extends { latitude?: number; longitude?: number }>(
  services: T[],
  userLocation: UserLocation
): T[] {
  return services
    .filter(service => service.latitude && service.longitude)
    .map(service => ({
      ...service,
      distance: calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        service.latitude!,
        service.longitude!
      ),
    }))
    .sort((a, b) => (a as any).distance - (b as any).distance)
    .map(({ distance, ...service }) => service); // Remove distance property from final result
}

/**
 * Format distance for display
 * @param distance Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`;
  } else {
    return `${Math.round(distance)}km`;
  }
}
