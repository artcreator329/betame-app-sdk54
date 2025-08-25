import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export interface DeepLinkConfig {
  scheme: string;
  domain?: string;
  fallbackUrl?: string;
}

export class DeepLinkService {
  private static config: DeepLinkConfig = {
    scheme: 'betame', // From app.json
    domain: 'betame.com.my', // Your app's domain
    fallbackUrl: 'https://betame.com.my' // Fallback website
  };

  /**
   * Generate a deep link URL for a user profile
   */
  static generateProfileLink(userId: string, userName?: string): string {
    const baseUrl = `${this.config.scheme}://profile/${userId}`;
    const params = userName ? `?name=${encodeURIComponent(userName)}` : '';
    return `${baseUrl}${params}`;
  }

  /**
   * Generate a universal link (works on web and mobile)
   */
  static generateUniversalProfileLink(userId: string, userName?: string): string {
    const params = new URLSearchParams();
    if (userName) params.append('name', userName);

    return `https://${this.config.domain}/profile/${userId}${params.toString() ? `?${params.toString()}` : ''}`;
  }

  /**
   * Generate a shareable link that includes fallback for users without the app
   */
  static generateShareableProfileLink(userId: string, userName?: string, userBio?: string): string {
    const params = new URLSearchParams({
      userId,
      ...(userName && { name: userName }),
      ...(userBio && { bio: userBio }),
      source: 'share'
    });

    return `https://${this.config.domain}/share/profile?${params.toString()}`;
  }

  /**
   * Open a profile deep link
   */
  static async openProfile(userId: string, userName?: string): Promise<boolean> {
    try {
      const deepLink = this.generateProfileLink(userId, userName);
      const canOpen = await Linking.canOpenURL(deepLink);

      if (canOpen) {
        await Linking.openURL(deepLink);
        return true;
      }

      // Fallback to universal link
      const universalLink = this.generateUniversalProfileLink(userId, userName);
      await WebBrowser.openBrowserAsync(universalLink);
      return true;
    } catch (error) {
      console.error('Error opening profile link:', error);
      return false;
    }
  }

  /**
   * Handle incoming deep links
   */
  static handleIncomingLink(url: string): { type: string; params: any } | null {
    try {
      const parsedUrl = new URL(url);

      // Handle deep link scheme
      if (parsedUrl.protocol === `${this.config.scheme}:`) {
        const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

        if (pathSegments[0] === 'profile' && pathSegments[1]) {
          return {
            type: 'profile',
            params: {
              userId: pathSegments[1],
              name: parsedUrl.searchParams.get('name')
            }
          };
        }

        // Handle payment callbacks
        if (pathSegments[0] === 'payment') {
          if (pathSegments[1] === 'success') {
            return {
              type: 'payment_success',
              params: {
                transaction_id: parsedUrl.searchParams.get('transaction_id') || parsedUrl.searchParams.get('razorpay_payment_link_reference_id'),
                razorpay_payment_id: parsedUrl.searchParams.get('razorpay_payment_id'),
                razorpay_payment_link_id: parsedUrl.searchParams.get('razorpay_payment_link_id'),
                razorpay_payment_link_status: parsedUrl.searchParams.get('razorpay_payment_link_status'),
                razorpay_signature: parsedUrl.searchParams.get('razorpay_signature'),
                error_code: parsedUrl.searchParams.get('error_code'),
                error_description: parsedUrl.searchParams.get('error_description'),
                error_reason: parsedUrl.searchParams.get('error_reason'),
                error_source: parsedUrl.searchParams.get('error_source'),
                error_step: parsedUrl.searchParams.get('error_step'),
              }
            };
          }
          
          if (pathSegments[1] === 'cancel') {
            return {
              type: 'payment_cancel',
              params: {
                transaction_id: parsedUrl.searchParams.get('transaction_id') || parsedUrl.searchParams.get('razorpay_payment_link_reference_id'),
              }
            };
          }
          
          if (pathSegments[1] === 'failed') {
            return {
              type: 'payment_failed',
              params: {
                transaction_id: parsedUrl.searchParams.get('transaction_id') || parsedUrl.searchParams.get('razorpay_payment_link_reference_id'),
                error_message: parsedUrl.searchParams.get('error_message'),
              }
            };
          }
        }
      }

      // Handle universal links
      if (parsedUrl.hostname === this.config.domain) {
        const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

        if (pathSegments[0] === 'profile' && pathSegments[1]) {
          return {
            type: 'profile',
            params: {
              userId: pathSegments[1],
              name: parsedUrl.searchParams.get('name')
            }
          };
        }

        if (pathSegments[0] === 'share' && pathSegments[1] === 'profile') {
          return {
            type: 'shared_profile',
            params: {
              userId: parsedUrl.searchParams.get('userId'),
              name: parsedUrl.searchParams.get('name'),
              bio: parsedUrl.searchParams.get('bio'),
              source: parsedUrl.searchParams.get('source')
            }
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing deep link:', error);
      return null;
    }
  }

  /**
   * Generate app store links for fallback
   */
  static getAppStoreLinks() {
    return {
      ios: 'https://apps.apple.com/app/betame/id123456789', // Replace with actual App Store ID
      android: 'https://play.google.com/store/apps/details?id=com.artcreator329.boltexponativewind',
      web: this.config.fallbackUrl
    };
  }

  /**
   * Generate a smart link that detects platform and redirects appropriately
   */
  static generateSmartLink(userId: string, userName?: string, userBio?: string): string {
    const params = new URLSearchParams({
      userId,
      ...(userName && { name: userName }),
      ...(userBio && { bio: userBio }),
      deepLink: this.generateProfileLink(userId, userName)
    });

    return `https://${this.config.domain}/smart-link?${params.toString()}`;
  }
}