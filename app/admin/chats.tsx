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
  MessageSquare,
  Users,
  Calendar,
  Eye,
  AlertTriangle,
  Ban,
  Trash2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/lib/admin-service';
import { Colors } from '@/constants/Colors';

interface Chat {
  id: string;
  participant1_id: string;
  participant2_id: string;
  created_at: string;
  last_message_at: string;
  is_active: boolean;
  message_count: number;
  participant1?: {
    full_name: string;
    email: string;
  };
  participant2?: {
    full_name: string;
    email: string;
  };
}

interface ChatCardProps {
  chat: Chat;
  onView: () => void;
  onDelete: () => void;
}

function ChatCard({ chat, onView, onDelete }: ChatCardProps) {
  const getParticipantNames = () => {
    const name1 = chat.participant1?.full_name || 'Unknown User';
    const name2 = chat.participant2?.full_name || 'Unknown User';
    return `${name1} & ${name2}`;
  };

  const getLastActivity = () => {
    const date = new Date(chat.last_message_at || chat.created_at);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Active now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  return (
    <View style={styles.chatCard as any}>
      <View style={styles.chatHeader as any}>
        <View style={styles.chatInfo as any}>
          <View style={styles.chatParticipants as any}>
          <MessageSquare size={16} color="#007AFF" />
          <Text style={styles.participantNames as any}>{getParticipantNames()}</Text>
        </View>
        <View style={styles.chatStats as any}>
            <Text style={styles.messageCount as any}>{chat.message_count || 0} messages</Text>
          <Text style={styles.lastActivity as any}>{getLastActivity()}</Text>
          </View>
        </View>
        <View style={styles.chatActions as any}>
          <TouchableOpacity style={styles.actionButton as any} onPress={onView}>
            <Eye size={16} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton as any, styles.deleteButton as any]} onPress={onDelete}>
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.chatDetails as any}>
        <View style={styles.detailItem as any}>
          <Users size={14} color="#6B7280" />
          <Text style={styles.detailText as any}>
            {chat.participant1?.email} • {chat.participant2?.email}
          </Text>
        </View>
        <View style={styles.detailItem as any}>
          <Calendar size={14} color="#6B7280" />
          <Text style={styles.detailText as any}>
            Created {new Date(chat.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge as any, { backgroundColor: chat.is_active ? '#10B981' + '20' : '#6B7280' + '20' }]}>
          <Text style={[styles.statusText as any, { color: chat.is_active ? '#10B981' : '#6B7280' }]}>
            {chat.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function AdminChats() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
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

      await loadChats();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    }
  };

  const loadChats = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const result = await adminService.getAllChats(pageNum, 20);
      
      if (refresh || pageNum === 1) {
        setChats(result.chats);
      } else {
        setChats(prev => [...prev, ...result.chats]);
      }
      
      setHasMore(result.chats.length === 20); // Has more if we got a full page
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading chats:', error);
      Alert.alert('Error', 'Failed to load chats');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadChats(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadChats(page + 1);
    }
  };

  const handleViewChat = (chat: Chat) => {
    Alert.alert(
      'Chat Details',
      `Chat ID: ${chat.id}\nParticipants: ${chat.participant1?.full_name} & ${chat.participant2?.full_name}\nMessages: ${chat.message_count}\nStatus: ${chat.is_active ? 'Active' : 'Inactive'}\nCreated: ${new Date(chat.created_at).toLocaleString()}\nLast Activity: ${new Date(chat.last_message_at || chat.created_at).toLocaleString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Messages', onPress: () => console.log('View messages for chat:', chat.id) },
      ]
    );
  };

  const handleDeleteChat = (chat: Chat) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete the chat between ${chat.participant1?.full_name} and ${chat.participant2?.full_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await adminService.deleteChat(chat.id);
              if (success) {
                setChats(prev => prev.filter(c => c.id !== chat.id));
                Alert.alert('Success', 'Chat deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete chat');
              }
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete chat');
            }
          },
        },
      ]
    );
  };

  const filteredChats = (chats || []).filter(chat => {
    const participant1Name = chat.participant1?.full_name?.toLowerCase() || '';
    const participant2Name = chat.participant2?.full_name?.toLowerCase() || '';
    const participant1Email = chat.participant1?.email?.toLowerCase() || '';
    const participant2Email = chat.participant2?.email?.toLowerCase() || '';
    
    const matchesSearch = participant1Name.includes(searchQuery.toLowerCase()) ||
                         participant2Name.includes(searchQuery.toLowerCase()) ||
                         participant1Email.includes(searchQuery.toLowerCase()) ||
                         participant2Email.includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && chat.is_active) ||
                         (filterStatus === 'inactive' && !chat.is_active);
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading && chats.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Chat Management</Text>
          <Text style={styles.headerSubtitle}>{(filteredChats || []).length} active chats</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chats..."
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
        {['all', 'active', 'inactive'].map((status) => (
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

      {/* Chats List */}
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
        {(filteredChats || []).length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageSquare size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No chats found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search criteria' : 'Chats will appear here when users start messaging'}
            </Text>
          </View>
        ) : (
          (filteredChats || []).map((chat) => (
            <ChatCard
              key={chat.id}
              chat={chat}
              onView={() => handleViewChat(chat)}
              onDelete={() => handleDeleteChat(chat)}
            />
          ))
        )}
        
        {isLoading && chats.length > 0 && (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingMoreText}>Loading more...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
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
    backgroundColor: '#007AFF' + '10',
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
  chatCard: {
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
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  chatInfo: {
    flex: 1,
    marginRight: 16,
  },
  chatParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  participantNames: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  chatStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  lastActivity: {
    fontSize: 14,
    color: '#6B7280',
  },
  chatActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  chatDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
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