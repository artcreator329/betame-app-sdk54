import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, Bell, Megaphone, Settings, Clock, MapPin } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { Notification } from '@/types/notification';
import { formatMalaysianDateTime } from '@/lib/malaysian-time-utils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface NotificationDetailModalProps {
  notification: Notification | null;
  visible: boolean;
  onClose: () => void;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'marketing':
      return Megaphone;
    case 'system':
      return Settings;
    case 'check_in':
      return MapPin;
    default:
      return Bell;
  }
}

function getNotificationColor(type: string, colors: any) {
  switch (type) {
    case 'marketing':
      return '#FF6B35';
    case 'system':
      return colors.primary.main;
    case 'check_in':
      return '#4CAF50';
    default:
      return colors.text.secondary;
  }
}

function formatNotificationTime(timestamp: string): string {
  return formatMalaysianDateTime(timestamp);
}

export default function NotificationDetailModal({
  notification,
  visible,
  onClose,
}: NotificationDetailModalProps) {
  const colors = useColors();

  if (!notification) return null;

  const IconComponent = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type, colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
          <View style={styles.headerContent}>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
              <IconComponent size={24} color={iconColor} />
            </View>
            <View style={styles.headerText}>
                             <Text style={[styles.notificationType, { color: colors.text.secondary }]}>
                 {notification.type === 'marketing' ? 'Marketing' : 
                  notification.type === 'system' ? 'System' : 
                  notification.type === 'check_in' ? 'Check-in' : 'Notification'} Notification
               </Text>
              <View style={styles.timeContainer}>
                <Clock size={14} color={colors.text.secondary} />
                <Text style={[styles.timestamp, { color: colors.text.secondary }]}>
                  {formatNotificationTime(notification.timestamp)}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.background.secondary }]}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.messageContainer}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {notification.title}
            </Text>
            <Text style={[styles.message, { color: colors.text.primary }]}>
              {notification.message}
            </Text>
            
            {/* Additional data if available */}
            {notification.data && Object.keys(notification.data).length > 0 && (
              <View style={[styles.additionalData, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
                <Text style={[styles.additionalDataTitle, { color: colors.text.secondary }]}>
                  Additional Information
                </Text>
                {Object.entries(notification.data).map(([key, value]) => (
                  <View key={key} style={styles.dataRow}>
                    <Text style={[styles.dataKey, { color: colors.text.secondary }]}>
                      {key}:
                    </Text>
                    <Text style={[styles.dataValue, { color: colors.text.primary }]}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border.light }]}>
          <TouchableOpacity
            style={[styles.closeModalButton, { backgroundColor: colors.primary.main }]}
            onPress={onClose}
          >
            <Text style={[styles.closeModalButtonText, { color: colors.text.white }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  notificationType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestamp: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  messageContainer: {
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  additionalData: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  additionalDataTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  dataKey: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  dataValue: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  closeModalButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
