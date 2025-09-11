import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Bell, X } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { useNotificationPermissions } from '@/hooks/useNotificationPermissions';

interface NotificationPermissionBannerProps {
  onDismiss?: () => void;
  style?: any;
  showCloseButton?: boolean;
}

export default function NotificationPermissionBanner({
  onDismiss,
  style,
  showCloseButton = true,
}: NotificationPermissionBannerProps) {
  const colors = useColors();
  const { hasPermission, isChecking, forceCheck } = useNotificationPermissions();

  // Don't show if user already has permission
  if (hasPermission) {
    return null;
  }

  const handleEnablePress = async () => {
    const granted = await forceCheck();
    if (granted && onDismiss) {
      onDismiss();
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primary.light }, style]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Bell size={20} color={colors.primary.main} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Enable Notifications
          </Text>
          <Text style={[styles.message, { color: colors.text.secondary }]}>
            Get notified about messages, offers, and order updates
          </Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.enableButton, { backgroundColor: colors.primary.main }]}
            onPress={handleEnablePress}
            disabled={isChecking}
          >
            <Text style={[styles.enableButtonText, { color: colors.text.white }]}>
              {isChecking ? 'Checking...' : 'Enable'}
            </Text>
          </TouchableOpacity>
          
          {showCloseButton && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleDismiss}
            >
              <X size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  enableButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
});