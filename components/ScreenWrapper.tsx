import React from 'react';
import { View, ViewStyle, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  safeArea?: boolean;
  statusBarStyle?: 'light' | 'dark' | 'auto';
  backgroundColor?: string;
}

/**
 * ScreenWrapper component that ensures consistent theming and prevents white flash
 * during navigation transitions in dark mode
 */
export function ScreenWrapper({ 
  children, 
  style, 
  safeArea = true, 
  statusBarStyle = 'auto',
  backgroundColor 
}: ScreenWrapperProps) {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  // Determine status bar style
  const getStatusBarStyle = () => {
    if (statusBarStyle === 'auto') {
      return isDarkMode ? 'light-content' : 'dark-content';
    }
    return statusBarStyle === 'light' ? 'light-content' : 'dark-content';
  };

  // Get background color
  const bgColor = backgroundColor || theme.background.primary;

  // Base container style
  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: bgColor,
    ...(safeArea && {
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }),
    ...style,
  };

  return (
    <>
      {Platform.OS === 'ios' && (
        <StatusBar
          barStyle={getStatusBarStyle()}
          backgroundColor={bgColor}
          translucent={false}
        />
      )}
      {Platform.OS === 'android' && (
        <StatusBar
          barStyle={getStatusBarStyle()}
          backgroundColor={bgColor}
          translucent={true}
        />
      )}
      <View style={containerStyle}>
        {children}
      </View>
    </>
  );
}

/**
 * Hook to get screen wrapper props for consistent theming
 */
export function useScreenWrapperProps(customBackground?: string) {
  const { theme, isDarkMode } = useTheme();
  
  return {
    backgroundColor: customBackground || theme.background.primary,
    statusBarStyle: isDarkMode ? 'light' : 'dark' as const,
    theme,
    isDarkMode,
  };
}

export default ScreenWrapper;