import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Order, orderManagementService } from '../lib/order-management-service';
import { OrderCard } from '../components/OrderCard';
import { OrderTimelineModal } from '../components/OrderTimelineModal';

type FilterType = 'all' | 'buyer' | 'seller';
type StatusFilter = 'all' | 'active' | 'completed' | 'disputed';

export default function OrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [timelineModalVisible, setTimelineModalVisible] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, filterType]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const role = filterType === 'all' ? 'both' : filterType;
      const ordersData = await orderManagementService.getUserOrders(user.id, role);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getFilteredOrders = () => {
    let filtered = orders;

    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'active':
          filtered = filtered.filter(order => 
            ['payment_received', 'work_in_progress', 'work_completed', 'buyer_reviewing'].includes(order.status)
          );
          break;
        case 'completed':
          filtered = filtered.filter(order => order.status === 'completed');
          break;
        case 'disputed':
          filtered = filtered.filter(order => order.dispute_status !== 'none');
          break;
      }
    }

    return filtered;
  };

  const showOrderTimeline = (order: Order) => {
    setSelectedOrder(order);
    setTimelineModalVisible(true);
  };

  const renderFilterButton = (type: FilterType, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterType === type && styles.activeFilterButton
      ]}
      onPress={() => setFilterType(type)}
    >
      <Text style={[
        styles.filterButtonText,
        filterType === type && styles.activeFilterButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderStatusFilterButton = (status: StatusFilter, label: string) => (
    <TouchableOpacity
      style={[
        styles.statusFilterButton,
        statusFilter === status && styles.activeStatusFilterButton
      ]}
      onPress={() => setStatusFilter(status)}
    >
      <Text style={[
        styles.statusFilterButtonText,
        statusFilter === status && styles.activeStatusFilterButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity
      onLongPress={() => showOrderTimeline(item)}
      activeOpacity={0.7}
    >
      <OrderCard
        order={item}
        currentUserId={user?.id || ''}
        onOrderUpdate={loadOrders}
      />
    </TouchableOpacity>
  );

  const filteredOrders = getFilteredOrders();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <TouchableOpacity onPress={loadOrders} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Role Filter */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All Orders')}
        {renderFilterButton('buyer', 'As Buyer')}
        {renderFilterButton('seller', 'As Seller')}
      </View>

      {/* Status Filter */}
      <View style={styles.statusFilterContainer}>
        {renderStatusFilterButton('all', 'All')}
        {renderStatusFilterButton('active', 'Active')}
        {renderStatusFilterButton('completed', 'Completed')}
        {renderStatusFilterButton('disputed', 'Disputed')}
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySubtitle}>
              {filterType === 'buyer' 
                ? "You haven't made any purchases yet"
                : filterType === 'seller'
                ? "You haven't received any orders yet"
                : "You don't have any orders yet"
              }
            </Text>
          </View>
        }
      />

      <View style={styles.helpText}>
        <Ionicons name="information-circle-outline" size={16} color="#666" />
        <Text style={styles.helpTextContent}>
          Long press on any order to view detailed timeline
        </Text>
      </View>

      {selectedOrder && (
        <OrderTimelineModal
          visible={timelineModalVisible}
          onClose={() => setTimelineModalVisible(false)}
          orderId={selectedOrder.id}
          orderTitle={selectedOrder.service_title}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  activeFilterButton: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  statusFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#f8f8f8',
  },
  activeStatusFilterButton: {
    backgroundColor: '#E3F2FD',
  },
  statusFilterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  activeStatusFilterButtonText: {
    color: '#2196F3',
  },
  listContainer: {
    paddingBottom: 80,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  helpText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  helpTextContent: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});