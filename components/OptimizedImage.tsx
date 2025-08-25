import React, { useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/contexts/ThemeContext';
import { performanceMonitor } from '@/lib/performance-monitor';
import { imageCacheService } from '@/lib/image-cache-service';

interface OptimizedImageProps {
  source: string | null;
  style?: any;
  placeholder?: string;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  transition?: number;
  priority?: 'low' | 'normal' | 'high';
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';
  onLoad?: () => void;
  onError?: (error: any) => void;
  showLoadingIndicator?: boolean;
}

export default function OptimizedImage({
  source,
  style,
  placeholder = 'https://via.placeholder.com/300x200?text=Loading...',
  contentFit = 'cover',
  transition = 300,
  priority = 'normal',
  cachePolicy = 'memory-disk',
  onLoad,
  onError,
  showLoadingIndicator = true,
}: OptimizedImageProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const loadStartTime = useRef<number>(0);

  if (!source) {
    return (
      <View style={[styles.placeholder, style, { backgroundColor: colors.border.light }]}>
        {showLoadingIndicator && (
          <ActivityIndicator size="small" color={colors.primary.main} />
        )}
      </View>
    );
  }

  const handleLoad = () => {
    const loadTime = Date.now() - loadStartTime.current;
    const isCached = imageCacheService.isCached(source!);
    
    // Track performance
    performanceMonitor.trackImageLoad(source!, loadTime, 0, isCached);
    
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = (error: any) => {
    const loadTime = Date.now() - loadStartTime.current;
    performanceMonitor.trackImageLoad(source!, loadTime, 0, false);
    
    setIsLoading(false);
    setHasError(true);
    onError?.(error);
  };

  return (
    <View style={[styles.container, style]}>
      <Image
        source={source}
        style={[styles.image, style]}
        contentFit={contentFit}
        transition={transition}
        priority={priority}
        cachePolicy={cachePolicy}
        placeholder={placeholder}
        onLoad={handleLoad}
        onError={handleError}
        onLoadStart={() => {
          loadStartTime.current = Date.now();
        }}
      />
      {isLoading && showLoadingIndicator && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary.main} />
        </View>
      )}
      {hasError && (
        <View style={[styles.errorOverlay, { backgroundColor: colors.border.light }]}>
          <ActivityIndicator size="small" color={colors.text.secondary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
