import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Bell, MessageCircle, Package, Settings, CheckCheck, Clock, Gift, Trash2, Megaphone, MapPin, BellOff } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { Notification } from '@/types/notification';
import { notificationScheduler } from '@/lib/notification-scheduler';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25; // 25% of screen width
const DELETE_THRESHOLD = screenWidth * 0.4; // 40% of screen width

interface SwipeableNotificationProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onDelete: (notificationId: string) => void;
  onMarkAsRead: (notificationId: string) => void;
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
      return '#9333EA'; // Purple color for structured inquiries
    default:
      return colors.text.secondary;
  }
}

function getNotificationGradient(type: string) {
  switch (type) {
    case 'chat':
      return ['#E8F5E8', '#F0F9F0'];
    case 'order':
      return ['#E3F2FD', '#F0F8FF'];
    case 'service':
      return ['#FFF3E0', '#FFF8F0'];
    case 'offer':
      return ['#F3E5F5', '#FAF0FB'];
    case 'marketing':
      return ['#FFF3E0', '#FFF8F0'];
    case 'check_in':
      return ['#E8F5E8', '#F0F9F0'];
    case 'structured_inquiry':
      return ['#F3E8FF', '#FAF0FB']; // Purple gradient for structured inquiries
    default:
      return ['#F5F5F5', '#FAFAFA'];
  }
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

export default function SwipeableNotification({
  notification,
  onPress,
  onDelete,
  onMarkAsRead
}: SwipeableNotificationProps) {
  const colors = useColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const rowOpacity = useRef(new Animated.Value(1)).current;
  const deleteButtonScale = useRef(new Animated.Value(0)).current;
  const instructionOpacity = useRef(new Animated.Value(0)).current;
  
  const IconComponent = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type, colors);
  const gradientColors = getNotificationGradient(notification.type);
  
  const isRead = notification.isRead;
  const readOpacity = isRead ? 0.6 : 1;
  const readTextColor = isRead ? colors.text.secondary : colors.text.primary;
  const readIconColor = isRead ? colors.text.secondary : iconColor;
  const readBackgroundColor = isRead ? colors.background.secondary : gradientColors[0];
  const readBorderColor = isRead ? colors.border.light : iconColor + '30';

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        // Reset any existing animations
        translateX.setOffset(translateX._value);
        translateX.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow right swipe (positive dx)
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
          
          // Scale delete button based on swipe distance
          const progress = Math.min(gestureState.dx / SWIPE_THRESHOLD, 1);
          deleteButtonScale.setValue(progress);
          
          // Show instruction text when partially swiped
          if (gestureState.dx > SWIPE_THRESHOLD * 0.3 && gestureState.dx < DELETE_THRESHOLD) {
            instructionOpacity.setValue(1);
          } else {
            instructionOpacity.setValue(0);
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        translateX.flattenOffset();
        
        if (gestureState.dx > DELETE_THRESHOLD) {
          // Delete the notification
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: screenWidth,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(rowOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            })
          ]).start(() => {
            onDelete(notification.id);
          });
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          // Snap to reveal delete button
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: SWIPE_THRESHOLD,
              useNativeDriver: true,
            }),
            Animated.spring(deleteButtonScale, {
              toValue: 1,
              useNativeDriver: true,
            }),
            Animated.timing(instructionOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            })
          ]).start();
        } else {
          // Snap back to original position
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(deleteButtonScale, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.timing(instructionOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            })
          ]).start();
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: screenWidth,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rowOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      onDelete(notification.id);
    });
  };

  const handlePress = () => {
    // If swiped, first reset position
    if (translateX._value > 0) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(deleteButtonScale, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(instructionOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
      return;
    }
    
    onPress(notification);
  };

  return (
    <View style={styles.container}>
      {/* Delete Button Background */}
      <Animated.View 
        style={[
          styles.deleteBackground,
          {
            backgroundColor: colors.status.error,
            transform: [{ scaleX: deleteButtonScale }]
          }
        ]}
      >
        <View style={styles.deleteContent}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={24} color={colors.text.white} />
            <Text style={[styles.deleteText, { color: colors.text.white }]}>Delete</Text>
          </TouchableOpacity>
          
          {/* Instruction Text */}
          <Animated.View 
            style={[
              styles.instructionContainer,
              {
                opacity: instructionOpacity
              }
            ]}
          >
            <Text style={[styles.instructionText, { color: colors.text.white }]}>
              Swipe all the way right to delete
            </Text>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Main Notification Content */}
      <Animated.View
        style={[
          styles.notificationWrapper,
          {
            opacity: rowOpacity,
            transform: [{ translateX }]
          }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[
            styles.notificationItem,
            { 
              backgroundColor: readBackgroundColor,
              borderColor: readBorderColor,
              shadowColor: colors.shadow.medium,
              opacity: readOpacity
            }
          ]}
          onPress={handlePress}
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
                { color: readTextColor },
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
              { color: readTextColor },
              !notification.isRead && { color: colors.text.primary }
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
                  <Text style={[styles.priceInfo, { color: readTextColor }]}>
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
          
          {/* Right side: Mark as read button only */}
          <View style={styles.rightSection}>
            {!notification.isRead && (
              <TouchableOpacity
                style={[styles.markReadButton, { backgroundColor: iconColor }]}
                onPress={(event) => {
                  event.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CheckCheck size={14} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 8,
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    transformOrigin: 'left',
  },
  deleteContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
  instructionContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
  },
  instructionText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.9,
  },
  notificationWrapper: {
    backgroundColor: 'transparent',
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
    maxWidth: '100%',
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
});