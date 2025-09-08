import React from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && width >= 1024;

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    mobile: number;
    tablet: number;
    desktop: number;
    wide: number;
  };
  gap?: number;
  className?: string;
}

export default function ResponsiveGrid({ 
  children, 
  columns = { mobile: 1, tablet: 2, desktop: 3, wide: 4 },
  gap = 16,
  className = ''
}: ResponsiveGridProps) {
  const { theme } = useTheme();

  const getColumns = () => {
    if (!isWeb) return columns.mobile;
    
    if (width >= 1440) return columns.wide;
    if (width >= 1024) return columns.desktop;
    if (width >= 768) return columns.tablet;
    return columns.mobile;
  };

  const gridColumns = getColumns();

  if (!isDesktop) {
    // Mobile: Use flexbox with wrap
    return (
      <View style={[
        styles.mobileGrid,
        { gap },
        { backgroundColor: theme.background.primary }
      ]}>
        {children}
      </View>
    );
  }

  // Desktop: Use CSS Grid via className
  const gridClassName = `desktop-grid-${gridColumns} ${className}`;

  return (
    <View 
      style={[
        styles.desktopGrid,
        { gap },
        { backgroundColor: theme.background.primary }
      ]}
      className={gridClassName}
    >
      {children}
    </View>
  );
}

// Card wrapper for grid items
interface GridCardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
}

export function GridCard({ children, className = '', onPress }: GridCardProps) {
  const { theme } = useTheme();

  return (
    <View 
      style={[
        styles.gridCard,
        { 
          backgroundColor: theme.background.secondary,
          borderColor: theme.border.light,
          shadowColor: theme.shadow.medium,
        }
      ]}
      className={`desktop-card ${className}`}
      onTouchEnd={onPress}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  desktopGrid: {
    width: '100%',
  },
  gridCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});
