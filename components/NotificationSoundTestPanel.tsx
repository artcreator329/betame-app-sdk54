import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Volume2, Bell, Smartphone, Wifi, TestTube } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { pushNotificationService } from '@/lib/push-notification-service';
import { showLocalNotification, checkNotificationPermissions } from '@/lib/local-notifications';
import { Audio } from 'expo-av';

export default function NotificationSoundTestPanel() {
  const colors = useColors();
  const { addNotification } = useNotifications();
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [isTestingLocal, setIsTestingLocal] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);

  const testCustomSound = async () => {
    if (isTestingSound) return;
    
    try {
      setIsTestingSound(true);
      console.log('🔊 Testing custom sound file...');
      
      // Load and play the notification sound directly
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
      
      Alert.alert(
        'Sound Test Complete',
        'Did you hear the custom notification sound (sfx.wav)? If not, check your device volume and notification settings.',
        [{ text: 'Yes, I heard it!' }, { text: 'No sound' }]
      );
    } catch (error) {
      console.error('❌ Error testing sound:', error);
      Alert.alert('Sound Test Failed', 'Could not play the custom sound file. Error: ' + error.message);
    } finally {
      setIsTestingSound(false);
    }
  };

  const testLocalNotification = async () => {
    if (isTestingLocal) return;
    
    try {
      setIsTestingLocal(true);
      console.log('📱 Testing local notification with custom sound...');
      
      // Check permissions first
      const hasPermission = await checkNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Notification permissions are required to test local notifications. Please grant permissions in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Create a test notification
      const testNotification = {
        id: `local-test-${Date.now()}`,
        userId: 'test-user',
        type: 'system' as const,
        title: 'Local Notification Test',
        message: 'This is a test local notification with custom sound (sfx.wav). You should hear the custom sound!',
        timestamp: new Date().toISOString(),
        isRead: false,
        data: { test: true, type: 'local' }
      };

      const success = await showLocalNotification(testNotification);
      
      if (success) {
        Alert.alert(
          'Local Notification Sent',
          'A test local notification was sent with custom sound. Did you hear the sfx.wav sound?',
          [{ text: 'Yes!' }, { text: 'No sound' }]
        );
      } else {
        Alert.alert(
          'Local Notification Failed',
          'Could not send local notification. Check permissions and try again.'
        );
      }
    } catch (error) {
      console.error('❌ Error testing local notification:', error);
      Alert.alert('Test Failed', 'Local notification test failed: ' + error.message);
    } finally {
      setIsTestingLocal(false);
    }
  };

  const testPushNotification = async () => {
    if (isTestingPush) return;
    
    try {
      setIsTestingPush(true);
      console.log('📡 Testing push notification...');
      
      const success = await pushNotificationService.sendTestNotification();
      
      if (success) {
        Alert.alert(
          'Push Notification Sent',
          'A test push notification was sent. Close the app or put it in background to test. You should receive it with custom sound in a few seconds.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Push Notification Failed',
          'Could not send push notification. Make sure you have a valid push token and internet connection.'
        );
      }
    } catch (error) {
      console.error('❌ Error testing push notification:', error);
      Alert.alert('Test Failed', 'Push notification test failed: ' + error.message);
    } finally {
      setIsTestingPush(false);
    }
  };

  const testAppNotification = async () => {
    try {
      console.log('🔔 Testing app notification system...');
      
      // This will trigger the full notification flow
      await addNotification({
        type: 'system',
        title: 'App Notification Test',
        message: 'This is a test notification through the app notification system. Custom sound should play!',
        data: { test: true, type: 'app' }
      }, 'current-user'); // This will be replaced with actual user ID

      Alert.alert(
        'App Notification Sent',
        'A test notification was sent through the app notification system. Check the notifications tab and listen for the custom sound!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Error testing app notification:', error);
      Alert.alert('Test Failed', 'App notification test failed: ' + error.message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
        <TestTube size={24} color={colors.primary.main} />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Notification Sound & Push Test
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={[styles.infoTitle, { color: colors.text.primary }]}>
          Testing Instructions
        </Text>
        <Text style={[styles.infoText, { color: colors.text.secondary }]}>
          Use these tests to verify notification sounds and push notifications work correctly on your device:
        </Text>
      </View>

      <View style={styles.testSection}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Sound Tests
        </Text>

        <TouchableOpacity
          style={[
            styles.testButton,
            { 
              backgroundColor: colors.background.secondary,
              borderColor: colors.border.light,
              opacity: isTestingSound ? 0.6 : 1
            }
          ]}
          onPress={testCustomSound}
          disabled={isTestingSound}
        >
          <Volume2 size={20} color={colors.primary.main} />
          <View style={styles.buttonContent}>
            <Text style={[styles.buttonTitle, { color: colors.text.primary }]}>
              {isTestingSound ? 'Playing Sound...' : 'Test Custom Sound File'}
            </Text>
            <Text style={[styles.buttonDescription, { color: colors.text.secondary }]}>
              Play sfx.wav directly to test audio file
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.testSection}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Local Notification Tests
        </Text>

        <TouchableOpacity
          style={[
            styles.testButton,
            { 
              backgroundColor: colors.background.secondary,
              borderColor: colors.border.light,
              opacity: isTestingLocal ? 0.6 : 1
            }
          ]}
          onPress={testLocalNotification}
          disabled={isTestingLocal}
        >
          <Bell size={20} color={colors.primary.main} />
          <View style={styles.buttonContent}>
            <Text style={[styles.buttonTitle, { color: colors.text.primary }]}>
              {isTestingLocal ? 'Sending...' : 'Test Local Notification'}
            </Text>
            <Text style={[styles.buttonDescription, { color: colors.text.secondary }]}>
              Send local notification with custom sound
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.testButton,
            { 
              backgroundColor: colors.background.secondary,
              borderColor: colors.border.light
            }
          ]}
          onPress={testAppNotification}
        >
          <Bell size={20} color={colors.primary.main} />
          <View style={styles.buttonContent}>
            <Text style={[styles.buttonTitle, { color: colors.text.primary }]}>
              Test App Notification System
            </Text>
            <Text style={[styles.buttonDescription, { color: colors.text.secondary }]}>
              Test full notification flow through app
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.testSection}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Push Notification Tests
        </Text>

        <TouchableOpacity
          style={[
            styles.testButton,
            { 
              backgroundColor: colors.background.secondary,
              borderColor: colors.border.light,
              opacity: isTestingPush ? 0.6 : 1
            }
          ]}
          onPress={testPushNotification}
          disabled={isTestingPush}
        >
          <Smartphone size={20} color={colors.primary.main} />
          <View style={styles.buttonContent}>
            <Text style={[styles.buttonTitle, { color: colors.text.primary }]}>
              {isTestingPush ? 'Sending...' : 'Test Push Notification'}
            </Text>
            <Text style={[styles.buttonDescription, { color: colors.text.secondary }]}>
              Send push notification (close app to test)
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.troubleshootingBox, { backgroundColor: colors.background.secondary }]}>
        <Text style={[styles.troubleshootingTitle, { color: colors.text.primary }]}>
          Troubleshooting Tips
        </Text>
        <Text style={[styles.troubleshootingText, { color: colors.text.secondary }]}>
          • Test on physical device (not simulator){'\n'}
          • Check device volume and notification settings{'\n'}
          • Disable Do Not Disturb mode{'\n'}
          • Grant notification permissions{'\n'}
          • For push tests, close app or put in background{'\n'}
          • Ensure internet connection for push notifications
        </Text>
      </View>
    </ScrollView>
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
  infoBox: {
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  testSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  troubleshootingBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  troubleshootingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  troubleshootingText: {
    fontSize: 14,
    lineHeight: 20,
  },
});