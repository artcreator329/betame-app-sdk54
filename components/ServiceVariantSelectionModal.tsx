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
  ActivityIndicator,
} from 'react-native';
import { X, Package, DollarSign, Clock, MapPin } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { ServiceService, Service } from '../lib/service-service';

interface ServiceVariantSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onVariantSelect: (variant: Service) => void;
  serviceId: string;
  serviceTitle: string;
}

export function ServiceVariantSelectionModal({
  visible,
  onClose,
  onVariantSelect,
  serviceId,
  serviceTitle,
}: ServiceVariantSelectionModalProps) {
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && serviceId) {
      loadServiceWithVariants();
    }
  }, [visible, serviceId]);

  const loadServiceWithVariants = async () => {
    setLoading(true);
    try {
      const serviceData = await ServiceService.getServiceById(serviceId);
      if (serviceData) {
        setService(serviceData);
      } else {
        Alert.alert('Error', 'Service not found');
        onClose();
      }
    } catch (error) {
      console.error('Error loading service variants:', error);
      Alert.alert('Error', 'Failed to load service variants');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleVariantSelect = (variant: Service) => {
    onVariantSelect(variant);
    onClose();
  };

  const formatPrice = (price: number, currency: string) => {
    return `${currency} ${price.toFixed(2)}`;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Service Variant</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Choose which variant of "{serviceTitle}" you'd like to inquire about:
          </Text>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary.main} />
              <Text style={styles.loadingText}>Loading service variants...</Text>
            </View>
          ) : (
            <ScrollView style={styles.variantsList} showsVerticalScrollIndicator={false}>
              {/* Main Service */}
              {service && (
                <TouchableOpacity
                  style={styles.variantCard}
                  onPress={() => handleVariantSelect(service)}
                >
                  <View style={styles.variantHeader}>
                    {service.image_url ? (
                      <Image source={{ uri: service.image_url }} style={styles.variantImage} />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Package size={24} color={Colors.text.secondary} />
                      </View>
                    )}
                    <View style={styles.variantInfo}>
                      <Text style={styles.variantTitle}>{service.title}</Text>
                      <Text style={styles.variantBadge}>Main Service</Text>
                    </View>
                  </View>

                  <Text style={styles.variantDescription} numberOfLines={2}>
                    {service.description}
                  </Text>

                  <View style={styles.variantDetails}>
                    <View style={styles.priceContainer}>
                      <DollarSign size={16} color={Colors.primary.main} />
                      <Text style={styles.priceText}>
                        {formatPrice(service.price, service.currency)}
                      </Text>
                    </View>

                    {service.category_name && (
                      <Text style={styles.categoryText}>{service.category_name}</Text>
                    )}
                  </View>

                  {service.location && (
                    <View style={styles.locationContainer}>
                      <MapPin size={14} color={Colors.text.secondary} />
                      <Text style={styles.locationText}>{service.location}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Service Variants */}
              {service?.service_variants && service.service_variants.length > 0 && (
                <>
                  <View style={styles.sectionDivider}>
                    <Text style={styles.sectionTitle}>Available Variants</Text>
                  </View>
                  
                  {service.service_variants.map((variant) => (
                    <TouchableOpacity
                      key={variant.id}
                      style={styles.variantCard}
                      onPress={() => handleVariantSelect(variant)}
                    >
                      <View style={styles.variantHeader}>
                        {variant.image_url ? (
                          <Image source={{ uri: variant.image_url }} style={styles.variantImage} />
                        ) : (
                          <View style={styles.placeholderImage}>
                            <Package size={24} color={Colors.text.secondary} />
                          </View>
                        )}
                        <View style={styles.variantInfo}>
                          <Text style={styles.variantTitle}>{variant.title}</Text>
                          <Text style={[styles.variantBadge, styles.variantBadgeSecondary]}>
                            Variant
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.variantDescription} numberOfLines={2}>
                        {variant.description}
                      </Text>

                      <View style={styles.variantDetails}>
                        <View style={styles.priceContainer}>
                          <DollarSign size={16} color={Colors.primary.main} />
                          <Text style={styles.priceText}>
                            {formatPrice(variant.price, variant.currency)}
                          </Text>
                        </View>

                        {variant.category_name && (
                          <Text style={styles.categoryText}>{variant.category_name}</Text>
                        )}
                      </View>

                      {variant.location && (
                        <View style={styles.locationContainer}>
                          <MapPin size={14} color={Colors.text.secondary} />
                          <Text style={styles.locationText}>{variant.location}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* No variants message */}
              {service && (!service.service_variants || service.service_variants.length === 0) && (
                <View style={styles.noVariantsContainer}>
                  <Text style={styles.noVariantsText}>
                    This service doesn't have additional variants. You can inquire about the main service above.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
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
    backgroundColor: Colors.background.primary,
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
    color: Colors.text.primary,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 12,
  },
  variantsList: {
    maxHeight: 400,
  },
  sectionDivider: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  variantCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  variantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  variantImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  variantInfo: {
    flex: 1,
  },
  variantTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  variantBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary.main,
    backgroundColor: Colors.primary.light,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  variantBadgeSecondary: {
    color: Colors.secondary.main,
    backgroundColor: Colors.secondary.light,
  },
  variantDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  variantDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.main,
    marginLeft: 4,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.text.secondary,
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 4,
  },
  noVariantsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noVariantsText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: Colors.background.secondary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});