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
      console.log('🔗 Deep link received:', url);
      const linkData = DeepLinkService.handleIncomingLink(url);
      
      if (!linkData) {
        console.log('❌ Unrecognized deep link format:', url);
        return;
      }
      
      console.log('🔗 Parsed deep link data:', linkData);

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
          console.log('🔗 Email verification deep link detected:', linkData.params);
          
          // Check if this is web verification success (from browser)
          const webVerification = linkData.params.web_verification;
          const verified = linkData.params.verified;
          
          if (webVerification === 'success' && verified === 'true') {
            // This is a web verification success - navigate to verify-email screen
            console.log('🔗 Web verification success detected, navigating to verify-email screen');
            try {
              router.push({
                pathname: '/auth/verify-email',
                params: linkData.params
              });
              console.log('✅ Web verification navigation completed');
            } catch (error) {
              console.error('❌ Web verification navigation failed:', error);
              // Fallback to login
              router.push('/auth/login');
            }
          } else if (linkData.params.token_hash && linkData.params.type) {
            // Regular email verification with token_hash
            console.log('🔗 Regular email verification with token_hash detected');
            // Try multiple navigation approaches for maximum compatibility
            let navigationSuccess = false;
            
            // Approach 1: Standard pathname with params
            try {
              router.push({
                pathname: '/auth/verify-email',
                params: linkData.params
              });
              navigationSuccess = true;
              console.log('✅ Email verification navigation (approach 1) completed');
            } catch (error) {
              console.error('❌ Approach 1 failed:', error);
            }
            
            // Approach 2: Try with replace if push failed
            if (!navigationSuccess) {
              try {
                router.replace({
                  pathname: '/auth/verify-email',
                  params: linkData.params
                });
                navigationSuccess = true;
                console.log('✅ Email verification navigation (approach 2) completed');
              } catch (error) {
                console.error('❌ Approach 2 failed:', error);
              }
            }
            
            // Approach 3: Try without leading slash
            if (!navigationSuccess) {
              try {
                router.push({
                  pathname: 'auth/verify-email',
                  params: linkData.params
                });
                navigationSuccess = true;
                console.log('✅ Email verification navigation (approach 3) completed');
              } catch (error) {
                console.error('❌ Approach 3 failed:', error);
              }
            }
            
            // Approach 4: Try with simple string navigation
            if (!navigationSuccess) {
              try {
                router.push('/auth/verify-email');
                navigationSuccess = true;
                console.log('✅ Email verification navigation (approach 4) completed (no params)');
              } catch (error) {
                console.error('❌ Approach 4 failed:', error);
              }
            }
            
            // Approach 5: Try navigating to auth group first, then verify-email
            if (!navigationSuccess) {
              try {
                router.push('/auth/login');
                setTimeout(() => {
                  router.push('/auth/verify-email');
                }, 100);
                navigationSuccess = true;
                console.log('✅ Email verification navigation (approach 5) completed (via login)');
              } catch (error) {
                console.error('❌ Approach 5 failed:', error);
              }
            }
            
            if (!navigationSuccess) {
              console.error('❌ ALL navigation approaches failed for email verification');
              router.push('/auth/login');
            }
          } else {
            console.error('❌ Missing required params in email verification:', linkData.params);
            // Navigate to login if params are missing
            router.push('/auth/login');
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