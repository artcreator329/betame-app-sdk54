import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Linking from 'expo-linking';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/contexts/ThemeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface PDFViewerProps {
  visible: boolean;
  pdfUrl: string;
  title?: string;
  onClose: () => void;
}

export default function PDFViewer({ visible, pdfUrl, title = 'PDF Receipt', onClose }: PDFViewerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('PDF Viewer Error:', nativeEvent);
    setError('Failed to load PDF. Please try again.');
    setLoading(false);
  };

  const handleClose = () => {
    setLoading(true);
    setError(null);
    onClose();
  };

  const retryLoad = () => {
    setError(null);
    setLoading(true);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {/* Safe area padding for top */}
        <View style={{ height: insets.top, backgroundColor: colors.background.primary }} />
        
                <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
          {/* Header */}
          <View style={[
            styles.header, 
            { 
              backgroundColor: colors.background.secondary, 
              borderBottomColor: colors.border.light,
              paddingTop: Math.max(insets.top, 12) // Ensure minimum padding even if insets.top is 0
            }
          ]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={1}>
            {title}
          </Text>
          
          <TouchableOpacity
            style={styles.shareButton}
            onPress={async () => {
              try {
                await Linking.openURL(pdfUrl);
              } catch (error) {
                Alert.alert('Error', 'Failed to open PDF in external viewer');
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="open-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* PDF Content */}
        <View style={styles.content}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="document-outline" size={64} color={colors.text.secondary} />
              <Text style={[styles.errorText, { color: colors.text.secondary }]}>
                {error}
              </Text>
              <View style={styles.errorButtons}>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.primary.main }]}
                  onPress={retryLoad}
                >
                  <Text style={[styles.retryButtonText, { color: colors.text.onPrimary }]}>
                    Try Again
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.externalButton, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}
                  onPress={async () => {
                    try {
                      await Linking.openURL(pdfUrl);
                    } catch (error) {
                      Alert.alert('Error', 'Failed to open PDF in external viewer');
                    }
                  }}
                >
                  <Text style={[styles.externalButtonText, { color: colors.text.primary }]}>
                    Open Externally
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <WebView
              source={{ uri: pdfUrl }}
              style={styles.webview}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary.main} />
                  <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
                    Loading PDF...
                  </Text>
                </View>
              )}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scalesPageToFit={true}
              scrollEnabled={true}
              bounces={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={true}
            />
          )}
        </View>

        {/* Loading Overlay */}
        {loading && !error && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
              Loading PDF...
            </Text>
          </View>
        )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  shareButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  externalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  externalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
