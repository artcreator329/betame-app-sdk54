import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { referralService, ReferralStats, Referral } from '@/lib/referral-service';
import { supabase } from '@/lib/supabase';

interface ReferralModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
}

interface ReferralWithUser extends Referral {
  referred_user?: {
    full_name: string;
    avatar_url?: string;
  };
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  visible,
  onClose,
  userId,
}) => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  useEffect(() => {
    if (visible) {
      if (!currentUserId) {
        getCurrentUser();
      } else {
        loadReferralData();
      }
    }
  }, [visible, currentUserId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadReferralData = async () => {
    if (!currentUserId) return;
    
    try {
      setLoading(true);
      
      // Load stats and referrals in parallel
      const [referralStats, userReferrals] = await Promise.all([
        referralService.getReferralStats(currentUserId),
        referralService.getUserReferrals(currentUserId)
      ]);
      
      setStats(referralStats);
      setReferrals(userReferrals as ReferralWithUser[]);
    } catch (error) {
      console.error('Error loading referral data:', error);
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
      const message = `Join me on BetaMe and earn extra income by listing your service.\n\n${referralLink}`;
      
      await Share.share({
        message,
        title: 'Join BetaMe and earn extra income',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share referral link');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'signup_completed':
        return '#007AFF';
      case 'first_job_completed':
      case 'completed':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'signup_completed':
        return 'Signed Up';
      case 'first_job_completed':
        return 'First Job Done';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* Compact Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroContent}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="gift" size={32} color="white" />
          </View>
          <Text style={styles.heroTitle}>Earn Rewards!</Text>
          <Text style={styles.heroSubtitle}>Invite friends and earn BetaCoins + Cash</Text>
        </View>
      </View>

      {/* Compact Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#FF6B6B' }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={20} color="white" />
            </View>
            <Text style={styles.statNumber}>{stats?.totalReferrals || 0}</Text>
            <Text style={styles.statLabel}>Referrals</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#4ECDC4' }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="diamond" size={20} color="white" />
            </View>
            <Text style={styles.statNumber}>{stats?.totalBetaCoinsEarned || 0}</Text>
            <Text style={styles.statLabel}>BetaCoins</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#45B7D1' }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cash" size={20} color="white" />
            </View>
            <Text style={styles.statNumber}>RM{((stats?.totalCashEarned || 0) / 100).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Cash</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#96CEB4' }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time" size={20} color="white" />
            </View>
            <Text style={styles.statNumber}>{stats?.pendingReferrals || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Compact Code Section */}
      <View style={styles.codeSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="qr-code" size={20} color="#FF6B6B" />
          <Text style={styles.sectionTitle}>Your Referral Code</Text>
        </View>
        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>{stats?.referralCode || 'Loading...'}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={copyReferralCode}>
            <Ionicons name="copy" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Compact How it Works Section */}
      <View style={styles.howItWorksSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="star" size={20} color="#FFD93D" />
          <Text style={styles.sectionTitle}>How it works</Text>
        </View>
        <View style={styles.rewardCard}>
          <View style={styles.rewardItem}>
            <View style={[styles.rewardIconContainer, { backgroundColor: '#4ECDC4' }]}>
              <Ionicons name="person-add" size={16} color="white" />
            </View>
            <View style={styles.rewardTextContainer}>
              <Text style={styles.rewardTitle}>Friend signs up</Text>
              <Text style={styles.rewardAmount}>+15 BetaCoins</Text>
            </View>
          </View>
          <View style={styles.rewardDivider} />
          <View style={styles.rewardItem}>
            <View style={[styles.rewardIconContainer, { backgroundColor: '#FF6B6B' }]}>
              <Ionicons name="checkmark-circle" size={16} color="white" />
            </View>
            <View style={styles.rewardTextContainer}>
              <Text style={styles.rewardTitle}>Friend completes first job</Text>
              <Text style={styles.rewardAmount}>+RM4.90</Text>
            </View>
          </View>
        </View>
        <View style={styles.totalRewardCard}>
          <Text style={styles.totalRewardText}>🎉 Total potential: 15 BetaCoins + RM4.90 per referral</Text>
        </View>
      </View>

      {/* Share Button */}
      <TouchableOpacity style={styles.shareButton} onPress={shareReferralLink}>
        <LinearGradient
          colors={['#FF6B6B', '#FF8E53']}
          style={styles.shareButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="share-social" size={20} color="white" />
          <Text style={styles.shareButtonText}>Share Referral Link</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderReferralItem = ({ item }: { item: ReferralWithUser }) => (
    <View style={styles.referralItem}>
      <View style={styles.referralHeader}>
        <View style={styles.userInfo}>
          {item.referred_user?.avatar_url ? (
            <Image
              source={{ uri: item.referred_user.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#8E8E93" />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {item.referred_user?.full_name || 'Anonymous User'}
            </Text>
            <Text style={styles.joinDate}>
              Joined {formatDate(item.created_at)}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.creditsInfo}>
        <View style={styles.creditItem}>
          <Ionicons name="person-add-outline" size={16} color="#34C759" />
          <Text style={styles.creditText}>
            Signup: +{item.signup_credits_awarded} credits
          </Text>
        </View>
        {item.first_job_credits_awarded > 0 && (
          <View style={styles.creditItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
            <Text style={styles.creditText}>
              First Job: +{item.first_job_credits_awarded} credits
            </Text>
          </View>
        )}
        <View style={styles.totalCredits}>
          <Text style={styles.totalCreditsText}>
            Total: {item.total_credits_earned} credits
          </Text>
        </View>
      </View>
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      {referrals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#8E8E93" />
          <Text style={styles.emptyTitle}>No Referrals Yet</Text>
          <Text style={styles.emptyText}>
            Share your referral code to start earning credits when friends join!
          </Text>
        </View>
      ) : (
        <FlatList
          data={referrals}
          renderItem={renderReferralItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Referral Program</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading referral data...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'overview' ? renderOverviewTab() : renderHistoryTab()}
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 30,
  },
  // Hero Section
  heroSection: {
    backgroundColor: '#FF6B6B',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#FF6B6B',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  statCard: {
    width: '23%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  statIconContainer: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '600',
  },
  codeSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  codeText: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
    letterSpacing: 1,
  },
  copyButton: {
    backgroundColor: '#FF6B6B',
    padding: 10,
    borderRadius: 6,
  },
  howItWorksSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  rewardCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rewardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rewardTextContainer: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  rewardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  rewardDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  totalRewardCard: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD93D',
  },
  totalRewardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    textAlign: 'center',
  },
  shareButton: {
    borderRadius: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    padding: 16,
  },
  referralItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  joinDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  creditsInfo: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  creditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  creditText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  totalCredits: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  totalCreditsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});