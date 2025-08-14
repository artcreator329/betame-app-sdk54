import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderTimeline, orderManagementService } from '../lib/order-management-service';

interface OrderTimelineModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  orderTitle: string;
}

export const OrderTimelineModal: React.FC<OrderTimelineModalProps> = ({
  visible,
  onClose,
  orderId,
  orderTitle,
}) => {
  const [timeline, setTimeline] = useState<OrderTimeline[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && orderId) {
      loadTimeline();
    }
  }, [visible, orderId]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const timelineData = await orderManagementService.getOrderTimeline(orderId);
      setTimeline(timelineData);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'order_created': return 'receipt-outline';
      case 'work_started': return 'play-outline';
      case 'work_completed': return 'checkmark-outline';
      case 'buyer_confirmed': return 'thumbs-up-outline';
      case 'auto_released': return 'time-outline';
      case 'payment_released': return 'cash-outline';
      case 'dispute_raised': return 'warning-outline';
      case 'refund_requested': return 'return-up-back-outline';
      default: return 'information-outline';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'order_created': return '#2196F3';
      case 'work_started': return '#FF9800';
      case 'work_completed': return '#9C27B0';
      case 'buyer_confirmed': return '#4CAF50';
      case 'auto_released': return '#607D8B';
      case 'payment_released': return '#4CAF50';
      case 'dispute_raised': return '#F44336';
      case 'refund_requested': return '#FF5722';
      default: return '#757575';
    }
  };

  const formatEventTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Order Timeline</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <Text style={styles.orderTitle} numberOfLines={2}>
          {orderTitle}
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Loading timeline...</Text>
          </View>
        ) : (
          <ScrollView style={styles.timelineContainer} showsVerticalScrollIndicator={false}>
            {timeline.map((event, index) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View 
                    style={[
                      styles.eventIcon, 
                      { backgroundColor: getEventColor(event.event_type) }
                    ]}
                  >
                    <Ionicons 
                      name={getEventIcon(event.event_type) as any} 
                      size={16} 
                      color="#fff" 
                    />
                  </View>
                  {index < timeline.length - 1 && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.timelineRight}>
                  <Text style={styles.eventDescription}>
                    {event.event_description}
                  </Text>
                  <Text style={styles.eventTime}>
                    {formatEventTime(event.created_at)}
                  </Text>
                  
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <View style={styles.metadata}>
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <Text key={key} style={styles.metadataText}>
                          {key}: {String(value)}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}

            {timeline.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No timeline events found</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  timelineContainer: {
    flex: 1,
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 8,
  },
  timelineRight: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 12,
    color: '#666',
  },
  metadata: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
});