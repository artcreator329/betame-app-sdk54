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
import { Bell, Trash2, CheckCheck, Filter, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import SwipeableNotification from '@/components/SwipeableNotification';
import { Notification } from '@/types/notification';

// Filter types
interface NotificationFilters {
  category: 'all' | 'chat' | 'order' | 'system';
  readStatus: 'all' | 'read' | 'unread';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { notifications, markAsRead, markAllAsRead, clearNotification, clearAllNotifications } = useNotifications();
  const colors = useColors();
  const [refreshing, setRefreshing] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState<NotificationFilters>({
    category: 'all',
    readStatus: 'all',
    dateRange: 'all',
  });

  // Debug logging
  React.useEffect(() => {
    console.log('📱 NotificationsScreen: Current notifications:', notifications);
    console.log('📱 NotificationsScreen: Notifications count:', notifications.length);
    console.log('📱 NotificationsScreen: Active filters:', filters);
  }, [notifications, filters]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh - in real app, you'd reload notifications
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Filter notifications based on current filters
  const filteredNotifications = React.useMemo(() => {
    let filtered = [...notifications];

    // Filter by category
    if (filters.category !== 'all') {
      if (filters.category === 'system') {
        // System includes system, marketing, check_in, and offer types
        filtered = filtered.filter(notification => 
          ['system', 'marketing', 'check_in', 'offer'].includes(notification.type)
        );
      } else {
        filtered = filtered.filter(notification => notification.type === filters.category);
      }
    }

    // Filter by read status
    if (filters.readStatus === 'read') {
      filtered = filtered.filter(notification => notification.isRead);
    } else if (filters.readStatus === 'unread') {
      filtered = filtered.filter(notification => !notification.isRead);
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const notificationDate = new Date();
      
      filtered = filtered.filter(notification => {
        notificationDate.setTime(new Date(notification.timestamp).getTime());
        
        switch (filters.dateRange) {
          case 'today':
            return notificationDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return notificationDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return notificationDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [notifications, filters]);

  const unreadCount = filteredNotifications.filter(n => !n.isRead).length;
  const totalFilteredCount = filteredNotifications.length;

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

  // Filter management functions
  const setCategoryFilter = (category: 'all' | 'chat' | 'order' | 'system') => {
    setFilters(prev => ({ ...prev, category }));
  };

  const setReadStatusFilter = (status: 'all' | 'read' | 'unread') => {
    setFilters(prev => ({ ...prev, readStatus: status }));
  };

  const setDateRangeFilter = (range: 'all' | 'today' | 'week' | 'month') => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  };

  const clearAllFilters = () => {
    setFilters({
      category: 'all',
      readStatus: 'all',
      dateRange: 'all',
    });
  };

  const hasActiveFilters = filters.category !== 'all' || filters.readStatus !== 'all' || filters.dateRange !== 'all';

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
        
        <View style={styles.headerActions}>
          {filteredNotifications.length > 0 && (
            <>
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
            </>
          )}
        </View>
      </View>

      {/* Filter Toggle Button */}
      <View style={[styles.filterToggleContainer, { backgroundColor: colors.background.primary, borderBottomColor: colors.border.light }]}>
        <TouchableOpacity 
          onPress={() => setShowFilters(!showFilters)}
          style={[
            styles.filterToggleButton,
            { 
              backgroundColor: hasActiveFilters ? colors.primary.main : colors.background.secondary,
              borderColor: colors.border.light,
            }
          ]}
        >
          <Filter size={16} color={hasActiveFilters ? colors.text.white : colors.text.primary} />
          <Text style={[
            styles.filterToggleText,
            { color: hasActiveFilters ? colors.text.white : colors.text.primary }
          ]}>
            Filters {hasActiveFilters ? `(${totalFilteredCount})` : ''}
          </Text>
          {hasActiveFilters && (
            <TouchableOpacity 
              onPress={clearAllFilters}
              style={styles.clearFiltersButton}
            >
              <X size={14} color={colors.text.white} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Options */}
      {showFilters && (
        <View style={[styles.filterOptionsContainer, { backgroundColor: colors.background.secondary, borderBottomColor: colors.border.light }]}>
          {/* Category Filters */}
          <View style={styles.filterSection}>
            <View style={styles.filterRow}>
              <TouchableOpacity
                onPress={() => setCategoryFilter('all')}
                style={[
                  styles.categoryFilter,
                  {
                    backgroundColor: filters.category === 'all' ? colors.primary.main : colors.background.primary,
                    borderColor: colors.border.light,
                  }
                ]}
              >
                <Text style={[
                  styles.categoryFilterText,
                  { color: filters.category === 'all' ? colors.text.white : colors.text.primary }
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setCategoryFilter('chat')}
                style={[
                  styles.categoryFilter,
                  {
                    backgroundColor: filters.category === 'chat' ? colors.primary.main : colors.background.primary,
                    borderColor: colors.border.light,
                  }
                ]}
              >
                <Text style={[
                  styles.categoryFilterText,
                  { color: filters.category === 'chat' ? colors.text.white : colors.text.primary }
                ]}>
                  Chat
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setCategoryFilter('order')}
                style={[
                  styles.categoryFilter,
                  {
                    backgroundColor: filters.category === 'order' ? colors.primary.main : colors.background.primary,
                    borderColor: colors.border.light,
                  }
                ]}
              >
                <Text style={[
                  styles.categoryFilterText,
                  { color: filters.category === 'order' ? colors.text.white : colors.text.primary }
                ]}>
                  Orders
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setCategoryFilter('system')}
                style={[
                  styles.categoryFilter,
                  {
                    backgroundColor: filters.category === 'system' ? colors.primary.main : colors.background.primary,
                    borderColor: colors.border.light,
                  }
                ]}
              >
                <Text style={[
                  styles.categoryFilterText,
                  { color: filters.category === 'system' ? colors.text.white : colors.text.primary }
                ]}>
                  System
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Secondary Filters */}
          <View style={styles.filterSection}>
            <View style={styles.secondaryFiltersRow}>
              {/* Read Status */}
              <View style={styles.secondaryFilterGroup}>
                <Text style={[styles.secondaryFilterLabel, { color: colors.text.secondary }]}>Status:</Text>
                <View style={styles.secondaryFilterButtons}>
                  <TouchableOpacity
                    onPress={() => setReadStatusFilter('all')}
                    style={[
                      styles.secondaryFilterButton,
                      {
                        backgroundColor: filters.readStatus === 'all' ? colors.primary.main : colors.background.primary,
                        borderColor: colors.border.light,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.secondaryFilterButtonText,
                      { color: filters.readStatus === 'all' ? colors.text.white : colors.text.primary }
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setReadStatusFilter('unread')}
                    style={[
                      styles.secondaryFilterButton,
                      {
                        backgroundColor: filters.readStatus === 'unread' ? colors.primary.main : colors.background.primary,
                        borderColor: colors.border.light,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.secondaryFilterButtonText,
                      { color: filters.readStatus === 'unread' ? colors.text.white : colors.text.primary }
                    ]}>
                      Unread
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Range */}
              <View style={styles.secondaryFilterGroup}>
                <Text style={[styles.secondaryFilterLabel, { color: colors.text.secondary }]}>Time:</Text>
                <View style={styles.secondaryFilterButtons}>
                  <TouchableOpacity
                    onPress={() => setDateRangeFilter('all')}
                    style={[
                      styles.secondaryFilterButton,
                      {
                        backgroundColor: filters.dateRange === 'all' ? colors.primary.main : colors.background.primary,
                        borderColor: colors.border.light,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.secondaryFilterButtonText,
                      { color: filters.dateRange === 'all' ? colors.text.white : colors.text.primary }
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setDateRangeFilter('today')}
                    style={[
                      styles.secondaryFilterButton,
                      {
                        backgroundColor: filters.dateRange === 'today' ? colors.primary.main : colors.background.primary,
                        borderColor: colors.border.light,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.secondaryFilterButtonText,
                      { color: filters.dateRange === 'today' ? colors.text.white : colors.text.primary }
                    ]}>
                      Today
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setDateRangeFilter('week')}
                    style={[
                      styles.secondaryFilterButton,
                      {
                        backgroundColor: filters.dateRange === 'week' ? colors.primary.main : colors.background.primary,
                        borderColor: colors.border.light,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.secondaryFilterButtonText,
                      { color: filters.dateRange === 'week' ? colors.text.white : colors.text.primary }
                    ]}>
                      Week
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
      
      <ScrollView 
        contentContainerStyle={[
          styles.content,
          filteredNotifications.length === 0 && styles.emptyContent
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
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.background.secondary }]}>
              <Bell size={48} color={colors.text.secondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {hasActiveFilters ? 'No matching notifications' : 'All caught up!'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              {hasActiveFilters 
                ? 'Try adjusting your filters to see more notifications.'
                : 'You don\'t have any notifications right now.\nWe\'ll let you know when something new happens.'
              }
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity 
                onPress={clearAllFilters}
                style={[styles.clearAllFiltersButton, { backgroundColor: colors.primary.main }]}
              >
                <Text style={[styles.clearFiltersButtonText, { color: colors.text.white }]}>
                  Clear all filters
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {filteredNotifications.map((notification) => (
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
  filterToggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearFiltersButton: {
    marginLeft: 8,
  },
  filterOptionsContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  categoryFilter: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  categoryFilterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  secondaryFilterGroup: {
    flex: 1,
  },
  secondaryFilterLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  secondaryFilterButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  secondaryFilterButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryFilterButtonText: {
    fontSize: 12,
    fontWeight: '500',
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
    marginBottom: 24,
  },
  clearAllFiltersButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
});