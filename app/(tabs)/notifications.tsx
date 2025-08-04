import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, MessageCircle, Package, Settings, Trash2 } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';

import { Notification } from '@/types/notification';

function getNotificationIcon(type: string) {
  switch (type) {
    case 'chat':
      return MessageCircle;
    case 'order':
      return Package;
    case 'service':
      return Settings;
    default:
      return Bell;
  }
}

function getNotificationColor(type: string) {
  switch (type) {
    case 'chat':
      return Colors.status.success; // Green for chat messages
    case 'order':
      return Colors.primary.main; // Blue for orders
    case 'service':
      return Colors.status.warning; // Orange for services
    default:
      return Colors.text.secondary; // Gray for system
  }
}

function formatNotificationTime(timestamp: string): string {
  const now = new Date();
  const notificationTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days}d ago`;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { notifications, markAsRead, markAllAsRead, clearNotification, clearAllNotifications } = useNotifications();

  // Debug logging
  React.useEffect(() => {
    console.log('📱 NotificationsScreen: Current notifications:', notifications);
    console.log('📱 NotificationsScreen: Notifications count:', notifications.length);
  }, [notifications]);







  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'chat' && notification.data?.participantId) {
      router.push(`/chat/${notification.data.participantId}`);
    } else if (notification.type === 'order' && notification.data?.orderId) {
      router.push(`/orders`);
    } else if (notification.type === 'service' && notification.data?.serviceId) {
      router.push(`/service/${notification.data.serviceId}`);
    }
  };

  const handleClearNotification = async (notificationId: string, event: any) => {
    event.stopPropagation();
    await clearNotification(notificationId);
  };



  const renderNotification = (notification: Notification) => {
    const IconComponent = getNotificationIcon(notification.type);
    const iconColor = getNotificationColor(notification.type);
    
    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationItem,
          !notification.isRead && styles.unreadNotification,
          notification.type === 'chat' && styles.chatNotification
        ]}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
          <IconComponent size={20} color={iconColor} />
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, !notification.isRead && styles.unreadTitle]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationTime}>
              {formatNotificationTime(notification.timestamp)}
            </Text>
          </View>
          
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notification.message}
          </Text>
          
          {notification.data?.participantImage && notification.type === 'chat' && (
            <Image 
              source={{ uri: notification.data.participantImage }} 
              style={styles.participantImage} 
            />
          )}
        </View>
        
        <TouchableOpacity
          style={styles.clearButton}
          onPress={(event) => handleClearNotification(notification.id, event)}
        >
          <Trash2 size={16} color="#8E8E93" />
        </TouchableOpacity>
        
        {!notification.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearAllNotifications} style={[styles.markAllButton, styles.clearAllButton]}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      

      
      <ScrollView contentContainerStyle={styles.content}>
        {notifications.length === 0 ? (
          <View style={styles.placeholder}>
            <Bell size={64} color={Colors.text.secondary} />
            <Text style={styles.placeholderTitle}>No notifications yet</Text>
            <Text style={styles.placeholderText}>You'll see your notifications here when you receive them</Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map(renderNotification)}
          </View>
        )}
        
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAllNotifications} style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>Clear All Notifications</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.tertiary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },




  content: {
    flex: 1,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary.main,
    borderRadius: 16,
  },
  markAllText: {
    fontSize: 14,
    color: Colors.text.white,
    fontWeight: '600',
  },


  notificationsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadNotification: {
    backgroundColor: Colors.background.secondary,
    borderColor: Colors.border.main,
  },
  chatNotification: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.status.success,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
    marginTop: 2,
  },
  participantImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  clearButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: Colors.background.secondary,
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.status.error,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  clearAllButton: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.status.error,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearAllText: {
    fontSize: 16,
    color: Colors.text.white,
    fontWeight: '600',
  },

});