import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { EscrowService, JobStatus } from '@/lib/escrow-service';
import { useFocusEffect } from '@react-navigation/native';

export default function OrdersScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [orders, setOrders] = useState<JobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<JobStatus | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAcknowledgmentModal, setShowAcknowledgmentModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [scheduledStartDate, setScheduledStartDate] = useState('');
  const [filter, setFilter] = useState<'all' | 'buying' | 'selling'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  const fetchOrders = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch both buyer and seller orders
      const [buyerOrders, sellerOrders] = await Promise.all([
        EscrowService.getBuyerJobs(user.id),
        EscrowService.getSellerJobs(user.id)
      ]);

      // Add perspective flag to each order
      const buyerOrdersWithPerspective = buyerOrders.map(order => ({
        ...order,
        perspective: 'buyer' as const
      }));

      const sellerOrdersWithPerspective = sellerOrders.map(order => ({
        ...order,
        perspective: 'seller' as const
      }));

      // Combine and sort by creation date
      const allOrders = [...buyerOrdersWithPerspective, ...sellerOrdersWithPerspective]
        .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

      setOrders(allOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleStartWork = async (order: JobStatus) => {
    if (!order.id) return;

    try {
      const result = await EscrowService.startWork(order.id, user!.id);
      if (result.success) {
        Alert.alert('Success', 'Work started! The buyer has been notified.');
        fetchOrders();
      } else {
        Alert.alert('Error', result.error || 'Failed to start work');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start work');
    }
  };

  const handleCompleteWork = async () => {
    if (!selectedOrder?.id) return;

    try {
      const result = await EscrowService.completeWork(
        selectedOrder.id, 
        user!.id, 
        completionNotes
      );
      
      if (result.success) {
        Alert.alert(
          'Work Completed!', 
          'The buyer has been notified and will review your work. Payment will be released upon their confirmation.'
        );
        setShowCompletionModal(false);
        setCompletionNotes('');
        setSelectedOrder(null);
        fetchOrders();
      } else {
        Alert.alert('Error', result.error || 'Failed to complete work');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete work');
    }
  };

  const handleConfirmCompletion = async () => {
    if (!selectedOrder?.id) return;

    try {
      const result = await EscrowService.confirmCompletionAndReleasePayment(
        selectedOrder.id,
        user!.id,
        rating,
        feedback
      );
      
      if (result.success) {
        Alert.alert(
          'Payment Released!', 
          'The seller has been paid and the job is now complete. Thank you for your business!'
        );
        setShowReviewModal(false);
        setFeedback('');
        setRating(5);
        setSelectedOrder(null);
        fetchOrders();
      } else {
        Alert.alert('Error', result.error || 'Failed to release payment');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to release payment');
    }
  };

  const handleAcknowledgeOffer = async (startNow: boolean) => {
    if (!selectedOrder?.id) return;

    try {
      const result = await EscrowService.acknowledgeOfferAcceptance(
        selectedOrder.id,
        user!.id,
        startNow,
        startNow ? undefined : scheduledStartDate
      );
      
      if (result.success) {
        Alert.alert(
          'Order Acknowledged!', 
          startNow 
            ? 'You have started working on this order. The buyer has been notified.'
            : `You have scheduled to start this order on ${new Date(scheduledStartDate).toLocaleDateString()}. The buyer has been notified.`
        );
        setShowAcknowledgmentModal(false);
        setScheduledStartDate('');
        setSelectedOrder(null);
        fetchOrders();
      } else {
        Alert.alert('Error', result.error || 'Failed to acknowledge order');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to acknowledge order');
    }
  };

  const handleStartScheduledWork = async (order: JobStatus) => {
    if (!order.id) return;

    try {
      const result = await EscrowService.startScheduledWork(order.id, user!.id);
      if (result.success) {
        Alert.alert('Success', 'Scheduled work started! The buyer has been notified.');
        fetchOrders();
      } else {
        Alert.alert('Error', result.error || 'Failed to start scheduled work');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start scheduled work');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payment_received': return '#FFA500';
      case 'acknowledgment_pending': return '#FF6B35';
      case 'work_in_progress': return '#007AFF';
      case 'work_completed': return '#32CD32';
      case 'buyer_reviewing': return '#9932CC';
      case 'completed': return '#228B22';
      case 'disputed': return '#DC143C';
      case 'cancelled': return '#808080';
      default: return '#666';
    }
  };

  const getStatusText = (status: string, perspective: 'buyer' | 'seller') => {
    switch (status) {
      case 'payment_received': 
        return perspective === 'buyer' ? 'Payment Sent' : 'Payment Received';
      case 'acknowledgment_pending':
        return perspective === 'buyer' ? 'Waiting for seller' : 'Acceptance Acknowledged';
      case 'work_in_progress': 
        return perspective === 'buyer' ? 'Work in Progress' : 'Working';
      case 'work_completed': 
        return perspective === 'buyer' ? 'Work Completed' : 'Work Submitted';
      case 'buyer_reviewing': 
        return perspective === 'buyer' ? 'Review & Confirm' : 'Under Review';
      case 'completed': 
        return 'Completed';
      case 'disputed': 
        return 'Disputed';
      case 'cancelled': 
        return 'Cancelled';
      default: 
        return status;
    }
  };

  const getActionButton = (order: JobStatus & { perspective: 'buyer' | 'seller' }) => {
    const escrowTransaction = (order as any).escrow_transactions;
    
    if (order.perspective === 'seller') {
      // Seller perspective actions
      switch (order.current_status) {
        case 'acknowledgment_pending':
          return (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF6B35' }]}
              onPress={() => {
                setSelectedOrder(order);
                setShowAcknowledgmentModal(true);
              }}
            >
              <Text style={styles.actionButtonText}>Acceptance Acknowledged</Text>
            </TouchableOpacity>
          );
        
        case 'payment_received':
          return (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#007AFF' }]}
              onPress={() => handleStartWork(order)}
            >
              <Text style={styles.actionButtonText}>Start Work</Text>
            </TouchableOpacity>
          );
        
        case 'work_in_progress':
          return (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#32CD32' }]}
              onPress={() => {
                setSelectedOrder(order);
                setShowCompletionModal(true);
              }}
            >
              <Text style={styles.actionButtonText}>Mark Complete</Text>
            </TouchableOpacity>
          );
        
        case 'work_completed':
        case 'buyer_reviewing':
          return (
            <View style={[styles.actionButton, { backgroundColor: '#9932CC' }]}>
              <Text style={styles.actionButtonText}>Awaiting Review</Text>
            </View>
          );
        
        case 'completed':
          return (
            <View style={[styles.actionButton, { backgroundColor: '#228B22' }]}>
              <Text style={styles.actionButtonText}>
                Earned: {escrowTransaction?.amount || 0} credits
              </Text>
            </View>
          );
        
        default:
          return null;
      }
    } else {
      // Buyer perspective actions
      switch (order.current_status) {
        case 'acknowledgment_pending':
          return (
            <View style={[styles.actionButton, { backgroundColor: '#FF6B35' }]}>
              <Text style={styles.actionButtonText}>Waiting for seller acknowledgment</Text>
            </View>
          );
        
        case 'payment_received':
          return (
            <View style={[styles.actionButton, { backgroundColor: '#FFA500' }]}>
              <Text style={styles.actionButtonText}>Waiting for seller</Text>
            </View>
          );
        
        case 'work_in_progress':
          return (
            <View style={[styles.actionButton, { backgroundColor: '#007AFF' }]}>
              <Text style={styles.actionButtonText}>Seller is working</Text>
            </View>
          );
        
        case 'work_completed':
        case 'buyer_reviewing':
          return (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#32CD32' }]}
              onPress={() => {
                setSelectedOrder(order);
                setShowReviewModal(true);
              }}
            >
              <Text style={styles.actionButtonText}>Review & Release Payment</Text>
            </TouchableOpacity>
          );
        
        case 'completed':
          return (
            <View style={[styles.actionButton, { backgroundColor: '#228B22' }]}>
              <Text style={styles.actionButtonText}>
                Paid: {escrowTransaction?.amount || 0} credits
              </Text>
            </View>
          );
        
        default:
          return null;
      }
    }
  };

  const filteredOrders = orders.filter(order => {
    // Filter by perspective (buying/selling)
    if (filter === 'buying' && (order as any).perspective !== 'buyer') return false;
    if (filter === 'selling' && (order as any).perspective !== 'seller') return false;
    
    // Filter by status
    if (statusFilter === 'active') {
      return ['acknowledgment_pending', 'payment_received', 'work_in_progress', 'work_completed', 'buyer_reviewing'].includes(order.current_status);
    }
    if (statusFilter === 'completed') {
      return order.current_status === 'completed';
    }
    
    return true;
  });

  const getOrderCounts = () => {
    const buying = orders.filter(o => (o as any).perspective === 'buyer').length;
    const selling = orders.filter(o => (o as any).perspective === 'seller').length;
    const active = orders.filter(o => 
      ['acknowledgment_pending', 'payment_received', 'work_in_progress', 'work_completed', 'buyer_reviewing'].includes(o.current_status)
    ).length;
    const completed = orders.filter(o => o.current_status === 'completed').length;
    
    return { buying, selling, active, completed };
  };

  const getDaysRemaining = (autoReleaseDate: string): number => {
    const now = new Date();
    const releaseDate = new Date(autoReleaseDate);
    const diffTime = releaseDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getJobDuration = (startDate: string, endDate?: string): string => {
    const start = new Date(startDate);
    const now = new Date();
    // If start is in the future, no elapsed time yet
    if (start.getTime() > now.getTime()) return '0m';
    const end = endDate ? new Date(endDate) : now;
    const diffTime = Math.max(0, end.getTime() - start.getTime());
    const totalMinutes = Math.floor(diffTime / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d${hours > 0 ? ` ${hours}h` : ''}`;
    if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    return `${minutes}m`;
  };

  const getDaysSinceCreation = (createdDate: string): number => {
    const created = new Date(createdDate);
    const now = new Date();
    // Compare by calendar days to avoid timezone rounding issues
    const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = nowDay.getTime() - createdDay.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  };

  const getCountdownToJob = (jobDate: string): string => {
    const now = new Date();
    const job = new Date(jobDate);
    const diffTime = job.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays < 0) {
      return 'Job completed';
    } else if (diffDays === 0) {
      if (diffHours <= 0) {
        return 'Job is today!';
      } else {
        return `${diffHours}h until job`;
      }
    } else if (diffDays === 1) {
      return 'Job tomorrow!';
    } else {
      return `${diffDays} days until job`;
    }
  };

  const getCountdownColor = (jobDate: string): string => {
    const now = new Date();
    const job = new Date(jobDate);
    const diffTime = job.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return '#32CD32'; // Green for completed
    } else if (diffDays === 0) {
      return '#FF6B35'; // Orange for today
    } else if (diffDays <= 3) {
      return '#FFA500'; // Orange for soon
    } else {
      return '#007AFF'; // Blue for future
    }
  };

  const getCountdownIcon = (jobDate: string): "checkmark-circle-outline" | "time-outline" | "calendar-outline" | "flash-outline" => {
    const now = new Date();
    const job = new Date(jobDate);
    const diffTime = job.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return "checkmark-circle-outline";
    } else if (diffDays === 0) {
      return "time-outline";
    } else if (diffDays <= 3) {
      return "flash-outline";
    } else {
      return "calendar-outline";
    }
  };

  const getJobStatusColor = (jobDate: string): string => {
    const now = new Date();
    const job = new Date(jobDate);
    const diffTime = job.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return '#32CD32'; // Green for completed
    } else if (diffDays === 0) {
      return '#FF6B35'; // Orange for today
    } else if (diffDays <= 3) {
      return '#FFA500'; // Orange for soon
    } else {
      return '#007AFF'; // Blue for future
    }
  };

  const getJobStatusIcon = (jobDate: string): "checkmark-circle-outline" | "time-outline" | "calendar-outline" | "flash-outline" => {
    const now = new Date();
    const job = new Date(jobDate);
    const diffTime = job.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return "checkmark-circle-outline";
    } else if (diffDays === 0) {
      return "time-outline";
    } else if (diffDays <= 3) {
      return "flash-outline";
    } else {
      return "calendar-outline";
    }
  };

  const getProgressPercentage = (startDate: string): number => {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = now.getTime() - start.getTime();
    const totalDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const elapsedTime = Math.min(diffTime, totalDuration); // Ensure elapsedTime doesn't exceed totalDuration
    return Math.round((elapsedTime / totalDuration) * 100);
  };

  const counts = getOrderCounts();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text.primary }]}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Orders</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Track your service orders</Text>
        </View>
        <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.background.secondary }]} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { 
        backgroundColor: colors.background.secondary,
        borderWidth: 1,
        borderColor: colors.border.light,
      }]}> 
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => {
            setFilter('buying');
            setStatusFilter('all');
          }}
          accessibilityRole="button"
          accessibilityLabel="Filter Buying"
        >
          <Text style={[styles.statNumber, { color: colors.primary.main }]}>{counts.buying}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Buying</Text>
        </TouchableOpacity>
        <View style={[styles.statDivider, { backgroundColor: colors.border.light }]} />
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => {
            setFilter('selling');
            setStatusFilter('all');
          }}
          accessibilityRole="button"
          accessibilityLabel="Filter Selling"
        >
          <Text style={[styles.statNumber, { color: colors.primary.main }]}>{counts.selling}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Selling</Text>
        </TouchableOpacity>
        <View style={[styles.statDivider, { backgroundColor: colors.border.light }]} />
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => {
            setStatusFilter('active');
          }}
          accessibilityRole="button"
          accessibilityLabel="Filter Active Status"
        >
          <Text style={[styles.statNumber, { color: colors.primary.main }]}>{counts.active}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Active</Text>
        </TouchableOpacity>
        <View style={[styles.statDivider, { backgroundColor: colors.border.light }]} />
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => {
            setStatusFilter('completed');
          }}
          accessibilityRole="button"
          accessibilityLabel="Filter Completed Status"
        >
          <Text style={[styles.statNumber, { color: colors.primary.main }]}>{counts.completed}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary, fontSize: 12 }]}>Completed</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Button */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterTab, 
              styles.activeFilterTab,
              { backgroundColor: colors.background.secondary }
            ]}
            onPress={() => {
              setFilter('all');
              setStatusFilter('all');
            }}
            accessibilityRole="button"
            accessibilityLabel="Show All Status"
          >
            <Text numberOfLines={1} ellipsizeMode="tail" style={[
              styles.filterText, 
              { color: colors.text.secondary }
            ]}>
              All Status
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.background.secondary }]}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary.light + '20' }]}>
              <Ionicons name="receipt-outline" size={48} color={colors.primary.main} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {filter === 'buying' ? 'No purchases yet' : 
               filter === 'selling' ? 'No sales yet' : 
               'No orders yet'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
              Your service orders will appear here
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const escrowTransaction = (order as any).escrow_transactions;
            const perspective = (order as any).perspective;
            
            return (
              <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.background.secondary }]}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderTitleContainer}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.orderTitle, { color: colors.text.primary }]} numberOfLines={2}>
                        {escrowTransaction?.service_title}
                      </Text>
                      <View style={[styles.perspectiveBadge, { backgroundColor: colors.primary.light + '20' }]}>
                        <Text style={[styles.perspectiveText, { color: colors.primary.main }]}>
                          {perspective === 'buyer' ? 'BUYING' : 'SELLING'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.current_status) }]}>
                        <Text style={styles.statusText}>
                          {getStatusText(order.current_status, perspective)}
                        </Text>
                      </View>
                      {escrowTransaction?.work_start_date && (
                        <View style={[styles.jobStatusIndicator, { backgroundColor: getJobStatusColor(escrowTransaction.work_start_date) }]}>
                          <Ionicons 
                            name={getJobStatusIcon(escrowTransaction.work_start_date)} 
                            size={12} 
                            color="#fff" 
                          />
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.orderAmountContainer}>
                    <Text style={[styles.orderAmount, { color: colors.primary.main }]}>
                      {escrowTransaction?.amount} credits
                    </Text>
                    {perspective === 'buyer' && escrowTransaction?.platform_fee > 0 && (
                      <Text style={[styles.platformFee, { color: colors.text.secondary }]}>
                        +{escrowTransaction.platform_fee} fee
                      </Text>
                    )}
                  </View>
                </View>

                {escrowTransaction?.service_description && (
                  <Text style={[styles.orderDescription, { color: colors.text.secondary }]} numberOfLines={2}>
                    {escrowTransaction.service_description}
                  </Text>
                )}

                <View style={styles.orderDetails}>
                  <View style={[styles.detailsSection, { borderBottomWidth: 1, borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.detailsSectionTitle, { color: colors.text.primary }]}>Timeline</Text>
                    
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
                      <Text style={[styles.detailText, { color: colors.text.secondary }]}>
                        Created: {new Date(order.created_at!).toLocaleDateString()} at {new Date(order.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    
                    {order.work_started_at && (
                      <View style={styles.detailRow}>
                        <Ionicons name="play-outline" size={16} color={colors.text.secondary} />
                        <Text style={[styles.detailText, { color: colors.text.secondary }]}>
                          Started: {new Date(order.work_started_at).toLocaleDateString()} at {new Date(order.work_started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    )}
                    
                    {order.work_completed_at && (
                      <View style={styles.detailRow}>
                        <Ionicons name="checkmark-outline" size={16} color="#32CD32" />
                        <Text style={[styles.detailText, { color: '#32CD32' }]}>
                          Completed: {new Date(order.work_completed_at).toLocaleDateString()} at {new Date(order.work_completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    )}

                    {order.auto_release_date && order.current_status === 'buyer_reviewing' && (
                      <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color="#FFA500" />
                        <Text style={[styles.detailText, { color: '#FFA500' }]}>
                          Auto-release: {new Date(order.auto_release_date).toLocaleDateString()} ({getDaysRemaining(order.auto_release_date)} days left)
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={[styles.detailsSectionTitle, { color: colors.text.primary }]}>Job Info</Text>
                    
                    {/* Job Date and Countdown */}
                    {escrowTransaction?.work_start_date && (
                      <View style={styles.detailRow}>
                        <View style={[styles.jobDateIcon, { backgroundColor: colors.primary.light + '20' }]}>
                          <Ionicons name="calendar" size={16} color={colors.primary.main} />
                        </View>
                        <View style={styles.jobDateContainer}>
                          <Text style={[styles.detailText, { color: colors.text.primary, fontWeight: '600' }]}>
                            Job Date: {new Date(escrowTransaction.work_start_date).toLocaleDateString()}
                          </Text>
                          <View style={styles.countdownContainer}>
                            <View style={[styles.countdownBadge, { backgroundColor: getCountdownColor(escrowTransaction.work_start_date) + '20' }]}>
                              <Ionicons 
                                name={getCountdownIcon(escrowTransaction.work_start_date)} 
                                size={12} 
                                color={getCountdownColor(escrowTransaction.work_start_date)} 
                              />
                              <Text style={[styles.countdownText, { color: getCountdownColor(escrowTransaction.work_start_date) }]}>
                                {getCountdownToJob(escrowTransaction.work_start_date)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Job Duration */}
                    {order.work_started_at && (
                      <View style={styles.detailRow}>
                        <View style={[styles.jobDateIcon, { backgroundColor: colors.primary.light + '20' }]}>
                          <Ionicons name="timer-outline" size={16} color={colors.text.secondary} />
                        </View>
                        <View style={styles.jobProgressContainer}>
                          <Text style={[styles.detailText, { color: colors.text.secondary }]}>
                            Duration: {getJobDuration(order.work_started_at, order.work_completed_at)}
                          </Text>
                          {!order.work_completed_at && (
                            <View style={styles.progressIndicator}>
                              <View style={[styles.progressBar, { backgroundColor: colors.primary.light }]}>
                                <View style={[styles.progressFill, { backgroundColor: colors.primary.main, width: getProgressPercentage(order.work_started_at) + '%' as any }]} />
                              </View>
                              <Text style={[styles.progressText, { color: colors.primary.main }]}>
                                {getProgressPercentage(order.work_started_at)}% complete
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Days since creation */}
                    <View style={styles.detailRow}>
                      <View style={[styles.jobDateIcon, { backgroundColor: colors.primary.light + '20' }]}>
                        <Ionicons name="calendar-clear-outline" size={16} color={colors.text.secondary} />
                      </View>
                      <Text style={[styles.detailText, { color: colors.text.secondary }]}>
                        {getDaysSinceCreation(order.created_at!)} days since creation
                      </Text>
                    </View>
                  </View>
                </View>

                {getActionButton(order as JobStatus & { perspective: 'buyer' | 'seller' })}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Completion Modal (Seller) */}
      <Modal
        visible={showCompletionModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background.primary }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.background.secondary, borderBottomColor: colors.border.main }]}>
            <TouchableOpacity onPress={() => setShowCompletionModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Mark Work Complete</Text>
            <TouchableOpacity onPress={handleCompleteWork}>
              <Text style={[styles.modalDone, { color: colors.primary.main }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.modalLabel, { color: colors.text.primary }]}>Completion Notes (Optional)</Text>
            <TextInput
              style={[styles.notesInput, { 
                backgroundColor: colors.background.secondary, 
                borderColor: colors.border.main,
                color: colors.text.primary 
              }]}
              placeholder="Describe what you've completed, any deliverables, or additional notes for the buyer..."
              placeholderTextColor={colors.text.secondary}
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            
            <View style={[styles.modalInfo, { backgroundColor: colors.background.secondary }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary.main} />
              <Text style={[styles.modalInfoText, { color: colors.primary.main }]}>
                The buyer will be notified and can review your work. Payment will be released upon their confirmation.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Review Modal (Buyer) */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background.primary }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.background.secondary, borderBottomColor: colors.border.main }]}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Confirm & Release Payment</Text>
            <TouchableOpacity onPress={handleConfirmCompletion}>
              <Text style={[styles.modalDone, { color: colors.primary.main }]}>Release</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {selectedOrder && (
              <>
                <View style={[styles.orderSummary, { backgroundColor: colors.background.secondary }]}>
                  <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>Order Summary</Text>
                  <Text style={[styles.summaryService, { color: colors.text.primary }]}>
                    {((selectedOrder as any).escrow_transactions)?.service_title}
                  </Text>
                  <Text style={[styles.summaryAmount, { color: colors.primary.main }]}>
                    {((selectedOrder as any).escrow_transactions)?.amount} credits will be released to the seller
                  </Text>
                </View>

                <View style={styles.ratingSection}>
                  <Text style={[styles.modalLabel, { color: colors.text.primary }]}>Rate this service</Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                      >
                        <Ionicons
                          name={star <= rating ? "star" : "star-outline"}
                          size={32}
                          color={star <= rating ? "#FFD700" : colors.text.secondary}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.feedbackSection}>
                  <Text style={[styles.modalLabel, { color: colors.text.primary }]}>Feedback (Optional)</Text>
                  <TextInput
                    style={[styles.feedbackInput, { 
                      backgroundColor: colors.background.secondary, 
                      borderColor: colors.border.main,
                      color: colors.text.primary 
                    }]}
                    placeholder="Share your experience with this service..."
                    placeholderTextColor={colors.text.secondary}
                    value={feedback}
                    onChangeText={setFeedback}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={[styles.modalWarning, { backgroundColor: '#fff3cd', borderLeftColor: '#FFA500' }]}>
                  <Ionicons name="warning-outline" size={20} color="#856404" />
                  <Text style={[styles.modalWarningText, { color: '#856404' }]}>
                    Once you confirm, the payment will be released to the seller and cannot be reversed.
                  </Text>
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Acknowledgment Modal (Seller) */}
      <Modal
        visible={showAcknowledgmentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background.primary }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.background.secondary, borderBottomColor: colors.border.main }]}>
            <TouchableOpacity onPress={() => setShowAcknowledgmentModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Acknowledge Order</Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.modalContent}>
            {selectedOrder && (
              <>
                <View style={[styles.orderSummary, { backgroundColor: colors.background.secondary }]}>
                  <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>Order Details</Text>
                  <Text style={[styles.summaryService, { color: colors.text.primary }]}>
                    {((selectedOrder as any).escrow_transactions)?.service_title}
                  </Text>
                  <Text style={[styles.summaryAmount, { color: colors.primary.main }]}>
                    {((selectedOrder as any).escrow_transactions)?.amount} credits
                  </Text>
                </View>

                <View style={styles.acknowledgmentSection}>
                  <Text style={[styles.modalLabel, { color: colors.text.primary }]}>When would you like to start?</Text>
                  
                  <TouchableOpacity
                    style={[styles.acknowledgmentButton, { backgroundColor: colors.primary.main }]}
                    onPress={() => handleAcknowledgeOffer(true)}
                  >
                    <Ionicons name="play" size={20} color="#fff" />
                    <Text style={styles.acknowledgmentButtonText}>Start Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.acknowledgmentButton, { backgroundColor: colors.background.secondary, borderColor: colors.border.main }]}
                    onPress={() => {
                      // Show date picker or schedule modal
                      Alert.prompt(
                        'Schedule Start Date',
                        'Enter the date you want to start (YYYY-MM-DD):',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Schedule', 
                            onPress: (date) => {
                              if (date) {
                                setScheduledStartDate(date);
                                handleAcknowledgeOffer(false);
                              }
                            }
                          }
                        ],
                        'plain-text',
                        new Date().toISOString().split('T')[0]
                      );
                    }}
                  >
                    <Ionicons name="calendar" size={20} color={colors.text.primary} />
                    <Text style={[styles.acknowledgmentButtonText, { color: colors.text.primary }]}>Schedule Later</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.modalInfo, { backgroundColor: colors.background.secondary }]}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary.main} />
                  <Text style={[styles.modalInfoText, { color: colors.primary.main }]}>
                    Acknowledging this order will notify the buyer and begin the work process.
                  </Text>
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    opacity: 0.8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 8,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeFilterTab: {
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  activeFilterText: {
    fontWeight: '700',
  },
  ordersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    borderRadius: 16,
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 32,
  },
  orderCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
    gap: 12,
  },
  orderTitleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 8,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  perspectiveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    minWidth: 60,
    alignItems: 'center',
  },
  perspectiveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  jobStatusIndicator: {
    padding: 3,
    borderRadius: 6,
  },
  orderAmountContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  platformFee: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  orderDescription: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
    opacity: 0.8,
  },
  orderDetails: {
    marginBottom: 4,
  },
  detailsSection: {
    paddingBottom: 8,
    marginBottom: 8,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 2,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  notesInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
  },
  modalInfoText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  orderSummary: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryService: {
    fontSize: 15,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  ratingSection: {
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  feedbackSection: {
    marginBottom: 20,
  },
  feedbackInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
  },
  modalWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  modalWarningText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  acknowledgmentSection: {
    marginBottom: 20,
  },
  acknowledgmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  acknowledgmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: '#fff',
  },
  jobDateIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  jobDateContainer: {
    flex: 1,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  jobProgressContainer: {
    flex: 1,
  },
  progressIndicator: {
    marginTop: 6,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
});