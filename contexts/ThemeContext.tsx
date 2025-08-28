import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme } from '@/constants/Colors';
import { useAuth } from './AuthContext';

type Theme = typeof LightTheme;

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  isLoading: boolean;
  ScreenContainer: React.ComponentType<{ children: ReactNode; style?: any }>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@betame_theme_preference';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // Default to dark mode to prevent white flash
  const [isLoading, setIsLoading] = useState<boolean>(true); // Add loading state

  // Load theme preference from storage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        // If user is not authenticated, force dark mode to prevent white flash
        if (!user) {
          setIsDarkMode(true);
          setIsLoading(false);
          return;
        }

        // If user is authenticated, load their preference
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        } else {
          // If no preference saved, default to dark mode to prevent white flash
          setIsDarkMode(true);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
        setIsDarkMode(true); // Default to dark mode on error to prevent white flash
      } finally {
        setIsLoading(false);
      }
    };

    // Load theme preference immediately, don't wait for auth loading
    loadThemePreference();
  }, [user]);

  // Save theme preference to storage
  const saveThemePreference = async (isDark: boolean) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    // Only allow theme toggle if user is authenticated
    if (!user) {
      console.warn('Theme toggle is only available for authenticated users');
      return;
    }
    
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    saveThemePreference(newTheme);
  };

  const setTheme = (isDark: boolean) => {
    // Only allow theme setting if user is authenticated
    if (!user) {
      console.warn('Theme setting is only available for authenticated users');
      return;
    }
    
    setIsDarkMode(isDark);
    saveThemePreference(isDark);
  };

  const theme = isDarkMode ? DarkTheme : LightTheme;

  // Screen container component that always uses the correct background
  const ScreenContainer = ({ children, style }: { children: ReactNode; style?: any }) => (
    <View style={[{ flex: 1, backgroundColor: theme.background.primary }, style]}>
      {children}
    </View>
  );

  // Always render children, don't block on auth loading
  // This prevents the white blank page issue
  const contextValue: ThemeContextType = {
    theme,
    isDarkMode,
    toggleTheme,
    setTheme,
    isLoading,
    ScreenContainer,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook to get current colors based on theme
export function useColors() {
  const { theme } = useTheme();
  return theme;
}

export default ThemeContext;