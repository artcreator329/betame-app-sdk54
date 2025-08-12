import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Trash2, CheckCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import SwipeableNotification from '@/components/SwipeableNotification';
import { Notification } from '@/types/notification';



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
    } else if (notification.type === 'offer' && notification.data?.chatId) {
      console.log('🔔 Navigating to existing chat for offer:', notification.data.chatId);
      console.log('🔔 Notification data:', JSON.stringify(notification.data, null, 2));
      
      // Use the existing chatId to navigate directly to the chat
      router.push(`/chat/${notification.data.participantId}?chatId=${notification.data.chatId}`);
    } else if (notification.type === 'order' && notification.data?.orderId) {
      router.push(`/orders`);
    } else if (notification.type === 'service' && notification.data?.serviceId) {
      router.push(`/service/${notification.data.serviceId}`);
    } else if (notification.type === 'check_in') {
      console.log('🔔 Navigating to check-in page');
      router.push('/check-in');
    } else if (notification.type === 'marketing') {
      console.log('🔔 Marketing notification tapped, navigating to home');
      router.push('/(tabs)');
    } else {
      console.log('🔔 Unknown notification type or missing data:', notification);
    }
  };

  const handleClearNotification = async (notificationId: string) => {
    await clearNotification(notificationId);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
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
            {notifications.map((notification) => (
              <SwipeableNotification
                key={notification.id}
                notification={notification}
                onPress={handleNotificationPress}
                onDelete={handleClearNotification}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
            
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