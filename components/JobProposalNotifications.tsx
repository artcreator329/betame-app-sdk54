import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Bell, Clock, User, CheckCircle, XCircle } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { JobService, JobProposalActivity } from '@/lib/job-service';

interface JobProposalNotificationsProps {
  userId: string;
  onNotificationPress?: (activity: JobProposalActivity) => void;
  limit?: number;
}

export function JobProposalNotifications({ 
  userId, 
  onNotificationPress,
  limit = 10 
}: JobProposalNotificationsProps) {
  const [activities, setActivities] = useState<JobProposalActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const colors = useColors();

  useEffect(() => {
    loadActivities();
    loadUnreadCount();
  }, [userId]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await JobService.getJobActivities(userId, limit);
      setActivities(data);
    } catch (error) {
      console.error('Error loading job activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await JobService.getUnreadActivityCount(userId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const markAsRead = async (activityIds: string[]) => {
    try {
      await JobService.markActivitiesAsRead(activityIds);
      setActivities(prev => 
        prev.map(activity => 
          activityIds.includes(activity.id!) 
            ? { ...activity, is_read: true }
            : activity
        )
      );
      setUnreadCount(prev => Math.max(0, prev - activityIds.length));
    } catch (error) {
      console.error('Error marking activities as read:', error);
    }
  };

  const handleNotificationPress = (activity: JobProposalActivity) => {
    if (!activity.is_read && activity.id) {
      markAsRead([activity.id]);
    }
    onNotificationPress?.(activity);
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'proposal_submitted':
        return <Bell size={16} color={colors.primary.main} />;
      case 'proposal_accepted':
        return <CheckCircle size={16} color="#4CAF50" />;
      case 'proposal_rejected':
        return <XCircle size={16} color="#F44336" />;
      case 'proposal_withdrawn':
        return <Clock size={16} color="#FF9800" />;
      default:
        return <User size={16} color={colors.text.secondary} />;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'proposal_submitted':
        return colors.primary.main;
      case 'proposal_accepted':
        return '#4CAF50';
      case 'proposal_rejected':
        return '#F44336';
      case 'proposal_withdrawn':
        return '#FF9800';
      default:
        return colors.text.secondary;
    }
  };

  const renderActivity = ({ item }: { item: JobProposalActivity }) => (
    <TouchableOpacity
      style={[
        styles.activityItem,
        { 
          backgroundColor: colors.background.secondary,
          borderLeftColor: getActivityColor(item.activity_type),
          opacity: item.is_read ? 0.7 : 1.0
        }
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <View style={styles.activityIcon}>
            {getActivityIcon(item.activity_type)}
          </View>
          <View style={styles.activityInfo}>
            <Text style={[styles.activityDescription, { color: colors.text.primary }]}>
              {item.activity_description}
            </Text>
            <View style={styles.activityMeta}>
              {item.actor_profile && (
                <Text style={[styles.actorName, { color: colors.primary.main }]}>
                  {item.actor_profile.full_name}
                </Text>
              )}
              <Text style={[styles.activityTime, { color: colors.text.secondary }]}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
              </Text>
            </View>
          </View>
          {!item.is_read && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary.main }]} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary.main} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading notifications...
        </Text>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Bell size={24} color={colors.text.secondary} />
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          No job proposal notifications yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <View style={styles.header}>
          <Text style={[styles.headerText, { color: colors.text.primary }]}>
            {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id!}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  activityItem: {
    marginBottom: 1,
    borderLeftWidth: 3,
  },
  activityContent: {
    padding: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  activityInfo: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actorName: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 6,
  },
});
