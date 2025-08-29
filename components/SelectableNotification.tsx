import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Bell, MessageCircle, Package, Settings, CheckCheck, Clock, Gift, Trash2, Megaphone, MapPin, BellOff, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/contexts/ThemeContext';
import { Notification } from '@/types/notification';
import { notificationScheduler } from '@/lib/notification-scheduler';

interface SelectableNotificationProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onDelete: (notificationId: string) => void;
  onMarkAsRead: (notificationId: string) => void;
  isSelected: boolean;
  onSelect: (notificationId: string) => void;
  selectionMode: boolean;
}

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
    case 'marketing':
      return Megaphone;
    case 'check_in':
      return MapPin;
    case 'structured_inquiry':
      return Package;
    default:
      return Bell;
  }
}

function getNotificationColor(type: string, colors: any) {
  switch (type) {
    case 'chat':
      return colors.status.success;
    case 'order':
      return colors.primary.main;
    case 'service':
      return colors.status.warning;
    case 'offer':
      return colors.primary.main;
    case 'marketing':
      return '#FF6B35';
    case 'check_in':
      return '#4CAF50';
    case 'structured_inquiry':
      return '#9333EA';
    default:
      return colors.text.secondary;
  }
}

function getNotificationGradient(type: string, data?: any, colors?: any) {
  if (type === 'order' && data?.action_type) {
    if (data.action_type.includes('revision')) {
      return ['#FF8C00', '#FFA500', '#FFD700'];
    }
    if (data.action_type.includes('completion') || data.action_type.includes('payment_released')) {
      return ['#00CED1', '#20B2AA', '#32CD32'];
    }
  }

  // For non-gradient notifications, use theme-appropriate backgrounds
  if (colors) {
    switch (type) {
      case 'chat':
        return [colors.background.tertiary, colors.background.secondary];
      case 'order':
        return ['#6B46C1', '#4338CA', '#3B82F6'];
      case 'service':
        return [colors.background.tertiary, colors.background.secondary];
      case 'offer':
        return [colors.background.tertiary, colors.background.secondary];
      case 'marketing':
        return [colors.background.tertiary, colors.background.secondary];
      case 'check_in':
        return [colors.background.tertiary, colors.background.secondary];
      case 'structured_inquiry':
        return ['#8B5CF6', '#7C3AED', '#6D28D9'];
      default:
        return [colors.background.tertiary, colors.background.secondary];
    }
  }

  // Fallback for when colors is not available
  switch (type) {
    case 'chat':
      return ['#E8F5E8', '#F0F9F0'];
    case 'order':
      return ['#6B46C1', '#4338CA', '#3B82F6'];
    case 'service':
      return ['#FFF3E0', '#FFF8F0'];
    case 'offer':
      return ['#F3E5F5', '#FAF0FB'];
    case 'marketing':
      return ['#FFF3E0', '#FFF8F0'];
    case 'check_in':
      return ['#E8F5E8', '#F0F9F0'];
    case 'structured_inquiry':
      return ['#8B5CF6', '#7C3AED', '#6D28D9'];
    default:
      return ['#F5F5F5', '#FAFAFA'];
  }
}

