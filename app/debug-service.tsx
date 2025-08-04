import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ServiceService } from '@/lib/service-service';

export default function DebugServiceScreen() {
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const testServiceId = 'd40aeffa-3cbc-4272-8326-a48e0cda1732';
    
    const fetchService = async () => {
      try {
        addLog('🔍 Starting service fetch...');
        addLog(`🔍 Service ID: ${testServiceId}`);
        
        const serviceData = await ServiceService.getServiceById(testServiceId);
        
        addLog(`📋 Service data received: ${JSON.stringify(serviceData, null, 2)}`);
        
        if (serviceData) {
          setService(serviceData);
          addLog('✅ Service loaded successfully');
        } else {
          setError('Service not found');
          addLog('❌ Service not found');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        addLog(`❌ Error: ${errorMessage}`);
      } finally {
        setLoading(false);
        addLog('🏁 Fetch completed');
      }
    };

    fetchService();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Debug Service Screen</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status:</Text>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}
          {error && <Text style={styles.errorText}>Error: {error}</Text>}
          {service && <Text style={styles.successText}>Service loaded successfully!</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Data:</Text>
          {service ? (
            <View style={styles.serviceData}>
              <Text style={styles.dataText}>ID: {service.id}</Text>
              <Text style={styles.dataText}>Title: {service.title}</Text>
              <Text style={styles.dataText}>Description: {service.description}</Text>
              <Text style={styles.dataText}>Price: {service.currency}{service.price}</Text>
              <Text style={styles.dataText}>Provider: {service.provider_name}</Text>
            </View>
          ) : (
            <Text style={styles.noDataText}>No service data</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Logs:</Text>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#007AFF',
  },
  errorText: {
    color: 'red',
    fontWeight: 'bold',
  },
  successText: {
    color: 'green',
    fontWeight: 'bold',
  },
  serviceData: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
  },
  dataText: {
    fontSize: 14,
    marginBottom: 4,
  },
  noDataText: {
    fontStyle: 'italic',
    color: '#666',
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
    color: '#333',
  },
});