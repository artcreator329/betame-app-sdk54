import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useColors } from '@/contexts/ThemeContext';
import { getDisplayVersion, getFullVersion, isDevelopmentBuild, getDebugVersionInfo } from '@/utils/version-utils';

interface VersionDisplayProps {
  showBuildNumber?: boolean;
  showDevelopmentBadge?: boolean;
  onLongPress?: () => void;
  style?: any;
  textStyle?: any;
}

export function VersionDisplay({ 
  showBuildNumber = false, 
  showDevelopmentBadge = true,
  onLongPress,
  style,
  textStyle
}: VersionDisplayProps) {
  const colors = useColors();

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress();
    } else if (__DEV__) {
      // In development, show debug info on long press
      const debugInfo = getDebugVersionInfo();
      console.log('🔍 Version Debug Info:', debugInfo);
      
      // You could show an alert or modal with debug info here
      // For now, just log to console
    }
  };

  return (
    <TouchableOpacity 
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      style={[styles.container, style]}
    >
      <Text style={[styles.versionText, { color: colors.text.secondary }, textStyle]}>
        {getDisplayVersion()}
        {showDevelopmentBadge && isDevelopmentBuild() && ' (Dev)'}
      </Text>
      {showBuildNumber && (
        <Text style={[styles.buildText, { color: colors.text.secondary }, textStyle]}>
          Build {getFullVersion()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'League Spartan, system-ui, -apple-system, sans-serif' : 'System',
    fontWeight: '600',
    marginBottom: 2,
  },
  buildText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'League Spartan, system-ui, -apple-system, sans-serif' : 'System',
    fontWeight: '400',
    opacity: 0.8,
  },
});