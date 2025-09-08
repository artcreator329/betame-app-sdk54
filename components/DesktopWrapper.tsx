import React from 'react';
import { View, StyleSheet, Platform, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && width >= 1024;

interface DesktopWrapperProps {
  children: React.ReactNode;
  maxWidth?: number;
  padding?: number;
  scrollable?: boolean;
  centerContent?: boolean;
  className?: string;
}

export default function DesktopWrapper({ 
  children, 
  maxWidth = 1400, 
  padding = 24, 
  scrollable = true,
  centerContent = false,
  className = ''
}: DesktopWrapperProps) {
  const { theme } = useTheme();

  if (!isDesktop) {
    // On mobile, just return children wrapped in SafeAreaView
    return (
      <SafeAreaView style={[styles.mobileContainer, { backgroundColor: theme.background.primary }]}>
        {scrollable ? (
          <ScrollView 
            style={styles.mobileScrollView}
            contentContainerStyle={styles.mobileScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </SafeAreaView>
    );
  }

  // Desktop layout
  const containerStyle = [
    styles.desktopContainer,
    {
      backgroundColor: theme.background.primary,
      maxWidth,
      paddingHorizontal: padding,
    },
    centerContent && styles.centerContent,
  ];

  const contentStyle = [
    styles.desktopContent,
    { backgroundColor: theme.background.primary }
  ];

  return (
    <SafeAreaView style={[styles.desktopWrapper, { backgroundColor: theme.background.primary }]}>
      <View 
        style={containerStyle}
        className={`desktop-main-container ${className}`}
      >
        {scrollable ? (
          <ScrollView 
            style={contentStyle}
            contentContainerStyle={[
              styles.desktopScrollContent,
              centerContent && styles.centerScrollContent
            ]}
            showsVerticalScrollIndicator={false}
            className="desktop-page-wrapper"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={contentStyle} className="desktop-page-wrapper">
            {children}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Mobile styles
  mobileContainer: {
    flex: 1,
  },
  mobileScrollView: {
    flex: 1,
  },
  mobileScrollContent: {
    flexGrow: 1,
  },
  
  // Desktop styles
  desktopWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  desktopContainer: {
    flex: 1,
    width: '100%',
    minHeight: '100vh' as any,
  },
  desktopContent: {
    flex: 1,
  },
  desktopScrollContent: {
    flexGrow: 1,
    paddingVertical: 24,
    minHeight: 'calc(100vh - 48px)' as any,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerScrollContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 48px)' as any,
  },
});
