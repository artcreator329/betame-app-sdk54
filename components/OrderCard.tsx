import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order, orderManagementService } from '../lib/order-management-service';

interface OrderCardProps {
  order: Order;
  currentUserId: string;
  onOrderUpdate?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  currentUserId, 
  onOrderUpdate 
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [canDispute, setCanDispute] = useState(false);

  const isBuyer = order.buyer_id === currentUserId;
  const isServiceProvider = order.service_provider_id === currentUserId;

  useEffect(() => {
    if (order.status === 'buyer_reviewing' && isBuyer) {
      const updateTimeRemaining = async () => {
        const remaining = await orderManagementService.getReviewTimeRemaining(order.id);
        setTimeRemaining(remaining);
        
        const canRaise = await orderManagementService.canRaiseDispute(order.id);
        setCanDispute(canRaise);
      };

      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [order.status, order.id, isBuyer]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payment_received': return '#FFA500';
      case 'work_in_progress': return '#2196F3';
      case 'work_completed': return '#FF9800';
      case 'buyer_reviewing': return '#9C27B0';
      case 'completed': return '#4CAF50';
      case 'disputed': return '#F44336';
      case 'cancelled': return '#757575';
      default: return '#757575';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'payment_received': return 'Payment Received';
      case 'work_in_progress': return 'Work in Progress';
      case 'work_completed': return 'Work Completed';
      case 'buyer_reviewing': return 'Buyer Reviewing';
      case 'completed': return 'Completed';
      case 'disputed': return 'Disputed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const handleStartWork = async () => {
    const success = await orderManagementService.startWork(order.id, currentUserId);
    if (success) {
      Alert.alert('Success', 'Work started successfully!');
      onOrderUpdate?.();
    } else {
      Alert.alert('Error', 'Failed to start work. Please try again.');
    }
  };

  const handleMarkCompleted = async () => {
    Alert.alert(
      'Mark Work Completed',
      'Are you sure you want to mark this work as completed? The buyer will have 24 hours to review.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Completed',
          onPress: async () => {
            const success = await orderManagementService.markWorkCompleted(order.id, currentUserId);
            if (success) {
              Alert.alert('Success', 'Work marked as completed! Buyer has 24 hours to review.');
              onOrderUpdate?.();
            } else {
              Alert.alert('Error', 'Failed to mark work as completed. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleConfirmCompletion = async () => {
    Alert.alert(
      'Confirm Work Completion',
      'Are you satisfied with the work? Payment will be released to the seller.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const success = await orderManagementService.confirmWorkCompletion(order.id, currentUserId);
            if (success) {
              Alert.alert('Success', 'Work confirmed! Payment has been released to the service provider.');
              onOrderUpdate?.();
            } else {
              Alert.alert('Error', 'Failed to confirm completion. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRaiseDispute = () => {
    Alert.prompt(
      'Raise Dispute',
      'Please describe the issue with the work:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Dispute',
          onPress: async (disputeReason) => {
            if (!disputeReason?.trim()) {
              Alert.alert('Error', 'Please provide a reason for the dispute.');
              return;
            }
            
            const success = await orderManagementService.raiseDispute(
              order.id, 
              currentUserId, 
              disputeReason
            );
            
            if (success) {
              Alert.alert('Dispute Raised', 'Your dispute has been submitted for admin review.');
              onOrderUpdate?.();
            } else {
              Alert.alert('Error', 'Failed to raise dispute. Please try again.');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const renderActionButtons = () => {
    if (isServiceProvider) {
      switch (order.status) {
        case 'payment_received':
          return (
            <TouchableOpacity style={styles.actionButton} onPress={handleStartWork}>
              <Text style={styles.actionButtonText}>Start Work</Text>
            </TouchableOpacity>
          );
        case 'work_in_progress':
          return (
            <TouchableOpacity style={styles.actionButton} onPress={handleMarkCompleted}>
              <Text style={styles.actionButtonText}>Mark Completed</Text>
            </TouchableOpacity>
          );
        default:
          return null;
      }
    }

    if (isBuyer && order.status === 'buyer_reviewing') {
      return (
        <View style={styles.buyerActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.confirmButton]} 
            onPress={handleConfirmCompletion}
          >
            <Text style={styles.actionButtonText}>Confirm Work</Text>
          </TouchableOpacity>
          
          {canDispute && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.disputeButton]} 
              onPress={handleRaiseDispute}
            >
              <Text style={styles.actionButtonText}>Raise Dispute</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {order.service_title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color="#666" />
          <Text style={styles.detailText}>Amount: {order.amount} BetaCoins</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            Role: {isBuyer ? 'Buyer' : 'Service Provider'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            Created: {new Date(order.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {order.status === 'buyer_reviewing' && isBuyer && timeRemaining !== null && (
        <View style={styles.reviewTimer}>
          <Ionicons name="time-outline" size={16} color="#FF9800" />
          <Text style={styles.timerText}>
            Review time remaining: {orderManagementService.formatTimeRemaining(timeRemaining)}
          </Text>
        </View>
      )}

      {order.dispute_status !== 'none' && (
        <View style={styles.disputeInfo}>
          <Ionicons name="warning-outline" size={16} color="#F44336" />
          <Text style={styles.disputeText}>
            Dispute Status: {order.dispute_status.replace('_', ' ')}
          </Text>
        </View>
      )}

      {renderActionButtons()}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  reviewTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  timerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  disputeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  disputeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  buyerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
  },
  disputeButton: {
    backgroundColor: '#F44336',
    flex: 1,
  },
});