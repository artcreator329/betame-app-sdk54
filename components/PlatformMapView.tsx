// Platform-agnostic MapView component
// This file will be used as fallback for any platform that doesn't have a specific implementation

export interface MapViewProps {
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  provider?: string;
  onRegionChange?: (region: any) => void;
  onPress?: (event: any) => void;
  children?: React.ReactNode;
}

export interface MarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  description?: string;
  onPress?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children?: React.ReactNode;
}

// Re-export from platform-specific implementations
export { PlatformMapView, PlatformMarker, PLATFORM_PROVIDER_GOOGLE } from './PlatformMapView.native';
