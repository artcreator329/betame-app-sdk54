import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification } from '@/types/notification';

const NOTIFICATIONS_STORAGE_KEY = '@betame_notifications';

export class NotificationService {
  private static instance: NotificationService;
  private listeners: ((notifications: Notification[]) => void)[] = [];
  private notifications: Notification[] = [];
  private isInitialized: boolean = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    if (!this.isInitialized) {
      await this.loadNotifications();
      this.isInitialized = true;
    }
  }

  private async loadNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        this.notifications = JSON.parse(stored);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  private async saveNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    
    // Use setTimeout to avoid calling listener during render
    setTimeout(async () => {
      if (this.isInitialized) {
        listener(this.notifications);
      } else {
        // Wait for initialization to complete, then call listener
        await this.initializeService();
        listener(this.notifications);
      }
    }, 0);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<void> {
    console.log('📝 NotificationService: addNotification called with:', notification);
    
    // Ensure service is initialized
    if (!this.isInitialized) {
      console.log('📝 NotificationService: Service not initialized, initializing...');
      await this.initializeService();
    }
    
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    
    console.log('📝 NotificationService: Created new notification:', newNotification);
    
    this.notifications.unshift(newNotification);
    console.log('📝 NotificationService: Added to notifications array, total count:', this.notifications.length);
    
    // Keep only the last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    await this.saveNotifications();
    console.log('📝 NotificationService: Saved to storage');
    
    this.notifyListeners();
    console.log('📝 NotificationService: Notified listeners, listener count:', this.listeners.length);
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  async markAllAsRead(): Promise<void> {
    let hasChanges = false;
    this.notifications.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  async clearNotification(notificationId: string): Promise<void> {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
      this.notifications.splice(index, 1);
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  async clearAllNotifications(): Promise<void> {
    this.notifications = [];
    await this.saveNotifications();
    this.notifyListeners();
  }

  async getNotifications(): Promise<Notification[]> {
    // Wait for initialization to complete if not already done
    if (!this.isInitialized) {
      await this.initializeService();
    }
    return this.notifications;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  getServiceStatus(): { isInitialized: boolean; notificationCount: number; listenerCount: number } {
    return {
      isInitialized: this.isInitialized,
      notificationCount: this.notifications.length,
      listenerCount: this.listeners.length,
    };
  }

  // Debug method to check current state
  debugState(): void {
    console.log('🔍 NotificationService Debug State:');
    console.log('  - isInitialized:', this.isInitialized);
    console.log('  - notifications count:', this.notifications.length);
    console.log('  - listeners count:', this.listeners.length);
    console.log('  - notifications:', this.notifications);
  }

  // Helper method to add chat message notification
  async addChatNotification({
    participantId,
    participantName,
    participantImage,
    message,
    chatId,
  }: {
    participantId: string;
    participantName: string;
    participantImage: string;
    message: string;
    chatId: string;
  }): Promise<void> {
    console.log('🔔 NotificationService: addChatNotification called with:', {
      participantId,
      participantName,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      fullMessage: message,
      chatId
    });
    
    // Ensure service is initialized
    if (!this.isInitialized) {
      console.log('🔔 NotificationService: Service not initialized, initializing...');
      await this.initializeService();
    }
    
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'> = {
       type: 'chat' as const,
       title: `New message from ${participantName}`,
       message: message.length > 50 ? message.substring(0, 50) + '...' : message,
       data: {
         chatId,
         participantId,
         participantName,
         participantImage,
       },
     };
     
     console.log('🔔 NotificationService: Created notification object:', notification);
     await this.addNotification(notification);
     console.log('🔔 NotificationService: addChatNotification completed');
  }


}

export const notificationService = NotificationService.getInstance();