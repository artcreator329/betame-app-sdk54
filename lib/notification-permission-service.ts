import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkNotificationPermissions, requestNotificationPermissions } from './local-notifications';

const PERMISSION_CHECK_KEY = 'notification_permission_last_check';
const PERMISSION_DISMISSED_KEY = 'notification_permission_dismissed';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class NotificationPermissionService {
  /**
   * Check if we should prompt the user for notification permissions
   * This considers:
   * - Current permission status
   * - When we last checked
   * - If user has dismissed the prompt recently
   */
  static async shouldPromptForPermissions(): Promise<boolean> {
    try {
      // Check current permission status
      const hasPermission = await checkNotificationPermissions();
      if (hasPermission) {
        return false; // Already has permission
      }

      // Check if user dismissed the prompt recently (within 24 hours)
      const dismissedTime = await AsyncStorage.getItem(PERMISSION_DISMISSED_KEY);
      if (dismissedTime) {
        const timeSinceDismissed = Date.now() - parseInt(dismissedTime);
        if (timeSinceDismissed < CHECK_INTERVAL) {
          return false; // Don't prompt again too soon
        }
      }

      // Check when we last prompted
      const lastCheckTime = await AsyncStorage.getItem(PERMISSION_CHECK_KEY);
      if (lastCheckTime) {
        const timeSinceLastCheck = Date.now() - parseInt(lastCheckTime);
        if (timeSinceLastCheck < CHECK_INTERVAL) {
          return false; // Don't prompt too frequently
        }
      }

      return true; // Should prompt
    } catch (error) {
      console.error('Error checking if should prompt for permissions:', error);
      return false;
    }
  }

  /**
   * Show a user-friendly prompt to enable notifications
   */
  static async promptForPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Enable Notifications',
        'Stay updated with important messages, service offers, and order updates. Would you like to enable notifications?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: async () => {
              // Mark as dismissed
              await AsyncStorage.setItem(PERMISSION_DISMISSED_KEY, Date.now().toString());
              resolve(false);
            },
          },
          {
            text: 'Enable',
            onPress: async () => {
              try {
                // Update last check time
                await AsyncStorage.setItem(PERMISSION_CHECK_KEY, Date.now().toString());
                
                // Request permissions
                const granted = await requestNotificationPermissions();
                
                if (granted) {
                  Alert.alert(
                    'Notifications Enabled',
                    'Great! You\'ll now receive important updates and messages.',
                    [{ text: 'OK' }]
                  );
                } else {
                  // Show instructions to enable in settings
                  Alert.alert(
                    'Enable in Settings',
                    Platform.OS === 'ios' 
                      ? 'To receive notifications, please go to Settings > BetaMe > Notifications and turn on Allow Notifications.'
                      : 'To receive notifications, please go to Settings > Apps > BetaMe > Notifications and enable notifications.',
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          // Mark as dismissed since user saw the instructions
                          AsyncStorage.setItem(PERMISSION_DISMISSED_KEY, Date.now().toString());
                        }
                      }
                    ]
                  );
                }
                
                resolve(granted);
              } catch (error) {
                console.error('Error requesting notification permissions:', error);
                resolve(false);
              }
            },
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Check permissions and prompt if needed
   * This is the main method to call from your app
   */
  static async checkAndPromptIfNeeded(): Promise<boolean> {
    try {
      const shouldPrompt = await this.shouldPromptForPermissions();
      
      if (shouldPrompt) {
        console.log('📱 NotificationPermissionService: Prompting user for notification permissions');
        return await this.promptForPermissions();
      }
      
      // Check if we already have permissions
      return await checkNotificationPermissions();
    } catch (error) {
      console.error('Error in checkAndPromptIfNeeded:', error);
      return false;
    }
  }

  /**
   * Force check permissions (ignores timing restrictions)
   * Useful for settings screens or when user explicitly wants to enable
   */
  static async forceCheckPermissions(): Promise<boolean> {
    try {
      const hasPermission = await checkNotificationPermissions();
      
      if (!hasPermission) {
        return await this.promptForPermissions();
      }
      
      return true;
    } catch (error) {
      console.error('Error in forceCheckPermissions:', error);
      return false;
    }
  }

  /**
   * Reset the permission check state (for testing or troubleshooting)
   */
  static async resetPermissionState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PERMISSION_CHECK_KEY);
      await AsyncStorage.removeItem(PERMISSION_DISMISSED_KEY);
      console.log('📱 NotificationPermissionService: Permission state reset');
    } catch (error) {
      console.error('Error resetting permission state:', error);
    }
  }

  /**
   * Get current permission status without prompting
   */
  static async getCurrentPermissionStatus(): Promise<{
    hasPermission: boolean;
    lastChecked: number | null;
    lastDismissed: number | null;
  }> {
    try {
      const hasPermission = await checkNotificationPermissions();
      const lastCheckedStr = await AsyncStorage.getItem(PERMISSION_CHECK_KEY);
      const lastDismissedStr = await AsyncStorage.getItem(PERMISSION_DISMISSED_KEY);
      
      return {
        hasPermission,
        lastChecked: lastCheckedStr ? parseInt(lastCheckedStr) : null,
        lastDismissed: lastDismissedStr ? parseInt(lastDismissedStr) : null,
      };
    } catch (error) {
      console.error('Error getting permission status:', error);
      return {
        hasPermission: false,
        lastChecked: null,
        lastDismissed: null,
      };
    }
  }
}