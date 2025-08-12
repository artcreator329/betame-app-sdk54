import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './notification-service';

const MARKETING_NOTIFICATION_KEY = '@betame_marketing_notifications_enabled';
const LAST_MARKETING_NOTIFICATION_KEY = '@betame_last_marketing_notification';
const CHECK_IN_REMINDER_KEY = '@betame_check_in_reminders';

export interface NotificationPreferences {
  marketingNotificationsEnabled: boolean;
  checkInRemindersEnabled: boolean;
}

class NotificationScheduler {
  private static instance: NotificationScheduler;
  private intervalId: any = null;
  private currentUserId: string | null = null;

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  private constructor() {}

  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    await this.startScheduler();
  }

  private async startScheduler(): Promise<void> {
    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Check every minute for notifications to send
    this.intervalId = setInterval(async () => {
      await this.checkAndSendNotifications();
    }, 60000); // Check every minute

    // Also check immediately
    await this.checkAndSendNotifications();
  }

  private async checkAndSendNotifications(): Promise<void> {
    if (!this.currentUserId) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Check for marketing notification at 10:00 AM
    if (currentHour === 10 && currentMinute === 0) {
      await this.sendMarketingNotification();
    }

    // Check for check-in reminders (every 3 days at 9:00 AM)
    if (currentHour === 9 && currentMinute === 0) {
      await this.sendCheckInReminder();
    }
  }

  private async sendMarketingNotification(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const preferences = await this.getNotificationPreferences();
      if (!preferences.marketingNotificationsEnabled) {
        console.log('📅 NotificationScheduler: Marketing notifications disabled for user:', this.currentUserId);
        return;
      }

      const today = new Date().toDateString();
      const lastSent = await AsyncStorage.getItem(`${LAST_MARKETING_NOTIFICATION_KEY}_${this.currentUserId}`);

      // Don't send if we already sent today
      if (lastSent === today) {
        console.log('📅 NotificationScheduler: Marketing notification already sent today');
        return;
      }

      console.log('📅 NotificationScheduler: Sending marketing notification for user:', this.currentUserId);

      const marketingMessages = [
        {
          title: "🌟 Discover New Services",
          message: "Check out trending services in your area and find amazing deals!"
        },
        {
          title: "💼 Grow Your Business",
          message: "List your services and connect with customers looking for your skills!"
        },
        {
          title: "🎯 Perfect Match Waiting",
          message: "New job opportunities that match your skills are available nearby!"
        },
        {
          title: "🔥 Hot Deals Today",
          message: "Don't miss out on limited-time offers from top-rated service providers!"
        },
        {
          title: "⭐ Rate Your Experience",
          message: "Help others by rating your recent service experiences!"
        }
      ];

      const randomMessage = marketingMessages[Math.floor(Math.random() * marketingMessages.length)];

      await notificationService.addNotification({
        type: 'marketing',
        title: randomMessage.title,
        message: randomMessage.message,
        data: {
          category: 'marketing',
          canDisable: true
        }
      }, this.currentUserId);

      // Save that we sent today
      await AsyncStorage.setItem(`${LAST_MARKETING_NOTIFICATION_KEY}_${this.currentUserId}`, today);
      console.log('📅 NotificationScheduler: Marketing notification sent and recorded');

    } catch (error) {
      console.error('❌ NotificationScheduler: Error sending marketing notification:', error);
    }
  }

  private async sendCheckInReminder(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const preferences = await this.getNotificationPreferences();
      if (!preferences.checkInRemindersEnabled) {
        return;
      }

      const lastCheckInKey = `${CHECK_IN_REMINDER_KEY}_${this.currentUserId}`;
      const lastCheckIn = await AsyncStorage.getItem(lastCheckInKey);
      const now = new Date();
      
      if (lastCheckIn) {
        const lastCheckInDate = new Date(lastCheckIn);
        const daysSinceLastCheckIn = Math.floor((now.getTime() - lastCheckInDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Send reminder every 3 days
        if (daysSinceLastCheckIn < 3) {
          return;
        }
      }

      await notificationService.addNotification({
        type: 'check_in',
        title: "👋 Time to Check In!",
        message: "Share your location and discover new opportunities around you!",
        data: {
          action: 'check_in',
          category: 'reminder'
        }
      }, this.currentUserId);

      // Update last reminder sent time
      await AsyncStorage.setItem(lastCheckInKey, now.toISOString());

    } catch (error) {
      console.error('Error sending check-in reminder:', error);
    }
  }

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    if (!this.currentUserId) {
      return {
        marketingNotificationsEnabled: true,
        checkInRemindersEnabled: true
      };
    }

    try {
      const marketingEnabled = await AsyncStorage.getItem(`${MARKETING_NOTIFICATION_KEY}_${this.currentUserId}`);
      const checkInEnabled = await AsyncStorage.getItem(`${CHECK_IN_REMINDER_KEY}_enabled_${this.currentUserId}`);

      return {
        marketingNotificationsEnabled: marketingEnabled !== 'false', // Default to true
        checkInRemindersEnabled: checkInEnabled !== 'false' // Default to true
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {
        marketingNotificationsEnabled: true,
        checkInRemindersEnabled: true
      };
    }
  }

  async setMarketingNotificationsEnabled(enabled: boolean): Promise<void> {
    if (!this.currentUserId) return;

    try {
      await AsyncStorage.setItem(`${MARKETING_NOTIFICATION_KEY}_${this.currentUserId}`, enabled.toString());
    } catch (error) {
      console.error('Error setting marketing notifications preference:', error);
    }
  }

  async setCheckInRemindersEnabled(enabled: boolean): Promise<void> {
    if (!this.currentUserId) return;

    try {
      await AsyncStorage.setItem(`${CHECK_IN_REMINDER_KEY}_enabled_${this.currentUserId}`, enabled.toString());
    } catch (error) {
      console.error('Error setting check-in reminders preference:', error);
    }
  }

  async recordCheckIn(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const now = new Date().toISOString();
      await AsyncStorage.setItem(`${CHECK_IN_REMINDER_KEY}_${this.currentUserId}`, now);
    } catch (error) {
      console.error('Error recording check-in:', error);
    }
  }

  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentUserId = null;
  }
}

export const notificationScheduler = NotificationScheduler.getInstance();