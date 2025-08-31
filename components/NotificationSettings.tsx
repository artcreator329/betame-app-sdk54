import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Bell, BellOff, MapPin, Megaphone, Volume2, Play, TestTube } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { notificationScheduler, NotificationPreferences } from '@/lib/notification-scheduler';
import { Audio } from 'expo-av';

interface NotificationSettingsProps {
  onClose?: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const colors = useColors();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    marketingNotificationsEnabled: true,
    checkInRemindersEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await notificationScheduler.getNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarketingToggle = async (enabled: boolean) => {
    try {
      await notificationScheduler.setMarketingNotificationsEnabled(enabled);
      setPreferences(prev => ({ ...prev, marketingNotificationsEnabled: enabled }));
      
      if (!enabled) {
        Alert.alert(
          'Marketing Notifications Disabled',
          'You will no longer receive daily marketing notifications. You can re-enable them anytime in settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating marketing notifications preference:', error);
      Alert.alert('Error', 'Failed to update notification preferences. Please try again.');
    }
  };

  const handleCheckInToggle = async (enabled: boolean) => {
    try {
      await notificationScheduler.setCheckInRemindersEnabled(enabled);
      setPreferences(prev => ({ ...prev, checkInRemindersEnabled: enabled }));
      
      if (!enabled) {
        Alert.alert(
          'Check-in Reminders Disabled',
          'You will no longer receive check-in reminder notifications.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating check-in reminders preference:', error);
      Alert.alert('Error', 'Failed to update notification preferences. Please try again.');
    }
  };

  const handleSoundPreview = async () => {
    if (isPlayingSound) return;
    
    try {
      setIsPlayingSound(true);
      
      // Load and play the notification sound
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sfx.wav'),
        { shouldPlay: true }
      );
      
      // Wait for the sound to finish playing
      await new Promise((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            resolve(true);
          }
        });
      });
      
      // Clean up
      await sound.unloadAsync();
    } catch (error) {
      console.error('Error playing notification sound:', error);
      Alert.alert('Error', 'Failed to play notification sound preview.');
    } finally {
      setIsPlayingSound(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading preferences...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
        <Bell size={24} color={colors.primary.main} />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Notification Settings
        </Text>
      </View>

      <View style={styles.settingsContainer}>
        {/* Marketing Notifications */}
        <View style={[styles.settingItem, { borderBottomColor: colors.border.light }]}>
          <View style={styles.settingInfo}>
            <View style={styles.settingHeader}>
              <Megaphone size={20} color={colors.primary.main} />
              <Text style={[styles.settingTitle, { color: colors.text.primary }]}>
                Marketing Notifications
              </Text>
            </View>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              Daily notifications about new services, deals, and opportunities (10:00 AM)
            </Text>
          </View>
          <Switch
            value={preferences.marketingNotificationsEnabled}
            onValueChange={handleMarketingToggle}
            trackColor={{ 
              false: colors.background.secondary, 
              true: colors.primary.light 
            }}
            thumbColor={preferences.marketingNotificationsEnabled ? colors.primary.main : colors.text.secondary}
          />
        </View>

        {/* Check-in Reminders */}
        <View style={[styles.settingItem, { borderBottomColor: colors.border.light }]}>
          <View style={styles.settingInfo}>
            <View style={styles.settingHeader}>
              <MapPin size={20} color={colors.primary.main} />
              <Text style={[styles.settingTitle, { color: colors.text.primary }]}>
                Check-in Reminders
              </Text>
            </View>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              Reminders to check in and discover opportunities near you (every 3 days)
            </Text>
          </View>
          <Switch
            value={preferences.checkInRemindersEnabled}
            onValueChange={handleCheckInToggle}
            trackColor={{ 
              false: colors.background.secondary, 
              true: colors.primary.light 
            }}
            thumbColor={preferences.checkInRemindersEnabled ? colors.primary.main : colors.text.secondary}
          />
        </View>

        {/* Notification Sound Preview */}
        <View style={[styles.settingItem, { borderBottomColor: colors.border.light }]}>
          <View style={styles.settingInfo}>
            <View style={styles.settingHeader}>
              <Volume2 size={20} color={colors.primary.main} />
              <Text style={[styles.settingTitle, { color: colors.text.primary }]}>
                Notification Sound
              </Text>
            </View>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              Preview the custom notification sound used by the app
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.playButton,
              { 
                backgroundColor: isPlayingSound ? colors.background.secondary : colors.primary.main,
                opacity: isPlayingSound ? 0.6 : 1
              }
            ]}
            onPress={handleSoundPreview}
            disabled={isPlayingSound}
          >
            <Play 
              size={16} 
              color={colors.text.white} 
              fill={colors.text.white}
            />
          </TouchableOpacity>
        </View>

        {/* Test Notifications */}
        <View style={[styles.settingItem, { borderBottomColor: colors.border.light }]}>
          <View style={styles.settingInfo}>
            <View style={styles.settingHeader}>
              <TestTube size={20} color={colors.primary.main} />
              <Text style={[styles.settingTitle, { color: colors.text.primary }]}>
                Test Notifications
              </Text>
            </View>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              Test notification sounds and push notifications on your device
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: colors.primary.main }]}
            onPress={() => {
              // This would open a test panel - for now just show an alert
              Alert.alert(
                'Notification Test',
                'Use the test panel in the admin section or development tools to test notifications with custom sound.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={[styles.testButtonText, { color: colors.text.white }]}>
              Test
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={[styles.infoBox, { backgroundColor: colors.background.secondary }]}>
          <BellOff size={16} color={colors.text.secondary} />
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            You can always change these settings later. Important notifications like messages and orders will still be delivered.
          </Text>
        </View>
      </View>

      {onClose && (
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.primary.main }]}
          onPress={onClose}
        >
          <Text style={[styles.closeButtonText, { color: colors.text.white }]}>
            Done
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  settingsContainer: {
    gap: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 28,
  },
  infoContainer: {
    marginTop: 32,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});