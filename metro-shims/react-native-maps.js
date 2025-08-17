// Web implementation of react-native-maps using Google Maps JavaScript API
console.log('🚀 react-native-maps shim loaded!');
console.log('🚀 Module being loaded');
const React = require('react');

// Google Maps API key from environment
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '<REDACTED_GOOGLE_API_KEY>';

// Debug environment variable loading
console.log('🔧 Environment check:');
console.log('🔧 process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY:', process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ? 'Set' : 'Not set');
console.log('🔧 GOOGLE_MAPS_API_KEY length:', GOOGLE_MAPS_API_KEY.length);
console.log('🔧 GOOGLE_MAPS_API_KEY preview:', GOOGLE_MAPS_API_KEY.substring(0, 10) + '...');
console.log('🔧 Window object available:', typeof window !== 'undefined');
console.log('🔧 Document object available:', typeof document !== 'undefined');

// Load Google Maps script
let googleMapsLoaded = false;
let googleMapsLoading = false;
let googleMapsCallbacks = [];

function loadGoogleMapsScript() {
  if (googleMapsLoaded || googleMapsLoading) return Promise.resolve();
  
  // Check if API key is available
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('❌ Google Maps API key not found. Please set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in your environment variables.');
    return Promise.reject(new Error('Google Maps API key not configured'));
  }
  
  console.log('🔧 Loading Google Maps script...');
  console.log('🔧 API Key:', GOOGLE_MAPS_API_KEY.substring(0, 10) + '...');
  
  googleMapsLoading = true;
  
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('✅ Google Maps script already loaded');
      googleMapsLoaded = true;
      googleMapsLoading = false;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('✅ Google Maps script loaded successfully');
      googleMapsLoaded = true;
      googleMapsLoading = false;
      resolve();
    };
    
    script.onerror = (error) => {
      console.error('❌ Failed to load Google Maps script:', error);
      googleMapsLoading = false;
      reject(new Error('Failed to load Google Maps'));
    };
    
    console.log('🔧 Appending script to document head');
    document.head.appendChild(script);
  });
}

