// Robust shim for react-native-maps on web platform
// Provides no-op components instead of throwing errors

const React = require('react');

// No-op MapView component
const MapView = React.forwardRef((props, ref) => {
  return React.createElement('div', {
    style: {
      width: '100%',
      height: '100%',
      backgroundColor: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...props.style
    },
    children: props.children
  });
});

// No-op Marker component
const Marker = React.forwardRef((props, ref) => {
  return React.createElement('div', {
    style: { display: 'none' },
    children: props.children
  });
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