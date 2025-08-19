export interface Notification {
  id: string;
  userId: string; // Add user ID to make notifications user-specific
  type: 'chat' | 'order' | 'service' | 'system' | 'offer' | 'marketing' | 'check_in' | 'structured_inquiry';
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
    offerId?: string;
    offerStatus?: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'in_progress';
    rejectReason?: string;
    serviceTitle?: string;
    price?: number;
    currency?: string;
    canDisable?: boolean;
    // Order notification fields
    buyerName?: string;
    buyerImage?: string;
    orderType?: 'direct' | 'offer';
    action_required?: boolean;
    // Marketing notification fields
    category?: string;
    // Check-in notification fields
    action?: string;
    // Location request notification fields
    actionType?: string;
    // Job completion notification fields
    serviceProviderName?: string;
    serviceProviderImage?: string;
    hasPhotos?: boolean;
    completionMessage?: string;
    action_type?: string;
    deadline_hours?: number;
    rating?: number;
    feedback?: string;
    hours_remaining?: number;
    // Revision notification fields
    revisionReason?: string;
    revisionDeadline?: string;
    disputeReason?: string;
    completionNotes?: string;
  };
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'userId'>, targetUserId: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
}