import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { sessionManager } from '@/lib/session-manager';

interface SessionStatusProps {
  showRefreshButton?: boolean;
}

export function SessionStatus({ showRefreshButton = false }: SessionStatusProps) {
  const { user, session, loading } = useAuth();

  const handleRefreshSession = async () => {
    try {
      console.log('🔄 SessionStatus: Manual session refresh requested...');
      const result = await sessionManager.refreshSession();
      if (result.success) {
        console.log('✅ SessionStatus: Manual session refresh successful');
      } else {
        console.log('❌ SessionStatus: Manual session refresh failed:', result.error);
      }
    } catch (error) {
      console.error('❌ SessionStatus: Manual session refresh error:', error);
    }
  };

  const getSessionStatus = () => {
    if (loading) return 'Loading...';
    if (!session) return 'Not authenticated';
    if (!user) return 'Session invalid';
    return 'Authenticated';
  };

  const getSessionInfo = () => {
    if (!session) return 'No session';
    return `User: ${user?.email || 'Unknown'}`;
  };

  if (!showRefreshButton) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>Status: {getSessionStatus()}</Text>
        <Text style={styles.info}>{getSessionInfo()}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.status}>Status: {getSessionStatus()}</Text>
      <Text style={styles.info}>{getSessionInfo()}</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshSession}>
        <Text style={styles.refreshButtonText}>Refresh Session</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SessionStatus; 