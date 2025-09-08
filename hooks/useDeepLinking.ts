import { useEffect, useRef } from 'react';
import { Linking, AppState, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import { DeepLinkService } from '@/lib/deep-link-service';
import { useReferral } from '@/contexts/ReferralContext';

export function useDeepLinking() {
  const router = useRouter();
  const appState = useRef(AppState.currentState);
  const { setReferralCode } = useReferral();

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
        case 'referral':
          if (linkData.params.referralCode) {
            // Store referral code for later use during signup
            setReferralCode(linkData.params.referralCode);
            console.log('🔗 Referral code captured from deep link:', linkData.params.referralCode);
            // Navigate to signup page
            router.push('/auth/login');
          }
          break;

        case 'profile':
        case 'shared_profile':
          if (linkData.params.userId) {
            // Navigate to profile page
            router.push(`/profile/${linkData.params.userId}`);
          }
          break;
        
        case 'payment_success':
          // Navigate to payment success page
          router.push({
            pathname: '/payment/success',
            params: linkData.params
          });
          break;
        
        case 'payment_cancel':
          // Navigate to payment cancel page
          router.push({
            pathname: '/payment/cancel',
            params: linkData.params
          });
          break;
        
        case 'payment_failed':
          // Navigate to payment failed page
          router.push({
            pathname: '/payment/failed',
            params: linkData.params
          });
          break;
        
        case 'email_verification':
          // Handle email verification deep link
          if (linkData.params.token_hash && linkData.params.type) {
            router.push({
              pathname: '/auth/verify-email',
              params: linkData.params
            });
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