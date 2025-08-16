import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  Filter,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Eye,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/lib/admin-service';
import { Colors } from '@/constants/Colors';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'payment' | 'payout' | 'refund' | 'commission';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface TransactionCardProps {
  transaction: Transaction;
  onPress: () => void;
}

function TransactionCard({ transaction, onPress }: TransactionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      case 'cancelled':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard size={16} color="#007AFF" />;
      case 'payout':
        return <TrendingUp size={16} color="#10B981" />;
      case 'refund':
        return <TrendingDown size={16} color="#EF4444" />;
      case 'commission':
        return <DollarSign size={16} color="#F59E0B" />;
      default:
        return <DollarSign size={16} color="#6B7280" />;
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === 'payout' || type === 'refund' ? '-' : '+';
    return `${prefix}RM ${Math.abs(amount).toFixed(2)}`;
  };

  return (
    <TouchableOpacity style={styles.transactionCard} onPress={onPress}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <View style={styles.transactionType}>
            {getTypeIcon(transaction.type)}
            <Text style={styles.transactionTypeText}>
              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
            </Text>
          </View>
          <Text style={styles.transactionDescription}>{transaction.description}</Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={[styles.amountText, { color: transaction.type === 'payout' || transaction.type === 'refund' ? '#EF4444' : '#10B981' }]}>
            {formatAmount(transaction.amount, transaction.type)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.transactionDetails}>
        <View style={styles.detailItem}>
          <User size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {transaction.profiles?.full_name || 'Unknown User'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Calendar size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {new Date(transaction.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminTransactions() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    try {
      const isAdmin = await adminService.isAdmin(user.id);
      if (!isAdmin) {
        Alert.alert('Access Denied', 'Admin access required');
        router.back();
        return;
      }

      await loadTransactions();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    }
  };

  const loadTransactions = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const result = await adminService.getAllTransactions(pageNum, 20);
      
      if (refresh || pageNum === 1) {
        setTransactions(result.transactions);
      } else {
        setTransactions(prev => [...prev, ...result.transactions]);
      }
      
      setHasMore(result.transactions.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadTransactions(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadTransactions(page + 1);
    }
  };

  const handleViewTransaction = (transaction: Transaction) => {
    Alert.alert(
      'Transaction Details',
      `ID: ${transaction.id}\nUser: ${transaction.profiles?.full_name || 'Unknown'}\nAmount: RM ${transaction.amount.toFixed(2)}\nType: ${transaction.type}\nStatus: ${transaction.status}\nDate: ${new Date(transaction.created_at).toLocaleString()}\nDescription: ${transaction.description}`,
      [{ text: 'OK' }]
    );
  };

  const filteredTransactions = (transactions || []).filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || transaction.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (isLoading && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color={Colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
        {['all', 'completed', 'pending', 'failed', 'cancelled'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              filterStatus === status && styles.activeFilterTab,
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterTabText,
                filterStatus === status && styles.activeFilterTabText,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Transactions List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
          if (isCloseToBottom) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {(filteredTransactions || []).length === 0 ? (
          <View style={styles.emptyContainer}>
            <DollarSign size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No transactions found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search criteria' : 'Transactions will appear here'}
            </Text>
          </View>
        ) : (
          (filteredTransactions || []).map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onPress={() => handleViewTransaction(transaction)}
            />
          ))
        )}
        
        {isLoading && transactions.length > 0 && (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingMoreText}>Loading more...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  filterButton: {
    padding: 12,
    backgroundColor: '#007AFF10',
    borderRadius: 12,
  },
  filterTabs: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  activeFilterTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterTabText: {
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 16,
  },
  transactionType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  transactionTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  transactionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
  },
});