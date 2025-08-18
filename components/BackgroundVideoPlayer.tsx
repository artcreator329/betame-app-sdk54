import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { audioSessionManager } from '../lib/audio-session-manager';

interface BackgroundVideoPlayerProps {
  videos: any[];
  onVideoError?: (error: string) => void;
}

export function BackgroundVideoPlayer({
  videos,
  onVideoError,
}: BackgroundVideoPlayerProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<Video>(null);

  // Initialize and configure audio session
  useEffect(() => {
    // Configure audio session for silent video playback
    audioSessionManager.configureForSilentPlayback();
  }, []);





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
});
