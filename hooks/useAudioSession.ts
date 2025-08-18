import { useEffect } from 'react';
import { Audio } from 'expo-av';

export function useAudioSession() {
  useEffect(() => {
    let isMounted = true;

    const configureAudioSession = async () => {
      try {
        if (!isMounted) return;
        
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        // Silently handle audio session errors to prevent console spam
        if (__DEV__) {
          console.log('Audio session configuration:', error);
        }
      }
    };

    configureAudioSession();

    return () => {
      isMounted = false;
      
      const resetAudioSession = async () => {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
        } catch (error) {
          // Silently handle audio session errors
          if (__DEV__) {
            console.log('Audio session reset:', error);
          }
        }
      };
      
      resetAudioSession();
    };
  }, []);
}
