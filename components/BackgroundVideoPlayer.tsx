import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { audioSessionManager } from '../lib/audio-session-manager';

interface BackgroundVideoPlayerProps {
  videos: any[];
  onVideoError?: (error: string) => void;
  fadeDuration?: number; // For backward compatibility
}

// Static background images for Android (extracted from videos or relevant images)
const androidBackgroundImages = [
  require('../assets/images/coin-bg.jpeg'),
  require('../assets/images/diamond-bg.jpeg'),
  require('../assets/images/icon_splashscreen.png'),
];

// Alternative: Create gradient backgrounds for better performance
const createGradientBackground = (index: number) => {
  const gradients = [
    { start: '#667eea', end: '#764ba2' }, // Purple gradient
    { start: '#f093fb', end: '#f5576c' }, // Pink gradient
    { start: '#4facfe', end: '#00f2fe' }, // Blue gradient
    { start: '#43e97b', end: '#38f9d7' }, // Green gradient
    { start: '#fa709a', end: '#fee140' }, // Orange gradient
  ];
  return gradients[index % gradients.length];
};

export function BackgroundVideoPlayer({
  videos,
  onVideoError,
  fadeDuration = 800,
}: BackgroundVideoPlayerProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const videoRef = useRef<Video>(null);
  
  // Animation values for crossfade
  const currentOpacity = useSharedValue(1);
  const nextOpacity = useSharedValue(0);

  // Initialize and configure audio session
  useEffect(() => {
    // Configure audio session for silent video playback
    audioSessionManager.configureForSilentPlayback();
  }, []);

  // Animated styles for crossfade
  const currentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: currentOpacity.value,
    };
  });

  const nextAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: nextOpacity.value,
    };
  });

  // Function to handle image transition
  const transitionToNextImage = () => {
    const nextIndex = (currentImageIndex + 1) % 5; // Use 5 gradients
    setNextImageIndex(nextIndex);
    
    // Start crossfade animation with smooth timing
    currentOpacity.value = withTiming(0, { 
      duration: fadeDuration,
    });
    nextOpacity.value = withTiming(1, { 
      duration: fadeDuration,
    }, (finished) => {
      if (finished) {
        runOnJS(() => {
          setCurrentImageIndex(nextIndex);
          setNextImageIndex((nextIndex + 1) % 5);
          currentOpacity.value = 1;
          nextOpacity.value = 0;
        })();
      }
    });
  };

  // For Android: Cycle through static images with crossfade
  useEffect(() => {
    if (Platform.OS === 'android') {
      const imageInterval = setInterval(() => {
        transitionToNextImage();
      }, 4000); // Change image every 4 seconds to allow for smooth transitions

      return () => clearInterval(imageInterval);
    }
  }, [currentImageIndex, fadeDuration]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      console.log('Video status:', {
        didJustFinish: status.didJustFinish,
        positionMillis: status.positionMillis,
        durationMillis: status.durationMillis,
        currentIndex: currentVideoIndex
      });
      
      if (status.didJustFinish) {
        // Move to next video when current video ends
        const nextIndex = (currentVideoIndex + 1) % videos.length;
        console.log('Transitioning to next video:', nextIndex);
        setCurrentVideoIndex(nextIndex);
      }
    }
  };

  const handleVideoError = (error: string) => {
    console.warn('Video error:', error);
    // Move to next video on error
    const nextIndex = (currentVideoIndex + 1) % videos.length;
    setCurrentVideoIndex(nextIndex);
    
    if (onVideoError) {
      onVideoError(error);
    }
  };

  // For Android: Render static images with crossfade
  if (Platform.OS === 'android') {
    const currentGradient = createGradientBackground(currentImageIndex);
    const nextGradient = createGradientBackground(nextImageIndex);
    
    return (
      <View style={styles.container}>
        {/* Current gradient */}
        <Animated.View style={[styles.gradientBackground, currentAnimatedStyle]}>
          <LinearGradient
            colors={[currentGradient.start, currentGradient.end]}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        
        {/* Next gradient for crossfade */}
        <Animated.View style={[styles.gradientBackground, nextAnimatedStyle]}>
          <LinearGradient
            colors={[nextGradient.start, nextGradient.end]}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        
        <View style={styles.videoOverlay} />
      </View>
    );
  }

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
      <Video
         key={currentVideoIndex}
         ref={videoRef}
         source={videos[currentVideoIndex]}
         style={styles.video}
         shouldPlay
         isLooping={false}
         isMuted
         resizeMode={ResizeMode.COVER}
         onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
         onError={(error) => handleVideoError(error)}
         onLoad={() => console.log('Video loaded:', currentVideoIndex)}
       />
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
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
