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
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { EscrowService, JobStatus } from '@/lib/escrow-service';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import JobCompletionPhotoUpload from '@/components/JobCompletionPhotoUpload';
import { supabase } from '@/lib/supabase';

export default function OrdersScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<JobStatus | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAcknowledgmentModal, setShowAcknowledgmentModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [rating, setRating] = useState(5);
  const [scheduledStartDate, setScheduledStartDate] = useState('');
  const [completionPhotos, setCompletionPhotos] = useState<Array<{ photo_url: string; photo_description?: string }>>([]);
  const [filter, setFilter] = useState<'all' | 'buying' | 'selling'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [animationValues] = useState<{ [key: string]: Animated.Value }>({});
  const [expandAll, setExpandAll] = useState(false);
  const [reviewAction, setReviewAction] = useState<'confirm' | 'request-changes' | null>(null);

  // Initialize animation values for each order
  const initializeAnimation = (orderId: string) => {
    if (!animationValues[orderId]) {
      animationValues[orderId] = new Animated.Value(0);
    }
  };

  const toggleExpandAll = () => {
    const newExpandAll = !expandAll;
    setExpandAll(newExpandAll);
    
    if (newExpandAll) {
      // Expand all orders
      const allOrderIds = new Set(filteredOrders.map(order => order.id || ''));
      setExpandedOrders(allOrderIds);
      
      // Animate all expansions
      filteredOrders.forEach(order => {
        const orderId = order.id || '';
        initializeAnimation(orderId);
        Animated.timing(animationValues[orderId], {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    } else {
      // Collapse all orders
      setExpandedOrders(new Set());
      
      // Animate all collapses
      filteredOrders.forEach(order => {
        const orderId = order.id || '';
        initializeAnimation(orderId);
        Animated.timing(animationValues[orderId], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpandedOrders = new Set(expandedOrders);
    const isExpanded = newExpandedOrders.has(orderId);
    
    if (isExpanded) {
      newExpandedOrders.delete(orderId);
      // Animate collapse
      Animated.timing(animationValues[orderId], {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      newExpandedOrders.add(orderId);
      // Animate expand
      Animated.timing(animationValues[orderId], {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
    
    setExpandedOrders(newExpandedOrders);
  };

  const fetchOrders = async () => {
    if (!user?.id) return;
    
    try {
      // Import ActiveJobService dynamically
      const { ActiveJobService } = await import('@/lib/active-job-service');
      
      // Fetch both escrow-based and direct orders
      const [buyerEscrowOrders, sellerEscrowOrders, activeJobs] = await Promise.all([
        EscrowService.getBuyerJobs(user.id),
        EscrowService.getSellerJobs(user.id),
        ActiveJobService.getUserActiveJobs(user.id)
      ]);

      console.log('🔍 Orders Debug:', {
        userId: user.id,
        buyerEscrowOrders: buyerEscrowOrders.length,
        sellerEscrowOrders: sellerEscrowOrders.length,
        activeJobsBuyer: activeJobs.asBuyer.length,
        activeJobsSeller: activeJobs.asServiceProvider.length,
        buyerEscrowDetails: buyerEscrowOrders.map(o => ({ id: o.id, status: o.current_status })),
        sellerEscrowDetails: sellerEscrowOrders.map(o => ({ id: o.id, status: o.current_status })),
        activeJobsBuyerDetails: activeJobs.asBuyer.map(j => ({ id: j.id, status: j.status })),
        activeJobsSellerDetails: activeJobs.asServiceProvider.map(j => ({ id: j.id, status: j.status }))
      });

      // Add perspective flag to escrow orders
      const buyerEscrowOrdersWithPerspective = buyerEscrowOrders.map(order => ({
        ...order,
        perspective: 'buyer' as const,
        orderType: 'escrow' as const
      }));

      const sellerEscrowOrdersWithPerspective = sellerEscrowOrders.map(order => ({
        ...order,
        perspective: 'seller' as const,
        orderType: 'escrow' as const
      }));

      // Add perspective flag to active jobs
      const buyerActiveJobsWithPerspective = activeJobs.asBuyer.map(job => ({
        ...job,
        perspective: 'buyer' as const,
        orderType: 'direct' as const,
        current_status: job.status === 'pending_confirmation' ? 'payment_received' :
                       job.status === 'in_progress' ? 'work_in_progress' : 
                       job.status === 'completed' ? 'buyer_reviewing' :
                       job.status === 'completed_confirmed' ? 'completed' :
                       job.status === 'revision_requested' ? 'revision_requested' :
                       job.status === 'revision_in_progress' ? 'revision_in_progress' :
                       job.status === 'revision_completed' ? 'revision_completed' : 'payment_received'
      }));

      const sellerActiveJobsWithPerspective = activeJobs.asServiceProvider.map(job => ({
        ...job,
        perspective: 'seller' as const,
        orderType: 'direct' as const,
        current_status: job.status === 'pending_confirmation' ? 'payment_received' :
                       job.status === 'in_progress' ? 'work_in_progress' : 
                       job.status === 'completed' ? 'buyer_reviewing' :
                       job.status === 'completed_confirmed' ? 'completed' :
                       job.status === 'revision_requested' ? 'revision_requested' :
                       job.status === 'revision_in_progress' ? 'revision_in_progress' :
                       job.status === 'revision_completed' ? 'revision_completed' : 'payment_received'
      }));

      // Combine all orders and sort by creation date
      const allOrders = [
        ...buyerEscrowOrdersWithPerspective, 
        ...sellerEscrowOrdersWithPerspective,
        ...buyerActiveJobsWithPerspective,
        ...sellerActiveJobsWithPerspective
      ].sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

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

  const handleConfirmOrder = async (order: JobStatus & { orderType?: string }) => {
    if (!order.id) return;

    try {
      // Check if this is a direct order (active job) or escrow order
      if (order.orderType === 'direct') {
        // Import ActiveJobService dynamically
        const { ActiveJobService } = await import('@/lib/active-job-service');
        const success = await ActiveJobService.confirmJob(order.id, user!.id);
        
        if (success) {
          Alert.alert('Order Confirmed!', 'You have confirmed the order and can now start working. The buyer has been notified.');
          fetchOrders();
        } else {
          Alert.alert('Error', 'Failed to confirm order. Please try again.');
        }
      } else {
        // Handle escrow orders (existing logic)
        const result = await EscrowService.startWork(order.id, user!.id);
        if (result.success) {
          Alert.alert('Success', 'Work started! The buyer has been notified.');
          fetchOrders();
        } else {
          Alert.alert('Error', result.error || 'Failed to start work');
        }
      }
    } catch (error) {
      console.error('Error confirming order:', error);
      Alert.alert('Error', 'Failed to confirm order');
    }
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

    // Require at least one photo
    if (completionPhotos.length === 0) {
      Alert.alert('Photo Required', 'Please upload at least one photo showing the completed work.');
      return;
    }

    try {
      // Check if this is a direct order (active job) or escrow order
      if ((selectedOrder as any).orderType === 'direct') {
        // For direct orders, use ActiveJobService
        const { ActiveJobService } = await import('@/lib/active-job-service');
        const success = await ActiveJobService.completeJob(selectedOrder.id);
        
        if (success) {
          Alert.alert(
            'Work Completed!', 
            'The job has been marked as completed. The buyer will be notified and can review your work.'
          );
          setShowCompletionModal(false);
          setCompletionNotes('');
          setCompletionPhotos([]);
          setSelectedOrder(null);
          fetchOrders();
        } else {
          Alert.alert('Error', 'Failed to complete work. Please try again.');
        }
      } else {
        // For escrow orders, find the job status ID first, then use JobCompletionService
        try {
          const { data: jobStatus, error } = await supabase
            .from('job_status')
            .select('id')
            .eq('service_offer_id', (selectedOrder as any).service_offer_id)
            .single();

          if (error || !jobStatus) {
            // Fallback to original EscrowService if job status not found
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
              setCompletionPhotos([]);
              setSelectedOrder(null);
              fetchOrders();
            } else {
              Alert.alert('Error', result.error || 'Failed to complete work');
            }
            return;
          }

          // Use JobCompletionService for photo upload
          const { JobCompletionService } = await import('@/lib/job-completion-service');
          const success = await JobCompletionService.completeJobWithPhotos(
            jobStatus.id,
            user!.id,
            completionPhotos,
            completionNotes.trim() || undefined
          );
          
          if (success) {
            Alert.alert(
              'Work Completed!', 
              'The job has been marked as completed with photos. The buyer will be notified and can review your work.'
            );
            setShowCompletionModal(false);
            setCompletionNotes('');
            setCompletionPhotos([]);
            setSelectedOrder(null);
            fetchOrders();
          } else {
            Alert.alert('Error', 'Failed to complete work. Please try again.');
          }
        } catch (jobStatusError) {
          console.error('Error finding job status:', jobStatusError);
          // Fallback to original EscrowService
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
            setCompletionPhotos([]);
            setSelectedOrder(null);
            fetchOrders();
          } else {
            Alert.alert('Error', result.error || 'Failed to complete work');
          }
        }
      }
    } catch (error) {
      console.error('Error completing work:', error);
      Alert.alert('Error', 'Failed to complete work. Please try again.');
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedOrder?.id || !revisionReason.trim()) {
      Alert.alert('Required Field', 'Please provide a reason for requesting changes.');
      return;
    }

    try {
      // Check if this is a direct order or escrow order
      if ((selectedOrder as any).orderType === 'direct') {
        // Handle direct orders
        const { ActiveJobService } = await import('@/lib/active-job-service');
        const result = await ActiveJobService.requestRevision(
          selectedOrder.id,
          user!.id,
          revisionReason.trim()
        );
        
        if (result.success) {
          Alert.alert(
            'Revision Requested', 
            'Your revision request has been sent to the service provider. They will respond within the deadline.'
          );
          setShowReviewModal(false);
          setRevisionReason('');
          setReviewAction(null);
          setSelectedOrder(null);
          fetchOrders();
        } else {
          Alert.alert('Error', result.error || 'Failed to request revision');
        }
      } else {
        // Handle escrow orders
        const result = await EscrowService.requestRevision(
          selectedOrder.id,
          user!.id,
          revisionReason.trim()
        );
        
        if (result.success) {
          Alert.alert(
            'Revision Requested', 
            'Your revision request has been sent to the service provider. They will respond within the deadline.'
          );
          setShowReviewModal(false);
          setRevisionReason('');
          setReviewAction(null);
          setSelectedOrder(null);
          fetchOrders();
        } else {
          Alert.alert('Error', result.error || 'Failed to request revision');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request revision');
    }
  };

  const handleConfirmCompletion = async () => {
    if (!selectedOrder?.id) return;

    try {
      // Check if this is a direct order or escrow order
      if ((selectedOrder as any).orderType === 'direct') {
        // Import ActiveJobService dynamically
        const { ActiveJobService } = await import('@/lib/active-job-service');
        const success = await ActiveJobService.confirmJobCompletion(selectedOrder.id, user!.id);
        
        if (success) {
          Alert.alert(
            'Job Confirmed!', 
            'You have confirmed the job completion. The service provider has been notified and payment has been released.'
          );
          setShowReviewModal(false);
          setFeedback('');
          setRating(5);
          setSelectedOrder(null);
          fetchOrders();
        } else {
          Alert.alert('Error', 'Failed to confirm job completion. Please try again.');
        }
      } else {
        // Handle escrow orders
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
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm completion');
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

  const handleContactBuyer = (order: JobStatus & { perspective: 'buyer' | 'seller' }) => {
    // Get the buyer ID from the order
    const buyerId = order.buyer_id;
    
    if (!buyerId) {
      Alert.alert('Error', 'Buyer information not available');
      return;
    }

    // Navigate to chat with the buyer
    router.push({
      pathname: '/chat/[participantId]',
      params: { 
        participantId: buyerId,
        chatId: '',
        prefilledMessage: `Hi! I'm contacting you about our order: ${(order as any).escrow_transactions?.service_title || 'Service Order'}`
      }
    });
  };

  const handleContactServiceProvider = (order: JobStatus & { perspective: 'buyer' | 'seller' }) => {
    // Get the service provider ID from the order
    const serviceProviderId = order.service_provider_id;
    
    if (!serviceProviderId) {
      Alert.alert('Error', 'Service provider information not available');
      return;
    }

    // Navigate to chat with the service provider
    router.push({
      pathname: '/chat/[participantId]',
      params: { 
        participantId: serviceProviderId,
        chatId: '',
        prefilledMessage: `Hi! I'm contacting you about our order: ${(order as any).escrow_transactions?.service_title || 'Service Order'}`
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payment_received': return '#FFA500';
      case 'acknowledgment_pending': return '#FF6B35';
      case 'work_in_progress': return '#007AFF';
      case 'work_completed': return '#32CD32';
      case 'buyer_reviewing': return '#9932CC';
      case 'revision_requested': return '#FF6B35';
      case 'revision_in_progress': return '#007AFF';
      case 'revision_completed': return '#9932CC';
      case 'completed': return '#228B22';
      case 'disputed': return '#DC143C';
      case 'cancelled': return '#808080';
      default: return '#666';
    }
  };

  const getStatusText = (status: string, perspective: 'buyer' | 'seller') => {
    switch (status) {
      case 'payment_received': 
        return perspective === 'buyer' ? 'Waiting for service provider to confirm' : 'Payment Received - Please Confirm';
      case 'acknowledgment_pending':
        return perspective === 'buyer' ? 'Waiting for seller' : 'Acceptance Acknowledged';
      case 'work_in_progress': 
        return perspective === 'buyer' ? 'Work in Progress' : 'Working';
      case 'work_completed': 
        return perspective === 'buyer' ? 'Work Completed' : 'Work Submitted';
      case 'buyer_reviewing': 
        return perspective === 'buyer' ? 'Review & Confirm' : 'Under Review';
      case 'revision_requested':
        return perspective === 'buyer' ? 'Revision Requested' : 'Revision Required';
      case 'revision_in_progress':
        return perspective === 'buyer' ? 'Revision in Progress' : 'Working on Revision';
      case 'revision_completed':
        return perspective === 'buyer' ? 'Revision Complete - Review' : 'Revision Submitted';
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

  const getQuickActionButton = (order: JobStatus & { perspective: 'buyer' | 'seller' }) => {
    const escrowTransaction = (order as any).escrow_transactions;
    
    if (order.perspective === 'seller') {
      // Seller perspective quick actions
      switch (order.current_status) {
        case 'acknowledgment_pending':
          return (
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#FF6B35' }]}
              onPress={() => {
                setSelectedOrder(order);
                setShowAcknowledgmentModal(true);
              }}
            >
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.quickActionText}>Acknowledge</Text>
            </TouchableOpacity>
          );
        
        case 'payment_received':
          return (
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#007AFF' }]}
              onPress={() => handleConfirmOrder(order)}
            >
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.quickActionText}>Confirm</Text>
            </TouchableOpacity>
          );
        
        case 'work_in_progress':
          return (
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#32CD32' }]}
              onPress={() => {
                setSelectedOrder(order);
                setShowCompletionModal(true);
              }}
            >
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={styles.quickActionText}>Complete</Text>
            </TouchableOpacity>
          );
        
        default:
          return null;
      }
    } else {
      // Buyer perspective quick actions
      switch (order.current_status) {
        case 'work_completed':
        case 'buyer_reviewing':
          return (
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#32CD32' }]}
              onPress={() => {
                setSelectedOrder(order);
                setShowReviewModal(true);
              }}
            >
              <Ionicons name="card" size={14} color="#fff" />
              <Text style={styles.quickActionText}>Review</Text>
            </TouchableOpacity>
          );
        
        default:
          return null;
      }
    }
  };

  const getActionButton = (order: JobStatus & { perspective: 'buyer' | 'seller' }) => {
    const escrowTransaction = (order as any).escrow_transactions;
    
    if (order.perspective === 'seller') {
      // Seller perspective actions
      switch (order.current_status) {
        case 'acknowledgment_pending':
          return (
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#FF6B35' }]}
                onPress={() => {
                  setSelectedOrder(order);
                  setShowAcknowledgmentModal(true);
                }}
              >
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Acceptance Acknowledged</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: '#007AFF' }]}
                onPress={() => handleContactBuyer(order)}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.contactButtonText}>Contact Buyer</Text>
              </TouchableOpacity>
            </View>
          );
        
        case 'payment_received':
          return (
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#007AFF' }]}
                onPress={() => handleConfirmOrder(order)}
              >
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Confirm Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: '#28a745' }]}
                onPress={() => handleContactBuyer(order)}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.contactButtonText}>Contact Buyer</Text>
              </TouchableOpacity>
            </View>
          );
        
        case 'work_in_progress':
          return (
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#32CD32' }]}
                onPress={() => {
                  setSelectedOrder(order);
                  setShowCompletionModal(true);
                }}
              >
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Mark Complete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: '#007AFF' }]}
                onPress={() => handleContactBuyer(order)}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.contactButtonText}>Contact Buyer</Text>
              </TouchableOpacity>
            </View>
          );
        
        case 'work_completed':
        case 'buyer_reviewing':
          return (
            <View style={styles.actionButtonContainer}>
              <View style={[styles.orderCardActionButton, { backgroundColor: '#9932CC' }]}>
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Awaiting Review</Text>
              </View>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: '#007AFF' }]}
                onPress={() => handleContactBuyer(order)}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.contactButtonText}>Contact Buyer</Text>
              </TouchableOpacity>
            </View>
          );
        
        case 'completed':
          return (
            <View style={styles.actionButtonContainer}>
              <View style={[styles.orderCardActionButton, { backgroundColor: '#228B22' }]}>
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>
                  Earned: {escrowTransaction?.amount ? `${escrowTransaction.amount} credits` : 
                           `${(order as any).currency || 'RM'} ${(order as any).price || 0}`}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: '#007AFF' }]}
                onPress={() => handleContactBuyer(order)}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.contactButtonText}>Contact Buyer</Text>
              </TouchableOpacity>
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
            <View style={styles.actionButtonContainer}>
              <View style={[styles.orderCardActionButton, { backgroundColor: '#FF6B35' }]}>
                <Ionicons name="time-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Waiting for seller acknowledgment</Text>
              </View>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#007AFF' }]}
                onPress={() => handleContactServiceProvider(order)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Contact Provider</Text>
              </TouchableOpacity>
            </View>
          );
        
        case 'payment_received':
          return (
            <View style={styles.actionButtonContainer}>
              <View style={[styles.orderCardActionButton, { backgroundColor: '#FFA500' }]}>
                <Ionicons name="time-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Waiting for service provider to confirm</Text>
              </View>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#007AFF' }]}
                onPress={() => handleContactServiceProvider(order)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Contact Provider</Text>
              </TouchableOpacity>
            </View>
          );
        
        case 'work_in_progress':
          return (
            <View style={styles.actionButtonContainer}>
              <View style={[styles.orderCardActionButton, { backgroundColor: '#007AFF' }]}>
                <Ionicons name="construct-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Service provider is working</Text>
              </View>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#28a745' }]}
                onPress={() => handleContactServiceProvider(order)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Contact Provider</Text>
              </TouchableOpacity>
            </View>
          );
        
        case 'work_completed':
        case 'buyer_reviewing':
          return (
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#32CD32' }]}
                onPress={() => {
                  setSelectedOrder(order);
                  setShowReviewModal(true);
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Review & Release Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#007AFF' }]}
                onPress={() => handleContactServiceProvider(order)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Contact Provider</Text>
              </TouchableOpacity>
            </View>
          );
        
        case 'completed':
          return (
            <View style={styles.actionButtonContainer}>
              <View style={[styles.orderCardActionButton, { backgroundColor: '#228B22' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>
                  Paid: {escrowTransaction?.amount ? `${escrowTransaction.amount} credits` : 
                         `${(order as any).currency || 'RM'} ${(order as any).price || 0}`}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#007AFF' }]}
                onPress={() => handleContactServiceProvider(order)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Contact Provider</Text>
              </TouchableOpacity>
            </View>
          );

        case 'revision_requested':
          return (
            <View style={styles.actionButtonContainer}>
              <View style={[styles.orderCardActionButton, { backgroundColor: '#FF6B35' }]}>
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Revision Requested</Text>
              </View>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#007AFF' }]}
                onPress={() => handleContactServiceProvider(order)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Contact Provider</Text>
              </TouchableOpacity>
            </View>
          );

        case 'revision_in_progress':
          return (
            <View style={styles.actionButtonContainer}>
              <View style={[styles.orderCardActionButton, { backgroundColor: '#007AFF' }]}>
                <Ionicons name="construct-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Revision in Progress</Text>
              </View>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#28a745' }]}
                onPress={() => handleContactServiceProvider(order)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Contact Provider</Text>
              </TouchableOpacity>
            </View>
          );

        case 'revision_completed':
          return (
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#32CD32' }]}
                onPress={() => {
                  setSelectedOrder(order);
                  setShowReviewModal(true);
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Review Revision</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.orderCardActionButton, { backgroundColor: '#007AFF' }]}
                onPress={() => handleContactServiceProvider(order)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>Contact Provider</Text>
              </TouchableOpacity>
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
      return ['acknowledgment_pending', 'payment_received', 'work_in_progress', 'work_completed', 'buyer_reviewing', 'revision_requested', 'revision_in_progress', 'revision_completed'].includes(order.current_status);
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
      ['acknowledgment_pending', 'payment_received', 'work_in_progress', 'work_completed', 'buyer_reviewing', 'revision_requested', 'revision_in_progress', 'revision_completed'].includes(o.current_status)
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

      {/* Filter and Expand Controls */}
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
          
          {filteredOrders.length > 0 && (
            <TouchableOpacity
              style={[
                styles.expandAllButton,
                { backgroundColor: colors.primary.main }
              ]}
              onPress={toggleExpandAll}
              accessibilityRole="button"
              accessibilityLabel={expandAll ? "Collapse All Orders" : "Expand All Orders"}
            >
              <Ionicons 
                name={expandAll ? "contract" : "expand"} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.expandAllText}>
                {expandAll ? 'Collapse All' : 'Expand All'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.ordersList}
        contentContainerStyle={[
          styles.ordersListContent,
          { paddingBottom: 120 + insets.bottom } // Add safe area bottom inset
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
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
            const orderId = order.id || '';
            initializeAnimation(orderId);
            
            return (
              <Animated.View
                key={order.id}
                style={[
                  styles.orderCard, 
                  { 
                    backgroundColor: colors.background.secondary, 
                    opacity: animationValues[orderId]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1],
                    }),
                    transform: [
                      {
                        scale: animationValues[orderId]?.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.95, 1],
                        }),
                      },
                    ],
                  }
                ]}
              >
                <TouchableOpacity
                  onPress={() => toggleOrderExpansion(orderId)}
                  style={styles.orderHeader}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderTitleContainer}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.orderTitle, { color: colors.text.primary }]} numberOfLines={expandedOrders.has(orderId) ? 2 : 1}>
                        {escrowTransaction?.service_title || (order as any).title}
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
                    {!expandedOrders.has(orderId) && (
                      <View style={styles.collapsedInfo}>
                        {(escrowTransaction?.service_description || (order as any).description) && (
                          <Text style={[styles.collapsedDescription, { color: colors.text.secondary }]} numberOfLines={1}>
                            {escrowTransaction?.service_description || (order as any).description}
                          </Text>
                        )}
                        <View style={styles.collapsedMeta}>
                          <Text style={[styles.collapsedMetaText, { color: colors.text.secondary }]}>
                            {new Date(order.created_at!).toLocaleDateString()}
                          </Text>
                          {escrowTransaction?.work_start_date && (
                            <Text style={[styles.collapsedMetaText, { color: getCountdownColor(escrowTransaction.work_start_date) }]}>
                              {getCountdownToJob(escrowTransaction.work_start_date)}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                  <View style={styles.orderAmountContainer}>
                    <Text style={[styles.orderAmount, { color: colors.primary.main }]}>
                      {escrowTransaction?.amount ? `${escrowTransaction.amount} credits` : 
                       `${(order as any).currency || 'RM'} ${(order as any).price || 0}`}
                    </Text>
                    {perspective === 'buyer' && escrowTransaction?.platform_fee > 0 && (
                      <Text style={[styles.platformFee, { color: colors.text.secondary }]}>
                        +{escrowTransaction.platform_fee} fee
                      </Text>
                    )}
                    <View style={styles.expandIndicator}>
                      <Ionicons 
                        name={expandedOrders.has(orderId) ? "chevron-up" : "chevron-down"} 
                        size={16} 
                        color={colors.text.secondary} 
                      />
                    </View>
                  </View>
                </TouchableOpacity>

                {expandedOrders.has(orderId) && (
                  <>
                    {(escrowTransaction?.service_description || (order as any).description) && (
                      <Text style={[styles.orderDescription, { color: colors.text.secondary }]} numberOfLines={2}>
                        {escrowTransaction?.service_description || (order as any).description}
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
                        
                        {/* Service Price and Details */}
                        <View style={styles.detailRow}>
                          <Ionicons name="pricetag-outline" size={16} color={colors.text.secondary} />
                          <Text style={[styles.detailText, { color: colors.text.secondary }]}>
                            Price: {escrowTransaction?.amount ? `${escrowTransaction.amount} credits` : 
                                   `${(order as any).currency || 'RM'} ${(order as any).price || 0}`}
                          </Text>
                        </View>

                        {/* Delivery Time */}
                        {((order as any).delivery_time || escrowTransaction?.delivery_time) && (
                          <View style={styles.detailRow}>
                            <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                            <Text style={[styles.detailText, { color: colors.text.secondary }]}>
                              Delivery: {(order as any).delivery_time || escrowTransaction?.delivery_time}
                            </Text>
                          </View>
                        )}

                        {/* Payment Status */}
                        {(order as any).payment_status && (
                          <View style={styles.detailRow}>
                            <Ionicons name="card-outline" size={16} color={colors.text.secondary} />
                            <Text style={[styles.detailText, { color: colors.text.secondary }]}>
                              Payment: {(order as any).payment_status === 'paid' ? 'Paid' : 
                                        (order as any).payment_status === 'pending' ? 'Pending' : 
                                        (order as any).payment_status}
                            </Text>
                          </View>
                        )}

                        {/* Order Type */}
                        <View style={styles.detailRow}>
                          <Ionicons name="layers-outline" size={16} color={colors.text.secondary} />
                          <Text style={[styles.detailText, { color: colors.text.secondary }]}>
                            Order Type: {(order as any).orderType === 'direct' ? 'Direct Order' : 'Escrow Order'}
                          </Text>
                        </View>
                        
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
                   </>
                 )}
                 
                 {/* Quick Action Button for Collapsed State */}
                 {!expandedOrders.has(orderId) && (
                   <View style={styles.quickActionContainer}>
                     {getQuickActionButton(order as JobStatus & { perspective: 'buyer' | 'seller' })}
                   </View>
                 )}
               </Animated.View>
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
            <TouchableOpacity onPress={() => {
              setShowCompletionModal(false);
              setCompletionNotes('');
              setCompletionPhotos([]);
            }}>
              <Text style={[styles.modalCancel, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Mark Work Complete</Text>
            <TouchableOpacity 
              onPress={handleCompleteWork}
              disabled={completionPhotos.length === 0}
            >
              <Text style={[
                styles.modalDone, 
                { 
                  color: completionPhotos.length === 0 ? colors.text.secondary : colors.primary.main 
                }
              ]}>Done</Text>
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
            
            {/* Photo Upload Section */}
            <View style={styles.photoUploadSection}>
              <JobCompletionPhotoUpload
                userId={user?.id || ''}
                photos={completionPhotos}
                onPhotosChange={setCompletionPhotos}
                maxPhotos={5}
              />
            </View>
            
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
            <TouchableOpacity onPress={() => {
              setShowReviewModal(false);
              setReviewAction(null);
              setRevisionReason('');
            }}>
              <Text style={[styles.modalCancel, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Review Completed Work</Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.modalContent}>
            {selectedOrder && (
              <>
                <View style={[styles.orderSummary, { backgroundColor: colors.background.secondary }]}>
                  <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>Order Summary</Text>
                  <Text style={[styles.summaryService, { color: colors.text.primary }]}>
                    {((selectedOrder as any).escrow_transactions)?.service_title || (selectedOrder as any).title}
                  </Text>
                  <Text style={[styles.summaryAmount, { color: colors.primary.main }]}>
                    {((selectedOrder as any).escrow_transactions)?.amount ? 
                      `${((selectedOrder as any).escrow_transactions).amount} credits will be released to the seller` :
                      `${(selectedOrder as any).currency || 'RM'} ${(selectedOrder as any).price || 0} was paid for this service`}
                  </Text>
                </View>

                {/* Action Selection */}
                {!reviewAction && (
                  <View style={styles.actionSelectionSection}>
                    <Text style={[styles.modalLabel, { color: colors.text.primary }]}>Choose an action:</Text>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary.main }]}
                      onPress={() => setReviewAction('confirm')}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Confirm & Release Payment</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.background.secondary, borderColor: colors.border.main }]}
                      onPress={() => setReviewAction('request-changes')}
                    >
                      <Ionicons name="refresh" size={20} color={colors.primary.main} />
                      <Text style={[styles.actionButtonText, { color: colors.primary.main }]}>Request Changes</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Confirm & Release Payment Section */}
                {reviewAction === 'confirm' && (
                  <>
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

                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary.main }]}
                      onPress={handleConfirmCompletion}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Confirm & Release Payment</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Request Changes Section */}
                {reviewAction === 'request-changes' && (
                  <>
                    <View style={styles.feedbackSection}>
                      <Text style={[styles.modalLabel, { color: colors.text.primary }]}>Reason for Changes (Required)</Text>
                      <TextInput
                        style={[styles.feedbackInput, { 
                          backgroundColor: colors.background.secondary, 
                          borderColor: colors.border.main,
                          color: colors.text.primary 
                        }]}
                        placeholder="Describe what changes or improvements you need..."
                        placeholderTextColor={colors.text.secondary}
                        value={revisionReason}
                        onChangeText={setRevisionReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>

                    <View style={[styles.modalWarning, { backgroundColor: '#ffe6e6', borderLeftColor: '#dc3545' }]}>
                      <Ionicons name="information-circle-outline" size={20} color="#dc3545" />
                      <Text style={[styles.modalWarningText, { color: '#dc3545' }]}>
                        The service provider will review your request and can either acknowledge the changes or dispute the request.
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary.main }]}
                      onPress={handleRequestChanges}
                    >
                      <Ionicons name="refresh" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Submit Revision Request</Text>
                    </TouchableOpacity>
                  </>
                )}
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
                    {((selectedOrder as any).escrow_transactions)?.service_title || (selectedOrder as any).title}
                  </Text>
                  <Text style={[styles.summaryAmount, { color: colors.primary.main }]}>
                    {((selectedOrder as any).escrow_transactions)?.amount ? 
                      `${((selectedOrder as any).escrow_transactions).amount} credits` :
                      `${(selectedOrder as any).currency || 'RM'} ${(selectedOrder as any).price || 0}`}
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
  ordersListContent: {
    paddingBottom: 20, // Base padding, safe area inset will be added dynamically
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
    marginHorizontal: 2, // Add small horizontal margin for better visual separation
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
    marginBottom: 8,
    marginTop: 8,
  },
  detailsSection: {
    paddingBottom: 12,
    marginBottom: 12,
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
    marginBottom: 6,
    gap: 10,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
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
  photoUploadSection: {
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
  collapsedDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  actionButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    alignItems: 'stretch', // Ensure buttons have same height
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    minHeight: 48, // Ensure minimum touch target size
  },
  orderCardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    minHeight: 48, // Ensure minimum touch target size
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    color: '#fff',
  },
  expandIndicator: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  collapsedInfo: {
    marginTop: 6,
  },
  collapsedMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  collapsedMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  expandAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  expandAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  actionSelectionSection: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  quickActionContainer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    letterSpacing: 0.2,
  },
});