import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useColors } from '@/contexts/ThemeContext';

interface UploadStatusIndicatorProps {
  isUploading: boolean;
  retryCount?: number;
  error?: string;
  onRetry?: () => void;
}

export default function UploadStatusIndicator({
  isUploading,
  retryCount = 0,
  error,
  onRetry
}: UploadStatusIndicatorProps) {
  const colors = useColors();

  if (!isUploading && !error) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      {isUploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color={colors.primary.main} />
          <Text style={[styles.uploadingText, { color: colors.text.primary }]}>
            Uploading...
            {retryCount > 0 && (
              <Text style={[styles.retryText, { color: colors.text.secondary }]}>
                {' '}(Retry {retryCount})
              </Text>
            )}
          </Text>
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.status.error }]}>
            {error}
          </Text>
          {onRetry && (
            <Text 
              style={[styles.retryButton, { color: colors.primary.main }]}
              onPress={onRetry}
            >
              Retry
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  retryText: {
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
});
