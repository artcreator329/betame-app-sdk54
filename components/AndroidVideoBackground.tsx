import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

// Import the three Android videos
const androidVideos = [
  require('../assets/images/android/sign_up_page_video_1.mp4'),
  require('../assets/images/android/sign_up_page_video_2_1.mp4'),
  require('../assets/images/android/sign_up_page_video_3_1.mp4'),
];

interface AndroidVideoBackgroundProps {
  onVideoError?: (error: any) => void;
}

export function AndroidVideoBackground({ onVideoError }: AndroidVideoBackgroundProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<Video>(null);

  // Cycle through videos every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % androidVideos.length);
    }, 10000); // 10 seconds per video

    return () => clearInterval(interval);
  }, []);

  const handleVideoLoad = () => {
    setIsVideoReady(true);
  };

  const handleVideoError = (error: any) => {
    console.log('Android video error (non-critical):', error);
    if (onVideoError) {
      onVideoError(error);
    }
    // Continue to next video on error
    setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % androidVideos.length);
  };

  const handleVideoEnd = () => {
    // Move to next video when current one ends
    setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % androidVideos.length);
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={androidVideos[currentVideoIndex]}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={true}
        isLooping={false}
        isMuted={true}
        onLoad={handleVideoLoad}
        onError={handleVideoError}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && status.didJustFinish) {
            handleVideoEnd();
          }
        }}
      />
      <View style={styles.overlay} />
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Darker overlay for better text readability
  },
});
