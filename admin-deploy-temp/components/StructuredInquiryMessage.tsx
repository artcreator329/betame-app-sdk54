import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Package, MapPin, Clock, DollarSign } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface StructuredInquiryMessageProps {
  message: {
    id: string;
    content: string;
    senderId: string;
    timestamp: Date;
  };
  isOwnMessage: boolean;
  onViewService?: (serviceData: any) => void;
}

export function StructuredInquiryMessage({
  message,
  isOwnMessage,
  onViewService,
}: StructuredInquiryMessageProps) {
  let inquiryData;
  try {
    inquiryData = JSON.parse(message.content);
  } catch (error) {
    console.error('Error parsing structured inquiry data:', error);
    return null;
  }

  const {
    serviceId,
    serviceTitle,
    servicePrice,
    serviceCurrency,
    serviceDescription,
    serviceImage,
    serviceCategory,
    customMessage,
  } = inquiryData;

  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownMessage : styles.otherMessage
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Package size={16} color={Colors.primary.main} />
        </View>
        <Text style={styles.headerText}>Service Inquiry</Text>
      </View>

      {/* Service Info */}
      <View style={styles.serviceInfo}>
        <View style={styles.serviceHeader}>
          {serviceImage ? (
            <Image source={{ uri: serviceImage }} style={styles.serviceImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Package size={20} color={Colors.text.secondary} />
            </View>
          )}
          <View style={styles.serviceDetails}>
            <Text style={styles.serviceTitle}>{serviceTitle}</Text>
            {serviceCategory && (
              <Text style={styles.serviceCategory}>{serviceCategory}</Text>
            )}
          </View>
        </View>

        {/* Service Description */}
        {serviceDescription && (
          <Text style={styles.serviceDescription} numberOfLines={3}>
            {serviceDescription}
          </Text>
        )}

        {/* Service Price */}
        <View style={styles.priceContainer}>
          <DollarSign size={16} color={Colors.primary.main} />
          <Text style={styles.priceText}>
            {serviceCurrency} {servicePrice}
          </Text>
        </View>

        {/* Inquiry Message */}
        <View style={styles.inquiryMessage}>
          <Text style={styles.inquiryText}>
            {customMessage || "Hi! I'm interested in this service. Could you tell me more about it and what's included?"}
          </Text>
        </View>
      </View>

      {/* Action Button */}
      {onViewService && (
        <TouchableOpacity
          style={styles.viewServiceButton}
          onPress={() => onViewService(inquiryData)}
        >
          <Text style={styles.viewServiceButtonText}>View Service Details</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3E8FF', // Light purple background
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#9333EA', // Purple border
    maxWidth: '85%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#F3E8FF', // Light purple background
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3E8FF', // Light purple background
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
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 4,
  },
  inquiryMessage: {
    backgroundColor: Colors.background.primary,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#9333EA', // Purple border
  },
  inquiryText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  viewServiceButton: {
    backgroundColor: '#9333EA', // Purple background
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  viewServiceButtonText: {
    color: Colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
