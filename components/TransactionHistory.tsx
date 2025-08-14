import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  Gift,
  CreditCard,
  Trophy,
  Users,
  Calendar,
  Filter,
  TrendingUp,
  ShoppingBag,
  Coins,
} from 'lucide-react-native';
import { WalletService, Transaction } from '../lib/wallet-service';
import { useColors } from '../contexts/ThemeContext';

interface TransactionHistoryProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

interface TransactionGroup {
  date: string;
  transactions: Transaction[];
}

const TRANSACTION_TYPES = {
  all: 'All Transactions',
  betacoin_purchase: 'BetaCoin Purchases',
  conversion: 'Stone Conversions',
  feature_purchase: 'Feature Purchases',
  daily_checkin: 'Daily Check-ins',
  referral_bonus: 'Referral Bonuses',
  service_payment: 'Service Payments',
  service_payment_received: 'Payment Received',
};

export function TransactionHistory({ visible, onClose, userId }: TransactionHistoryProps) {
  const colors = useColors();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<keyof typeof TRANSACTION_TYPES>('all');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      loadTransactions();
    }
  }, [visible, userId]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, selectedFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await WalletService.getTransactionHistory(userId);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const filterTransactions = () => {
    if (selectedFilter === 'all') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter(t => t.type === selectedFilter));
    }
  };

  const groupTransactionsByDate = (transactions: Transaction[]): TransactionGroup[] => {
    const groups: { [key: string]: Transaction[] } = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.created_at || '').toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
    });

    return Object.entries(groups)
      .map(([date, transactions]) => ({ date, transactions }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getTransactionIcon = (type: string, amount: number) => {
    const iconProps = { size: 20, color: 'white' };
    
    switch (type) {
      case 'betacoin_purchase':
        return <CreditCard {...iconProps} />;
      case 'conversion':
        return <Coins {...iconProps} />;
      case 'feature_purchase':
        return <Zap {...iconProps} />;
      case 'daily_checkin':
        return <Calendar {...iconProps} />;
      case 'referral_bonus':
        return <Users {...iconProps} />;
      case 'service_payment':
        return <ArrowUpRight {...iconProps} />;
      case 'service_payment_received':
        return <ArrowDownLeft {...iconProps} />;
      default:
        return amount > 0 ? <ArrowDownLeft {...iconProps} /> : <ArrowUpRight {...iconProps} />;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    switch (type) {
      case 'betacoin_purchase':
        return colors.status.success;
      case 'conversion':
        return colors.primary.main;
      case 'feature_purchase':
        return colors.status.warning;
      case 'daily_checkin':
        return colors.status.info;
      case 'referral_bonus':
        return '#9C27B0';
      case 'service_payment':
        return colors.status.error;
      case 'service_payment_received':
        return colors.status.success;
      default:
        return amount > 0 ? colors.status.success : colors.status.error;
    }
  };

  const getTransactionTitle = (type: string) => {
    switch (type) {
      case 'betacoin_purchase':
        return 'BetaCoin Purchase';
      case 'conversion':
        return 'Stone Conversion';
      case 'feature_purchase':
        return 'Feature Purchase';
      case 'daily_checkin':
        return 'Daily Check-in';
      case 'referral_bonus':
        return 'Referral Bonus';
      case 'service_payment':
        return 'Service Payment';
      case 'service_payment_received':
        return 'Payment Received';
      default:
        return 'Transaction';
    }
  };

  const getAmountDisplay = (transaction: Transaction) => {
    const { type, amount } = transaction;
    const prefix = amount > 0 ? '+' : '';
    
    if (type === 'betacoin_purchase' || type === 'service_payment_received') {
      return `${prefix}${amount} BetaCoins`;
    } else if (type === 'conversion') {
      return `+${Math.floor(amount / 10)} BetaCoins`;
    } else if (type === 'daily_checkin' || type === 'referral_bonus') {
      return `${prefix}${amount} Stones`;
    } else if (type === 'service_payment' || type === 'feature_purchase') {
      return `${amount} BetaCoins`;
    }
    
    return `${prefix}${amount}`;
  };

  const getCurrencyInfo = (transaction: Transaction) => {
    // Extract currency info from description for real currency transactions
    if (transaction.type === 'betacoin_purchase' && transaction.description.includes('RM')) {
      const rmMatch = transaction.description.match(/RM([\d.]+)/);
      const feeMatch = transaction.description.match(/Processing Fee: RM([\d.]+)/);
      
      if (rmMatch) {
        const totalAmount = rmMatch[1];
        const processingFee = feeMatch ? feeMatch[1] : '0.00';
        const baseAmount = (parseFloat(totalAmount) - parseFloat(processingFee)).toFixed(2);
        
        return {
          totalAmount: `RM${totalAmount}`,
          baseAmount: `RM${baseAmount}`,
          processingFee: feeMatch ? `RM${processingFee}` : null,
        };
      }
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!visible) return null;

  const groupedTransactions = groupTransactionsByDate(filteredTransactions);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              Transaction History
            </Text>
            <TouchableOpacity 
              onPress={() => setShowFilter(true)}
              style={[styles.filterButton, { backgroundColor: colors.primary.main }]}
            >
              <Filter size={20} color="white" />
            </TouchableOpacity>
          </View>
          
          {selectedFilter !== 'all' && (
            <View style={styles.filterIndicator}>
              <Text style={[styles.filterText, { color: colors.text.secondary }]}>
                Showing: {TRANSACTION_TYPES[selectedFilter]}
              </Text>
              <TouchableOpacity 
                onPress={() => setSelectedFilter('all')}
                style={styles.clearFilterButton}
              >
                <Text style={[styles.clearFilterText, { color: colors.primary.main }]}>
                  Clear Filter
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
              Loading transactions...
            </Text>
          </View>
        ) : groupedTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <TrendingUp size={48} color={colors.text.secondary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              No Transactions Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              {selectedFilter === 'all' 
                ? "You haven't made any transactions yet." 
                : `No ${TRANSACTION_TYPES[selectedFilter].toLowerCase()} found.`}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary.main}
              />
            }
          >
            {groupedTransactions.map((group, groupIndex) => (
              <View key={groupIndex} style={styles.dateGroup}>
                <Text style={[styles.dateHeader, { color: colors.text.primary }]}>
                  {formatDate(group.date)}
                </Text>
                
                {group.transactions.map((transaction, index) => {
                  const currencyInfo = getCurrencyInfo(transaction);
                  
                  return (
                    <View
                      key={transaction.id || index}
                      style={[styles.transactionCard, { backgroundColor: colors.background.tertiary }]}
                    >
                      <View style={styles.transactionMain}>
                        <View style={[
                          styles.iconContainer,
                          { backgroundColor: getTransactionColor(transaction.type, transaction.amount) }
                        ]}>
                          {getTransactionIcon(transaction.type, transaction.amount)}
                        </View>
                        
                        <View style={styles.transactionInfo}>
                          <Text style={[styles.transactionTitle, { color: colors.text.primary }]}>
                            {getTransactionTitle(transaction.type)}
                          </Text>
                          <Text style={[styles.transactionDescription, { color: colors.text.secondary }]} numberOfLines={2}>
                            {transaction.description}
                          </Text>
                          <Text style={[styles.transactionTime, { color: colors.text.secondary }]}>
                            {formatTime(transaction.created_at || '')}
                          </Text>
                        </View>
                        
                        <View style={styles.amountContainer}>
                          <Text style={[
                            styles.transactionAmount,
                            { 
                              color: transaction.amount > 0 || transaction.type === 'service_payment_received' 
                                ? colors.status.success 
                                : colors.status.error 
                            }
                          ]}>
                            {getAmountDisplay(transaction)}
                          </Text>
                          
                          {currencyInfo && (
                            <View style={styles.currencyInfo}>
                              <Text style={[styles.currencyAmount, { color: colors.text.secondary }]}>
                                {currencyInfo.totalAmount}
                              </Text>
                              {currencyInfo.processingFee && (
                                <Text style={[styles.processingFee, { color: colors.text.tertiary }]}>
                                  Fee: {currencyInfo.processingFee}
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
            
            <View style={styles.bottomPadding} />
          </ScrollView>
        )}

        {/* Filter Modal */}
        <Modal
          visible={showFilter}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFilter(false)}
        >
          <View style={styles.filterModalOverlay}>
            <View style={[styles.filterModalContent, { backgroundColor: colors.background.tertiary }]}>
              <Text style={[styles.filterModalTitle, { color: colors.text.primary }]}>
                Filter Transactions
              </Text>
              
              {Object.entries(TRANSACTION_TYPES).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterOption,
                    selectedFilter === key && { backgroundColor: colors.primary.main + '20' }
                  ]}
                  onPress={() => {
                    setSelectedFilter(key as keyof typeof TRANSACTION_TYPES);
                    setShowFilter(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: selectedFilter === key ? colors.primary.main : colors.text.primary }
                  ]}>
                    {label}
                  </Text>
                  {selectedFilter === key && (
                    <View style={[styles.filterCheckmark, { backgroundColor: colors.primary.main }]}>
                      <Text style={styles.filterCheckmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={[styles.filterCloseButton, { backgroundColor: colors.background.secondary }]}
                onPress={() => setShowFilter(false)}
              >
                <Text style={[styles.filterCloseText, { color: colors.text.primary }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
  },
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearFilterButton: {
    padding: 4,
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  transactionCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  currencyInfo: {
    alignItems: 'flex-end',
  },
  currencyAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  processingFee: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 40,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContent: {
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  filterCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCheckmarkText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  filterCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
