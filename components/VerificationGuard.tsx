import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react-native';
import { VerificationService } from '@/lib/verification-service';
import { useRouter } from 'expo-router';

interface VerificationGuardProps {
  action: 'place_order' | 'become_service_provider';
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
  showInlineMessage?: boolean;
}

export function VerificationGuard({ 
  action, 
  children, 
  fallbackComponent,
  showInlineMessage = true 
}: VerificationGuardProps) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
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
      
      if (action === 'place_order') {
        setIsVerified(status.canPlaceOrders);
      } else {
        setIsVerified(status.canBecomeServiceProvider);
      }
      
      setVerificationStatus(status.status);
    } catch (error) {
      console.error('Error checking verification status:', error);
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationPress = () => {
    router.push('/ekyc-verification');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Checking verification status...</Text>
      </View>
    );
  }

  if (isVerified) {
    return <>{children}</>;
  }

  if (fallbackComponent) {
    return <>{fallbackComponent}</>;
  }

  if (!showInlineMessage) {
    return null;
  }

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'verified':
        return <CheckCircle size={20} color="#34C759" />;
      case 'in_progress':
        return <Clock size={20} color="#FF9500" />;
      case 'rejected':
        return <AlertCircle size={20} color="#FF3B30" />;
      default:
        return <Shield size={20} color="#8E8E93" />;
    }
  };

  const getStatusMessage = () => {
    const actionText = action === 'place_order' ? 'place orders' : 'become a service provider';
    
    switch (verificationStatus) {
      case 'in_progress':
        return `Your verification is being processed. You'll be able to ${actionText} once approved.`;
      case 'rejected':
        return `Your verification was rejected. Please retry verification to ${actionText}.`;
      default:
        return `Complete eKYC verification to ${actionText} and ensure platform security.`;
    }
  };

  const getButtonText = () => {
    switch (verificationStatus) {
      case 'in_progress':
        return 'Check Status';
      case 'rejected':
        return 'Retry Verification';
      default:
        return 'Get Verified';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.messageContainer}>
        <View style={styles.iconContainer}>
          {getStatusIcon()}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Verification Required</Text>
          <Text style={styles.message}>{getStatusMessage()}</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.verifyButton}
        onPress={handleVerificationPress}
      >
        <Text style={styles.verifyButtonText}>{getButtonText()}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});