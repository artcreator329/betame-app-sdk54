import { Platform } from 'react-native';
import type { Notification as AppNotification } from '@/types/notification';

let notificationsModule: any | null = null;

async function ensureModule() {
  if (notificationsModule) return notificationsModule;
  
  try {
    // Dynamically import to avoid bundling issues if not installed
    const mod = await import('expo-notifications');
    notificationsModule = mod;
    return mod;
  } catch (error) {
    console.log('Failed to load notifications module:', error);
    return null;
  }
}

async function requestPermissions() {
  const mod = await ensureModule();
  if (!mod) return false;

  try {
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
    
    console.log('📱 Notification permission status:', status);
    return status === 'granted';
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    return false;
  }
}

export async function configureLocalNotifications() {
  const mod = await ensureModule();
  if (!mod) {
    console.log('❌ Notification module not available');
    return false;
  }

  try {
    console.log('🔧 Configuring local notifications...');

    // Configure notification handler first
    await mod.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('📱 Handling notification:', notification.request.content.title);
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });

    // Set notification channel for Android
    if (Platform.OS === 'android') {
      await mod.setNotificationChannelAsync('default', {
        name: 'BetaMe Notifications',
        importance: mod.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
      console.log('📱 Android notification channel created');
    }

    // Request permissions after configuration
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log('⚠️ Notification permissions not granted, but configuration complete');
      return false;
    }

    console.log('✅ Local notifications configured successfully with permissions');
    return true;
  } catch (error) {
    console.error('❌ Error configuring local notifications:', error);
    return false;
  }
}

export async function showLocalNotification(notification: AppNotification) {
  const mod = await ensureModule();
  if (!mod) {
    console.log('❌ Notification module not available');
    return false;
  }

  try {
    // Check if we have permission
    const { status } = await mod.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('❌ No notification permission, requesting...');
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('❌ Notification permission denied');
        return false;
      }
    }

    console.log(`📱 Sending system notification: "${notification.title}"`);

    const notificationContent = {
      title: notification.title,
      body: notification.message,
      data: notification.data ?? {},
      sound: 'default',
      badge: 1,
    };

    // Add Android-specific properties
    if (Platform.OS === 'android') {
      notificationContent.channelId = 'default';
      notificationContent.priority = mod.AndroidImportance.HIGH;
    }

    const notificationId = await mod.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Show immediately
    });

    console.log(`✅ System notification sent with ID: ${notificationId}`);
    return true;
  } catch (error) {
    console.error('❌ Local notification error:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

// Helper function to check notification permissions
export async function checkNotificationPermissions() {
  const mod = await ensureModule();
  if (!mod) return false;

  try {
    const { status } = await mod.getPermissionsAsync();
    console.log('📱 Current notification permission status:', status);
    return status === 'granted';
  } catch (error) {
    console.error('❌ Error checking notification permissions:', error);
    return false;
  }
}

// Helper function to manually request permissions
export async function requestNotificationPermissions() {
  return await requestPermissions();
}