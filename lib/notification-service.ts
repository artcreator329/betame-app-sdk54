import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification } from '@/types/notification';

const NOTIFICATIONS_STORAGE_KEY = '@betame_notifications';

export class NotificationService {
  private static instance: NotificationService;
  private listeners: ((notifications: Notification[]) => void)[] = [];
  private notifications: Notification[] = [];
  private isInitialized: boolean = false;
  private currentUserId: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private constructor() {
    // Defer initialization until a user is set to avoid noisy warnings
  }

  private async initializeService(userId?: string): Promise<void> {
    const effectiveUserId = userId ?? this.currentUserId;
    if (!effectiveUserId) {
      // No user available yet; skip initialization quietly
      return;
    }

    if (!this.isInitialized || effectiveUserId !== this.currentUserId) {
      this.currentUserId = effectiveUserId;
      await this.loadNotifications();
      this.isInitialized = true;
    }
  }

  // Set the current user ID for user-specific notifications
  setCurrentUser(userId: string): void {
    if (userId !== this.currentUserId) {
      this.currentUserId = userId;
      this.isInitialized = false; // Force re-initialization with new user
    }
  }

  private async loadNotifications(): Promise<void> {
    try {
      if (!this.currentUserId) return;
      
      const userStorageKey = `${NOTIFICATIONS_STORAGE_KEY}_${this.currentUserId}`;
      const stored = await AsyncStorage.getItem(userStorageKey);
      if (stored) {
        const allNotifications = JSON.parse(stored);
        // Filter notifications for current user only
        this.notifications = allNotifications.filter((n: Notification) => n.userId === this.currentUserId);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  private async saveNotifications(): Promise<void> {
    try {
      if (!this.currentUserId) return;
      
      const userStorageKey = `${NOTIFICATIONS_STORAGE_KEY}_${this.currentUserId}`;
      await AsyncStorage.setItem(userStorageKey, JSON.stringify(this.notifications));
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

  async addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'>, targetUserId: string): Promise<void> {
    console.log('📝 NotificationService: addNotification called with:', notification, 'for user:', targetUserId);
    
    // Temporarily set the target user to save the notification
    const originalUserId = this.currentUserId;
    this.setCurrentUser(targetUserId);
    
    // Ensure service is initialized for the target user
    if (!this.isInitialized) {
      console.log('📝 NotificationService: Service not initialized, initializing...');
      await this.initializeService(targetUserId);
    }
    
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      userId: targetUserId,
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
    
    // Restore original user if it was different
    if (originalUserId && originalUserId !== targetUserId) {
      this.setCurrentUser(originalUserId);
      await this.initializeService(originalUserId);
    }
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
    senderId,
  }: {
    participantId: string;
    participantName: string;
    participantImage: string;
    message: string;
    chatId: string;
    senderId: string;
  }): Promise<void> {
    console.log('🔔 NotificationService: addChatNotification called with:', {
      participantId,
      participantName,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      fullMessage: message,
      chatId,
      senderId
    });

    // Validate that we have a senderId for navigation
    if (!senderId) {
      console.error('❌ NotificationService: senderId is required for chat notifications');
      return;
    }
    
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
         participantId: senderId, // Always use senderId for navigation (the person who sent the message)
         participantName,
         participantImage,
       },
     };
     
     console.log('🔔 NotificationService: Created notification object:', notification);
     console.log('🔔 NotificationService: Notification will be sent TO:', participantId, 'with navigation TO:', senderId);
     await this.addNotification(notification, participantId);
     console.log('🔔 NotificationService: addChatNotification completed');
  }

  // Helper method to add service offer notification
  async addOfferNotification({
    participantId,
    participantName,
    participantImage,
    chatId,
    offerId,
    serviceTitle,
    price,
    currency,
    senderId,
    isIncoming = true,
  }: {
    participantId: string;
    participantName: string;
    participantImage: string;
    chatId: string;
    offerId: string;
    serviceTitle: string;
    price: number;
    currency: string;
    senderId: string;
    isIncoming?: boolean;
  }): Promise<void> {
    console.log('🔔 NotificationService: addOfferNotification called with:', {
      participantId,
      participantName,
      offerId,
      serviceTitle,
      senderId
    });

    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'> = {
      type: 'offer' as const,
      title: isIncoming ? `New offer from ${participantName}` : `Offer sent to ${participantName}`,
      message: `${serviceTitle} - ${currency} ${price}`,
      data: {
        chatId,
        participantId: senderId, // Use senderId for navigation (the seller who made the offer)
        participantName,
        participantImage,
        offerId,
        offerStatus: 'pending',
        serviceTitle,
        price,
        currency,
      },
    };
    
    console.log('🔔 NotificationService: Created offer notification:', notification);
    await this.addNotification(notification, participantId);
    console.log('🔔 NotificationService: Offer notification sent to:', participantId);
  }

  // Helper method to add offer acceptance notification
  async addOfferAcceptedNotification({
    participantId,
    participantName,
    participantImage,
    chatId,
    offerId,
    serviceTitle,
    price,
    currency,
    isAcceptedByMe = false,
  }: {
    participantId: string;
    participantName: string;
    participantImage: string;
    chatId: string;
    offerId: string;
    serviceTitle: string;
    price: number;
    currency: string;
    isAcceptedByMe?: boolean;
  }): Promise<void> {
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'> = {
      type: 'offer' as const,
      title: isAcceptedByMe ? `You accepted ${participantName}'s offer` : `Your offer was accepted by ${participantName}`,
      message: `${serviceTitle} - ${currency} ${price}`,
      data: {
        chatId,
        participantId,
        participantName,
        participantImage,
        offerId,
        offerStatus: 'in_progress',
        serviceTitle,
        price,
        currency,
      },
    };
    
    await this.addNotification(notification, participantId);
  }

  // Helper method to add offer rejection notification
  async addOfferRejectedNotification({
    participantId,
    participantName,
    participantImage,
    chatId,
    offerId,
    serviceTitle,
    price,
    currency,
    rejectReason,
    isRejectedByMe = false,
  }: {
    participantId: string;
    participantName: string;
    participantImage: string;
    chatId: string;
    offerId: string;
    serviceTitle: string;
    price: number;
    currency: string;
    rejectReason?: string;
    isRejectedByMe?: boolean;
  }): Promise<void> {
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'> = {
      type: 'offer' as const,
      title: isRejectedByMe ? `You rejected ${participantName}'s offer` : `Your offer was rejected by ${participantName}`,
      message: rejectReason 
        ? `${serviceTitle} - Reason: ${rejectReason}`
        : `${serviceTitle} - ${currency} ${price}`,
      data: {
        chatId,
        participantId,
        participantName,
        participantImage,
        offerId,
        offerStatus: 'rejected',
        serviceTitle,
        price,
        currency,
        rejectReason,
      },
    };
    
    await this.addNotification(notification, participantId);
  }


}

export const notificationService = NotificationService.getInstance();