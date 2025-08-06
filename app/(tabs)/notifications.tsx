import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, MessageCircle, Package, Settings, Trash2, CheckCheck, X, Clock, Gift } from 'lucide-react-native';
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
    case 'offer':
      return Gift;
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
    case 'offer':
      return colors.primary.main; // Blue for offers
    default:
      return colors.text.secondary; // Gray for system
  }
}

function getNotificationGradient(type: string) {
  switch (type) {
    case 'chat':
      return ['#E8F5E8', '#F0F9F0']; // Light green gradient
    case 'order':
      return ['#E3F2FD', '#F0F8FF']; // Light blue gradient
    case 'service':
      return ['#FFF3E0', '#FFF8F0']; // Light orange gradient
    case 'offer':
      return ['#F3E5F5', '#FAF0FB']; // Light purple gradient
    default:
      return ['#F5F5F5', '#FAFAFA']; // Light gray gradient
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
  const [refreshing, setRefreshing] = React.useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log('📱 NotificationsScreen: Current notifications:', notifications);
    console.log('📱 NotificationsScreen: Notifications count:', notifications.length);
  }, [notifications]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh - in real app, you'd reload notifications
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;







  const handleNotificationPress = async (notification: Notification) => {
    console.log('🔔 Notification pressed:', notification);
    console.log('🔔 Full notification object:', JSON.stringify(notification, null, 2));
    
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'chat' && notification.data?.participantId) {
      console.log('🔔 Navigating to chat with participant:', notification.data.participantId);
      console.log('🔔 Notification data:', JSON.stringify(notification.data, null, 2));
      
      // If we have a chatId, we could potentially navigate directly to it
      // But for now, let's use the participant ID approach
      router.push(`/chat/${notification.data.participantId}`);
    } else if (notification.type === 'offer' && notification.data?.participantId) {
      console.log('🔔 Navigating to chat for offer with participant:', notification.data.participantId);
      router.push(`/chat/${notification.data.participantId}`);
    } else if (notification.type === 'order' && notification.data?.orderId) {
      router.push(`/orders`);
    } else if (notification.type === 'service' && notification.data?.serviceId) {
      router.push(`/service/${notification.data.serviceId}`);
    } else {
      console.log('🔔 Unknown notification type or missing data:', notification);
    }
  };

  const handleClearNotification = async (notificationId: string, event: any) => {
    event.stopPropagation();
    await clearNotification(notificationId);
  };



  const renderNotification = (notification: Notification) => {
    const IconComponent = getNotificationIcon(notification.type);
    const iconColor = getNotificationColor(notification.type, colors);
    const gradientColors = getNotificationGradient(notification.type);
    
    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationItem,
          { 
            backgroundColor: notification.isRead ? colors.background.secondary : gradientColors[0],
            borderColor: notification.isRead ? colors.border.light : iconColor + '30',
            shadowColor: colors.shadow.medium
          }
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.7}
      >
        {/* Left side: Icon and indicator */}
        <View style={styles.leftSection}>
          <View style={[
            styles.iconContainer, 
            { 
              backgroundColor: iconColor + '15',
              borderWidth: 2,
              borderColor: iconColor + '30'
            }
          ]}>
            <IconComponent size={22} color={iconColor} />
          </View>
          {!notification.isRead && (
            <View style={[styles.unreadIndicator, { backgroundColor: iconColor }]} />
          )}
        </View>
        
        {/* Main content */}
        <View style={styles.mainContent}>
          {/* Header with title and time */}
          <View style={styles.contentHeader}>
            <Text style={[
              styles.notificationTitle,
              { color: colors.text.primary },
              !notification.isRead && styles.unreadTitle
            ]} numberOfLines={1}>
              {notification.title}
            </Text>
            <View style={styles.timeContainer}>
              <Clock size={12} color={colors.text.secondary} />
              <Text style={[styles.notificationTime, { color: colors.text.secondary }]}>
                {formatNotificationTime(notification.timestamp)}
              </Text>
            </View>
          </View>
          
          {/* Message content */}
          <Text style={[
            styles.notificationMessage, 
            { color: colors.text.secondary },
            !notification.isRead && { color: colors.text.primary }
          ]} numberOfLines={2}>
            {notification.message}
          </Text>
          
          {/* Additional info for offers */}
          {notification.type === 'offer' && notification.data && (
            <View style={styles.offerInfo}>
              {notification.data.serviceTitle && (
                <Text style={[styles.serviceTitle, { color: iconColor }]} numberOfLines={1}>
                  📋 {notification.data.serviceTitle}
                </Text>
              )}
              {notification.data.price && (
                <Text style={[styles.priceInfo, { color: colors.text.primary }]}>
                  💰 {notification.data.currency || 'RM'} {notification.data.price}
                </Text>
              )}
            </View>
          )}
          
          {/* Participant image for chat notifications */}
          {notification.data?.participantImage && notification.type === 'chat' && (
            <View style={styles.participantSection}>
              <Image 
                source={{ uri: notification.data.participantImage }} 
                style={styles.participantImage} 
              />
              <Text style={[styles.participantName, { color: colors.text.secondary }]}>
                {notification.data.participantName}
              </Text>
            </View>
          )}
        </View>
        
        {/* Right side: Actions */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: colors.background.tertiary }]}
            onPress={(event) => handleClearNotification(notification.id, event)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={colors.text.secondary} />
          </TouchableOpacity>
          
          {!notification.isRead && (
            <TouchableOpacity
              style={[styles.markReadButton, { backgroundColor: iconColor }]}
              onPress={(event) => {
                event.stopPropagation();
                markAsRead(notification.id);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <CheckCheck size={14} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.light, backgroundColor: colors.background.primary }]}>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.status.error }]}>
              <Text style={[styles.unreadBadgeText, { color: colors.text.white }]}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        
        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity 
                onPress={markAllAsRead} 
                style={[styles.iconButton, { backgroundColor: colors.primary.main }]}
              >
                <CheckCheck size={18} color={colors.text.white} />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={clearAllNotifications}
              style={[styles.iconButton, { backgroundColor: colors.status.error }]}
            >
              <Trash2 size={18} color={colors.text.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      

      
      <ScrollView 
        contentContainerStyle={[
          styles.content,
          notifications.length === 0 && styles.emptyContent
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
            colors={[colors.primary.main]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.background.secondary }]}>
              <Bell size={48} color={colors.text.secondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              All caught up!
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              You don't have any notifications right now.{'\n'}
              We'll let you know when something new happens.
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map(renderNotification)}
            
            {/* Bottom spacing */}
            <View style={styles.bottomSpacing} />
          </View>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    // Additional styles for clear button if needed
  },
  content: {
    flexGrow: 1,
    paddingTop: 8,
  },
  emptyContent: {
    flex: 1,
  },
  notificationsList: {
    paddingHorizontal: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    maxWidth: '100%',
  },
  leftSection: {
    alignItems: 'center',
    marginRight: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    marginRight: 8,
    minWidth: 0, // Allows text to wrap properly
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    lineHeight: 22,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  offerInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  priceInfo: {
    fontSize: 13,
    fontWeight: '700',
  },
  participantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  participantImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  participantName: {
    fontSize: 13,
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'center',
    gap: 6,
    minWidth: 32, // Ensures minimum space for buttons
  },
  clearButton: {
    padding: 6,
    borderRadius: 14,
  },
  markReadButton: {
    padding: 5,
    borderRadius: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  bottomSpacing: {
    height: 20,
  },
});