function shouldShowGradient(type: string): boolean {
  return type === 'order' || type === 'structured_inquiry';
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

export default function SelectableNotification({
  notification,
  onPress,
  onDelete,
  onMarkAsRead,
  isSelected,
  onSelect,
  selectionMode
}: SelectableNotificationProps) {
  const colors = useColors();
  
  const IconComponent = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type, colors);
  const gradientColors = getNotificationGradient(notification.type, notification.data, colors);
  
  const isRead = notification.isRead;
  const readOpacity = isRead ? 0.6 : 1;
  const readTextColor = isRead ? colors.text.secondary : colors.text.primary;
  const readIconColor = isRead ? colors.text.secondary : iconColor;
  const readBackgroundColor = isRead ? colors.background.secondary : gradientColors[0];
  const readBorderColor = isRead ? colors.border.light : iconColor + '30';
  
  // Ensure proper text contrast for all notification types
  const messageTextColor = isRead ? colors.text.secondary : colors.text.primary;
  const titleTextColor = isRead ? colors.text.secondary : colors.text.primary;

  const handlePress = () => {
    if (selectionMode) {
      onSelect(notification.id);
    } else {
      onPress(notification);
    }
  };

  const handleLongPress = () => {
    if (!selectionMode) {
      onSelect(notification.id);
    }
  };

  const handleDelete = () => {
    onDelete(notification.id);
  };

  const handleMarkAsRead = (event: any) => {
    event.stopPropagation();
    onMarkAsRead(notification.id);
  };

  const handleSelect = (event: any) => {
    event.stopPropagation();
    onSelect(notification.id);
  };

  return (
    <View style={styles.container}>
      {/* Selection Checkbox */}
      {selectionMode && (
        <TouchableOpacity
          style={[
            styles.checkbox,
            {
              backgroundColor: isSelected ? colors.primary.main : colors.background.primary,
              borderColor: isSelected ? colors.primary.main : colors.border.light,
            }
          ]}
          onPress={handleSelect}
        >
          {isSelected && <Check size={16} color={colors.text.white} />}
        </TouchableOpacity>
      )}

      {/* Main Notification Content */}
      {shouldShowGradient(notification.type) && !notification.isRead ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.notificationItem,
            styles.gradientNotification,
            { 
              borderColor: 'transparent',
              shadowColor: colors.shadow.medium,
              marginLeft: selectionMode ? 12 : 0,
            }
          ]}
        >
          <TouchableOpacity
            style={styles.gradientTouchable}
            onPress={handlePress}
            onLongPress={handleLongPress}
            activeOpacity={0.7}
          >
            {/* Left side: Icon and indicator */}
            <View style={styles.leftSection}>
              <View style={[
                styles.iconContainer, 
                { 
                  backgroundColor: shouldShowGradient(notification.type) && !notification.isRead 
                    ? 'rgba(255, 255, 255, 0.25)'
                    : readIconColor + '15',
                  borderWidth: 2,
                  borderColor: shouldShowGradient(notification.type) && !notification.isRead
                    ? 'rgba(255, 255, 255, 0.4)'
                    : readIconColor + '30'
                }
              ]}>
                <IconComponent 
                  size={22} 
                  color={shouldShowGradient(notification.type) && !notification.isRead 
                    ? '#FFFFFF' 
                    : readIconColor
                  } 
                />
              </View>
              {!notification.isRead && (
                <View style={[
                  styles.unreadIndicator, 
                  { 
                    backgroundColor: shouldShowGradient(notification.type) 
                      ? '#FFFFFF' 
                      : iconColor 
                  }
                ]} />
              )}
            </View>
            
            {/* Main content */}
            <View style={styles.mainContent}>
              {/* Header with title and time */}
              <View style={styles.contentHeader}>
                <Text style={[
                  styles.notificationTitle,
                  { 
                    color: shouldShowGradient(notification.type) && !notification.isRead 
                      ? '#FFFFFF' 
                      : readTextColor 
                  },
                  !notification.isRead && styles.unreadTitle
                ]} numberOfLines={1}>
                  {notification.title}
                </Text>
                <View style={styles.timeContainer}>
                  <Clock 
                    size={12} 
                    color={shouldShowGradient(notification.type) && !notification.isRead 
                      ? 'rgba(255, 255, 255, 0.8)' 
                      : colors.text.secondary
                    } 
                  />
                  <Text style={[
                    styles.notificationTime, 
                    { 
                      color: shouldShowGradient(notification.type) && !notification.isRead 
                        ? 'rgba(255, 255, 255, 0.8)' 
                        : colors.text.secondary 
                    }
                  ]}>
                    {formatNotificationTime(notification.timestamp)}
                  </Text>
                </View>
              </View>
              
              {/* Message content */}
              <Text style={[
                styles.notificationMessage, 
                { 
                  color: shouldShowGradient(notification.type) && !notification.isRead 
                    ? 'rgba(255, 255, 255, 0.95)' 
                    : readTextColor 
                },
                !notification.isRead && !shouldShowGradient(notification.type) && { color: colors.text.primary }
              ]} numberOfLines={2}>
                {notification.message}
              </Text>
              
              {/* Additional info for offers */}
              {notification.type === 'offer' && notification.data && (
                <View style={[
                  styles.offerInfo,
                  shouldShowGradient(notification.type) && !notification.isRead && {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)'
                  }
                ]}>
                  {notification.data.serviceTitle && (
                    <Text style={[
                      styles.serviceTitle, 
                      { 
                        color: shouldShowGradient(notification.type) && !notification.isRead
                          ? '#FFFFFF'
                          : readIconColor 
                      }
                    ]} numberOfLines={1}>
                      📋 {notification.data.serviceTitle}
                    </Text>
                  )}
                  {notification.data.price && (
                    <Text style={[
                      styles.priceInfo, 
                      { 
                        color: shouldShowGradient(notification.type) && !notification.isRead
                          ? '#FFFFFF'
                          : readTextColor 
                      }
                    ]}>
                      💰 {notification.data.currency || 'RM'} {notification.data.price}
                    </Text>
                  )}
                </View>
              )}
              
              {/* Additional info for structured inquiries */}
              {notification.type === 'structured_inquiry' && notification.data && (
                <View style={[
                  styles.offerInfo,
                  shouldShowGradient(notification.type) && !notification.isRead && {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)'
                  }
                ]}>
                  {notification.data.serviceTitle && (
                    <Text style={[
                      styles.serviceTitle, 
                      { 
                        color: shouldShowGradient(notification.type) && !notification.isRead
                          ? '#FFFFFF'
                          : readIconColor 
                      }
                    ]} numberOfLines={1}>
                      🔍 Inquiry about: {notification.data.serviceTitle}
                    </Text>
                  )}
                </View>
              )}
              
              {/* Participant image for chat notifications */}
              {notification.data?.participantImage && notification.type === 'chat' && (
                <View style={styles.participantSection}>
                  <Image 
                    source={{ uri: notification.data.participantImage }} 
                    style={[styles.participantImage, { opacity: readOpacity }]} 
                  />
                  <Text style={[styles.participantName, { color: colors.text.secondary }]}>
                    {notification.data.participantName}
                  </Text>
                </View>
              )}
              
              {/* Marketing notification disable option */}
              {notification.type === 'marketing' && notification.data?.canDisable && (
                <TouchableOpacity
                  style={[styles.disableButton, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}
                  onPress={async (event) => {
                    event.stopPropagation();
                    try {
                      await notificationScheduler.setMarketingNotificationsEnabled(false);
                      onDelete(notification.id);
                    } catch (error) {
                      console.error('Error disabling marketing notifications:', error);
                    }
                  }}
                >
                  <BellOff size={14} color={colors.text.secondary} />
                  <Text style={[styles.disableButtonText, { color: colors.text.secondary }]}>
                    Turn off marketing notifications
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Right side: Action buttons */}
            <View style={styles.rightSection}>
              {!notification.isRead && !selectionMode && (
                <TouchableOpacity
                  style={[
                    styles.markReadButton, 
                    { 
                      backgroundColor: shouldShowGradient(notification.type) 
                        ? 'rgba(255, 255, 255, 0.25)' 
                        : iconColor 
                    }
                  ]}
                  onPress={handleMarkAsRead}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CheckCheck size={14} color="white" />
                </TouchableOpacity>
              )}
              {selectionMode && (
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: colors.status.error }]}
                  onPress={handleDelete}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={16} color={colors.text.white} />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </LinearGradient>
      ) : (
        <TouchableOpacity
          style={[
            styles.notificationItem,
            { 
              backgroundColor: readBackgroundColor,
              borderColor: readBorderColor,
              shadowColor: colors.shadow.medium,
              opacity: readOpacity,
              marginLeft: selectionMode ? 12 : 0,
            }
          ]}
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.7}
        >
          {/* Left side: Icon and indicator */}
          <View style={styles.leftSection}>
            <View style={[
              styles.iconContainer, 
              { 
                backgroundColor: readIconColor + '15',
                borderWidth: 2,
                borderColor: readIconColor + '30'
              }
            ]}>
              <IconComponent size={22} color={readIconColor} />
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
                { color: titleTextColor },
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
              { color: messageTextColor }
            ]} numberOfLines={2}>
              {notification.message}
            </Text>
            
            {/* Additional info for offers */}
            {notification.type === 'offer' && notification.data && (
              <View style={styles.offerInfo}>
                {notification.data.serviceTitle && (
                  <Text style={[styles.serviceTitle, { color: readIconColor }]} numberOfLines={1}>
                    📋 {notification.data.serviceTitle}
                  </Text>
                )}
                {notification.data.price && (
                  <Text style={[styles.priceInfo, { color: messageTextColor }]}>
                    💰 {notification.data.currency || 'RM'} {notification.data.price}
                  </Text>
                )}
              </View>
            )}
            
            {/* Additional info for structured inquiries */}
            {notification.type === 'structured_inquiry' && notification.data && (
              <View style={styles.offerInfo}>
                {notification.data.serviceTitle && (
                  <Text style={[styles.serviceTitle, { color: readIconColor }]} numberOfLines={1}>
                    🔍 Inquiry about: {notification.data.serviceTitle}
                  </Text>
                )}
              </View>
            )}
            
            {/* Participant image for chat notifications */}
            {notification.data?.participantImage && notification.type === 'chat' && (
              <View style={styles.participantSection}>
                <Image 
                  source={{ uri: notification.data.participantImage }} 
                  style={[styles.participantImage, { opacity: readOpacity }]} 
                />
                <Text style={[styles.participantName, { color: colors.text.secondary }]}>
                  {notification.data.participantName}
                </Text>
              </View>
            )}
            
            {/* Marketing notification disable option */}
            {notification.type === 'marketing' && notification.data?.canDisable && (
              <TouchableOpacity
                style={[styles.disableButton, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}
                onPress={async (event) => {
                  event.stopPropagation();
                  try {
                    await notificationScheduler.setMarketingNotificationsEnabled(false);
                    onDelete(notification.id);
                  } catch (error) {
                    console.error('Error disabling marketing notifications:', error);
                  }
                }}
              >
                <BellOff size={14} color={colors.text.secondary} />
                <Text style={[styles.disableButtonText, { color: colors.text.secondary }]}>
                  Turn off marketing notifications
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Right side: Action buttons */}
          <View style={styles.rightSection}>
            {!notification.isRead && !selectionMode && (
              <TouchableOpacity
                style={[styles.markReadButton, { backgroundColor: iconColor }]}
                onPress={handleMarkAsRead}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CheckCheck size={14} color="white" />
              </TouchableOpacity>
            )}
            {selectionMode && (
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: colors.status.error }]}
                onPress={handleDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={16} color={colors.text.white} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    flex: 1,
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
    minWidth: 0,
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
    minWidth: 32,
  },
  markReadButton: {
    padding: 5,
    borderRadius: 10,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 12,
  },
  disableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  disableButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  gradientNotification: {
    overflow: 'hidden',
    borderWidth: 0,
    elevation: 5,
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  gradientTouchable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
  },
});
