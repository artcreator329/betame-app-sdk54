// BetaMe App Color Theme - Blue Gradient Based
// Inspired by the app logo's blue gradient design

export const Colors = {
  // Primary Blue Gradient Colors
  primary: {
    light: '#6dd5ed',     // Light blue from gradient
    main: '#2193b0',      // Main blue from gradient  
    dark: '#1a7a96',      // Darker blue for depth
    gradient: ['#2193b0', '#6dd5ed'], // Main gradient array
  },
  
  // Secondary Blue Tones
  secondary: {
    light: '#a3d5ff',     // Very light blue
    main: '#4a90e2',      // Medium blue
    dark: '#2c5aa0',      // Dark blue
  },
  
  // Background Colors
  background: {
    primary: '#f0f8ff',   // Very light blue tint instead of gray
    secondary: '#e6f3ff', // Light blue tint for cards
    tertiary: '#ffffff',  // Pure white for contrast
  },
  
  // Text Colors
  text: {
    primary: '#1a365d',   // Dark blue for primary text
    secondary: '#4a90e2', // Medium blue for secondary text
    tertiary: '#7bb3f0',  // Light blue for tertiary text
    white: '#ffffff',     // White text for dark backgrounds
  },
  
  // Border Colors
  border: {
    light: '#b8e0ff',     // Light blue border
    main: '#6dd5ed',      // Main blue border
    dark: '#2193b0',      // Dark blue border
  },
  
  // Status Colors
  status: {
    success: '#10b981',   // Keep green for success
    warning: '#f59e0b',   // Keep orange for warning
    error: '#ef4444',     // Keep red for error
    info: '#2193b0',      // Use primary blue for info
  },
  
  // Interactive Elements
  interactive: {
    active: '#2193b0',    // Primary blue for active states
    hover: '#6dd5ed',     // Light blue for hover states
    pressed: '#1a7a96',   // Dark blue for pressed states
    disabled: '#b8e0ff',  // Very light blue for disabled
  },
  
  // Shadow Colors
  shadow: {
    light: 'rgba(33, 147, 176, 0.1)',  // Light blue shadow
    medium: 'rgba(33, 147, 176, 0.2)', // Medium blue shadow
    dark: 'rgba(33, 147, 176, 0.3)',   // Dark blue shadow
  },
};

// Legacy color mappings for easy migration
export const LegacyColors = {
  // Old gray colors mapped to new blue theme
  '#F2F2F7': Colors.background.primary,
  '#E5E5EA': Colors.border.light,
  '#8E8E93': Colors.text.secondary,
  '#1D1D1F': Colors.text.primary,
  '#007AFF': Colors.primary.main,
  '#FF3B30': Colors.status.error,
  '#34C759': Colors.status.success,
};

export default Colors;