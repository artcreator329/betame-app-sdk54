import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Notification, NotificationContextType } from '@/types/notification';
import { notificationService } from '@/lib/notification-service';
import { notificationScheduler } from '@/lib/notification-scheduler';
import { jobNotificationScheduler } from '@/lib/job-notification-scheduler';
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

    const loadNotifications = async () => {
      if (!user?.id) {
        setNotifications([]);
        setUnreadCount(0);
        // Ensure realtime channel is cleaned up when user logs out
        try {
          (notificationService as any).disconnect?.();
          notificationScheduler.disconnect();
        } catch {}
        return;
      }

      await (notificationService as any).connect?.(user.id);
      await notificationScheduler.initialize(user.id);
      await jobNotificationScheduler.start();
      
      await notificationService.getNotifications().then((savedNotifications) => {
        setNotifications(savedNotifications);
        setUnreadCount(savedNotifications.filter(n => !n.isRead).length);
      });

      unsubscribe = notificationService.subscribe((updatedNotifications) => {
        console.log('🔔 NotificationContext: Received notification update, count:', updatedNotifications.length);
        setNotifications(updatedNotifications);
        setUnreadCount(updatedNotifications.filter(n => !n.isRead).length);
      });
    };

    loadNotifications();

    return () => {
      if (unsubscribe) unsubscribe();
      notificationScheduler.disconnect();
      jobNotificationScheduler.stop();
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
  };

  const clearNotification = async (notificationId: string) => {
    console.log('🔔 NotificationContext: clearNotification called for:', notificationId);
    await notificationService.clearNotification(notificationId);
    console.log('🔔 NotificationContext: clearNotification completed for:', notificationId);
  };

  const clearAllNotifications = async () => {
    await notificationService.clearAllNotifications();
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
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