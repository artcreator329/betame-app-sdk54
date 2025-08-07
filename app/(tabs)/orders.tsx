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
  const [completionNotes, setCompletionNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payment_received': return '#FFA500';
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
      return ['payment_received', 'work_in_progress', 'work_completed', 'buyer_reviewing'].includes(order.current_status);
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
      ['payment_received', 'work_in_progress', 'work_completed', 'buyer_reviewing'].includes(o.current_status)
    ).length;
    const completed = orders.filter(o => o.current_status === 'completed').length;
    
    return { buying, selling, active, completed };
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
        <View>
          <Text style={[styles.title, { color: colors.text.primary }]}>Orders</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Track your service orders</Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.background.secondary }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.accent }]}>{counts.buying}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Buying</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.accent }]}>{counts.selling}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Selling</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.accent }]}>{counts.active}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.accent }]}>{counts.completed}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Completed</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterTab, 
              filter === 'all' && styles.activeFilterTab,
              { backgroundColor: filter === 'all' ? colors.accent : colors.background.secondary }
            ]}
            onPress={() => setFilter('all')}
          >
            <Text style={[
              styles.filterText, 
              filter === 'all' && styles.activeFilterText,
              { color: filter === 'all' ? '#fff' : colors.text.secondary }
            ]}>
              All ({orders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab, 
              filter === 'buying' && styles.activeFilterTab,
              { backgroundColor: filter === 'buying' ? colors.accent : colors.background.secondary }
            ]}
            onPress={() => setFilter('buying')}
          >
            <Text style={[
              styles.filterText, 
              filter === 'buying' && styles.activeFilterText,
              { color: filter === 'buying' ? '#fff' : colors.text.secondary }
            ]}>
              Buying ({counts.buying})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab, 
              filter === 'selling' && styles.activeFilterTab,
              { backgroundColor: filter === 'selling' ? colors.accent : colors.background.secondary }
            ]}
            onPress={() => setFilter('selling')}
          >
            <Text style={[
              styles.filterText, 
              filter === 'selling' && styles.activeFilterText,
              { color: filter === 'selling' ? '#fff' : colors.text.secondary }
            ]}>
              Selling ({counts.selling})
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterTab, 
              statusFilter === 'active' && styles.activeFilterTab,
              { backgroundColor: statusFilter === 'active' ? colors.accent : colors.background.secondary }
            ]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[
              styles.filterText, 
              statusFilter === 'active' && styles.activeFilterText,
              { color: statusFilter === 'active' ? '#fff' : colors.text.secondary }
            ]}>
              Active ({counts.active})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab, 
              statusFilter === 'completed' && styles.activeFilterTab,
              { backgroundColor: statusFilter === 'completed' ? colors.accent : colors.background.secondary }
            ]}
            onPress={() => setStatusFilter('completed')}
          >
            <Text style={[
              styles.filterText, 
              statusFilter === 'completed' && styles.activeFilterText,
              { color: statusFilter === 'completed' ? '#fff' : colors.text.secondary }
            ]}>
              Completed ({counts.completed})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab, 
              statusFilter === 'all' && styles.activeFilterTab,
              { backgroundColor: statusFilter === 'all' ? colors.accent : colors.background.secondary }
            ]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[
              styles.filterText, 
              statusFilter === 'all' && styles.activeFilterText,
              { color: statusFilter === 'all' ? '#fff' : colors.text.secondary }
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
            <Ionicons name="receipt-outline" size={64} color={colors.text.secondary} />
            <Text style={[styles.emptyText, { color: colors.text.primary }]}>
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
                      <Text style={[styles.orderTitle, { color: colors.text.primary }]}>
                        {escrowTransaction?.service_title}
                      </Text>
                      <View style={styles.perspectiveBadge}>
                        <Text style={styles.perspectiveText}>
                          {perspective === 'buyer' ? 'BUYING' : 'SELLING'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.current_status) }]}>
                      <Text style={styles.statusText}>
                        {getStatusText(order.current_status, perspective)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderAmountContainer}>
                    <Text style={[styles.orderAmount, { color: colors.accent }]}>
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
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
                    <Text style={[styles.detailText, { color: colors.text.secondary }]}>
                      Created: {new Date(order.created_at!).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  {order.work_started_at && (
                    <View style={styles.detailRow}>
                      <Ionicons name="play-outline" size={16} color={colors.text.secondary} />
                      <Text style={[styles.detailText, { color: colors.text.secondary }]}>
                        Started: {new Date(order.work_started_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  
                  {order.work_completed_at && (
                    <View style={styles.detailRow}>
                      <Ionicons name="checkmark-outline" size={16} color="#32CD32" />
                      <Text style={[styles.detailText, { color: '#32CD32' }]}>
                        Completed: {new Date(order.work_completed_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  {order.auto_release_date && order.current_status === 'buyer_reviewing' && (
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color="#FFA500" />
                      <Text style={[styles.detailText, { color: '#FFA500' }]}>
                        Auto-release: {new Date(order.auto_release_date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
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
          <View style={[styles.modalHeader, { backgroundColor: colors.background.secondary, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCompletionModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Mark Work Complete</Text>
            <TouchableOpacity onPress={handleCompleteWork}>
              <Text style={[styles.modalDone, { color: colors.accent }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.modalLabel, { color: colors.text.primary }]}>Completion Notes (Optional)</Text>
            <TextInput
              style={[styles.notesInput, { 
                backgroundColor: colors.background.secondary, 
                borderColor: colors.border,
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
              <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
              <Text style={[styles.modalInfoText, { color: colors.accent }]}>
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
          <View style={[styles.modalHeader, { backgroundColor: colors.background.secondary, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Confirm & Release Payment</Text>
            <TouchableOpacity onPress={handleConfirmCompletion}>
              <Text style={[styles.modalDone, { color: colors.accent }]}>Release</Text>
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
                  <Text style={[styles.summaryAmount, { color: colors.accent }]}>
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
                      borderColor: colors.border,
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  activeFilterTab: {
    // backgroundColor handled dynamically
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterText: {
    // color handled dynamically
  },
  ordersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    borderRadius: 12,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  perspectiveBadge: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  perspectiveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  orderAmountContainer: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  platformFee: {
    fontSize: 12,
    marginTop: 2,
  },
  orderDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    marginLeft: 6,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
});