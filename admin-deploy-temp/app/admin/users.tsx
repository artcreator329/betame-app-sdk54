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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  MapPin,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService, UserManagement } from '@/lib/admin-service';
import { Colors } from '@/constants/Colors';

// Extended UserManagement interface with missing properties
interface ExtendedUserManagement extends UserManagement {
  phone?: string;
  is_active: boolean;
  services_count: number;
  jobs_count: number;
  location?: string;
}

interface UserCardProps {
  user: ExtendedUserManagement;
  onToggleStatus: (userId: string, currentStatus: boolean) => void;
  onViewDetails: (user: ExtendedUserManagement) => void;
}

function UserCard({ user, onToggleStatus, onViewDetails }: UserCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (isActive: boolean): string => {
    return isActive ? '#10B981' : '#EF4444';
  };

  return (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => onViewDetails(user)}
    >
      <View style={styles.userCardHeader}>
        <View style={styles.userInfo}>
          <Image
            source={{
              uri: user.avatar_url || undefined,
            }}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user.full_name || 'Unknown User'}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.userMeta}>
              <Text style={styles.userMetaText}>
                Joined: {formatDate(user.created_at)}
              </Text>
              {user.phone && (
                <View style={styles.metaItem}>
                  <Phone size={12} color={Colors.text.secondary} />
                  <Text style={styles.userMetaText}>{user.phone}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.userActions}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(user.is_active) + '20' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(user.is_active) },
              ]}
            >
              {user.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onToggleStatus(user.id, user.is_active)}
          >
            {user.is_active ? (
              <UserX size={16} color={Colors.text.secondary} />
            ) : (
              <UserCheck size={16} color={Colors.text.secondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.userStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.services_count || 0}</Text>
          <Text style={styles.statLabel}>Services</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.jobs_count || 0}</Text>
          <Text style={styles.statLabel}>Jobs</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            RM {user.wallet_balance?.toFixed(2) || '0.00'}
          </Text>
          <Text style={styles.statLabel}>Wallet</Text>
        </View>
        {user.location && (
          <View style={styles.statItem}>
            <MapPin size={12} color={Colors.text.secondary} />
            <Text style={styles.statLabel}>{user.location}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function AdminUsers() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<ExtendedUserManagement[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ExtendedUserManagement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, filterActive]);

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

      await loadUsers();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const result = await adminService.getAllUsers();
      
      // Handle the response structure { users: [], total: 0 }
      const allUsers = result.users || [];
      
      // Transform UserManagement to ExtendedUserManagement
        const extendedUsers: ExtendedUserManagement[] = allUsers.map(user => ({
          ...user,
          is_active: user.status === 'active', // Use actual status from data
          services_count: user.total_services || 0, // Use actual data from enriched response
          jobs_count: user.total_jobs || 0, // Use actual data from enriched response
          phone: undefined, // Not available in current data structure
          location: undefined, // Not available in current data structure
        }));
      setUsers(extendedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterActive !== null) {
      filtered = filtered.filter((user) => user.is_active === filterActive);
    }

    setFilteredUsers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: currentStatus ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await adminService.toggleUserStatus(userId, !currentStatus);
              await loadUsers();
              Alert.alert('Success', `User ${action}d successfully`);
            } catch (error) {
              console.error('Error toggling user status:', error);
              Alert.alert('Error', `Failed to ${action} user`);
            }
          },
        },
      ]
    );
  };

  const handleViewUserDetails = (selectedUser: ExtendedUserManagement) => {
    Alert.alert(
      'User Details',
      `Name: ${selectedUser.full_name || 'N/A'}\n` +
        `Email: ${selectedUser.email}\n` +
        `Phone: ${selectedUser.phone || 'N/A'}\n` +
        `Location: ${selectedUser.location || 'N/A'}\n` +
        `Services: ${selectedUser.services_count}\n` +
        `Jobs: ${selectedUser.jobs_count}\n` +
        `Wallet: RM ${selectedUser.wallet_balance?.toFixed(2) || '0.00'}\n` +
        `Status: ${selectedUser.is_active ? 'Active' : 'Inactive'}\n` +
        `Joined: ${new Date(selectedUser.created_at).toLocaleDateString()}`,
      [{ text: 'OK' }]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textSecondary}
          />
        </View>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterActive === null && styles.filterButtonActive,
            ]}
            onPress={() => setFilterActive(null)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterActive === null && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterActive === true && styles.filterButtonActive,
            ]}
            onPress={() => setFilterActive(true)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterActive === true && styles.filterButtonTextActive,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterActive === false && styles.filterButtonActive,
            ]}
            onPress={() => setFilterActive(false)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterActive === false && styles.filterButtonTextActive,
              ]}
            >
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Users List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {(filteredUsers || []).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          (filteredUsers || []).map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onToggleStatus={handleToggleUserStatus}
              onViewDetails={handleViewUserDetails}
            />
          ))
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
    color: Colors.textSecondary,
  },

  searchSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  filterButtonTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  userCard: {
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
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  userActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});