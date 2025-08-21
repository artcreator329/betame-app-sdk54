import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { audioSessionManager } from '../lib/audio-session-manager';

interface BackgroundVideoPlayerProps {
  videos: any[];
  onVideoError?: (error: string) => void;
  fadeDuration?: number; // For backward compatibility
}

export function BackgroundVideoPlayer({
  videos,
  onVideoError,
  fadeDuration = 800,
}: BackgroundVideoPlayerProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<Video>(null);

  // Initialize and configure audio session
  useEffect(() => {
    // Configure audio session for silent video playback
    audioSessionManager.configureForSilentPlayback();
  }, []);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      // Only log essential info to reduce console noise
      if (status.didJustFinish) {
        // Smoothly transition to next video
        const nextIndex = (currentVideoIndex + 1) % videos.length;
        setCurrentVideoIndex(nextIndex);
        setIsVideoReady(false); // Reset ready state for smooth transition
      }
    }
  };

  const handleVideoError = (error: string) => {
    // Silently handle video errors to prevent flashing
    console.warn('Video error (handled gracefully):', error);
    
    // Don't immediately switch videos on error to prevent flashing
    // Let the fallback background show instead
    if (onVideoError) {
      onVideoError(error);
    }
  };

  const handleVideoLoad = () => {
    setIsVideoReady(true);
  };

  // For iOS: Render videos
  if (!videos || videos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.fallbackBackground} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Always show fallback background to prevent flashing */}
      <View style={styles.fallbackBackground} />
      
      {/* Video layer with smooth loading */}
      <Video
         key={currentVideoIndex}
         ref={videoRef}
         source={videos[currentVideoIndex]}
         style={[styles.video, { opacity: isVideoReady ? 1 : 0 }]}
         shouldPlay={isVideoReady}
         isLooping={false}
         isMuted
         resizeMode={ResizeMode.COVER}
         onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
         onError={(error) => handleVideoError(error)}
         onLoad={handleVideoLoad}
         onLoadStart={() => setIsVideoReady(false)}
       />
      
      {/* Overlay for better text readability */}
      <View style={styles.videoOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  fallbackBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 0,
  },
});