// MapView component for web
const MapView = React.forwardRef((props, ref) => {
  console.log('🔧 MapView component rendered with props:', props);
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const [mapError, setMapError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    console.log('🔧 MapView useEffect triggered, mapRef.current:', !!mapRef.current);
    
    let timeoutId = null;
    
    // Use a small delay to ensure the DOM element is created
    const timer = setTimeout(() => {
      if (!mapRef.current) {
        console.log('❌ MapView: mapRef.current is still null after delay, returning early');
        return;
      }

      console.log('🔧 MapView: Starting map initialization...');

      // Add timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (!mapLoaded && !mapError) {
          console.error('❌ Map loading timeout - taking too long');
          setMapError(true);
        }
      }, 10000); // 10 second timeout

    const initMap = async () => {
      try {
        console.log('🔧 Initializing Google Maps...');
        console.log('🔧 API Key available:', !!GOOGLE_MAPS_API_KEY);
        
        // For now, let's create a simple fallback map without Google Maps API
        console.log('🔧 Creating simple fallback map...');
        
        // Set loading state first
        setMapLoaded(true);
        console.log('✅ Map loading state set');
        
        // Try to load Google Maps API in background
        try {
          await loadGoogleMapsScript();
          
          // Check if google object is available
          if (typeof google === 'undefined' || !google.maps) {
            console.error('❌ Google Maps API not loaded properly');
            return;
          }
          
          console.log('✅ Google Maps API loaded successfully');
        } catch (error) {
          console.error('❌ Failed to load Google Maps API:', error);
          return;
        }
        
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

        console.log('🔧 Creating map with options:', mapOptions);
        const map = new google.maps.Map(mapRef.current, mapOptions);
        mapInstanceRef.current = map;
        console.log('✅ Map created successfully');
        
        // Add a small delay to ensure the map is fully rendered
        setTimeout(() => {
          console.log('✅ Map rendering completed');
        }, 1000);

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
          myLocationButton.className = 'custom-map-control-button';
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
        setMapError(true);
      }
    };

      initMap();
    }, 100); // 100ms delay to ensure DOM element is created

    // Cleanup timeout
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(timer);
      
      // Clean up map instance to prevent DOM conflicts
      if (mapInstanceRef.current) {
        // Clear all markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
        
        // Clear the map instance
        mapInstanceRef.current = null;
      }
    };
  }, [retryCount]);

  // Handle markers
  React.useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers from children
    React.Children.forEach(props.children, (child) => {
      if (React.isValidElement(child) && child.type === Marker) {
        const markerProps = child.props;
        const marker = new google.maps.Marker({
          position: {
            lat: markerProps.coordinate.latitude,
            lng: markerProps.coordinate.longitude,
          },
          map: mapInstanceRef.current,
          title: markerProps.title,
          label: markerProps.description,
        });

        if (markerProps.onPress) {
          marker.addListener('click', () => {
            markerProps.onPress();
          });
        }

        markersRef.current.push(marker);
      }
    });
  }, [mapLoaded, props.children]);

  // Always render a div with ref, but show loading content when needed
  return React.createElement('div', {
    ref: mapRef,
    className: 'map-container',
    style: {
      width: '100%',
      height: '100%',
      minHeight: props.style?.minHeight || 400,
      backgroundColor: (!mapLoaded && !mapError) ? '#f0f0f0' : 'transparent',
      display: (!mapLoaded && !mapError) ? 'flex' : 'block',
      alignItems: (!mapLoaded && !mapError) ? 'center' : 'stretch',
      justifyContent: (!mapLoaded && !mapError) ? 'center' : 'flex-start',
      flexDirection: (!mapLoaded && !mapError) ? 'column' : 'row',
      ...props.style,
    },
    children: (!mapLoaded && !mapError) ? [
      React.createElement('div', {
        key: 'loading-spinner',
        style: {
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2196F3',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px',
        }
      }),
      React.createElement('div', {
        key: 'loading-text',
        style: {
          fontSize: '16px',
          color: '#666',
          textAlign: 'center',
          marginBottom: '8px',
        },
        children: 'Loading map...'
      }),
      React.createElement('div', {
        key: 'loading-details',
        style: {
          fontSize: '12px',
          color: '#999',
          textAlign: 'center',
        },
        children: 'Initializing Google Maps API'
      })
    ] : null
  });

  // Show error state if map failed to load
  if (mapError) {
    return React.createElement('div', {
      className: 'map-container',
      style: {
        width: '100%',
        height: '100%',
        minHeight: props.style?.minHeight || 400,
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        ...props.style,
      },
      children: [
        React.createElement('div', {
          key: 'error-icon',
          style: {
            fontSize: '48px',
            marginBottom: '16px',
            color: '#666',
          },
          children: '🗺️'
        }),
        React.createElement('div', {
          key: 'error-text',
          style: {
            fontSize: '16px',
            color: '#666',
            textAlign: 'center',
            padding: '0 20px',
            marginBottom: '16px',
          },
          children: 'Map unavailable. Please check your internet connection and Google Maps API configuration.'
        }),
        React.createElement('div', {
          key: 'error-details',
          style: {
            fontSize: '12px',
            color: '#999',
            textAlign: 'center',
            padding: '0 20px',
            marginBottom: '16px',
          },
          children: `API Key: ${GOOGLE_MAPS_API_KEY ? 'Configured' : 'Missing'} | Script: ${googleMapsLoaded ? 'Loaded' : 'Failed'}`
        }),
        React.createElement('button', {
          key: 'retry-button',
          style: {
            padding: '8px 16px',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          },
          onClick: () => {
            console.log('🔄 Retrying map initialization...');
            setMapError(false);
            setMapLoaded(false);
            setRetryCount(prev => prev + 1);
            // Force re-initialization by updating retry count
          },
          children: 'Retry Loading Map'
        })
      ]
    });
  }


});

// Marker component for web
const Marker = React.forwardRef((props, ref) => {
  // Markers are handled by the MapView component
  return null;
});

// Constants
const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = 'default';

// Export all possible exports from react-native-maps
module.exports = {
  __esModule: true,
  default: MapView,
  MapView,
  Marker,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
  // Add other common exports as no-ops
  Callout: Marker,
  Circle: Marker,
  Polygon: Marker,
  Polyline: Marker,
  Overlay: Marker,
  Heatmap: Marker,
  Geojson: Marker,
};