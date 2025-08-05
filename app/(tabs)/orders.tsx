import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/contexts/ThemeContext';

export default function OrdersScreen() {
  const colors = useColors();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Orders</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Track your service orders</Text>
        <View style={[styles.placeholder, { backgroundColor: colors.background.secondary }]}>
          <Text style={[styles.placeholderText, { color: colors.text.secondary }]}>No orders yet...</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  placeholder: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
  },
});