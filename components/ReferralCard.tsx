import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { referralService, ReferralStats } from '../lib/referral-service';
import { supabase } from '../lib/supabase';

interface ReferralCardProps {
  userId?: string;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({ userId }) => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);
  const [isExpanded, setIsExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!currentUserId) {
      getCurrentUser();
    } else {
      loadReferralStats();
    }
  }, [currentUserId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      setLoading(false);
    }
  };

  const loadReferralStats = async () => {
    if (!currentUserId) return;
    
    try {
      setLoading(true);
      console.log('Loading referral stats for user:', currentUserId);
      const referralStats = await referralService.getReferralStats(currentUserId);
      console.log('Referral stats loaded:', referralStats);
      setStats(referralStats);
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = async () => {
    if (!stats?.referralCode) return;
    
    try {
      await Clipboard.setStringAsync(stats.referralCode);
      Alert.alert('Copied!', 'Referral code copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy referral code');
    }
  };

  const shareReferralLink = async () => {
    if (!stats?.referralCode) return;
    
    try {
      const referralLink = referralService.generateReferralLink(stats.referralCode);
      const message = `Join me on BetaMe and earn credits! Use my referral code: ${stats.referralCode}\n\n${referralLink}`;
      
      await Share.share({
        message,
        title: 'Join BetaMe with my referral code',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share referral link');
    }
  };

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.timing(animatedHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading referral info...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>Unable to load referral information</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadReferralStats}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Ionicons name="people-outline" size={20} color="#007AFF" />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Referral Program</Text>
            {!isExpanded && (
              <Text style={styles.collapsedStats}>
                {stats.totalReferrals} referrals • {stats.totalCreditsEarned} credits earned
              </Text>
            )}
          </View>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={18} 
          color="#007AFF" 
        />
      </TouchableOpacity>

      <Animated.View 
        style={[
          styles.expandableContent,
          {
            maxHeight: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000], // Adjust this value based on content height
            }),
            opacity: animatedHeight,
          }
        ]}
      >
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalReferrals}</Text>
            <Text style={styles.statLabel}>Total Referrals</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalCreditsEarned}</Text>
            <Text style={styles.statLabel}>Credits Earned</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.pendingReferrals}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{stats.referralCode}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={copyReferralCode}>
              <Ionicons name="copy-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rewardInfo}>
          <Text style={styles.rewardTitle}>How it works:</Text>
          <View style={styles.rewardItem}>
            <Ionicons name="person-add-outline" size={16} color="#34C759" />
            <Text style={styles.rewardText}>Friend signs up: +15 credits</Text>
          </View>
          <View style={styles.rewardItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
            <Text style={styles.rewardText}>Friend completes first job: +25 credits</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={shareReferralLink}>
          <Ionicons name="share-outline" size={20} color="white" />
          <Text style={styles.shareButtonText}>Share Referral Link</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 0,
    margin: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleContainer: {
    marginLeft: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'left',
  },
  collapsedStats: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  expandableContent: {
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  codeContainer: {
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  codeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 8,
  },
  rewardInfo: {
    marginBottom: 16,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rewardText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  shareButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 6,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});