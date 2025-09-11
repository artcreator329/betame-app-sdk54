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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Activity,
  Server,
  Database,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Globe,
  Shield,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/lib/admin-service';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface SystemMetrics {
  server: {
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  database: {
    connections: number;
    queryTime: number;
    cacheHitRate: number;
    diskUsage: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  services: Array<{
    name: string;
    status: 'online' | 'offline' | 'degraded';
    responseTime: number;
    lastCheck: string;
  }>;
  alerts: Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  status: 'healthy' | 'warning' | 'critical';
  description?: string;
}

function MetricCard({ title, value, unit, icon, status, description }: MetricCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'critical':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={16} color="#10B981" />;
      case 'warning':
        return <AlertTriangle size={16} color="#F59E0B" />;
      case 'critical':
        return <XCircle size={16} color="#EF4444" />;
      default:
        return <Activity size={16} color="#6B7280" />;
    }
  };

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: getStatusColor(status) + '20' }]}>
          {icon}
        </View>
        <View style={styles.statusIndicator}>
          {getStatusIcon(status)}
        </View>
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricValue}>
          {value}{unit && <Text style={styles.metricUnit}>{unit}</Text>}
        </Text>
        <Text style={styles.metricTitle}>{title}</Text>
        {description && <Text style={styles.metricDescription}>{description}</Text>}
      </View>
    </View>
  );
}

interface ServiceStatusProps {
  service: {
    name: string;
    status: 'online' | 'offline' | 'degraded';
    responseTime: number;
    lastCheck: string;
  };
}

