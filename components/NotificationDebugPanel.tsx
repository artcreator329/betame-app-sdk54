import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { notificationService } from '@/lib/notification-service';
import { checkNotificationPermissions, requestNotificationPermissions } from '@/lib/local-notifications';

export default function NotificationDebugPanel() {
  const { notifications, addNotification } = useNotifications();
  const { user } = useAuth();
  const colors = useColors();
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [permissionStatus, setPermissionStatus] = useState<string>('Unknown');

  const handleDebugState = () => {
    (notificationService as any).debugState?.();
    
    const info = `
Debug Info:
- User ID: ${user?.id || 'None'}
- Notifications Count: ${notifications.length}
- Unread Count: ${notifications.filter(n => !n.isRead).length}
- Service Status: ${(notificationService as any).getServiceStatus?.() || 'Unknown'}
    `.trim();
    
    setDebugInfo(info);
  };

  const handleTestSystemNotification = async () => {
    try {
      const result = await (notificationService as any).testSystemNotification?.();
      setDebugInfo(`System notification test result: ${result ? 'Success' : 'Failed'}`);
    } catch (error) {
      setDebugInfo(`System notification test error: ${error}`);
    }
  };

  const handleCheckPermissions = async () => {
    try {
      const hasPermissions = await checkNotificationPermissions();
      setPermissionStatus(hasPermissions ? 'Granted' : 'Denied');
      setDebugInfo(`Notification permissions: ${hasPermissions ? 'Granted' : 'Denied'}`);
    } catch (error) {
      setPermissionStatus('Error');
      setDebugInfo(`Permission check error: ${error}`);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      const granted = await requestNotificationPermissions();
      setPermissionStatus(granted ? 'Granted' : 'Denied');
      setDebugInfo(`Permission request result: ${granted ? 'Granted' : 'Denied'}`);
    } catch (error) {
      setPermissionStatus('Error');
      setDebugInfo(`Permission request error: ${error}`);
    }
  };

  const handleForceReconnect = async () => {
    try {
      await (notificationService as any).forceReconnectRealtime?.();
      setDebugInfo('Realtime reconnection attempted');
    } catch (error) {
      setDebugInfo(`Reconnection error: ${error}`);
    }
  };

  const handleTestNotification = async () => {
    if (!user?.id) {
      setDebugInfo('No user logged in');
      return;
    }

    try {
      await addNotification({
        type: 'system',
        title: 'Debug Test Notification',
        message: `Test notification sent at ${new Date().toLocaleTimeString()}`,
        data: { debug: true, timestamp: Date.now() }
      }, user.id);
      
      setDebugInfo('Test notification sent');
    } catch (error) {
      setDebugInfo(`Test notification error: ${error}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Notification Debug Panel
      </Text>
      
      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: colors.text.secondary }]}>
          Permissions:
        </Text>
        <Text style={[styles.statusValue, { color: colors.text.primary }]}>
          {permissionStatus}
        </Text>
      </View>

      <ScrollView style={styles.buttonContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary.main }]}
          onPress={handleDebugState}
        >
          <Text style={[styles.buttonText, { color: colors.text.white }]}>
            Debug State
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary.main }]}
          onPress={handleCheckPermissions}
        >
          <Text style={[styles.buttonText, { color: colors.text.white }]}>
            Check Permissions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary.main }]}
          onPress={handleRequestPermissions}
        >
          <Text style={[styles.buttonText, { color: colors.text.white }]}>
            Request Permissions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary.main }]}
          onPress={handleTestSystemNotification}
        >
          <Text style={[styles.buttonText, { color: colors.text.white }]}>
            Test System Notification
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary.main }]}
          onPress={handleTestNotification}
        >
          <Text style={[styles.buttonText, { color: colors.text.white }]}>
            Test App Notification
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.status.warning }]}
          onPress={handleForceReconnect}
        >
          <Text style={[styles.buttonText, { color: colors.text.white }]}>
            Force Reconnect Realtime
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {debugInfo ? (
        <View style={[styles.debugOutput, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
          <Text style={[styles.debugText, { color: colors.text.primary }]}>
            {debugInfo}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    maxHeight: 200,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  debugOutput: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 150,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});