import { StyleSheet } from 'react-native';
import { DarkTheme, LightTheme } from './Colors';

// Global styles to prevent white flash during navigation
export const createGlobalStyles = (isDarkMode: boolean) => {
  const theme = isDarkMode ? DarkTheme : LightTheme;
  
  return StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: theme.background.primary,
    },
    safeAreaContainer: {
      flex: 1,
      backgroundColor: theme.background.primary,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.background.primary,
    },
    overlayContainer: {
      flex: 1,
      backgroundColor: theme.background.primary,
    },
  });
};

// Default styles for light mode
export const GlobalStyles = createGlobalStyles(false);

// Export theme-aware container component
export const getScreenContainerStyle = (isDarkMode: boolean) => ({
  flex: 1,
  backgroundColor: isDarkMode ? DarkTheme.background.primary : LightTheme.background.primary,
});