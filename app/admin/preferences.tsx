import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { adminPreferencesService, AdminSignInPreference } from '@/lib/admin-preferences-service';

export default function AdminPreferencesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    defaultSignInDestination: 'ask' as AdminSignInPreference,
    rememberChoice: false,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userPreferences = await adminPreferencesService.getPreferences(user.id);
      setPreferences(userPreferences);
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: typeof preferences) => {
    if (!user) return;
    
    try {
      await adminPreferencesService.savePreferences(user.id, newPreferences);
      setPreferences(newPreferences);
      Alert.alert('Success', 'Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  const handleDefaultDestinationChange = (destination: AdminSignInPreference) => {
    const newPreferences = {
      ...preferences,
      defaultSignInDestination: destination,
    };
    savePreferences(newPreferences);
  };

  const handleRememberChoiceToggle = (value: boolean) => {
    const newPreferences = {
      ...preferences,
      rememberChoice: value,
      // If turning off remember choice, reset to ask
      defaultSignInDestination: value ? preferences.defaultSignInDestination : 'ask' as AdminSignInPreference,
    };
    savePreferences(newPreferences);
  };

  const clearPreferences = async () => {
    if (!user) return;
    
    Alert.alert(
      'Clear Preferences',
      'This will reset all your admin sign-in preferences. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminPreferencesService.clearPreferences(user.id);
              setPreferences({
                defaultSignInDestination: 'ask',
                rememberChoice: false,
              });
              Alert.alert('Success', 'Preferences cleared successfully');
            } catch (error) {
              console.error('Error clearing preferences:', error);
              Alert.alert('Error', 'Failed to clear preferences');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Sign-In Behavior Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sign-In Behavior</Text>
          <Text style={styles.sectionDescription}>
            Choose what happens when you sign in with your admin account
          </Text>

          {/* Remember Choice Toggle */}
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Remember My Choice</Text>
              <Text style={styles.settingDescription}>
                Skip the choice dialog and use your preferred destination
              </Text>
            </View>
            <Switch
              value={preferences.rememberChoice}
              onValueChange={handleRememberChoiceToggle}
              trackColor={{ false: '#E0E0E0', true: '#2196F3' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Default Destination Options */}
          {preferences.rememberChoice && (
            <View style={styles.destinationOptions}>
              <Text style={styles.optionsTitle}>Default Destination</Text>
              
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  preferences.defaultSignInDestination === 'dashboard' && styles.optionItemSelected
                ]}
                onPress={() => handleDefaultDestinationChange('dashboard')}
              >
                <View style={styles.optionContent}>
                  <Ionicons 
                    name="analytics" 
                    size={20} 
                    color={preferences.defaultSignInDestination === 'dashboard' ? '#2196F3' : '#666'} 
                  />
                  <View style={styles.optionText}>
                    <Text style={[
                      styles.optionTitle,
                      preferences.defaultSignInDestination === 'dashboard' && styles.optionTitleSelected
                    ]}>
                      Admin Dashboard
                    </Text>
                    <Text style={styles.optionDescription}>
                      Go directly to admin tools and analytics
                    </Text>
                  </View>
                </View>
                {preferences.defaultSignInDestination === 'dashboard' && (
                  <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionItem,
                  preferences.defaultSignInDestination === 'app' && styles.optionItemSelected
                ]}
                onPress={() => handleDefaultDestinationChange('app')}
              >
                <View style={styles.optionContent}>
                  <Ionicons 
                    name="home" 
                    size={20} 
                    color={preferences.defaultSignInDestination === 'app' ? '#2196F3' : '#666'} 
                  />
                  <View style={styles.optionText}>
                    <Text style={[
                      styles.optionTitle,
                      preferences.defaultSignInDestination === 'app' && styles.optionTitleSelected
                    ]}>
                      Main App
                    </Text>
                    <Text style={styles.optionDescription}>
                      Use the app as a regular user
                    </Text>
                  </View>
                </View>
                {preferences.defaultSignInDestination === 'app' && (
                  <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={clearPreferences}
          >
            <Ionicons name="refresh" size={20} color="#FF5722" />
            <Text style={styles.actionButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={20} color="#2196F3" />
          <Text style={styles.infoText}>
            You can always switch between admin dashboard and main app using the buttons in your profile page.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },

  section: {
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
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  destinationOptions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  optionItemSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#F3F8FF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: '#2196F3',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5722',
    backgroundColor: '#FFF3F0',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF5722',
    marginLeft: 8,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F8FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2196F3',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
});