import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FeatureIcons from './FeatureIcons';
import { ServiceFeatureApplication } from '@/lib/feature-service';

export default function FeatureIconsTest() {
  // Test data with different feature types
  const testFeatures: ServiceFeatureApplication[] = [
    {
      id: '1',
      user_id: 'test-user',
      service_id: 'test-service',
      feature_type: 'boost_instant',
      feature_name: 'Boost (instant visibility)',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    },
    {
      id: '2',
      user_id: 'test-user',
      service_id: 'test-service',
      feature_type: 'showcase_max',
      feature_name: 'Showcase (Max visibility)',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    },
    {
      id: '3',
      user_id: 'test-user',
      service_id: 'test-service',
      feature_type: 'feature_2x',
      feature_name: 'Feature (2x visibility)',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    },
    {
      id: '4',
      user_id: 'test-user',
      service_id: 'test-service',
      feature_type: 'boost_feature_max',
      feature_name: 'Boost Feature (Max visibility)',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feature Icons Test</Text>
      
      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>All Features:</Text>
        <FeatureIcons features={testFeatures} size={24} />
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Boost Feature Only:</Text>
        <FeatureIcons features={[testFeatures[0]]} size={20} />
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Showcase Feature Only:</Text>
        <FeatureIcons features={[testFeatures[1]]} size={20} />
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Feature 2x Only:</Text>
        <FeatureIcons features={[testFeatures[2]]} size={20} />
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Boost Feature Max Only:</Text>
        <FeatureIcons features={[testFeatures[3]]} size={20} />
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>No Features (should show nothing):</Text>
        <FeatureIcons features={[]} size={20} />
        <Text style={styles.note}>No icons should appear above</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  testSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  note: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
});
