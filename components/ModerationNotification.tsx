import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { AlertTriangle, X, Shield } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface ModerationNotificationProps {
  visible: boolean;
  message: string;
  type: 'warning' | 'ban' | 'info';
  onClose: () => void;
  onViewDetails?: () => void;
  autoHide?: boolean;
  duration?: number;
}

export function ModerationNotification({
  visible,
  message,
  type,
  onClose,
  onViewDetails,
  autoHide = true,
  duration = 5000,
}: ModerationNotificationProps) {
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Auto hide
      if (autoHide) {
        const timer = setTimeout(() => {
          hideNotification();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      hideNotification();
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const getNotificationStyle = () => {
    switch (type) {
      case 'ban':
        return {
          backgroundColor: '#FEF2F2',
          borderColor: Colors.status.error,
          iconColor: Colors.status.error,
        };
      case 'warning':
        return {
          backgroundColor: '#FFF7ED',
          borderColor: '#F59E0B',
          iconColor: '#F59E0B',
        };
      default:
        return {
          backgroundColor: '#F0F9FF',
          borderColor: Colors.primary.main,
          iconColor: Colors.primary.main,
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'ban':
      case 'warning':
        return <AlertTriangle size={20} color={getNotificationStyle().iconColor} />;
      default:
        return <Shield size={20} color={getNotificationStyle().iconColor} />;
    }
  };

  if (!visible) return null;

  const style = getNotificationStyle();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
          {onViewDetails && (
            <TouchableOpacity onPress={onViewDetails} style={styles.detailsButton}>
              <Text style={[styles.detailsText, { color: style.iconColor }]}>
                View Details
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={hideNotification} style={styles.closeButton}>
          <X size={18} color={Colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 1000,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
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
  },
  message: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  detailsButton: {
    marginTop: 4,
  },
  detailsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});