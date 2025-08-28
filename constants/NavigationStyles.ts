import { Platform } from 'react-native';

/**
 * Navigation styles that prevent white flash during transitions
 * This is an aggressive fix that disables all animations to ensure
 * no white background is ever shown during navigation
 */

export const createNavigationStyles = (backgroundColor: string) => {
  return {
    // Base screen options - no animations, dark background always
    screenOptions: {
      headerShown: false,
      animation: 'none' as const,
      gestureEnabled: false,
      cardStyle: {
        backgroundColor,
      },
      cardOverlayEnabled: false,
      cardStyleInterpolator: () => ({
        cardStyle: {
          backgroundColor,
          opacity: 1,
        },
        overlayStyle: {
          backgroundColor,
          opacity: 0,
        },
      }),
    },
    
    // Tab options - no animations
    tabOptions: {
      headerShown: false,
      animation: 'none' as const,
      tabBarStyle: {
        backgroundColor,
      },
    },
  };
};

// Force dark background for all navigation elements
export const DARK_BACKGROUND = '#0f1419';

// Navigation theme that prevents white flash
export const NavigationTheme = {
  dark: true,
  colors: {
    primary: '#4db8d8',
    background: DARK_BACKGROUND,
    card: DARK_BACKGROUND,
    text: '#e2e8f0',
    border: '#334155',
    notification: '#4db8d8',
  },
};

// Web-specific styles to prevent white flash
export const webNavigationStyles = `
  /* Force dark background for all navigation elements */
  .react-navigation-screen {
    background-color: ${DARK_BACKGROUND} !important;
  }
  
  .react-navigation-card {
    background-color: ${DARK_BACKGROUND} !important;
  }
  
  .react-navigation-header {
    background-color: ${DARK_BACKGROUND} !important;
  }
  
  /* Override any white backgrounds */
  [data-reactroot] * {
    background-color: inherit !important;
  }
  
  /* Prevent white flash during route changes */
  body, html, #root {
    background-color: ${DARK_BACKGROUND} !important;
  }
`;

// Inject web styles if on web platform
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = webNavigationStyles;
  document.head.appendChild(style);
}