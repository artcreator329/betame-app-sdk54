import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import CurlecPaymentService, { PaymentTransaction } from '../lib/curlec-payment-service';
import Colors from '../constants/Colors';

interface PaymentTransactionHistoryProps {
  onTransactionPress?: (transaction: PaymentTransaction) => void;
}

export default function PaymentTransactionHistory({ onTransactionPress }: PaymentTransactionHistoryProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user, filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const paymentService = CurlecPaymentService.getInstance();
      const transactionsData = await paymentService.getUserPaymentTransactions(user!.id, 100);
      
      // Apply filter
      let filteredTransactions = transactionsData;
      if (filter !== 'all') {
        filteredTransactions = transactionsData.filter(t => t.status === filter);
      }
      
      setTransactions(filteredTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const formatAmount = (amountInCents: number) => {
    return `RM${(amountInCents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'failed':
        return '#dc3545';
      case 'cancelled':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getPaymentTypeText = (paymentType: string) => {
    switch (paymentType) {
      case 'betacoin_purchase':
        return 'BetaCoin Purchase';
      case 'service_payment':
        return 'Service Payment';
      case 'wallet_topup':
        return 'Wallet Topup';
      default:
        return paymentType;
    }
  };

  const getPaymentTypeIcon = (paymentType: string) => {
    switch (paymentType) {
      case 'betacoin_purchase':
        return 'diamond';
      case 'service_payment':
        return 'card';
      case 'wallet_topup':
        return 'wallet';
      default:
        return 'card';
    }
  };

  const renderTransaction = ({ item }: { item: PaymentTransaction }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => onTransactionPress?.(item)}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionType}>
          <Ionicons 
            name={getPaymentTypeIcon(item.payment_type) as any} 
            size={20} 
            color={Colors.primary} 
          />
          <Text style={styles.transactionTypeText}>
            {getPaymentTypeText(item.payment_type)}
          </Text>
        </View>
        <Text style={styles.transactionAmount}>
          {formatAmount(item.amount)}
        </Text>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDate}>
            {formatDate(item.created_at!)}
          </Text>
          {item.metadata?.betacoin_amount && (
            <Text style={styles.betacoinAmount}>
              {item.metadata.betacoin_amount.toLocaleString()} BetaCoins
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      {item.error_message && (
        <Text style={styles.errorMessage}>
          Error: {item.error_message}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderFilterButton = (filterType: 'all' | 'completed' | 'pending' | 'failed', label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.filterButtonActive
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === filterType && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('completed', 'Completed')}
        {renderFilterButton('pending', 'Pending')}
        {renderFilterButton('failed', 'Failed')}
      </View>

      {/* Transaction List */}
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id!}
        style={styles.transactionList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? 'No transactions found'
                : `No ${filter} transactions found`
              }
            </Text>
            <Text style={styles.emptySubtext}>
              Your payment history will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  transactionList: {
    flex: 1,
  },
  transactionItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionTypeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  betacoinAmount: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

