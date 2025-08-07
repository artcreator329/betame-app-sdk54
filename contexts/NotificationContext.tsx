import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Notification, NotificationContextType } from '@/types/notification';
import { notificationService } from '@/lib/notification-service';
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
    const loadNotifications = async () => {
      if (!user?.id) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      
      // Set the current user for the notification service
      notificationService.setCurrentUser(user.id);
      
      const savedNotifications = await notificationService.getNotifications();
      setNotifications(savedNotifications);
      setUnreadCount(savedNotifications.filter(n => !n.isRead).length);
    };

    loadNotifications();

    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      console.log('🔄 NotificationContext: Received update with', updatedNotifications.length, 'notifications');
      console.log('🔄 NotificationContext: Notifications:', updatedNotifications);
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.isRead).length);
    });

    return unsubscribe;
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
    await notificationService.clearNotification(notificationId);
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