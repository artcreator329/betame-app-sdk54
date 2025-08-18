import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { audioSessionManager } from '@/lib/audio-session-manager';

interface BackgroundVideoPlayerProps {
  videos: any[];
  fadeDuration?: number;
  onVideoError?: (error: any) => void;
}

export function BackgroundVideoPlayer({ 
  videos, 
  fadeDuration = 1000,
  onVideoError 
}: BackgroundVideoPlayerProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const videoRef = useRef<Video>(null);

  // Initialize with a random video and configure audio session
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * videos.length);
    setCurrentVideoIndex(randomIndex);

    // Configure audio session for silent video playback
    audioSessionManager.configureForSilentPlayback();
  }, []);





  const handleVideoLoad = () => {
    // Video loaded successfully
  };

  // Simple playback status update
  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded && status.didJustFinish) {
      handleVideoEnd();
    }
  };

  const transitionToNextVideo = () => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    
    // Simple: just go to the next video in sequence
    const newIndex = (currentVideoIndex + 1) % videos.length;
    
    // Fade out current video
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: fadeDuration / 2,
      useNativeDriver: true,
    }).start(() => {
      // Update video index
      setCurrentVideoIndex(newIndex);
      
      // Fade in new video immediately
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: fadeDuration / 2,
        useNativeDriver: true,
      }).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  const handleVideoEnd = () => {
    // Always transition to next video when current one ends
    transitionToNextVideo();
  };

  const handleVideoError = (error: any) => {
    onVideoError?.(error);
    
    // Immediately transition to next video on error
    transitionToNextVideo();
  };







  return (
    <View style={styles.container}>
      <Animated.View style={[styles.videoContainer, { opacity: fadeAnim }]}>
        <Video
          ref={videoRef}
          source={videos[currentVideoIndex]}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          isMuted
          volume={0}
          onError={handleVideoError}
          onLoad={handleVideoLoad}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          useNativeControls={false}
          posterStyle={{ resizeMode: 'cover' }}
        />
      </Animated.View>
      
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
  videoContainer: {
    flex: 1,
  },
  video: {
    flex: 1,
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
  },
  fallbackBackground: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
