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
  Eye,
  Trash2,
  Star,
  MapPin,
  DollarSign,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/lib/admin-service';
import { Colors } from '@/constants/Colors';

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  images: string[];
  user_id: string;
  created_at: string;
  status: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface ServiceCardProps {
  service: Service;
  onView: (service: Service) => void;
  onDelete: (serviceId: string) => void;
}

function ServiceCard({ service, onView, onDelete }: ServiceCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return `RM ${price.toFixed(2)}`;
  };

  return (
    <TouchableOpacity style={styles.serviceCard} onPress={() => onView(service)}>
      <View style={styles.serviceHeader}>
        <Image
          source={{
            uri: service.images?.[0] || undefined,
          }}
          style={styles.serviceImage}
        />
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTitle} numberOfLines={2}>
            {service.title}
          </Text>
          <Text style={styles.serviceProvider}>
            by {service.profiles?.full_name || 'Unknown'}
          </Text>
          <View style={styles.serviceMeta}>
            <View style={styles.metaItem}>
              <DollarSign size={14} color="#007AFF" />
              <Text style={styles.servicePrice}>{formatPrice(service.price)}</Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.serviceLocation}>{service.location}</Text>
            </View>
          </View>
        </View>
        <View style={styles.serviceActions}>
          <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: service.status === 'active' ? '#10B98120' : '#EF444420',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: service.status === 'active' ? '#10B981' : '#EF4444',
              },
            ]}
          >
              {service.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onDelete(service.id)}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.serviceFooter}>
        <Text style={styles.serviceCategory}>{service.category}</Text>
        <Text style={styles.serviceDate}>Created: {formatDate(service.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminServices() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    filterServices();
  }, [services, searchQuery, filterActive]);

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

      await loadServices();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    }
  };

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const result = await adminService.getAllServices();
      setServices(result.services);
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = services;

    if (searchQuery) {
      filtered = filtered.filter(
        (service) =>
          service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          service.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          service.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterActive !== null) {
      filtered = filtered.filter((service) => 
        filterActive ? service.status === 'active' : service.status !== 'active'
      );
    }

    setFilteredServices(filtered);
  };

  const handleViewService = (service: Service) => {
    router.push(`/service/${service.id}`);
  };

  const handleDeleteService = async (serviceId: string) => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteService(serviceId);
              await loadServices();
              Alert.alert('Success', 'Service deleted successfully');
            } catch (error) {
              console.error('Error deleting service:', error);
              Alert.alert('Error', 'Failed to delete service');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading services...</Text>
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
          <Text style={styles.headerTitle}>Service Management</Text>
          <Text style={styles.headerSubtitle}>{(filteredServices || []).length} services</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
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

      {/* Services List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {(filteredServices || []).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No services found</Text>
          </View>
        ) : (
          (filteredServices || []).map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onView={handleViewService}
              onDelete={handleDeleteService}
            />
          ))
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
  searchSection: {
    padding: 20,
    backgroundColor: 'white',
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
    color: '#1F2937',
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
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
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
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  serviceHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  serviceImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceProvider: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  serviceMeta: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  serviceLocation: {
    fontSize: 12,
    color: '#6B7280',
  },
  serviceActions: {
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
    fontWeight: '500',
  },
  actionButton: {
    padding: 8,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  serviceCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
    backgroundColor: '#007AFF20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  serviceDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
  },
});