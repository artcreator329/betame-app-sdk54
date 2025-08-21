import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { FeatureService } from '@/lib/feature-service';
import { ServiceService } from '@/lib/service-service';
import FeatureIconsDebug from '@/components/FeatureIconsDebug';

export default function DebugFeaturesScreen() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      debugFeatures();
    }
  }, [user]);

  const debugFeatures = async () => {
    try {
      setLoading(true);
      
      // Get user's services
      const userServices = await ServiceService.getUserServices(user!.id);
      
      // Get active features for each service
      const servicesWithFeatures = await Promise.all(
        userServices.map(async (service) => {
          const activeFeatures = await FeatureService.getActiveFeaturesForService(service.id);
          return {
            ...service,
            active_features: activeFeatures
          };
        })
      );

      // Get all active features for the user
      const allActiveFeatures = await FeatureService.getActiveFeaturesForServices(
        userServices.map(s => s.id)
      );

      setDebugInfo({
        userServices: userServices.length,
        servicesWithFeatures,
        allActiveFeatures,
        userServices
      });

    } catch (error) {
      console.error('Debug error:', error);
      Alert.alert('Error', 'Failed to debug features');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading debug info...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Feature Debug Information</Text>
        
        {/* Feature Icons Debug Test */}
        <FeatureIconsDebug />
        
        <Text style={styles.sectionTitle}>User Services: {debugInfo?.userServices}</Text>
        
        {debugInfo?.servicesWithFeatures.map((service: any, index: number) => (
          <View key={service.id} style={styles.serviceCard}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <Text style={styles.serviceId}>ID: {service.id}</Text>
            <Text style={styles.featureCount}>
              Active Features: {service.active_features?.length || 0}
            </Text>
            
            {service.active_features?.map((feature: any, featureIndex: number) => (
              <View key={featureIndex} style={styles.featureItem}>
                <Text style={styles.featureName}>• {feature.feature_name}</Text>
                <Text style={styles.featureType}>Type: {feature.feature_type}</Text>
                <Text style={styles.featureExpiry}>
                  Expires: {new Date(feature.expires_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.sectionTitle}>All Active Features Map:</Text>
        <Text style={styles.jsonText}>
          {JSON.stringify(debugInfo?.allActiveFeatures, null, 2)}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  serviceCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  serviceId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  featureCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  featureItem: {
    marginLeft: 16,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  featureType: {
    fontSize: 12,
    color: '#666',
  },
  featureExpiry: {
    fontSize: 12,
    color: '#666',
  },
  jsonText: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
  },
});
