import { Audio } from 'expo-av';

class AudioSessionManager {
  private static instance: AudioSessionManager;
  private isConfigured = false;

  private constructor() {}

  static getInstance(): AudioSessionManager {
    if (!AudioSessionManager.instance) {
      AudioSessionManager.instance = new AudioSessionManager();
    }
    return AudioSessionManager.instance;
  }

  async configureForVideoPlayback(): Promise<void> {
    if (this.isConfigured) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.isConfigured = true;
    } catch (error) {
      // Silently handle audio session errors to prevent console spam
      if (__DEV__) {
        console.log('Audio session configuration error:', error);
      }
    }
  }

  async resetToDefault(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.isConfigured = false;
    } catch (error) {
      // Silently handle audio session errors
      if (__DEV__) {
        console.log('Audio session reset error:', error);
      }
    }
  }

  async configureForSilentPlayback(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      if (__DEV__) {
        console.log('Silent playback configuration error:', error);
      }
    }
  }
}

export const audioSessionManager = AudioSessionManager.getInstance();
