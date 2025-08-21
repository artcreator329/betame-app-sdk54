import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { adminPreferencesService } from '@/lib/admin-preferences-service';

interface AdminQuickSwitchProps {
  currentLocation: 'app' | 'admin';
  style?: any;
}

export function AdminQuickSwitch({ currentLocation, style }: AdminQuickSwitchProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [switching, setSwitching] = useState(false);

  const handleSwitch = async () => {
    if (!user || switching) return;

    setSwitching(true);
    
    try {
      const targetLocation = currentLocation === 'app' ? 'admin' : 'app';
      const targetRoute = targetLocation === 'admin' ? '/admin' : '/(tabs)';
      
      // Save the switch preference (but don't remember it for sign-in)
      await adminPreferencesService.saveSignInChoice(user.id, targetLocation, false);
      
      // Navigate to target
      router.replace(targetRoute as any);
      
    } catch (error) {
      console.error('Error switching admin mode:', error);
      Alert.alert('Error', 'Failed to switch mode. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  const getButtonConfig = () => {
    if (currentLocation === 'app') {
      return {
        icon: 'shield-checkmark' as const,
        text: 'Admin Dashboard',
        color: '#2196F3',
        backgroundColor: '#E3F2FD',
      };
    } else {
      return {
        icon: 'home' as const,
        text: 'Main App',
        color: '#4CAF50',
        backgroundColor: '#E8F5E8',
      };
    }
  };

  const config = getButtonConfig();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: config.backgroundColor }, style]}
      onPress={handleSwitch}
      disabled={switching}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: 'white' }]}>
          <Ionicons 
            name={config.icon} 
            size={16} 
            color={config.color} 
          />
        </View>
        <Text style={[styles.text, { color: config.color }]}>
          {switching ? 'Switching...' : `Switch to ${config.text}`}
        </Text>
        <Ionicons 
          name="chevron-forward" 
          size={14} 
          color={config.color} 
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});