import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface AdminSignInChoiceModalProps {
  visible: boolean;
  onContinueToApp: (rememberChoice?: boolean) => void;
  onGoToDashboard: (rememberChoice?: boolean) => void;
  userEmail?: string;
}

export function AdminSignInChoiceModal({
  visible,
  onContinueToApp,
  onGoToDashboard,
  userEmail
}: AdminSignInChoiceModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={styles.blurView}>
            <View style={styles.modalContainer}>
              <ModalContent 
                onContinueToApp={onContinueToApp}
                onGoToDashboard={onGoToDashboard}
                userEmail={userEmail}
              />
            </View>
          </BlurView>
        ) : (
          <View style={styles.androidOverlay}>
            <View style={styles.modalContainer}>
              <ModalContent 
                onContinueToApp={onContinueToApp}
                onGoToDashboard={onGoToDashboard}
                userEmail={userEmail}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function ModalContent({ 
  onContinueToApp, 
  onGoToDashboard, 
  userEmail 
}: {
  onContinueToApp: (rememberChoice?: boolean) => void;
  onGoToDashboard: (rememberChoice?: boolean) => void;
  userEmail?: string;
}) {
  const [rememberChoice, setRememberChoice] = useState(false);
  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={32} color="#2196F3" />
        </View>
        <Text style={styles.title}>Admin Account Detected</Text>
        <Text style={styles.subtitle}>
          Welcome back! You're signing in with an admin account.
        </Text>
        {userEmail && (
          <Text style={styles.email}>{userEmail}</Text>
        )}
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => onGoToDashboard(rememberChoice)}
          activeOpacity={0.8}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="analytics" size={24} color="#2196F3" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Go to Admin Dashboard</Text>
            <Text style={styles.optionDescription}>
              Access admin tools, analytics, user management, and system controls
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => onContinueToApp(rememberChoice)}
          activeOpacity={0.8}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="home" size={24} color="#4CAF50" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Continue to Main App</Text>
            <Text style={styles.optionDescription}>
              Use the app as a regular user to browse services and connect with others
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Remember Choice Option */}
      <View style={styles.rememberContainer}>
        <View style={styles.rememberContent}>
          <Text style={styles.rememberText}>Remember my choice</Text>
          <Text style={styles.rememberSubtext}>Skip this dialog for 30 days</Text>
        </View>
        <Switch
          value={rememberChoice}
          onValueChange={setRememberChoice}
          trackColor={{ false: '#E0E0E0', true: '#2196F3' }}
          thumbColor={rememberChoice ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          You can always switch between admin dashboard and main app from your profile settings.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: Math.min(width - 40, 400),
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  email: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  rememberContent: {
    flex: 1,
  },
  rememberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  rememberSubtext: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});