import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Shield, AlertTriangle } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface ContactInfoWarningMessageProps {
  violationType: 'contact_info_sharing' | 'spam' | 'inappropriate_content';
  detectedContent: string;
}

export function ContactInfoWarningMessage({ 
  violationType, 
  detectedContent 
}: ContactInfoWarningMessageProps) {
  const getWarningConfig = () => {
    switch (violationType) {
      case 'contact_info_sharing':
        return {
          icon: <Shield size={20} color="#FF6B35" />,
          title: '🛡️ Communication Safety Notice',
          message: 'We detected an attempt to share contact information. For your safety and privacy, all communication should happen within the app.',
          backgroundColor: '#FFF4F2',
          borderColor: '#FF6B35',
          textColor: '#D63031'
        };
      case 'spam':
        return {
          icon: <AlertTriangle size={20} color="#F39C12" />,
          title: '⚠️ Spam Content Detected',
          message: 'This message was flagged as potential spam and has been blocked to protect users.',
          backgroundColor: '#FEF9E7',
          borderColor: '#F39C12',
          textColor: '#E67E22'
        };
      default:
        return {
          icon: <AlertTriangle size={20} color="#E74C3C" />,
          title: '🚫 Content Blocked',
          message: 'This message was blocked for containing inappropriate content.',
          backgroundColor: '#FDEDEC',
          borderColor: '#E74C3C',
          textColor: '#C0392B'
        };
    }
  };

  const config = getWarningConfig();

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor 
      }
    ]}>
      <View style={styles.header}>
        {config.icon}
        <Text style={[styles.title, { color: config.textColor }]}>
          {config.title}
        </Text>
      </View>
      
      <Text style={[styles.message, { color: config.textColor }]}>
        {config.message}
      </Text>
      
      <View style={styles.safetyTips}>
        <Text style={[styles.safetyTitle, { color: config.textColor }]}>
          🔒 Why we protect you:
        </Text>
        <Text style={styles.safetyText}>
          • Prevents scams and fraud{'\n'}
          • Protects your personal information{'\n'}
          • Ensures secure transactions{'\n'}
          • Maintains platform safety standards
        </Text>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Continue using our secure messaging system for safe communication.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '500',
  },
  safetyTips: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  safetyTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  safetyText: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});