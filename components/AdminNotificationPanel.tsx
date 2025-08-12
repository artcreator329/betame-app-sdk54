import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { 
  Bell, 
  Megaphone, 
  MapPin, 
  Sparkles, 
  Shield, 
  Users, 
  Send,
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/lib/notification-service';
import { notificationScheduler } from '@/lib/notification-scheduler';
import { checkNotificationPermissions, requestNotificationPermissions, showLocalNotification } from '@/lib/local-notifications';
import { createSampleNotifications } from '@/scripts/test-notifications';
import { demonstrateNotifications } from '@/scripts/demo-notifications';
import { adminService } from '@/lib/admin-service';

interface NotificationStats {
  totalSent: number;
  marketingSent: number;
  checkInsSent: number;
  systemNotificationsSent: number;
  usersWithPermissions: number;
  totalUsers: number;
}

export default function AdminNotificationPanel() {
  const colors = useColors();
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stats, setStats] = useState<NotificationStats>({
    totalSent: 0,
    marketingSent: 0,
    checkInsSent: 0,
    systemNotificationsSent: 0,
    usersWithPermissions: 0,
    totalUsers: 0,
  });
  
  // Broadcast notification form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'marketing' | 'system'>('marketing');
  const [isSending, setIsSending] = useState(false);

  // Scheduler settings
  const [marketingEnabled, setMarketingEnabled] = useState(true);
  const [checkInEnabled, setCheckInEnabled] = useState(true);

  useEffect(() => {
    checkPermissions();
    loadStats();
    loadSchedulerSettings();
  }, []);

  const checkPermissions = async () => {
    const permission = await checkNotificationPermissions();
    setHasPermission(permission);
  };

  const loadStats = async () => {
    try {
      const notificationStats = await adminService.getNotificationStats();
      setStats({
        totalSent: notificationStats.totalSent,
        marketingSent: notificationStats.marketingSent,
        checkInsSent: notificationStats.checkInsSent,
        systemNotificationsSent: notificationStats.systemNotificationsSent,
        usersWithPermissions: notificationStats.usersWithPermissions,
        totalUsers: notificationStats.totalUsers,
      });
    } catch (error) {
      console.error('Error loading notification stats:', error);
    }
  };

  const loadSchedulerSettings = async () => {
    try {
      const preferences = await notificationScheduler.getNotificationPreferences();
      setMarketingEnabled(preferences.marketingNotificationsEnabled);
      setCheckInEnabled(preferences.checkInRemindersEnabled);
    } catch (error) {
      console.error('Error loading scheduler settings:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const granted = await requestNotificationPermissions();
      setHasPermission(granted);
      if (granted) {
        Alert.alert('Success', 'Notification permissions granted!');
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings.');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request notification permissions');
    }
  };

  const testSystemNotification = async () => {
    try {
      const success = await showLocalNotification({
        id: 'admin-test-' + Date.now(),
        userId: user?.id || 'admin',
        type: 'system',
        title: '🔧 Admin Test Notification',
        message: 'This is a test system notification from the admin panel.',
        timestamp: new Date().toISOString(),
        isRead: false,
        data: { source: 'admin_panel', test: true }
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

  const sendBroadcastNotification = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert('Error', 'Please enter both title and message');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Admin user not found');
      return;
    }

    Alert.alert(
      'Send Broadcast Notification',
      `Are you sure you want to send this ${broadcastType} notification to all users?\n\nTitle: ${broadcastTitle}\nMessage: ${broadcastMessage}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
          onPress: async () => {
            setIsSending(true);
            try {
              // Send broadcast notification via admin service
              const result = await adminService.sendBroadcastNotification(
                broadcastTitle,
                broadcastMessage,
                broadcastType === 'marketing' ? 'marketing' : 'system'
              );

              if (result.success) {
                Alert.alert(
                  'Success', 
                  `Broadcast notification sent to ${result.sentCount} users!`
                );
                setBroadcastTitle('');
                setBroadcastMessage('');
                
                // Also send to current admin for testing
                if (broadcastType === 'marketing') {
                  await notificationService.addMarketingNotification({
                    userId: user.id,
                    title: broadcastTitle,
                    message: broadcastMessage,
                  });
                } else {
                  await notificationService.addNotification({
                    type: 'system',
                    title: broadcastTitle,
                    message: broadcastMessage,
                    data: { source: 'admin_broadcast' }
                  }, user.id);
                }
                
                loadStats(); // Refresh stats
              } else {
                Alert.alert('Error', result.error || 'Failed to send broadcast notification');
              }
            } catch (error) {
              console.error('Error sending broadcast:', error);
              Alert.alert('Error', 'Failed to send broadcast notification');
            } finally {
              setIsSending(false);
            }
          }
        }
      ]
    );
  };

  const createSampleNotifs = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to create sample notifications');
      return;
    }

    try {
      await createSampleNotifications(user.id);
      Alert.alert('Success', 'Sample notifications created! Check your notifications tab.');
      loadStats(); // Refresh stats
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
      loadStats(); // Refresh stats
    } catch (error) {
      console.error('Error running demo:', error);
      Alert.alert('Error', 'Failed to run demo');
    }
  };

  const toggleScheduler = async (type: 'marketing' | 'checkin', enabled: boolean) => {
    try {
      // Update via admin service for global settings
      const result = await adminService.updateNotificationSettings({
        marketingEnabled: type === 'marketing' ? enabled : marketingEnabled,
        checkInEnabled: type === 'checkin' ? enabled : checkInEnabled,
      });

      if (result.success) {
        if (type === 'marketing') {
          await notificationScheduler.setMarketingNotificationsEnabled(enabled);
          setMarketingEnabled(enabled);
        } else {
          await notificationScheduler.setCheckInRemindersEnabled(enabled);
          setCheckInEnabled(enabled);
        }
        Alert.alert('Success', `${type} notifications ${enabled ? 'enabled' : 'disabled'} globally`);
      } else {
        Alert.alert('Error', result.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error toggling scheduler:', error);
      Alert.alert('Error', 'Failed to update scheduler settings');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background.primary }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
        <Bell size={24} color={colors.primary.main} />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Notification Management
        </Text>
      </View>

      {/* System Status */}
      <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>System Status</Text>
        
        <View style={[styles.statusContainer, { 
          backgroundColor: hasPermission ? '#E8F5E8' : '#FFF3E0', 
          borderColor: hasPermission ? '#4CAF50' : '#FF9800' 
        }]}>
          <Text style={[styles.statusText, { color: hasPermission ? '#2E7D32' : '#F57C00' }]}>
            Admin Notifications: {hasPermission === null ? 'Checking...' : hasPermission ? '✅ Enabled' : '❌ Disabled'}
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
      </View>

      {/* Statistics */}
      <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
            <BarChart3 size={20} color={colors.primary.main} />
            <Text style={[styles.statNumber, { color: colors.text.primary }]}>{stats.totalSent}</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Total Sent</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
            <Megaphone size={20} color="#FF6B35" />
            <Text style={[styles.statNumber, { color: colors.text.primary }]}>{stats.marketingSent}</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Marketing</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
            <MapPin size={20} color="#4CAF50" />
            <Text style={[styles.statNumber, { color: colors.text.primary }]}>{stats.checkInsSent}</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Check-ins</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
            <Users size={20} color="#8B5CF6" />
            <Text style={[styles.statNumber, { color: colors.text.primary }]}>{stats.usersWithPermissions}/{stats.totalUsers}</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Users w/ Permissions</Text>
          </View>
        </View>
      </View>

      {/* Scheduler Settings */}
      <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Global Scheduler Settings</Text>
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border.light }]}>
          <View style={styles.settingInfo}>
            <View style={styles.settingHeader}>
              <Megaphone size={18} color="#FF6B35" />
              <Text style={[styles.settingTitle, { color: colors.text.primary }]}>Marketing Notifications</Text>
            </View>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              Daily at 10:00 AM for all users (unless individually disabled)
            </Text>
          </View>
          <Switch
            value={marketingEnabled}
            onValueChange={(value) => toggleScheduler('marketing', value)}
            trackColor={{ false: colors.background.primary, true: colors.primary.light }}
            thumbColor={marketingEnabled ? colors.primary.main : colors.text.secondary}
          />
        </View>

        <View style={[styles.settingItem, { borderBottomColor: colors.border.light }]}>
          <View style={styles.settingInfo}>
            <View style={styles.settingHeader}>
              <MapPin size={18} color="#4CAF50" />
              <Text style={[styles.settingTitle, { color: colors.text.primary }]}>Check-in Reminders</Text>
            </View>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              Every 3 days at 9:00 AM for inactive users
            </Text>
          </View>
          <Switch
            value={checkInEnabled}
            onValueChange={(value) => toggleScheduler('checkin', value)}
            trackColor={{ false: colors.background.primary, true: colors.primary.light }}
            thumbColor={checkInEnabled ? colors.primary.main : colors.text.secondary}
          />
        </View>
      </View>

      {/* Broadcast Notification */}
      <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Send Broadcast Notification</Text>
        
        <View style={styles.broadcastForm}>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                { backgroundColor: broadcastType === 'marketing' ? colors.primary.main : colors.background.primary }
              ]}
              onPress={() => setBroadcastType('marketing')}
            >
              <Megaphone size={16} color={broadcastType === 'marketing' ? 'white' : colors.text.secondary} />
              <Text style={[
                styles.typeButtonText,
                { color: broadcastType === 'marketing' ? 'white' : colors.text.secondary }
              ]}>Marketing</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.typeButton,
                { backgroundColor: broadcastType === 'system' ? colors.primary.main : colors.background.primary }
              ]}
              onPress={() => setBroadcastType('system')}
            >
              <Bell size={16} color={broadcastType === 'system' ? 'white' : colors.text.secondary} />
              <Text style={[
                styles.typeButtonText,
                { color: broadcastType === 'system' ? 'white' : colors.text.secondary }
              ]}>System</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: colors.background.primary, color: colors.text.primary, borderColor: colors.border.light }]}
            placeholder="Notification title..."
            placeholderTextColor={colors.text.secondary}
            value={broadcastTitle}
            onChangeText={setBroadcastTitle}
            maxLength={100}
          />

          <TextInput
            style={[styles.textArea, { backgroundColor: colors.background.primary, color: colors.text.primary, borderColor: colors.border.light }]}
            placeholder="Notification message..."
            placeholderTextColor={colors.text.secondary}
            value={broadcastMessage}
            onChangeText={setBroadcastMessage}
            multiline
            numberOfLines={3}
            maxLength={300}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              { 
                backgroundColor: colors.primary.main,
                opacity: (broadcastTitle.trim() && broadcastMessage.trim() && !isSending) ? 1 : 0.5
              }
            ]}
            onPress={sendBroadcastNotification}
            disabled={!broadcastTitle.trim() || !broadcastMessage.trim() || isSending}
          >
            <Send size={18} color="white" />
            <Text style={styles.sendButtonText}>
              {isSending ? 'Sending...' : 'Send to All Users'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Testing Tools */}
      <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Testing Tools</Text>
        
        <View style={styles.testingGrid}>
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: colors.primary.main }]}
            onPress={testSystemNotification}
          >
            <Bell size={18} color="white" />
            <Text style={styles.testButtonText}>Test System Notification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: '#FF6B35' }]}
            onPress={createSampleNotifs}
          >
            <Sparkles size={18} color="white" />
            <Text style={styles.testButtonText}>Create Sample Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: '#4CAF50' }]}
            onPress={runDemo}
          >
            <Settings size={18} color="white" />
            <Text style={styles.testButtonText}>Run Full Demo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 26,
  },
  broadcastForm: {
    gap: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  testingGrid: {
    gap: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});