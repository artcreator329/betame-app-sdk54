export interface Notification {
  id: string;
  type: 'chat' | 'order' | 'service' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data?: {
    chatId?: string;
    participantId?: string;
    participantName?: string;
    participantImage?: string;
    orderId?: string;
    serviceId?: string;
    [key: string]: any;
  };
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
}