function ServiceStatus({ service }: ServiceStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#10B981';
      case 'degraded':
        return '#F59E0B';
      case 'offline':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle size={16} color="#10B981" />;
      case 'degraded':
        return <AlertTriangle size={16} color="#F59E0B" />;
      case 'offline':
        return <XCircle size={16} color="#EF4444" />;
      default:
        return <Activity size={16} color="#6B7280" />;
    }
  };

  return (
    <View style={styles.serviceItem}>
      <View style={styles.serviceInfo}>
        <View style={styles.serviceHeader}>
          {getStatusIcon(service.status)}
          <Text style={styles.serviceName}>{service.name}</Text>
        </View>
        <Text style={styles.serviceDetails}>
          Response: {service.responseTime}ms • Last check: {new Date(service.lastCheck).toLocaleTimeString()}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(service.status) + '20' }]}>
        <Text style={[styles.statusText, { color: getStatusColor(service.status) }]}>
          {service.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

interface AlertItemProps {
  alert: {
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    resolved: boolean;
  };
  onResolve: (alertId: string) => void;
}

function AlertItem({ alert, onResolve }: AlertItemProps) {
  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      case 'info':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle size={16} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={16} color="#F59E0B" />;
      case 'info':
        return <Activity size={16} color="#3B82F6" />;
      default:
        return <Activity size={16} color="#6B7280" />;
    }
  };

  return (
    <View style={[styles.alertItem, alert.resolved && styles.alertResolved]}>
      <View style={styles.alertHeader}>
        {getAlertIcon(alert.type)}
        <Text style={styles.alertMessage}>{alert.message}</Text>
      </View>
      <Text style={styles.alertTimestamp}>
        {new Date(alert.timestamp).toLocaleString()}
      </Text>
      {!alert.resolved && (
        <TouchableOpacity
          style={styles.resolveButton}
          onPress={() => onResolve(alert.id)}
        >
          <Text style={styles.resolveButtonText}>Resolve</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SystemMonitor() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (!isLoading) {
        loadSystemMetrics();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLoading]);

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

      await loadSystemMetrics();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    }
  };

  const loadSystemMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Mock system metrics - in real app, this would come from monitoring services
      const mockMetrics: SystemMetrics = {
        server: {
          uptime: 99.8,
          cpuUsage: 45,
          memoryUsage: 68,
          diskUsage: 32,
          networkLatency: 12,
          status: 'healthy',
        },
        database: {
          connections: 45,
          queryTime: 2.3,
          cacheHitRate: 94,
          diskUsage: 28,
          status: 'healthy',
        },
        api: {
          requestsPerMinute: 1250,
          averageResponseTime: 180,
          errorRate: 0.2,
          activeConnections: 89,
          status: 'healthy',
        },
        services: [
          {
            name: 'Authentication Service',
            status: 'online',
            responseTime: 45,
            lastCheck: new Date().toISOString(),
          },
          {
            name: 'Payment Gateway',
            status: 'online',
            responseTime: 120,
            lastCheck: new Date().toISOString(),
          },
          {
            name: 'Notification Service',
            status: 'degraded',
            responseTime: 350,
            lastCheck: new Date().toISOString(),
          },
          {
            name: 'File Storage',
            status: 'online',
            responseTime: 80,
            lastCheck: new Date().toISOString(),
          },
          {
            name: 'Search Engine',
            status: 'online',
            responseTime: 95,
            lastCheck: new Date().toISOString(),
          },
        ],
        alerts: [
          {
            id: 'alert_1',
            type: 'warning',
            message: 'High memory usage detected on server-01',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            resolved: false,
          },
          {
            id: 'alert_2',
            type: 'info',
            message: 'Database backup completed successfully',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            resolved: true,
          },
          {
            id: 'alert_3',
            type: 'error',
            message: 'Payment gateway timeout increased',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            resolved: false,
          },
        ],
      };
      
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error loading system metrics:', error);
      Alert.alert('Error', 'Failed to load system metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSystemMetrics();
    setRefreshing(false);
  };

  const handleResolveAlert = (alertId: string) => {
    setMetrics(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        alerts: prev.alerts.map(alert =>
          alert.id === alertId ? { ...alert, resolved: true } : alert
        ),
      };
    });
  };

  if (isLoading && !metrics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>Loading system metrics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!metrics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load system metrics</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSystemMetrics}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const unresolvedAlerts = metrics.alerts.filter(alert => !alert.resolved);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* System Overview */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Server Uptime"
              value={metrics.server.uptime}
              unit="%"
              icon={<Server size={20} color="#10B981" />}
              status={metrics.server.status}
              description="Last 30 days"
            />
            <MetricCard
              title="CPU Usage"
              value={metrics.server.cpuUsage}
              unit="%"
              icon={<Cpu size={20} color="#F59E0B" />}
              status={metrics.server.cpuUsage > 80 ? 'critical' : metrics.server.cpuUsage > 60 ? 'warning' : 'healthy'}
            />
            <MetricCard
              title="Memory Usage"
              value={metrics.server.memoryUsage}
              unit="%"
              icon={<MemoryStick size={20} color="#8B5CF6" />}
              status={metrics.server.memoryUsage > 85 ? 'critical' : metrics.server.memoryUsage > 70 ? 'warning' : 'healthy'}
            />
            <MetricCard
              title="Disk Usage"
              value={metrics.server.diskUsage}
              unit="%"
              icon={<HardDrive size={20} color="#06B6D4" />}
              status={metrics.server.diskUsage > 90 ? 'critical' : metrics.server.diskUsage > 75 ? 'warning' : 'healthy'}
            />
          </View>
        </View>

        {/* Database Metrics */}
        <View style={styles.databaseSection}>
          <Text style={styles.sectionTitle}>Database Performance</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Active Connections"
              value={metrics.database.connections}
              icon={<Database size={20} color="#007AFF" />}
              status={metrics.database.status}
            />
            <MetricCard
              title="Query Time"
              value={metrics.database.queryTime}
              unit="ms"
              icon={<Clock size={20} color="#10B981" />}
              status={metrics.database.queryTime > 5 ? 'warning' : 'healthy'}
              description="Average"
            />
            <MetricCard
              title="Cache Hit Rate"
              value={metrics.database.cacheHitRate}
              unit="%"
              icon={<Zap size={20} color="#F59E0B" />}
              status={metrics.database.cacheHitRate < 80 ? 'warning' : 'healthy'}
            />
            <MetricCard
              title="DB Disk Usage"
              value={metrics.database.diskUsage}
              unit="%"
              icon={<HardDrive size={20} color="#EF4444" />}
              status={metrics.database.diskUsage > 80 ? 'critical' : 'healthy'}
            />
          </View>
        </View>

        {/* API Performance */}
        <View style={styles.apiSection}>
          <Text style={styles.sectionTitle}>API Performance</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Requests/Min"
              value={metrics.api.requestsPerMinute.toLocaleString()}
              icon={<Globe size={20} color="#8B5CF6" />}
              status={metrics.api.status}
            />
            <MetricCard
              title="Response Time"
              value={metrics.api.averageResponseTime}
              unit="ms"
              icon={<Clock size={20} color="#06B6D4" />}
              status={metrics.api.averageResponseTime > 500 ? 'warning' : 'healthy'}
              description="Average"
            />
            <MetricCard
              title="Error Rate"
              value={metrics.api.errorRate}
              unit="%"
              icon={<AlertTriangle size={20} color="#EF4444" />}
              status={metrics.api.errorRate > 1 ? 'critical' : metrics.api.errorRate > 0.5 ? 'warning' : 'healthy'}
            />
            <MetricCard
              title="Active Connections"
              value={metrics.api.activeConnections}
              icon={<Wifi size={20} color="#10B981" />}
              status="healthy"
            />
          </View>
        </View>

        {/* Service Status */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Service Status</Text>
          <View style={styles.servicesList}>
            {metrics.services.map((service, index) => (
              <ServiceStatus key={index} service={service} />
            ))}
          </View>
        </View>

        {/* System Alerts */}
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>
            System Alerts ({unresolvedAlerts.length} unresolved)
          </Text>
          <View style={styles.alertsList}>
            {metrics.alerts.length === 0 ? (
              <View style={styles.noAlertsContainer}>
                <CheckCircle size={48} color="#10B981" />
                <Text style={styles.noAlertsText}>No system alerts</Text>
                <Text style={styles.noAlertsSubtext}>All systems are running normally</Text>
              </View>
            ) : (
              metrics.alerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onResolve={handleResolveAlert}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  refreshIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  overviewSection: {
    marginBottom: 32,
  },
  databaseSection: {
    marginBottom: 32,
  },
  apiSection: {
    marginBottom: 32,
  },
  servicesSection: {
    marginBottom: 32,
  },
  alertsSection: {
    marginBottom: 32,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: (width - 56) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    padding: 4,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  metricUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: Colors.text.secondary,
  },
  metricTitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  metricDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  servicesList: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  serviceDetails: {
    fontSize: 14,
    color: Colors.text.secondary,
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
  alertsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  alertResolved: {
    opacity: 0.6,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 16,
    color: Colors.text.primary,
    flex: 1,
  },
  alertTimestamp: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  resolveButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resolveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  noAlertsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noAlertsText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noAlertsSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
});