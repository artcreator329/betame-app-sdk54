import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { X, MapPin, MessageCircle } from 'lucide-react-native';
import Colors from '../constants/Colors';

interface LocationRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onSendLocation: () => void;
  onSendMessage: () => void;
  serviceTitle: string;
  buyerName: string;
}

export function LocationRequestModal({
  visible,
  onClose,
  onSendLocation,
  onSendMessage,
  serviceTitle,
  buyerName,
}: LocationRequestModalProps) {
  const handleSendLocation = () => {
    Alert.alert(
      'Send Location',
      `Share your location with ${buyerName} for the job "${serviceTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Location',
          onPress: () => {
            onSendLocation();
            onClose();
          },
        },
      ]
    );
  };

  const handleSendMessage = () => {
    onSendMessage();
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Job Confirmed!</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MapPin size={48} color={Colors.primary} />
          </View>
          
          <Text style={styles.heading}>
            Time to Share Your Location
          </Text>
          
          <Text style={styles.description}>
            Great! Your job "{serviceTitle}" has been confirmed by {buyerName}. 
            Now it's time to share your location so they know where to meet you.
          </Text>

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Why share location now?</Text>
            <Text style={styles.infoText}>
              • Helps the buyer plan their schedule{'\n'}
              • Ensures smooth coordination{'\n'}
              • Builds trust and professionalism{'\n'}
              • Required before starting the job
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleSendLocation}
            >
              <MapPin size={20} color="white" />
              <Text style={styles.primaryButtonText}>Share My Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleSendMessage}
            >
              <MessageCircle size={20} color={Colors.primary} />
              <Text style={styles.secondaryButtonText}>Send Message Instead</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={handleClose}
            >
              <Text style={styles.tertiaryButtonText}>I'll Do This Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  infoContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  tertiaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});
