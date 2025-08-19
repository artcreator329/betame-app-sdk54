import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification } from '@/types/notification';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { showLocalNotification } from '@/lib/local-notifications';

const NOTIFICATIONS_STORAGE_KEY = '@betame_notifications';

export class NotificationService {
  private static instance: NotificationService;
  private listeners: ((notifications: Notification[]) => void)[] = [];
  private notifications: Notification[] = [];
  private isInitialized: boolean = false;
  private currentUserId: string | null = null;
  private realtimeChannel: RealtimeChannel | null = null;

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

  // Connect for a logged-in user: set current user, hydrate from Supabase, and start realtime
  async connect(userId: string): Promise<void> {
    this.setCurrentUser(userId);
    await this.initializeService(userId);
    await this.hydrateFromSupabase();
    await this.backfillLocalToSupabase();
    this.startRealtimeSubscription(userId);
  }

  private async loadNotifications(): Promise<void> {
    try {
      if (!this.currentUserId) return;
      
      const userStorageKey = `${NOTIFICATIONS_STORAGE_KEY}_${this.currentUserId}`;
      const stored = await AsyncStorage.getItem(userStorageKey);
      if (stored) {
        const allNotifications = JSON.parse(stored);
        // Filter notifications for current user only (tolerate missing userId by assigning)
        const normalized: Notification[] = (allNotifications as Notification[]).map((n: any) => ({
          ...n,
          userId: n.userId ?? this.currentUserId!,
        }));
        this.notifications = normalized.filter((n: Notification) => n.userId === this.currentUserId);
        this.notifyListeners();
        return;
      }

      // Legacy migration: look for unsuffixed key and migrate
      const legacyStored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (legacyStored) {
        try {
          const legacy = JSON.parse(legacyStored);
          if (Array.isArray(legacy)) {
            const migrated: Notification[] = legacy.map((n: any) => ({
              id: n.id ?? `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: n.userId ?? this.currentUserId!,
              type: n.type ?? 'system',
              title: n.title ?? 'Notification',
              message: n.message ?? '',
              timestamp: n.timestamp ?? new Date().toISOString(),
              isRead: !!n.isRead,
              data: n.data ?? undefined,
            }));
            this.notifications = migrated.filter(n => n.userId === this.currentUserId);
            await this.saveNotifications(); // persist to per-user key
            this.notifyListeners();
          }
        } catch (e) {
          // ignore malformed legacy
        }
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
    // Generate a UUID v4 compatible string
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
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

  private startRealtimeSubscription(userId: string) {
    try {
      // Clean up any existing channel
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }

      // Subscribe to inserts/updates/deletes for this user's notifications
      const channel = supabase
        .channel(`notifications_${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload: any) => {
            const row = payload.new as any;
            const incoming: Notification = {
              id: row.id,
              userId: row.user_id,
              type: row.type,
              title: row.title,
              message: row.message,
              timestamp: row.created_at ?? new Date().toISOString(),
              isRead: row.is_read,
              data: row.data ?? undefined,
            };

            // Avoid duplicates
            const exists = this.notifications.some(n => n.id === incoming.id);
            if (!exists) {
              this.notifications.unshift(incoming);
              // Keep only the last 100
              if (this.notifications.length > 100) {
                this.notifications = this.notifications.slice(0, 100);
              }
              // Persist and notify
              this.saveNotifications();
              this.notifyListeners();

              // Show system notification
              showLocalNotification(incoming).catch(() => {});
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload: any) => {
            const row = payload.new as any;
            const index = this.notifications.findIndex(n => n.id === row.id);
            if (index !== -1) {
              this.notifications[index].isRead = !!row.is_read;
              this.notifications[index].title = row.title ?? this.notifications[index].title;
              this.notifications[index].message = row.message ?? this.notifications[index].message;
              this.notifications[index].data = row.data ?? this.notifications[index].data;
              this.saveNotifications();
              this.notifyListeners();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload: any) => {
            const row = payload.old as any;
            const index = this.notifications.findIndex(n => n.id === row.id);
            if (index !== -1) {
              this.notifications.splice(index, 1);
              this.saveNotifications();
              this.notifyListeners();
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // no-op
          }
        });

      this.realtimeChannel = channel;
    } catch (error) {
      console.error('Error starting notifications realtime subscription:', error);
    }
  }

  private async hydrateFromSupabase(): Promise<void> {
    if (!this.currentUserId) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching notifications from Supabase:', error);
        return;
      }

      if (!data) return;

      const supabaseNotifications: Notification[] = data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        title: row.title,
        message: row.message,
        timestamp: row.created_at ?? new Date().toISOString(),
        isRead: row.is_read,
        data: row.data ?? undefined,
      }));

      // Merge Supabase and local, preferring Supabase entries
      const byId = new Map<string, Notification>();
      for (const n of this.notifications) byId.set(n.id, n);
      for (const n of supabaseNotifications) byId.set(n.id, n);
      this.notifications = Array.from(byId.values()).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

      await this.saveNotifications();
      this.notifyListeners();
    } catch (error) {
      console.error('Unexpected error hydrating notifications from Supabase:', error);
    }
  }

  private async backfillLocalToSupabase(): Promise<void> {
    if (!this.currentUserId) return;
    try {
      if (this.notifications.length === 0) return;
      // Fetch existing Supabase IDs to avoid upserting everything
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', this.currentUserId)
        .limit(1000);
      const existingIds = new Set((existing ?? []).map((r: any) => r.id));

      const toCreate = this.notifications.filter(n => !existingIds.has(n.id));
      if (toCreate.length === 0) return;

      // Call RPC per-notification to preserve ids and satisfy RLS (and avoid UUID cast issues)
      for (const n of toCreate) {
        try {
          const { error } = await supabase.rpc('create_notification', {
            p_user_id: this.currentUserId,
            p_type: n.type,
            p_title: n.title,
            p_message: n.message,
            p_data: n.data ?? null,
            p_id: n.id,
          });
          if (error) {
            console.error('❌ NotificationService: Backfill RPC error:', error, 'for id:', n.id);
          }
        } catch (e) {
          console.error('❌ NotificationService: Backfill exception for id:', n.id, e);
        }
      }
    } catch (error) {
      console.error('❌ NotificationService: Exception during backfill:', error);
    }
  }

  disconnect(): void {
    try {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
    } catch (error) {
      console.error('Error disconnecting notifications realtime channel:', error);
    }
  }

  async addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'>, targetUserId: string): Promise<void> {
    console.log('📝 NotificationService: addNotification called with:', {
      type: notification.type,
      title: notification.title,
      message: notification.message.substring(0, 50) + '...',
      targetUserId,
      currentUserId: this.currentUserId,
      isForCurrentUser: targetUserId === this.currentUserId
    });
    
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      userId: targetUserId,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    
    console.log('📝 NotificationService: Created new notification for user:', targetUserId);

    // Write-through to Supabase via secure RPC (this will trigger realtime for the target user)
    try {
      const { error } = await supabase.rpc('create_notification', {
        p_user_id: targetUserId,
        p_type: newNotification.type,
        p_title: newNotification.title,
        p_message: newNotification.message,
        p_data: newNotification.data ?? null,
        p_id: newNotification.id,
      });
      if (error) {
        console.error('❌ NotificationService: Failed to insert notification to Supabase:', error);
      } else {
        console.log('✅ NotificationService: Notification saved to Supabase for user:', targetUserId);
      }
    } catch (error) {
      console.error('❌ NotificationService: Exception inserting notification to Supabase:', error);
    }

    // If the target user is the current user, add to local notifications and show system notification
    if (targetUserId === this.currentUserId) {
      console.log('📝 NotificationService: Adding to local notifications for current user');
      
      this.notifications.unshift(newNotification);
      
      // Keep only the last 100 notifications
      if (this.notifications.length > 100) {
        this.notifications = this.notifications.slice(0, 100);
      }

      await this.saveNotifications();
      this.notifyListeners();

      // Show system notification
      try {
        console.log('📱 NotificationService: Triggering system notification for current user:', newNotification.title);
        await showLocalNotification(newNotification);
        console.log('✅ NotificationService: System notification sent successfully');
      } catch (error) {
        console.error('❌ NotificationService: Failed to show system notification:', error);
      }
    } else {
      console.log('📝 NotificationService: Notification sent to different user via Supabase realtime. Current user:', this.currentUserId, 'Target user:', targetUserId);
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      await this.saveNotifications();
      this.notifyListeners();

      // Mirror to Supabase
      try {
        if (this.currentUserId) {
          const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', this.currentUserId);
          if (error) console.error('❌ NotificationService: Failed to mark as read in Supabase:', error);
        }
      } catch (error) {
        console.error('❌ NotificationService: Exception marking as read in Supabase:', error);
      }
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

      // Mirror deletion to Supabase
      try {
        if (this.currentUserId) {
          const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', this.currentUserId);
          if (error) console.error('❌ NotificationService: Failed to delete notification in Supabase:', error);
        }
      } catch (error) {
        console.error('❌ NotificationService: Exception deleting notification in Supabase:', error);
      }
    }
  }

  async clearAllNotifications(): Promise<void> {
    this.notifications = [];
    await this.saveNotifications();
    this.notifyListeners();

    try {
      if (this.currentUserId) {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', this.currentUserId);
        if (error) console.error('❌ NotificationService: Failed to clear all notifications in Supabase:', error);
      }
    } catch (error) {
      console.error('❌ NotificationService: Exception clearing all notifications in Supabase:', error);
    }
  }

  async getNotifications(): Promise<Notification[]> {
    // Wait for initialization to complete if not already done
    if (!this.isInitialized) {
      await this.initializeService();
    }
    return this.notifications;
  }

  async getNotificationsPage(pageSize: number, beforeCreatedAt?: string, beforeId?: string): Promise<{ items: Notification[]; nextCursor?: { createdAt: string; id: string } }> {
    if (!this.currentUserId) return { items: [] };
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      if (beforeCreatedAt) {
        query = query.lt('created_at', beforeCreatedAt);
      }
      if (beforeId) {
        // tie-breaker for same timestamp
        query = query.lt('id', beforeId);
      }

      const { data, error } = await query.limit(pageSize);
      if (error || !data) return { items: [] };

      const items: Notification[] = data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        title: row.title,
        message: row.message,
        timestamp: row.created_at ?? new Date().toISOString(),
        isRead: row.is_read,
        data: row.data ?? undefined,
      }));

      const last = items[items.length - 1];
      const nextCursor = last ? { createdAt: last.timestamp, id: last.id } : undefined;

      // Merge into local cache
      const byId = new Map<string, Notification>(this.notifications.map(n => [n.id, n] as const));
      for (const n of items) byId.set(n.id, n);
      this.notifications = Array.from(byId.values()).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
      await this.saveNotifications();
      this.notifyListeners();

      return { items, nextCursor };
    } catch (error) {
      console.error('❌ NotificationService: getNotificationsPage error:', error);
      return { items: [] };
    }
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

  // Helper method to add structured inquiry notification
  async addStructuredInquiryNotification({
    participantId,
    participantName,
    participantImage,
    serviceTitle,
    chatId,
    senderId,
  }: {
    participantId: string;
    participantName: string;
    participantImage: string;
    serviceTitle: string;
    chatId: string;
    senderId: string;
  }): Promise<void> {
    console.log('🔔 NotificationService: addStructuredInquiryNotification called with:', {
      participantId,
      participantName,
      serviceTitle,
      chatId,
      senderId,
      currentUserId: this.currentUserId
    });

    // Validate that we have a senderId for navigation
    if (!senderId) {
      console.error('❌ NotificationService: senderId is required for structured inquiry notifications');
      return;
    }

    // CRITICAL: Prevent self-notifications - don't notify if sender is the same as recipient
    if (senderId === participantId) {
      console.log('ℹ️ NotificationService: Skipping self-notification - sender and recipient are the same:', senderId);
      return;
    }
    
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
       type: 'structured_inquiry' as const,
       title: `Service inquiry from ${participantName}`,
       message: `Inquiry about "${serviceTitle}"`,
       data: {
         chatId,
         participantId: senderId, // Always use senderId for navigation (the person who sent the inquiry)
         participantName,
         participantImage,
         serviceTitle,
       },
     };
     
     console.log('🔔 NotificationService: Created structured inquiry notification object:', notification);
     console.log('🔔 NotificationService: Structured inquiry notification will be sent TO:', participantId, 'FROM:', participantName);
     await this.addNotification(notification, participantId);
     console.log('🔔 NotificationService: addStructuredInquiryNotification completed');
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
      senderId,
      currentUserId: this.currentUserId
    });

    // Validate that we have a senderId for navigation
    if (!senderId) {
      console.error('❌ NotificationService: senderId is required for chat notifications');
      return;
    }

    // CRITICAL: Prevent self-notifications - don't notify if sender is the same as recipient
    if (senderId === participantId) {
      console.log('ℹ️ NotificationService: Skipping self-notification - sender and recipient are the same:', senderId);
      return;
    }
    
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
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
     console.log('🔔 NotificationService: Notification will be sent TO:', participantId, 'FROM:', participantName);
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
      senderId,
      currentUserId: this.currentUserId
    });

    // CRITICAL: Prevent self-notifications - don't notify if sender is the same as recipient
    if (senderId === participantId) {
      console.log('ℹ️ NotificationService: Skipping self-offer-notification - sender and recipient are the same:', senderId);
      return;
    }

    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
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
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
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
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
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

  // Helper method to add location request notification
  async addLocationRequestNotification({
    serviceProviderId,
    buyerName,
    buyerImage,
    serviceTitle,
    chatId,
    offerId,
  }: {
    serviceProviderId: string;
    buyerName: string;
    buyerImage: string;
    serviceTitle: string;
    chatId: string;
    offerId: string;
  }): Promise<void> {
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
      type: 'system' as const,
      title: 'Location Request Required',
      message: `${buyerName} is waiting for your location for "${serviceTitle}"`,
      data: {
        chatId,
        participantId: serviceProviderId,
        participantName: buyerName,
        participantImage: buyerImage,
        offerId,
        serviceTitle,
        actionType: 'location_request',
      },
    };
    
    await this.addNotification(notification, serviceProviderId);
  }

  // Helper method to add order notification
  async addOrderNotification({
    serviceProviderId,
    buyerName,
    buyerImage,
    serviceTitle,
    price,
    currency,
    orderId,
    orderType
  }: {
    serviceProviderId: string;
    buyerName: string;
    buyerImage?: string;
    serviceTitle: string;
    price: number;
    currency: string;
    orderId: string;
    orderType: 'direct' | 'offer';
  }): Promise<void> {
    console.log('🔔 NotificationService: addOrderNotification called with:', {
      serviceProviderId,
      buyerName,
      serviceTitle,
      price,
      currency,
      orderId,
      orderType
    });

    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
      type: 'order' as const,
      title: 'New Order Received!',
      message: `${buyerName} placed a new order for "${serviceTitle}" (${currency} ${price}). Please review and confirm.`,
      data: {
        orderId,
        serviceTitle,
        buyerName,
        buyerImage,
        price,
        currency,
        orderType,
        action_required: true
      }
    };

    await this.addNotification(notification, serviceProviderId);
    console.log('🔔 NotificationService: addOrderNotification completed');
  }

  // Helper method to add marketing notification
  async addMarketingNotification({
    userId,
    title,
    message,
  }: {
    userId: string;
    title: string;
    message: string;
  }): Promise<void> {
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
      type: 'marketing' as const,
      title,
      message,
      data: {
        category: 'marketing',
        canDisable: true,
      },
    };
    
    await this.addNotification(notification, userId);
  }

  // Helper method to add check-in reminder notification
  async addCheckInReminderNotification({
    userId,
  }: {
    userId: string;
  }): Promise<void> {
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
      type: 'check_in' as const,
      title: '👋 Time to Check In!',
      message: 'Share your location and discover new opportunities around you!',
      data: {
        action: 'check_in',
        category: 'reminder',
      },
    };
    
    await this.addNotification(notification, userId);
  }

  // Helper method to add job completion notification for buyer
  async addJobCompletionNotification({
    buyerId,
    serviceProviderName,
    serviceProviderImage,
    serviceTitle,
    jobId,
    hasPhotos,
    completionMessage,
  }: {
    buyerId: string;
    serviceProviderName: string;
    serviceProviderImage?: string;
    serviceTitle: string;
    jobId: string;
    hasPhotos: boolean;
    completionMessage?: string;
  }): Promise<void> {
    console.log('🔔 NotificationService: addJobCompletionNotification called with:', {
      buyerId,
      serviceProviderName,
      serviceTitle,
      jobId,
      hasPhotos,
      hasCompletionMessage: !!completionMessage
    });

    const photoText = hasPhotos ? ' with photos' : '';
    const messageText = completionMessage ? `\n\nMessage: "${completionMessage}"` : '';
    
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
      type: 'order' as const,
      title: '✅ Work Completed!',
      message: `${serviceProviderName} has marked "${serviceTitle}" as completed${photoText}. Please review and confirm within 24 hours to release payment.${messageText}`,
      data: {
        orderId: jobId,
        serviceTitle,
        serviceProviderName,
        serviceProviderImage,
        hasPhotos,
        completionMessage,
        action_required: true,
        action_type: 'review_completion',
        deadline_hours: 24
      }
    };

    await this.addNotification(notification, buyerId);
    console.log('🔔 NotificationService: addJobCompletionNotification completed');
  }

  // Helper method to add job completion confirmation notification for service provider
  async addJobCompletionConfirmationNotification({
    serviceProviderId,
    buyerName,
    buyerImage,
    serviceTitle,
    jobId,
    rating,
    feedback,
  }: {
    serviceProviderId: string;
    buyerName: string;
    buyerImage?: string;
    serviceTitle: string;
    jobId: string;
    rating?: number;
    feedback?: string;
  }): Promise<void> {
    console.log('🔔 NotificationService: addJobCompletionConfirmationNotification called with:', {
      serviceProviderId,
      buyerName,
      serviceTitle,
      jobId,
      rating,
      hasFeedback: !!feedback
    });

    const ratingText = rating ? ` (${rating}/5 stars)` : '';
    const feedbackText = feedback ? `\n\nFeedback: "${feedback}"` : '';
    
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
      type: 'order' as const,
      title: '🎉 Payment Released!',
      message: `${buyerName} has confirmed completion of "${serviceTitle}"${ratingText}. Your payment has been released!${feedbackText}`,
      data: {
        orderId: jobId,
        serviceTitle,
        buyerName,
        buyerImage,
        rating,
        feedback,
        action_type: 'payment_released'
      }
    };

    await this.addNotification(notification, serviceProviderId);
    console.log('🔔 NotificationService: addJobCompletionConfirmationNotification completed');
  }

  // Helper method to add revision request notification for service provider
  async addRevisionRequestNotification({
    serviceProviderId,
    buyerName,
    buyerImage,
    serviceTitle,
    jobId,
    revisionReason,
    revisionDeadline,
  }: {
    serviceProviderId: string;
    buyerName: string;
    buyerImage?: string;
    serviceTitle: string;
    jobId: string;
    revisionReason: string;
    revisionDeadline: string;
  }): Promise<void> {
    console.log('🔔 NotificationService: addRevisionRequestNotification called with:', {
      serviceProviderId,
      buyerName,
      serviceTitle,
      jobId,
      revisionReason,
      revisionDeadline
    });

    const deadlineDate = new Date(revisionDeadline);
    const deadlineText = deadlineDate.toLocaleDateString();
    
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
      type: 'order' as const,
      title: '🔧 Revision Requested',
      message: `${buyerName} has requested revisions for "${serviceTitle}". Reason: "${revisionReason}". Please review and respond by ${deadlineText}.`,
      data: {
        orderId: jobId,
        serviceTitle,
        buyerName,
        buyerImage,
        revisionReason,
        revisionDeadline,
        action_required: true,
        action_type: 'revision_request',
      }
    };

    await this.addNotification(notification, serviceProviderId);
    console.log('🔔 NotificationService: addRevisionRequestNotification completed');
  }

  // Helper method to add revision acknowledgment notification for buyer
  async addRevisionAcknowledgmentNotification({
    buyerId,
    serviceProviderName,
    serviceProviderImage,
    serviceTitle,
    jobId,
  }: {
    buyerId: string;
    serviceProviderName: string;
    serviceProviderImage?: string;
    serviceTitle: string;
    jobId: string;
  }): Promise<void> {
    console.log('🔔 NotificationService: addRevisionAcknowledgmentNotification called with:', {
      buyerId,
      serviceProviderName,
      serviceTitle,
      jobId,
    });
    
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
      type: 'order' as const,
      title: '✅ Revision Acknowledged',
      message: `${serviceProviderName} has acknowledged your revision request for "${serviceTitle}" and will work on the improvements.`,
      data: {
        orderId: jobId,
        serviceTitle,
        serviceProviderName,
        serviceProviderImage,
        action_type: 'revision_acknowledged'
      }
    };

    await this.addNotification(notification, buyerId);
    console.log('🔔 NotificationService: addRevisionAcknowledgmentNotification completed');
  }

  // Helper method to add revision dispute notification for buyer
  async addRevisionDisputeNotification({
    buyerId,
    serviceProviderName,
    serviceProviderImage,
    serviceTitle,
    jobId,
    disputeReason,
  }: {
    buyerId: string;
    serviceProviderName: string;
    serviceProviderImage?: string;
    serviceTitle: string;
    jobId: string;
    disputeReason: string;
  }): Promise<void> {
    console.log('🔔 NotificationService: addRevisionDisputeNotification called with:', {
      buyerId,
      serviceProviderName,
      serviceTitle,
      jobId,
      disputeReason
    });
    
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
      type: 'order' as const,
      title: '⚠️ Revision Disputed',
      message: `${serviceProviderName} has disputed your revision request for "${serviceTitle}". Reason: "${disputeReason}". This will be reviewed by our support team.`,
      data: {
        orderId: jobId,
        serviceTitle,
        serviceProviderName,
        serviceProviderImage,
        disputeReason,
        action_type: 'revision_disputed'
      }
    };

    await this.addNotification(notification, buyerId);
    console.log('🔔 NotificationService: addRevisionDisputeNotification completed');
  }

  // Helper method to add revision completion notification for buyer
  async addRevisionCompletionNotification({
    buyerId,
    serviceProviderName,
    serviceProviderImage,
    serviceTitle,
    jobId,
    completionNotes,
  }: {
    buyerId: string;
    serviceProviderName: string;
    serviceProviderImage?: string;
    serviceTitle: string;
    jobId: string;
    completionNotes?: string;
  }): Promise<void> {
    console.log('🔔 NotificationService: addRevisionCompletionNotification called with:', {
      buyerId,
      serviceProviderName,
      serviceTitle,
      jobId,
      completionNotes
    });

    const notesText = completionNotes ? `\n\nNotes: "${completionNotes}"` : '';
    
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
      type: 'order' as const,
      title: '✅ Revision Completed',
      message: `${serviceProviderName} has completed the revision for "${serviceTitle}". Please review the updated work.${notesText}`,
      data: {
        orderId: jobId,
        serviceTitle,
        serviceProviderName,
        serviceProviderImage,
        completionNotes,
        action_required: true,
        action_type: 'revision_completed'
      }
    };

    await this.addNotification(notification, buyerId);
    console.log('🔔 NotificationService: addRevisionCompletionNotification completed');
  }

  // Helper method to add job completion reminder notification for buyer
  async addJobCompletionReminderNotification({
    buyerId,
    serviceProviderName,
    serviceTitle,
    jobId,
    hoursRemaining,
  }: {
    buyerId: string;
    serviceProviderName: string;
    serviceTitle: string;
    jobId: string;
    hoursRemaining: number;
  }): Promise<void> {
    console.log('🔔 NotificationService: addJobCompletionReminderNotification called with:', {
      buyerId,
      serviceProviderName,
      serviceTitle,
      jobId,
      hoursRemaining
    });

    const timeText = hoursRemaining <= 1 ? '1 hour' : `${hoursRemaining} hours`;
    
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
      type: 'order' as const,
      title: '⏰ Review Deadline Approaching',
      message: `You have ${timeText} left to review and confirm completion of "${serviceTitle}" by ${serviceProviderName}. Payment will be automatically released if not confirmed.`,
      data: {
        orderId: jobId,
        serviceTitle,
        serviceProviderName,
        action_required: true,
        action_type: 'review_completion_reminder',
        hours_remaining: hoursRemaining
      }
    };

    await this.addNotification(notification, buyerId);
    console.log('🔔 NotificationService: addJobCompletionReminderNotification completed');
  }

  // Helper method to add review notification for service provider
  async addReviewNotification({
    serviceProviderId,
    reviewerName,
    reviewerImage,
    serviceTitle,
    rating,
    feedback,
    orderId,
  }: {
    serviceProviderId: string;
    reviewerName: string;
    reviewerImage?: string;
    serviceTitle: string;
    rating: number;
    feedback?: string;
    orderId: string;
  }): Promise<void> {
    console.log('🔔 NotificationService: addReviewNotification called with:', {
      serviceProviderId,
      reviewerName,
      serviceTitle,
      rating,
      feedback,
      orderId
    });

    const feedbackText = feedback ? `\n\nReview: "${feedback}"` : '';
    const stars = '⭐'.repeat(rating);
    
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'> = {
      type: 'order' as const,
      title: '⭐ New Review Received',
      message: `${reviewerName} left a ${rating}-star review for "${serviceTitle}".${feedbackText}\n\nRating: ${stars}`,
      data: {
        orderId,
        serviceTitle,
        reviewerName,
        reviewerImage,
        rating,
        feedback,
        action_type: 'review_received'
      }
    };

    await this.addNotification(notification, serviceProviderId);
    console.log('🔔 NotificationService: addReviewNotification completed');
  }

}

export const notificationService = NotificationService.getInstance();