import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Bell, Megaphone, MapPin, Sparkles, Shield } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/lib/notification-service';
import { notificationScheduler } from '@/lib/notification-scheduler';
import { createSampleNotifications } from '@/scripts/test-notifications';
import { demonstrateNotifications } from '@/scripts/demo-notifications';
import { checkNotificationPermissions, requestNotificationPermissions, showLocalNotification } from '@/lib/local-notifications';

export default function NotificationTestPanel() {
  const colors = useColors();
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const permission = await checkNotificationPermissions();
    setHasPermission(permission);
  };

  const requestPermissions = async () => {
    try {
      const granted = await requestNotificationPermissions();
      setHasPermission(granted);
      if (granted) {
        Alert.alert('Success', 'Notification permissions granted!');
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings to receive system notifications.');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request notification permissions');
    }
  };

  const testSystemNotification = async () => {
    try {
      const success = await showLocalNotification({
        id: 'test-' + Date.now(),
        userId: user?.id || 'test',
        type: 'marketing',
        title: '🧪 Test System Notification',
        message: 'This is a test system notification! If you see this, notifications are working.',
        timestamp: new Date().toISOString(),
        isRead: false,
        data: { test: true }
      });

      if (success) {
        Alert.alert('Success', 'System notification sent! Check your notification center.');
      } else {
        Alert.alert('Failed', 'System notification failed. Check permissions.');
      }
    } catch (error) {
      console.error('Error sending system notification:', error);
      Alert.alert('Error', 'Failed to send system notification');
    }
  };

  const testMarketingNotification = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to test notifications');
      return;
    }

    try {
      await notificationService.addMarketingNotification({
        userId: user.id,
        title: '🌟 Test Marketing Notification',
        message: 'This is a test marketing notification to see how it looks!',
      });
      Alert.alert('Success', 'Marketing notification sent! Check notifications tab and system notifications.');
    } catch (error) {
      console.error('Error sending marketing notification:', error);
      Alert.alert('Error', 'Failed to send marketing notification');
    }
  };

  const testCheckInNotification = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to test notifications');
      return;
    }

    try {
      await notificationService.addCheckInReminderNotification({
        userId: user.id,
      });
      Alert.alert('Success', 'Check-in reminder sent!');
    } catch (error) {
      console.error('Error sending check-in notification:', error);
      Alert.alert('Error', 'Failed to send check-in notification');
    }
  };

  const testScheduler = async () => {
    try {
      const preferences = await notificationScheduler.getNotificationPreferences();
      Alert.alert(
        'Scheduler Status',
        `Marketing: ${preferences.marketingNotificationsEnabled ? 'Enabled' : 'Disabled'}\nCheck-in: ${preferences.checkInRemindersEnabled ? 'Enabled' : 'Disabled'}`
      );
    } catch (error) {
      console.error('Error checking scheduler:', error);
      Alert.alert('Error', 'Failed to check scheduler status');
    }
  };

  const createSampleNotifs = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to create sample notifications');
      return;
    }

    try {
      await createSampleNotifications(user.id);
      Alert.alert('Success', 'Sample notifications created! Check your notifications tab.');
    } catch (error) {
      console.error('Error creating sample notifications:', error);
      Alert.alert('Error', 'Failed to create sample notifications');
    }
  };

  const runDemo = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to run demo');
      return;
    }

    try {
      await demonstrateNotifications(user.id);
      Alert.alert('Demo Complete', 'Check the console logs and your notifications tab!');
    } catch (error) {
      console.error('Error running demo:', error);
      Alert.alert('Error', 'Failed to run demo');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        🧪 Notification Test Panel
      </Text>
      
      <View style={[styles.statusContainer, { backgroundColor: hasPermission ? '#E8F5E8' : '#FFF3E0', borderColor: hasPermission ? '#4CAF50' : '#FF9800' }]}>
        <Text style={[styles.statusText, { color: hasPermission ? '#2E7D32' : '#F57C00' }]}>
          System Notifications: {hasPermission === null ? 'Checking...' : hasPermission ? '✅ Enabled' : '❌ Disabled'}
        </Text>
        {hasPermission === false && (
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary.main }]}
            onPress={requestPermissions}
          >
            <Shield size={14} color="white" />
            <Text style={styles.permissionButtonText}>Enable</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.demoButton, { backgroundColor: '#FF6B35' }]}
          onPress={testSystemNotification}
        >
          <Bell size={18} color="white" />
          <Text style={styles.demoButtonText}>Test System Notification</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: colors.primary.main }]}
          onPress={testMarketingNotification}
        >
          <Megaphone size={14} color="white" />
          <Text style={styles.buttonText}>Marketing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#4CAF50' }]}
          onPress={testCheckInNotification}
        >
          <MapPin size={14} color="white" />
          <Text style={styles.buttonText}>Check-in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: colors.text.secondary }]}
          onPress={testScheduler}
        >
          <Bell size={14} color="white" />
          <Text style={styles.buttonText}>Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonRow: {
    marginBottom: 8,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  demoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 6,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});