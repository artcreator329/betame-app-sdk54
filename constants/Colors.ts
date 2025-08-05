// BetaMe App Color Theme - Blue Gradient Based with Dark Mode Support
// Inspired by the app logo's blue gradient design

export const LightTheme = {
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

export const DarkTheme = {
  // Primary Blue Gradient Colors (adjusted for dark mode)
  primary: {
    light: '#6dd5ed',     // Keep light blue for contrast
    main: '#4db8d8',      // Brighter blue for dark backgrounds
    dark: '#2193b0',      // Original main blue
    gradient: ['#4db8d8', '#6dd5ed'], // Adjusted gradient
  },
  
  // Secondary Blue Tones
  secondary: {
    light: '#7bb3f0',     // Lighter for visibility
    main: '#5ba3f5',      // Brighter medium blue
    dark: '#4a90e2',      // Original secondary main
  },
  
  // Background Colors
  background: {
    primary: '#0f1419',   // Very dark blue-gray
    secondary: '#1a2332', // Dark blue-gray for cards
    tertiary: '#243447',  // Lighter dark blue for contrast
  },
  
  // Text Colors
  text: {
    primary: '#e2e8f0',   // Light gray-blue for primary text
    secondary: '#94a3b8', // Medium gray-blue for secondary text
    tertiary: '#64748b',  // Darker gray-blue for tertiary text
    white: '#ffffff',     // Pure white
  },
  
  // Border Colors
  border: {
    light: '#334155',     // Dark gray-blue border
    main: '#475569',      // Medium dark border
    dark: '#64748b',      // Lighter dark border
  },
  
  // Status Colors (adjusted for dark mode)
  status: {
    success: '#22c55e',   // Brighter green
    warning: '#fbbf24',   // Brighter orange
    error: '#f87171',     // Brighter red
    info: '#4db8d8',      // Primary blue
  },
  
  // Interactive Elements
  interactive: {
    active: '#4db8d8',    // Bright blue for active states
    hover: '#6dd5ed',     // Light blue for hover states
    pressed: '#2193b0',   // Darker blue for pressed states
    disabled: '#475569',  // Dark gray for disabled
  },
  
  // Shadow Colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.2)',    // Dark shadows
    medium: 'rgba(0, 0, 0, 0.4)',   // Medium dark shadows
    dark: 'rgba(0, 0, 0, 0.6)',     // Dark shadows
  },
};

// Default export for backward compatibility
export const Colors = LightTheme;

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