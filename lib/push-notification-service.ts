import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const PUSH_TOKEN_STORAGE_KEY = '@betame_push_token';

let notificationsModule: any | null = null;

async function ensureModule() {
  if (notificationsModule) return notificationsModule;
  
  try {
    const mod = await import('expo-notifications');
    notificationsModule = mod;
    return mod;
  } catch (error) {
    console.log('Failed to load notifications module:', error);
    return null;
  }
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private currentUserId: string | null = null;
  private pushToken: string | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private constructor() {}

  async initialize(userId: string): Promise<void> {
    console.log('🔔 PushNotificationService: Initializing for user:', userId);
    this.currentUserId = userId;

    try {
      // Register for push notifications and get token
      const token = await this.registerForPushNotifications();
      if (token) {
        this.pushToken = token;
        await this.savePushTokenToSupabase(token);
        console.log('✅ PushNotificationService: Initialized successfully with token');
      } else {
        console.log('⚠️ PushNotificationService: No push token obtained');
      }
    } catch (error) {
      console.error('❌ PushNotificationService: Initialization failed:', error);
    }
  }

  private async registerForPushNotifications(): Promise<string | null> {
    const mod = await ensureModule();
    if (!mod) {
      console.log('❌ PushNotificationService: Notifications module not available');
      return null;
    }

    try {
      console.log('🔔 PushNotificationService: Requesting push notification permissions...');

      // Request permissions
      const { status: existingStatus } = await mod.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await mod.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: false,
            allowCriticalAlerts: false,
            provideAppNotificationSettings: false,
            allowProvisional: false,
            allowAnnouncements: false,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ PushNotificationService: Push notification permission denied');
        return null;
      }

      console.log('✅ PushNotificationService: Push notification permission granted');

      // Get the push notification token
      console.log('🔔 PushNotificationService: Getting Expo push token...');
      const tokenData = await mod.getExpoPushTokenAsync({
        projectId: '205a3431-8510-43a6-8801-b21297ac679e', // From app.json
      });

      const token = tokenData.data;
      console.log('✅ PushNotificationService: Got push token:', token.substring(0, 20) + '...');

      // Store token locally
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

      return token;
    } catch (error) {
      console.error('❌ PushNotificationService: Error registering for push notifications:', error);
      return null;
    }
  }

  private async savePushTokenToSupabase(token: string): Promise<void> {
    if (!this.currentUserId) {
      console.log('❌ PushNotificationService: No current user ID');
      return;
    }

    try {
      console.log('🔔 PushNotificationService: Saving push token to Supabase...');

      // Save or update the push token in the user's profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: this.currentUserId,
          push_token: token,
          push_token_updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('❌ PushNotificationService: Error saving push token:', error);
      } else {
        console.log('✅ PushNotificationService: Push token saved to Supabase');
      }
    } catch (error) {
      console.error('❌ PushNotificationService: Exception saving push token:', error);
    }
  }

  async refreshToken(): Promise<void> {
    if (!this.currentUserId) return;

    console.log('🔄 PushNotificationService: Refreshing push token...');
    const token = await this.registerForPushNotifications();
    if (token && token !== this.pushToken) {
      this.pushToken = token;
      await this.savePushTokenToSupabase(token);
      console.log('✅ PushNotificationService: Push token refreshed');
    }
  }

  async clearToken(): Promise<void> {
    console.log('🧹 PushNotificationService: Clearing push token...');
    
    this.pushToken = null;
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);

    if (this.currentUserId) {
      try {
        // Clear the push token from Supabase
        const { error } = await supabase
          .from('profiles')
          .update({
            push_token: null,
            push_token_updated_at: new Date().toISOString(),
          })
          .eq('id', this.currentUserId);

        if (error) {
          console.error('❌ PushNotificationService: Error clearing push token from Supabase:', error);
        } else {
          console.log('✅ PushNotificationService: Push token cleared from Supabase');
        }
      } catch (error) {
        console.error('❌ PushNotificationService: Exception clearing push token:', error);
      }
    }

    this.currentUserId = null;
  }

  getCurrentToken(): string | null {
    return this.pushToken;
  }

  async setupNotificationHandlers(): Promise<void> {
    const mod = await ensureModule();
    if (!mod) return;

    try {
      console.log('🔔 PushNotificationService: Setting up notification handlers...');

      // Handle notifications received while app is in foreground
      mod.setNotificationHandler({
        handleNotification: async (notification: any) => {
          console.log('📱 PushNotificationService: Foreground notification received:', notification.request.content.title);
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          };
        },
      });

      // Handle notification responses (when user taps notification)
      const subscription = mod.addNotificationResponseReceivedListener((response: any) => {
        console.log('📱 PushNotificationService: Notification response received:', response);
        
        const data = response.notification.request.content.data;
        if (data) {
          // Handle navigation based on notification data
          this.handleNotificationNavigation(data);
        }
      });

      console.log('✅ PushNotificationService: Notification handlers set up');
      return subscription;
    } catch (error) {
      console.error('❌ PushNotificationService: Error setting up notification handlers:', error);
    }
  }

  private handleNotificationNavigation(data: any): void {
    console.log('🔔 PushNotificationService: Handling notification navigation:', data);
    
    // This would integrate with your navigation system
    // For now, just log the data
    if (data.chatId && data.participantId) {
      console.log('📱 Should navigate to chat:', data.chatId, 'with participant:', data.participantId);
    } else if (data.orderId) {
      console.log('📱 Should navigate to order:', data.orderId);
    } else if (data.serviceId) {
      console.log('📱 Should navigate to service:', data.serviceId);
    }
  }

  // Test method to send a test push notification
  async sendTestNotification(): Promise<boolean> {
    if (!this.pushToken) {
      console.log('❌ PushNotificationService: No push token available for test');
      return false;
    }

    try {
      console.log('🔔 PushNotificationService: Sending test push notification...');

      // This would typically be done from your backend
      // For testing, you can use Expo's push notification service directly
      const message = {
        to: this.pushToken,
        sound: 'sfx.wav',
        title: 'BetaMe Test Notification',
        body: 'This is a test push notification with custom sound!',
        data: { test: true },
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('✅ PushNotificationService: Test notification sent:', result);
      return true;
    } catch (error) {
      console.error('❌ PushNotificationService: Error sending test notification:', error);
      return false;
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();