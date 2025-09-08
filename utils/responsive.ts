import { Platform, Dimensions } from 'react-native';

// Get current screen dimensions
export const getScreenDimensions = () => {
  return Dimensions.get('window');
};

// Check if current platform is web
export const isWeb = Platform.OS === 'web';

// Check if current screen size is desktop
export const isDesktop = () => {
  const { width } = getScreenDimensions();
  return isWeb && width >= 1024;
};

// Check if current screen size is tablet
export const isTablet = () => {
  const { width } = getScreenDimensions();
  return isWeb && width >= 768 && width < 1024;
};

// Check if current screen size is mobile
export const isMobile = () => {
  const { width } = getScreenDimensions();
  return !isWeb || width < 768;
};

// Get responsive value based on screen size
export const getResponsiveValue = <T>(
  mobile: T,
  tablet?: T,
  desktop?: T
): T => {
  const { width } = getScreenDimensions();
  
  if (isWeb && width >= 1024 && desktop !== undefined) {
    return desktop;
  }
  
  if (isWeb && width >= 768 && tablet !== undefined) {
    return tablet;
  }
  
  return mobile;
};

// Create responsive styles
export const createResponsiveStyles = <T extends Record<string, any>>(
  styleFactory: (isDesktop: boolean, isTablet: boolean, isMobile: boolean) => T
): T => {
  const { width } = getScreenDimensions();
  const desktop = isWeb && width >= 1024;
  const tablet = isWeb && width >= 768 && width < 1024;
  const mobile = !isWeb || width < 768;
  
  return styleFactory(desktop, tablet, mobile);
};
