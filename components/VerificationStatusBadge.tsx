import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Shield, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react-native';
import { VerificationService } from '@/lib/verification-service';
import { useRouter } from 'expo-router';

interface VerificationStatusBadgeProps {
  showFullStatus?: boolean;
  onPress?: () => void;
  style?: any;
}

export function VerificationStatusBadge({ 
  showFullStatus = false, 
  onPress,
  style 
}: VerificationStatusBadgeProps) {
  const [verificationStatus, setVerificationStatus] = useState<string>('not_started');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      setLoading(true);
      const status = await VerificationService.getVerificationStatus();
      setVerificationStatus(status.status);
    } catch (error) {
      console.error('Error checking verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/ekyc-verification');
    }
  };

  const getStatusConfig = () => {
    switch (verificationStatus) {
      case 'verified':
        return {
          icon: <CheckCircle size={16} color="#34C759" />,
          text: 'Verified',
          color: '#34C759',
          backgroundColor: '#E8F5E8',
          borderColor: '#34C759',
        };
      case 'in_progress':
        return {
          icon: <Clock size={16} color="#FF9500" />,
          text: 'Pending',
          color: '#FF9500',
          backgroundColor: '#FFF4E6',
          borderColor: '#FF9500',
        };
      case 'rejected':
        return {
          icon: <XCircle size={16} color="#FF3B30" />,
          text: 'Rejected',
          color: '#FF3B30',
          backgroundColor: '#FFE6E6',
          borderColor: '#FF3B30',
        };
      default:
        return {
          icon: <Shield size={16} color="#8E8E93" />,
          text: 'Not Verified',
          color: '#8E8E93',
          backgroundColor: '#F2F2F7',
          borderColor: '#8E8E93',
        };
    }
  };

  if (loading) {
    return (
      <View style={[styles.badge, styles.loadingBadge, style]}>
        <ActivityIndicator size="small" color="#8E8E93" />
        <Text style={styles.loadingText}>Checking...</Text>
      </View>
    );
  }

  const config = getStatusConfig();

  if (showFullStatus) {
    return (
      <TouchableOpacity 
        style={[
          styles.fullStatusContainer,
          { backgroundColor: config.backgroundColor, borderColor: config.borderColor },
          style
        ]}
        onPress={handlePress}
      >
        <View style={styles.statusHeader}>
          {config.icon}
          <Text style={[styles.statusTitle, { color: config.color }]}>
            {config.text}
          </Text>
        </View>
        <Text style={styles.statusDescription}>
          {VerificationService.getStatusMessage(verificationStatus)}
        </Text>
        {verificationStatus !== 'verified' && (
          <Text style={styles.actionHint}>Tap to verify</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[
        styles.badge,
        { backgroundColor: config.backgroundColor, borderColor: config.borderColor },
        style
      ]}
      onPress={handlePress}
    >
      {config.icon}
      <Text style={[styles.badgeText, { color: config.color }]}>
        {config.text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  loadingBadge: {
    backgroundColor: '#F2F2F7',
    borderColor: '#8E8E93',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  fullStatusContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  actionHint: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
});