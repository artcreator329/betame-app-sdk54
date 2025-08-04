import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { X, DollarSign, Clock, FileText } from 'lucide-react-native';
import { Service } from '../lib/service-service';

interface ServiceOfferModalProps {
  visible: boolean;
  onClose: () => void;
  service: Service | null;
  onSendOffer: (offerData: {
    serviceId: string;
    customPrice?: number;
    customDescription?: string;
    customDeliveryTime?: number;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function ServiceOfferModal({
  visible,
  onClose,
  service,
  onSendOffer,
  isLoading = false,
}: ServiceOfferModalProps) {
  const [customPrice, setCustomPrice] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customDeliveryTime, setCustomDeliveryTime] = useState('');

  const handleSendOffer = () => {
    if (!service) return;

    const price = customPrice ? parseFloat(customPrice) : undefined;
    const deliveryTime = customDeliveryTime ? parseInt(customDeliveryTime) : undefined;

    if (customPrice && (isNaN(price!) || price! <= 0)) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    if (customDeliveryTime && (isNaN(deliveryTime!) || deliveryTime! <= 0)) {
      Alert.alert('Invalid Delivery Time', 'Please enter a valid delivery time in days.');
      return;
    }

    if (!service.id) {
      Alert.alert('Error', 'Invalid service selected.');
      return;
    }

    onSendOffer({
      serviceId: service.id,
      customPrice: price,
      customDescription: customDescription.trim() || undefined,
      customDeliveryTime: deliveryTime,
    });

    // Reset form
    setCustomPrice('');
    setCustomDescription('');
    setCustomDeliveryTime('');
  };

  const handleClose = () => {
    setCustomPrice('');
    setCustomDescription('');
    setCustomDeliveryTime('');
    onClose();
  };

  if (!service) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Customize Service Offer
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Service Preview */}
          <View style={styles.servicePreview}>
            {service.image_url && (
              <Image source={{ uri: service.image_url }} style={styles.serviceImage} />
            )}
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.originalPrice}>
                Original Price: ${service.price} {service.currency}
              </Text>
            </View>
          </View>

          {/* Custom Price */}
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <DollarSign size={20} color="#007AFF" />
              <Text style={styles.inputLabel}>Custom Price (Optional)</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder={`Original: $${service.price} ${service.currency}`}
              value={customPrice}
              onChangeText={setCustomPrice}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Custom Delivery Time */}
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <Clock size={20} color="#007AFF" />
              <Text style={styles.inputLabel}>Custom Delivery Time (Days)</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Enter delivery time in days"
              value={customDeliveryTime}
              onChangeText={setCustomDeliveryTime}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Custom Description */}
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <FileText size={20} color="#007AFF" />
              <Text style={styles.inputLabel}>Custom Description (Optional)</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Add any custom details or modifications for this offer..."
              value={customDescription}
              onChangeText={setCustomDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
            onPress={handleSendOffer}
            disabled={isLoading}
          >
            <Text style={styles.sendButtonText}>
              {isLoading ? 'Sending...' : 'Send Offer'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  servicePreview: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginVertical: 16,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  originalDelivery: {
    fontSize: 14,
    color: '#666',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginLeft: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  sendButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});