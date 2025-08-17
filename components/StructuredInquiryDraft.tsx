import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { Package, X, Send } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface StructuredInquiryDraftProps {
  inquiryData: {
    serviceId: string;
    serviceTitle: string;
    servicePrice: string;
    serviceCurrency: string;
    serviceDescription: string;
    serviceImage?: string;
    serviceCategory?: string;
  };
  onSend: (customMessage?: string) => void;
  onCancel: () => void;
}

export function StructuredInquiryDraft({
  inquiryData,
  onSend,
  onCancel,
}: StructuredInquiryDraftProps) {
  const [customMessage, setCustomMessage] = useState('Hi! I\'m interested in this service. Could you tell me more about it and what\'s included?');

  const handleSend = () => {
    onSend(customMessage.trim() || undefined);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Package size={16} color={Colors.primary.main} />
        </View>
        <Text style={styles.headerText}>Service Inquiry</Text>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <X size={16} color={Colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Service Info */}
      <View style={styles.serviceInfo}>
        <View style={styles.serviceHeader}>
          {inquiryData.serviceImage ? (
            <Image source={{ uri: inquiryData.serviceImage }} style={styles.serviceImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Package size={20} color={Colors.text.secondary} />
            </View>
          )}
          <View style={styles.serviceDetails}>
            <Text style={styles.serviceTitle}>{inquiryData.serviceTitle}</Text>
            {inquiryData.serviceCategory && (
              <Text style={styles.serviceCategory}>{inquiryData.serviceCategory}</Text>
            )}
          </View>
        </View>

        {/* Service Description */}
        {inquiryData.serviceDescription && (
          <Text style={styles.serviceDescription} numberOfLines={2}>
            {inquiryData.serviceDescription}
          </Text>
        )}

        {/* Service Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>
            {inquiryData.serviceCurrency} {inquiryData.servicePrice}
          </Text>
        </View>

        {/* Custom Inquiry Message */}
        <View style={styles.inquiryMessage}>
          <Text style={styles.inquiryLabel}>Your Message:</Text>
          <TextInput
            style={styles.inquiryInput}
            value={customMessage}
            onChangeText={setCustomMessage}
            placeholder="Write your inquiry message..."
            placeholderTextColor="#9333EA80"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {customMessage.length}/500 characters
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.cancelActionButton} onPress={onCancel}>
          <Text style={styles.cancelActionText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.sendButton,
            customMessage.trim() ? styles.sendButtonActive : styles.sendButtonInactive
          ]} 
          onPress={handleSend}
          disabled={!customMessage.trim()}
        >
          <Send size={16} color={Colors.text.white} />
          <Text style={styles.sendButtonText}>Send Inquiry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3E8FF', // Light purple background
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#9333EA', // Purple border
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#9333EA', // Purple background
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9333EA', // Purple text
    flex: 1,
  },
  cancelButton: {
    padding: 4,
  },
  serviceInfo: {
    gap: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  serviceCategory: {
    fontSize: 12,
    color: Colors.text.secondary,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  serviceDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  priceContainer: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9333EA', // Purple text
  },
  inquiryMessage: {
    backgroundColor: Colors.background.primary,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#9333EA', // Purple border
  },
  inquiryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9333EA',
    marginBottom: 8,
  },
  inquiryInput: {
    fontSize: 14,
    color: Colors.text.primary,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#9333EA40',
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'right',
    marginTop: 4,
  },
  inquiryText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  cancelActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.text.secondary,
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  cancelActionText: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  sendButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  sendButtonActive: {
    backgroundColor: '#9333EA', // Purple background
  },
  sendButtonInactive: {
    backgroundColor: '#9333EA60', // Semi-transparent purple
  },
  sendButtonText: {
    color: Colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
