import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FeatureIcons from './FeatureIcons';
import { ServiceFeatureApplication } from '@/lib/feature-service';

export default function FeatureIconsDebug() {
  // Sample data based on the actual database records
  const sampleFeatures: ServiceFeatureApplication[] = [
    {
      id: '77420dd9-53a6-468b-8d7d-0b6e16a65afc',
      user_id: 'af123559-a1d8-4434-b662-0925d1d8b3a4',
      service_id: 'e72d015e-0d76-4123-8f6b-9a841fc89789',
      feature_type: 'showcase_max',
      feature_name: 'Showcase (Max visibility)',
      applied_at: '2025-08-20 08:22:12.621+00',
      expires_at: '2025-09-03 08:22:12.537+00',
      created_at: '2025-08-20 08:22:12.652757+00',
      updated_at: '2025-08-20 08:22:12.652757+00',
    },
    {
      id: 'ed2fa30e-69a9-49ae-acbd-6b510998d44e',
      user_id: 'af123559-a1d8-4434-b662-0925d1d8b3a4',
      service_id: '752d4b1c-2e0e-4091-abe3-f3cbb3b04336',
      feature_type: 'feature_2x',
      feature_name: 'Feature (2x visibility)',
      applied_at: '2025-08-20 08:21:03.754+00',
      expires_at: '2025-09-03 08:21:03.688+00',
      created_at: '2025-08-20 08:21:03.804774+00',
      updated_at: '2025-08-20 08:21:03.804774+00',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feature Icons Debug Test</Text>
      
      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Single Feature (Showcase Max):</Text>
        <View style={styles.iconContainer}>
          <FeatureIcons 
            features={[sampleFeatures[0]]} 
            size={24} 
          />
        </View>
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Single Feature (Feature 2x):</Text>
        <View style={styles.iconContainer}>
          <FeatureIcons 
            features={[sampleFeatures[1]]} 
            size={24} 
          />
        </View>
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Multiple Features:</Text>
        <View style={styles.iconContainer}>
          <FeatureIcons 
            features={sampleFeatures} 
            size={20} 
          />
        </View>
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>No Features:</Text>
        <View style={styles.iconContainer}>
          <FeatureIcons 
            features={[]} 
            size={24} 
          />
          <Text style={styles.noFeaturesText}>No features applied</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Debug Information:</Text>
        <Text style={styles.infoText}>• Total features: {sampleFeatures.length}</Text>
        <Text style={styles.infoText}>• Feature types: {sampleFeatures.map(f => f.feature_type).join(', ')}</Text>
        <Text style={styles.infoText}>• Service IDs: {sampleFeatures.map(f => f.service_id).join(', ')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  testSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  noFeaturesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  infoSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
});
