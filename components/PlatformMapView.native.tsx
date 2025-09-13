// Native platform MapView component
import React from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

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

export const PlatformMapView = React.forwardRef<any, MapViewProps>((props, ref) => {
  return (
    <MapView
      ref={ref}
      style={props.style}
      provider={PROVIDER_GOOGLE}
      initialRegion={props.initialRegion || {
        latitude: 3.1478,
        longitude: 101.6953,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
      showsUserLocation={props.showsUserLocation}
      showsMyLocationButton={props.showsMyLocationButton}
      onRegionChange={props.onRegionChange}
      onPress={props.onPress}
    >
      {props.children}
    </MapView>
  );
});

export const PlatformMarker = React.forwardRef<any, MarkerProps>((props, ref) => {
  return (
    <Marker
      ref={ref}
      coordinate={props.coordinate}
      title={props.title}
      description={props.description}
      onPress={props.onPress}
    >
      {props.children}
    </Marker>
  );
});

export const PLATFORM_PROVIDER_GOOGLE = PROVIDER_GOOGLE;
