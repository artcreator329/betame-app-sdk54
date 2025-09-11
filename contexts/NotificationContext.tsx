import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Notification, NotificationContextType } from '@/types/notification';
import { notificationService } from '@/lib/notification-service';
import { notificationScheduler } from '@/lib/notification-scheduler';
import { jobNotificationScheduler } from '@/lib/job-notification-scheduler';
import { pushNotificationService } from '@/lib/push-notification-service';
import { iosBadgeService } from '@/lib/ios-badge-service';
import { useAuth } from '@/contexts/AuthContext';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isActive = true; // Flag to prevent state updates after cleanup

    const loadNotifications = async () => {
      console.log('🔍 NotificationContext: loadNotifications called with user:', user?.id);
      
      if (!user?.id) {
        console.log('🔍 NotificationContext: No user ID, clearing notifications');
        if (isActive) {
          setNotifications([]);
          setUnreadCount(0);
          
          // Clear iOS badge when user logs out
          iosBadgeService.clearBadge();
        }
        // Ensure realtime channel is cleaned up when user logs out
        try {
          (notificationService as any).disconnect?.();
          notificationScheduler.disconnect();
          pushNotificationService.clearToken().catch(error => {
            console.error('Error clearing push token:', error);
          });
        } catch (error) {
          console.error('Error disconnecting notification services:', error);
        }
        return;
      }

      try {
        console.log('🔍 NotificationContext: Connecting notification service for user:', user.id);
        
        // Connect notification service with proper error handling
        await (notificationService as any).connect?.(user.id);
        
        // Initialize push notification service
        await pushNotificationService.initialize(user.id);
        await pushNotificationService.setupNotificationHandlers();
        
        // Initialize schedulers
        await notificationScheduler.initialize(user.id);
        await jobNotificationScheduler.start();
        
        console.log('🔍 NotificationContext: Getting notifications from service');
        const savedNotifications = await notificationService.getNotifications();
        
        // Only update state if component is still active
        if (isActive) {
          console.log('🔍 NotificationContext: Received notifications:', savedNotifications.length);
          setNotifications(savedNotifications);
          const newUnreadCount = savedNotifications.filter(n => !n.isRead).length;
          setUnreadCount(newUnreadCount);
          
          // Update iOS badge count
          iosBadgeService.updateBadgeCount(newUnreadCount);
        }

        // Subscribe to updates
        unsubscribe = notificationService.subscribe((updatedNotifications) => {
          if (isActive) {
            console.log('🔍 NotificationContext: Received updated notifications:', updatedNotifications.length);
            // Force React to detect the change by creating a new array reference
            setNotifications([...updatedNotifications]);
            const newUnreadCount = updatedNotifications.filter(n => !n.isRead).length;
            setUnreadCount(newUnreadCount);
            
            // Update iOS badge count
            iosBadgeService.updateBadgeCount(newUnreadCount);
          }
        });
        
        console.log('✅ NotificationContext: Initialization completed successfully');
        
      } catch (error) {
        console.error('❌ NotificationContext: Error during initialization:', error);
        
        // On error, still try to get cached notifications
        try {
          const cachedNotifications = await notificationService.getNotifications();
          if (isActive) {
            setNotifications(cachedNotifications);
            const newUnreadCount = cachedNotifications.filter(n => !n.isRead).length;
            setUnreadCount(newUnreadCount);
            
            // Update iOS badge count
            iosBadgeService.updateBadgeCount(newUnreadCount);
          }
        } catch (cacheError) {
          console.error('❌ NotificationContext: Error getting cached notifications:', cacheError);
        }
      }
    };

    loadNotifications();

    return () => {
      isActive = false; // Prevent state updates after cleanup
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from notifications:', error);
        }
      }
      try {
        notificationScheduler.disconnect();
        jobNotificationScheduler.stop();
        pushNotificationService.clearToken().catch(error => {
          console.error('Error clearing push token:', error);
        });
      } catch (error) {
        console.error('Error disconnecting schedulers:', error);
      }
    };
  }, [user?.id]);

  const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'>, targetUserId: string) => {
    await notificationService.addNotification(notification, targetUserId);
  };

  const markAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
  };

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
    
    // Force a re-render by updating the state with a new reference
    setNotifications(prev => [...prev]);
    
    // Clear iOS badge since all notifications are now read
    iosBadgeService.clearBadge();
  };

  const clearNotification = async (notificationId: string) => {
    await notificationService.clearNotification(notificationId);
    
    // Force a re-render by updating the state with a new reference
    setNotifications(prev => [...prev]);
  };

  const clearAllNotifications = async () => {
    await notificationService.clearAllNotifications();
    
    // Force a re-render by updating the state with a new reference
    setNotifications(prev => [...prev]);
    
    // Clear iOS badge since all notifications are cleared
    iosBadgeService.clearBadge();
  };

  const refreshNotifications = async () => {
    await notificationService.refreshNotifications();
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}