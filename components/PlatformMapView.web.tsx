// Web platform MapView component using Google Maps JavaScript API
import React, { useRef, useEffect, useState } from 'react';

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

// Google Maps API key from environment
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '<REDACTED_GOOGLE_API_KEY>';

// Load Google Maps script
let googleMapsLoaded = false;
let googleMapsLoading = false;
let googleMapsCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(): Promise<void> {
  if (googleMapsLoaded && typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
    return Promise.resolve();
  }
  
  if (googleMapsLoading) {
    return new Promise((resolve) => {
      googleMapsCallbacks.push(resolve);
    });
  }
  
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('❌ Google Maps API key not found');
    return Promise.reject(new Error('Google Maps API key not configured'));
  }
  
  googleMapsLoading = true;
  
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript && (window as any).google && (window as any).google.maps) {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      googleMapsCallbacks.forEach(callback => callback());
      googleMapsCallbacks = [];
      resolve();
      return;
    }

    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    (window as any).initGoogleMaps = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      googleMapsCallbacks.forEach(callback => callback());
      googleMapsCallbacks = [];
      resolve();
      delete (window as any).initGoogleMaps;
    };
    
    script.onerror = (error) => {
      console.error('❌ Failed to load Google Maps script:', error);
      googleMapsLoading = false;
      googleMapsCallbacks = [];
      reject(new Error('Failed to load Google Maps'));
    };
    
    document.head.appendChild(script);
  });
}

export const PlatformMapView = React.forwardRef<any, MapViewProps>((props, ref) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const initMap = async () => {
      if (!mountedRef.current || !mapRef.current) return;
      
      try {
        setIsInitializing(true);
        setMapError(false);
        
        try {
          await loadGoogleMapsScript();
          
          if (!mountedRef.current) return;
          if (typeof window === 'undefined' || typeof (window as any).google === 'undefined' || !(window as any).google.maps) {
            throw new Error('Google Maps API not available');
          }
        } catch (error) {
          console.error('❌ Failed to load Google Maps API:', error);
          if (mountedRef.current) {
            setMapError(true);
            setIsInitializing(false);
          }
          return;
        }
        
        const google = (window as any).google;
        const initialRegion = props.initialRegion || {
          latitude: 3.1478,
          longitude: 101.6953,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };

        const mapOptions = {
          center: {
            lat: initialRegion.latitude,
            lng: initialRegion.longitude,
          },
          zoom: Math.round(14 - Math.log2(initialRegion.latitudeDelta)),
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        };

        if (!mountedRef.current) return;
        
        const map = new google.maps.Map(mapRef.current, mapOptions);
        mapInstanceRef.current = map;
        
        if (mountedRef.current) {
          setMapLoaded(true);
          setIsInitializing(false);
        }

        // Handle user location if requested
        if (props.showsUserLocation) {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const userLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
                
                new google.maps.Marker({
                  position: userLocation,
                  map: map,
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                  },
                  title: 'Your Location',
                });
              },
              (error) => {
                console.warn('Error getting user location:', error);
              }
            );
          }
        }

        // Handle my location button
        if (props.showsMyLocationButton) {
          const myLocationButton = document.createElement('div');
          myLocationButton.innerHTML = `
            <div style="
              background-color: white;
              border: 2px solid #ccc;
              border-radius: 3px;
              box-shadow: 0 2px 6px rgba(0,0,0,.3);
              cursor: pointer;
              margin-bottom: 22px;
              text-align: center;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 20px;
                height: 20px;
                background-color: #4285F4;
                border-radius: 50%;
                border: 2px solid white;
              "></div>
            </div>
          `;
          
          myLocationButton.addEventListener('click', () => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                  };
                  map.setCenter(userLocation);
                  map.setZoom(15);
                },
                (error) => {
                  console.warn('Error getting user location:', error);
                }
              );
            }
          });

          map.controls[google.maps.ControlPosition.TOP_RIGHT].push(myLocationButton);
        }

      } catch (error) {
        console.error('❌ Error initializing Google Maps:', error);
        if (mountedRef.current) {
          setMapError(true);
          setIsInitializing(false);
        }
      }
    };

    timeoutId = setTimeout(() => {
      if (mountedRef.current && !mapLoaded && !mapError) {
        console.error('❌ Map loading timeout');
        setMapError(true);
        setIsInitializing(false);
      }
    }, 15000);

    const timer = setTimeout(() => {
      if (mountedRef.current && mapRef.current) {
        initMap();
      }
    }, 100);

    return () => {
      mountedRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(timer);
      
      if (mapInstanceRef.current) {
        markersRef.current.forEach(marker => {
          if (marker && marker.setMap) {
            marker.setMap(null);
          }
        });
        markersRef.current = [];
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle markers
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    React.Children.forEach(props.children, (child) => {
      if (React.isValidElement(child) && child.type === PlatformMarker) {
        const markerProps = child.props as MarkerProps;
        const google = (window as any).google;
        
        const marker = new google.maps.Marker({
          position: {
            lat: markerProps.coordinate.latitude,
            lng: markerProps.coordinate.longitude,
          },
          map: mapInstanceRef.current,
          title: markerProps.title || 'Service',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#007AFF" stroke="white" stroke-width="2"/>
                <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">S</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12)
          }
        });

        const infoContent = `
          <div style="
            background: white;
            border: 2px solid #007AFF;
            border-radius: 8px;
            padding: 8px 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            max-width: 200px;
          ">
            <div style="font-weight: 600; margin-bottom: 2px; color: #007AFF;">${markerProps.title || 'Service'}</div>
            <div style="font-size: 11px; color: #666;">${markerProps.description || ''}</div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
          content: infoContent
        });

        if (markerProps.onMouseEnter) {
          marker.addListener('mouseover', markerProps.onMouseEnter);
        }

        if (markerProps.onMouseLeave) {
          marker.addListener('mouseout', markerProps.onMouseLeave);
        }

        marker.addListener('mouseover', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });

        marker.addListener('mouseout', () => {
          infoWindow.close();
        });

        if (markerProps.onPress) {
          marker.addListener('click', markerProps.onPress);
        }

        markersRef.current.push(marker);
      }
    });
  }, [mapLoaded, props.children]);

  const isLoading = isInitializing || (!mapLoaded && !mapError);
  
  if (mapError) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: props.style?.minHeight || 400,
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          ...props.style,
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px', color: '#666' }}>
          🗺️
        </div>
        <div style={{ fontSize: '16px', color: '#666', textAlign: 'center', padding: '0 20px', marginBottom: '16px' }}>
          Map unavailable. Please check your internet connection.
        </div>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: props.style?.minHeight || 400,
        backgroundColor: isLoading ? '#f0f0f0' : 'transparent',
        display: isLoading ? 'flex' : 'block',
        alignItems: isLoading ? 'center' : 'stretch',
        justifyContent: isLoading ? 'center' : 'flex-start',
        flexDirection: isLoading ? 'column' : 'row',
        ...props.style,
      }}
    >
      {isLoading && (
        <>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #007AFF',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px',
            }}
          />
          <div
            style={{
              fontSize: '16px',
              color: '#333',
              textAlign: 'center',
              marginBottom: '8px',
              fontWeight: '500',
            }}
          >
            {isInitializing ? 'Initializing map...' : 'Loading map...'}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
            }}
          >
            Please wait
          </div>
        </>
      )}
    </div>
  );
});

export const PlatformMarker = React.forwardRef<any, MarkerProps>((props, ref) => {
  // Markers are handled by the MapView component
  return null;
});

export const PLATFORM_PROVIDER_GOOGLE = 'google';
