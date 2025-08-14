import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { X, MapPin } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { ServiceService, Service } from '../lib/service-service';
import { useAuth } from '../contexts/AuthContext';

interface ServiceSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onServiceSelect: (service: Service) => void;
  featureTitle: string;
}

export function ServiceSelectionModal({
  visible,
  onClose,
  onServiceSelect,
  featureTitle,
}: ServiceSelectionModalProps) {
  const colors = useColors();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && user?.id) {
      loadUserServices();
    }
  }, [visible, user?.id]);

  const loadUserServices = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const userServices = await ServiceService.getUserServices(user.id);
      // Filter out service variants, only show main services
      const mainServices = userServices.filter(service => !service.parent_service_id);
      setServices(mainServices);
    } catch (error) {
      console.error('Error loading user services:', error);
      Alert.alert('Error', 'Failed to load your services');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    onServiceSelect(service);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background.tertiary }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Select Service for {featureTitle}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>
            Choose which service you want to apply this boost feature to:
          </Text>

          {/* Services List */}
          <ScrollView style={styles.servicesList} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
                  Loading your services...
                </Text>
              </View>
            ) : services.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                  You don't have any services yet.
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
                  Create a service first to use boost features.
                </Text>
              </View>
            ) : (
              services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[styles.serviceCard, { backgroundColor: colors.background.secondary }]}
                  onPress={() => handleServiceSelect(service)}
                >
                  {service.image_url && (
                    <Image source={{ uri: service.image_url }} style={styles.serviceImage} />
                  )}
                  <View style={styles.serviceContent}>
                    <Text style={[styles.serviceTitle, { color: colors.text.primary }]}>
                      {service.title}
                    </Text>
                    <Text 
                      style={[styles.serviceDescription, { color: colors.text.secondary }]}
                      numberOfLines={2}
                    >
                      {service.description}
                    </Text>
                    {service.location && (
                      <View style={styles.locationContainer}>
                        <MapPin size={14} color={colors.text.secondary} />
                        <Text style={[styles.locationText, { color: colors.text.secondary }]}>
                          {service.location}
                        </Text>
                      </View>
                    )}
                    <View style={styles.priceContainer}>
                      <Text style={[styles.priceText, { color: colors.primary.main }]}>
                        {service.currency} {service.price}
                      </Text>
                      <Text style={[styles.categoryText, { color: colors.text.secondary }]}>
                        {service.category_name}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  servicesList: {
    maxHeight: 400,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  serviceCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});