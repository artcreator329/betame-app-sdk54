import { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Hook to ensure proper screen background and status bar styling
 * Prevents white flash during navigation in dark mode
 */
export function useScreenBackground() {
  const { theme, isDarkMode } = useTheme();

  useEffect(() => {
    // Set status bar style based on theme
    if (Platform.OS === 'ios') {
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content', true);
    }
  }, [isDarkMode]);

  return {
    screenStyle: {
      flex: 1,
      backgroundColor: theme.background.primary,
    },
    containerStyle: {
      flex: 1,
      backgroundColor: theme.background.primary,
    },
    theme,
    isDarkMode,
  };
}

/**
 * Get screen container style for consistent theming
 */
export function getScreenContainerStyle(isDarkMode: boolean, customBackground?: string) {
  const backgroundColor = customBackground || (isDarkMode ? '#0f1419' : '#f0f8ff');
  
  return {
    flex: 1,
    backgroundColor,
  };
}