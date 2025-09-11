import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Bell, Settings, RefreshCw } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { useNotificationPermissions } from '@/hooks/useNotificationPermissions';

interface NotificationSettingsProps {
  style?: any;
  showTitle?: boolean;
}

export default function NotificationSettings({
  style,
  showTitle = true,
}: NotificationSettingsProps) {
  const colors = useColors();
  const { 
    hasPermission, 
    isChecking, 
    forceCheck, 
    resetPermissionState,
    refreshStatus 
  } = useNotificationPermissions();
  
  const [isResetting, setIsResetting] = useState(false);

  const handleEnableNotifications = async () => {
    const granted = await forceCheck();
    
    if (granted) {
      Alert.alert(
        'Notifications Enabled',
        'You will now receive important updates and messages.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleOpenSettings = () => {
    Alert.alert(
      'Open Settings',
      Platform.OS === 'ios' 
        ? 'Go to Settings > BetaMe > Notifications to manage your notification preferences.'
        : 'Go to Settings > Apps > BetaMe > Notifications to manage your notification preferences.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            // On iOS, you can't directly open app settings, but this will open the main settings
            if (Platform.OS === 'ios') {
              // For iOS, we can only suggest the user to go to settings manually
              // Linking.openURL('app-settings:') doesn't work reliably
            } else {
              // For Android, you could potentially open app settings
              // Linking.openSettings() might work on some versions
            }
          }
        }
      ]
    );
  };

  const handleResetPermissionState = async () => {
    Alert.alert(
      'Reset Permission State',
      'This will reset the notification permission tracking. Use this if you\'re having issues with permission prompts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              await resetPermissionState();
              Alert.alert('Reset Complete', 'Permission state has been reset.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset permission state.');
            } finally {
              setIsResetting(false);
            }
          }
        }
      ]
    );
  };

  const handleRefreshStatus = async () => {
    await refreshStatus();
  };

  return (
    <View style={[styles.container, style]}>
      {showTitle && (
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Notification Settings
        </Text>
      )}
      
      {/* Permission Status */}
      <View style={[styles.settingRow, { borderBottomColor: colors.border.light }]}>
        <View style={styles.settingInfo}>
          <Bell size={20} color={hasPermission ? colors.status.success : colors.status.warning} />
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: colors.text.primary }]}>
              Notifications
            </Text>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              {hasPermission ? 'Enabled' : 'Disabled'} - Tap to {hasPermission ? 'manage' : 'enable'}
            </Text>
          </View>
        </View>
        <Switch
          value={hasPermission}
          onValueChange={hasPermission ? handleOpenSettings : handleEnableNotifications}
          disabled={isChecking}
          trackColor={{ 
            false: colors.background.secondary, 
            true: colors.primary.light 
          }}
          thumbColor={hasPermission ? colors.primary.main : colors.text.secondary}
        />
      </View>

      {/* Enable/Manage Button */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          { 
            backgroundColor: hasPermission ? colors.background.secondary : colors.primary.main,
            borderColor: colors.border.light 
          }
        ]}
        onPress={hasPermission ? handleOpenSettings : handleEnableNotifications}
        disabled={isChecking}
      >
        <Bell size={18} color={hasPermission ? colors.text.primary : colors.text.white} />
        <Text style={[
          styles.actionButtonText,
          { color: hasPermission ? colors.text.primary : colors.text.white }
        ]}>
          {isChecking ? 'Checking...' : hasPermission ? 'Manage in Settings' : 'Enable Notifications'}
        </Text>
      </TouchableOpacity>

      {/* Refresh Status Button */}
      <TouchableOpacity
        style={[styles.secondaryButton, { borderColor: colors.border.light }]}
        onPress={handleRefreshStatus}
        disabled={isChecking}
      >
        <RefreshCw size={16} color={colors.text.secondary} />
        <Text style={[styles.secondaryButtonText, { color: colors.text.secondary }]}>
          Refresh Status
        </Text>
      </TouchableOpacity>

      {/* Debug/Reset Button (only show in development or for troubleshooting) */}
      {__DEV__ && (
        <TouchableOpacity
          style={[styles.debugButton, { borderColor: colors.status.warning }]}
          onPress={handleResetPermissionState}
          disabled={isResetting}
        >
          <Settings size={16} color={colors.status.warning} />
          <Text style={[styles.debugButtonText, { color: colors.status.warning }]}>
            {isResetting ? 'Resetting...' : 'Reset Permission State (Debug)'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Status Info */}
      <View style={styles.statusInfo}>
        <Text style={[styles.statusText, { color: colors.text.secondary }]}>
          Status: {hasPermission ? '✅ Enabled' : '❌ Disabled'}
        </Text>
        <Text style={[styles.statusText, { color: colors.text.secondary }]}>
          Platform: {Platform.OS === 'ios' ? 'iOS' : 'Android'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    marginLeft: 6,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  debugButtonText: {
    fontSize: 12,
    marginLeft: 6,
  },
  statusInfo: {
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    marginBottom: 2,
  },
});