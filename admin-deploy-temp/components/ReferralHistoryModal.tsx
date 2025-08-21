import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { referralService, Referral } from '../lib/referral-service';
import { supabase } from '../lib/supabase';

interface ReferralHistoryModalProps {
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

export const ReferralHistoryModal: React.FC<ReferralHistoryModalProps> = ({
  visible,
  onClose,
  userId,
}) => {
  const [referrals, setReferrals] = useState<ReferralWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);

  useEffect(() => {
    if (visible) {
      if (!currentUserId) {
        getCurrentUser();
      } else {
        loadReferrals();
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

  const loadReferrals = async () => {
    if (!currentUserId) return;
    
    try {
      setLoading(true);
      const userReferrals = await referralService.getUserReferrals(currentUserId);
      setReferrals(userReferrals as ReferralWithUser[]);
    } catch (error) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoading(false);
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Referral History</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading referrals...</Text>
          </View>
        ) : referrals.length === 0 ? (
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