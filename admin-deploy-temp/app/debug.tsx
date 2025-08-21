import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DebugPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Page</Text>
      <Text style={styles.subtitle}>If you can see this, the app is loading correctly</Text>
      <Text style={styles.info}>Environment: {process.env.EXPO_PUBLIC_ADMIN_ONLY || 'not set'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
