import { useEffect, useRef } from 'react';
import { Linking, AppState, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import { DeepLinkService } from '@/lib/deep-link-service';

export function useDeepLinking() {
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Handle initial URL when app is opened from a deep link
    const handleInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error('Error getting initial URL:', error);
      }
    };

    // Handle deep links when app is already running
    const handleUrlChange = (url: string) => {
      handleDeepLink(url);
    };

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground, check for pending deep links
        handleInitialURL();
      }
      appState.current = nextAppState;
    };

    // Set up listeners
    const urlListener = Linking.addEventListener('url', (event) => {
      handleUrlChange(event.url);
    });

    const appStateListener = AppState.addEventListener('change', handleAppStateChange);

    // Handle initial URL
    handleInitialURL();

    // Cleanup
    return () => {
      urlListener?.remove();
      appStateListener?.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    try {
      const linkData = DeepLinkService.handleIncomingLink(url);
      
      if (!linkData) {
        console.log('Unrecognized deep link format:', url);
        return;
      }

      switch (linkData.type) {
        case 'profile':
        case 'shared_profile':
          if (linkData.params.userId) {
            // Navigate to profile page
            router.push(`/profile/${linkData.params.userId}`);
          }
          break;
        
        default:
          console.log('Unhandled deep link type:', linkData.type);
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  return {
    handleDeepLink
  };
}