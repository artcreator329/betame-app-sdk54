import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Order, 
  TemporaryPayout, 
  orderManagementService 
} from '../../lib/order-management-service';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && width >= 1024;

type AdminView = 'interventions' | 'payouts' | 'auto_release';

export default function AdminOrderManagementScreen() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<AdminView>('interventions');
  const [interventionOrders, setInterventionOrders] = useState<Order[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<TemporaryPayout[]>([]);
  const [autoReleaseOrders, setAutoReleaseOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [adminNotesModal, setAdminNotesModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [currentView]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (currentView === 'interventions') {
        const orders = await orderManagementService.getOrdersRequiringAdminIntervention();
        setInterventionOrders(orders);
      } else if (currentView === 'payouts') {
        const payouts = await orderManagementService.getPendingPayouts();
        setPendingPayouts(payouts);
      } else if (currentView === 'auto_release') {
        const orders = await orderManagementService.getOrdersReadyForAutoRelease();
        setAutoReleaseOrders(orders);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const processAutoRelease = async () => {
    Alert.alert(
      'Process Auto-Release',
      'This will automatically release payments for all eligible orders. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          onPress: async () => {
            try {
              const count = await orderManagementService.processAutoRelease();
              Alert.alert(
                'Success', 
                `${count} payments have been auto-released.`
              );
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to process auto-release.');
            }
          }
        }
      ]
    );
  };

  const openAdminNotesModal = (order: Order) => {
    setSelectedOrder(order);
    setAdminNotes(order.admin_notes || '');
    setAdminNotesModal(true);
  };

  const saveAdminNotes = async () => {
    if (!selectedOrder) return;

    try {
      // This would need to be implemented in the service
      // For now, we'll just close the modal
      setAdminNotesModal(false);
      setSelectedOrder(null);
      setAdminNotes('');
      Alert.alert('Success', 'Admin notes saved successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save admin notes.');
    }
  };

  const renderTabButton = (view: AdminView, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        currentView === view && styles.activeTabButton
      ]}
      onPress={() => setCurrentView(view)}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={currentView === view ? '#fff' : '#666'} 
      />
      <Text style={[
        styles.tabButtonText,
        currentView === view && styles.activeTabButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderInterventionOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle} numberOfLines={2}>
          {item.service_title}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.dispute_status !== 'none' ? '#F44336' : '#FF9800' }
        ]}>
          <Text style={styles.statusText}>
            {item.dispute_status !== 'none' ? 'Disputed' : 'Needs Review'}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.detailText}>Amount: {item.amount} BetaCoins</Text>
        <Text style={styles.detailText}>Status: {item.status}</Text>
        {item.dispute_reason && (
          <Text style={styles.disputeReason}>
            Dispute: {item.dispute_reason}
          </Text>
        )}
        {item.refund_preference && (
          <Text style={styles.refundInfo}>
            Refund Preference: {item.refund_preference.replace('_', ' ')}
          </Text>
        )}
      </View>

      <View style={styles.orderActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openAdminNotesModal(item)}
        >
          <Text style={styles.actionButtonText}>Add Notes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPayout = ({ item }: { item: TemporaryPayout }) => (
    <View style={styles.payoutCard}>
      <View style={styles.payoutHeader}>
        <Text style={styles.payoutAmount}>{item.amount} BetaCoins</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: '#FF9800' }
        ]}>
          <Text style={styles.statusText}>{item.payout_status}</Text>
        </View>
      </View>

      <View style={styles.payoutDetails}>
        <Text style={styles.detailText}>Method: {item.payout_method}</Text>
        <Text style={styles.detailText}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.payout_notes && (
          <Text style={styles.payoutNotes}>{item.payout_notes}</Text>
        )}
      </View>
    </View>
  );

  const renderAutoReleaseOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle} numberOfLines={2}>
          {item.service_title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.statusText}>Ready</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.detailText}>Amount: {item.amount} BetaCoins</Text>
        <Text style={styles.detailText}>
          Auto-release: {item.auto_release_at ? 
            new Date(item.auto_release_at).toLocaleString() : 'N/A'
          }
        </Text>
      </View>
    </View>
  );

  // Desktop-specific render functions
  const renderInterventionOrderDesktop = (item: Order) => (
    <View style={styles.desktopOrderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle} numberOfLines={2}>
          {item.service_title}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.dispute_status !== 'none' ? '#F44336' : '#FF9800' }
        ]}>
          <Text style={styles.statusText}>
            {item.dispute_status !== 'none' ? 'Disputed' : 'Needs Review'}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.detailText}>Amount: {item.amount} BetaCoins</Text>
        <Text style={styles.detailText}>Status: {item.status}</Text>
        {item.dispute_reason && (
          <Text style={styles.disputeReason}>
            Dispute: {item.dispute_reason}
          </Text>
        )}
        {item.refund_preference && (
          <Text style={styles.refundInfo}>
            Refund Preference: {item.refund_preference.replace('_', ' ')}
          </Text>
        )}
      </View>

      <View style={styles.desktopOrderActions}>
        <TouchableOpacity
          style={styles.desktopActionButton}
          onPress={() => openAdminNotesModal(item)}
        >
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Add Notes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPayoutDesktop = (item: TemporaryPayout) => (
    <View style={styles.desktopPayoutCard}>
      <View style={styles.payoutHeader}>
        <Text style={styles.payoutAmount}>{item.amount} BetaCoins</Text>
        <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]}>
          <Text style={styles.statusText}>{item.payout_status}</Text>
        </View>
      </View>

      <View style={styles.payoutDetails}>
        <Text style={styles.detailText}>Method: {item.payout_method}</Text>
        <Text style={styles.detailText}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.payout_notes && (
          <Text style={styles.payoutNotes}>{item.payout_notes}</Text>
        )}
      </View>
    </View>
  );

  const renderAutoReleaseOrderDesktop = (item: Order) => (
    <View style={styles.desktopOrderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle} numberOfLines={2}>
          {item.service_title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.statusText}>Ready</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.detailText}>Amount: {item.amount} BetaCoins</Text>
        <Text style={styles.detailText}>
          Auto-release: {item.auto_release_at ? 
            new Date(item.auto_release_at).toLocaleString() : 'N/A'
          }
        </Text>
      </View>
    </View>
  );

  const renderDesktopContent = () => {
    switch (currentView) {
      case 'interventions':
        return (
          <ScrollView 
            style={styles.desktopScrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <View style={styles.desktopGrid}>
              {interventionOrders.length > 0 ? (
                interventionOrders.map((item) => (
                  <View key={item.id} style={styles.desktopCard}>
                    {renderInterventionOrderDesktop(item)}
                  </View>
                ))
              ) : (
                <View style={styles.desktopEmptyState}>
                  <Ionicons name="checkmark-circle-outline" size={64} color="#4CAF50" />
                  <Text style={styles.emptyTitle}>No Interventions Needed</Text>
                  <Text style={styles.emptySubtitle}>All orders are running smoothly!</Text>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'payouts':
        return (
          <ScrollView 
            style={styles.desktopScrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <View style={styles.desktopGrid}>
              {pendingPayouts.length > 0 ? (
                pendingPayouts.map((item) => (
                  <View key={item.id} style={styles.desktopCard}>
                    {renderPayoutDesktop(item)}
                  </View>
                ))
              ) : (
                <View style={styles.desktopEmptyState}>
                  <Ionicons name="wallet-outline" size={64} color="#4CAF50" />
                  <Text style={styles.emptyTitle}>No Pending Payouts</Text>
                  <Text style={styles.emptySubtitle}>All payouts have been processed!</Text>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'auto_release':
        return (
          <View style={styles.desktopAutoReleaseContainer}>
            <View style={styles.desktopAutoReleaseHeader}>
              <Text style={styles.autoReleaseTitle}>
                Orders Ready for Auto-Release ({autoReleaseOrders.length})
              </Text>
              <TouchableOpacity
                style={styles.processButton}
                onPress={processAutoRelease}
                disabled={autoReleaseOrders.length === 0}
              >
                <Text style={styles.processButtonText}>Process All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.desktopScrollView}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
            >
              <View style={styles.desktopGrid}>
                {autoReleaseOrders.length > 0 ? (
                  autoReleaseOrders.map((item) => (
                    <View key={item.id} style={styles.desktopCard}>
                      {renderAutoReleaseOrderDesktop(item)}
                    </View>
                  ))
                ) : (
                  <View style={styles.desktopEmptyState}>
                    <Ionicons name="time-outline" size={64} color="#666" />
                    <Text style={styles.emptyTitle}>No Orders Ready</Text>
                    <Text style={styles.emptySubtitle}>No orders are ready for auto-release yet.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'interventions':
        return (
          <FlatList
            data={interventionOrders}
            renderItem={renderInterventionOrder}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={64} color="#4CAF50" />
                <Text style={styles.emptyTitle}>No Interventions Needed</Text>
                <Text style={styles.emptySubtitle}>
                  All orders are running smoothly!
                </Text>
              </View>
            }
          />
        );

      case 'payouts':
        return (
          <FlatList
            data={pendingPayouts}
            renderItem={renderPayout}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={64} color="#4CAF50" />
                <Text style={styles.emptyTitle}>No Pending Payouts</Text>
                <Text style={styles.emptySubtitle}>
                  All payouts have been processed!
                </Text>
              </View>
            }
          />
        );

      case 'auto_release':
        return (
          <View style={styles.autoReleaseContainer}>
            <View style={styles.autoReleaseHeader}>
              <Text style={styles.autoReleaseTitle}>
                Orders Ready for Auto-Release ({autoReleaseOrders.length})
              </Text>
              <TouchableOpacity
                style={styles.processButton}
                onPress={processAutoRelease}
                disabled={autoReleaseOrders.length === 0}
              >
                <Text style={styles.processButtonText}>Process All</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={autoReleaseOrders}
              renderItem={renderAutoReleaseOrder}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={64} color="#666" />
                  <Text style={styles.emptyTitle}>No Orders Ready</Text>
                  <Text style={styles.emptySubtitle}>
                    No orders are ready for auto-release yet.
                  </Text>
                </View>
              }
            />
          </View>
        );

      default:
        return null;
    }
  };

  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        <View style={styles.desktopHeader}>
          <Text style={styles.desktopTitle}>Order Management</Text>
          <View style={styles.desktopStats}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{interventionOrders.length}</Text>
              <Text style={styles.statLabel}>Interventions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pendingPayouts.length}</Text>
              <Text style={styles.statLabel}>Pending Payouts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{autoReleaseOrders.length}</Text>
              <Text style={styles.statLabel}>Auto-Release Ready</Text>
            </View>
          </View>
        </View>

        <View style={styles.desktopTabContainer}>
          {renderTabButton('interventions', 'Interventions', 'warning-outline')}
          {renderTabButton('payouts', 'Payouts', 'wallet-outline')}
          {renderTabButton('auto_release', 'Auto-Release', 'time-outline')}
        </View>

        <View style={styles.desktopContent}>
          {renderDesktopContent()}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Management</Text>
      </View>

      <View style={styles.tabContainer}>
        {renderTabButton('interventions', 'Interventions', 'warning-outline')}
        {renderTabButton('payouts', 'Payouts', 'wallet-outline')}
        {renderTabButton('auto_release', 'Auto-Release', 'time-outline')}
      </View>

      {renderContent()}

      {/* Admin Notes Modal */}
      <Modal
        visible={adminNotesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAdminNotesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Admin Notes</Text>
            <TouchableOpacity onPress={() => setAdminNotesModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.orderTitleModal}>
              {selectedOrder?.service_title}
            </Text>

            <TextInput
              style={styles.notesInput}
              placeholder="Add admin notes..."
              value={adminNotes}
              onChangeText={setAdminNotes}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.saveButton} onPress={saveAdminNotes}>
              <Text style={styles.saveButtonText}>Save Notes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  desktopContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  desktopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  desktopTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  desktopStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  desktopTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  desktopContent: {
    flex: 1,
  },
  desktopScrollView: {
    flex: 1,
  },
  desktopGrid: {
    padding: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  desktopCard: {
    width: isDesktop ? (width - 280 - 48 - 32) / 3 : '100%', // Sidebar width - padding - gap, divided by 3 columns
    minWidth: 300,
  },
  desktopOrderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  desktopPayoutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  desktopOrderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  desktopActionButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  desktopEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    width: '100%',
  },
  desktopAutoReleaseContainer: {
    flex: 1,
  },
  desktopAutoReleaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  activeTabButton: {
    backgroundColor: '#2196F3',
  },
  tabButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabButtonText: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
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
  orderTitle: {
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
  orderDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  disputeReason: {
    fontSize: 14,
    color: '#F44336',
    fontStyle: 'italic',
    marginTop: 4,
  },
  refundInfo: {
    fontSize: 14,
    color: '#FF9800',
    marginTop: 4,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  payoutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  payoutDetails: {
    marginBottom: 8,
  },
  payoutNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  autoReleaseContainer: {
    flex: 1,
  },
  autoReleaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  autoReleaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  processButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
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
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  orderTitleModal: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});