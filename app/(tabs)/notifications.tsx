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
import { useRouter } from 'expo-router';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';

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

function getNotificationColor(type: string, colors: any) {
  switch (type) {
    case 'chat':
      return colors.status.success; // Green for chat messages
    case 'order':
      return colors.primary.main; // Blue for orders
    case 'service':
      return colors.status.warning; // Orange for services
    default:
      return colors.text.secondary; // Gray for system
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
  const colors = useColors();

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
    const iconColor = getNotificationColor(notification.type, colors);
    
    return (
      <TouchableOpacity
          key={notification.id}
          style={[
            styles.notificationItem,
            { 
              backgroundColor: colors.background.secondary,
              borderColor: colors.border.light,
              shadowColor: colors.shadow.medium
            },
            !notification.isRead && {
              backgroundColor: colors.background.tertiary,
              borderColor: colors.border.main
            },
            notification.type === 'chat' && {
              borderLeftWidth: 4,
              borderLeftColor: colors.status.success
            }
          ]}
          onPress={() => handleNotificationPress(notification)}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
            <IconComponent size={20} color={iconColor} />
          </View>
          
          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text style={[
                styles.notificationTitle,
                { color: colors.text.primary },
                !notification.isRead && styles.unreadTitle
              ]}>
                {notification.title}
              </Text>
              <Text style={[styles.notificationTime, { color: colors.text.secondary }]}>
                {formatNotificationTime(notification.timestamp)}
              </Text>
            </View>
            
            <Text style={[styles.notificationMessage, { color: colors.text.primary }]} numberOfLines={2}>
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
            style={[styles.clearButton, { backgroundColor: colors.background.tertiary }]}
            onPress={(event) => handleClearNotification(notification.id, event)}
          >
            <Trash2 size={16} color={colors.text.secondary} />
          </TouchableOpacity>
          
          {!notification.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.status.error }]} />}
        </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.light, backgroundColor: colors.background.primary }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Notifications</Text>
        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={[styles.markAllButton, { backgroundColor: colors.primary.main }]}>
              <Text style={[styles.markAllText, { color: colors.text.white }]}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearAllNotifications} style={[styles.markAllButton, styles.clearAllButton, { backgroundColor: colors.status.error }]}>
              <Text style={[styles.clearAllText, { color: colors.text.white }]}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      

      
      <ScrollView contentContainerStyle={styles.content}>
        {notifications.length === 0 ? (
          <View style={styles.placeholder}>
            <Bell size={64} color={colors.text.secondary} />
            <Text style={[styles.placeholderTitle, { color: colors.text.primary }]}>No notifications yet</Text>
            <Text style={[styles.placeholderText, { color: colors.text.secondary }]}>You'll see your notifications here when you receive them</Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map(renderNotification)}
          </View>
        )}
        
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAllNotifications} style={[styles.clearAllButton, { backgroundColor: colors.status.error }]}>
            <Text style={[styles.clearAllText, { color: colors.text.white }]}>Clear All Notifications</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
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
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },


  notificationsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 14,
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
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
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
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  clearAllButton: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearAllText: {
    fontSize: 16,
    fontWeight: '600',
  },

});