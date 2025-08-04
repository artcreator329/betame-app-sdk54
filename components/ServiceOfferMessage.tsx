import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Check, X, Edit3, Clock, Tag } from 'lucide-react-native';
import { LiveChatMessage } from '../types/chat';
import { Colors } from '../constants/Colors';

interface ServiceOfferMessageProps {
  message: LiveChatMessage;
  isCurrentUser: boolean;
  onAcceptOffer?: (offerId: string) => void;
  onRejectOffer?: (offerId: string) => void;
  onEditOffer?: (offerId: string) => void;
  onViewService?: (serviceId: string) => void;
}

export function ServiceOfferMessage({
  message,
  isCurrentUser,
  onAcceptOffer,
  onRejectOffer,
  onEditOffer,
  onViewService,
}: ServiceOfferMessageProps) {
  const { serviceData, offerId, offerStatus, offerExpiresAt } = message;
  const [showCustomOfferModal, setShowCustomOfferModal] = useState(false);

  // Debug logging
  console.log('🔍 ServiceOfferMessage: Full message data:', message);
  console.log('🔍 ServiceOfferMessage: Service data:', serviceData);
  console.log('🔍 ServiceOfferMessage: Offer ID:', offerId);

  if (!serviceData || !offerId) {
    console.log('❌ ServiceOfferMessage: Missing serviceData or offerId');
    return null;
  }

  const isExpired = offerExpiresAt && new Date() > offerExpiresAt;
  const isPending = offerStatus === 'pending' || !offerStatus;
  const isAccepted = offerStatus === 'accepted';
  const isRejected = offerStatus === 'rejected';

  const handleAccept = () => {
    if (!offerId) return;
    Alert.alert(
      'Accept Offer',
      'Are you sure you want to accept this service offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: () => onAcceptOffer?.(offerId),
        },
      ]
    );
  };

  const handleReject = () => {
    if (!offerId) return;
    Alert.alert(
      'Reject Offer',
      'Are you sure you want to reject this service offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => onRejectOffer?.(offerId),
        },
      ]
    );
  };

  const handleEdit = () => {
    if (!offerId) return;
    onEditOffer?.(offerId);
  };

  const handleViewService = () => {
    if (!serviceData.id) return;
    console.log('🔗 ServiceOfferMessage: View Service clicked with serviceData:', serviceData);
    console.log('🔗 ServiceOfferMessage: Service ID:', serviceData.id);
    console.log('🔗 ServiceOfferMessage: Service title:', serviceData.title);
    
    // Check if this is a custom offer with no service reference
    if (serviceData.isCustomOffer && 
        (serviceData.id.startsWith('custom-offer-') || 
         serviceData.id.startsWith('fallback-'))) {
      console.log('🔗 ServiceOfferMessage: This is a custom offer with no service reference, showing modal');
      setShowCustomOfferModal(true);
    } else {
      // This is a regular service or custom offer based on existing service, call the onViewService callback
      onViewService?.(serviceData.id);
    }
  };

  const getStatusConfig = () => {
    if (isExpired) return { color: Colors.text.secondary, bgColor: Colors.background.secondary, text: 'Expired' };
    if (isAccepted) return { color: Colors.status.success, bgColor: Colors.background.secondary, text: 'Accepted' };
    if (isRejected) return { color: Colors.status.error, bgColor: Colors.background.secondary, text: 'Rejected' };
    return { color: Colors.primary.main, bgColor: Colors.background.secondary, text: 'Pending' };
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={[styles.container, isCurrentUser ? styles.myOffer : styles.theirOffer]}>
      <View style={styles.bubble}>
        {/* Header with Status */}
        <View style={styles.header}>
          <Text style={styles.offerTitle}>Service Offer</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>
        </View>

        {/* Main Horizontal Content */}
        <View style={styles.mainContent}>
          {/* Left: Service Image */}
          {serviceData.image_url ? (
            <Image source={{ uri: serviceData.image_url }} style={styles.serviceImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Tag size={24} color={Colors.text.secondary} />
            </View>
          )}

          {/* Right: Service Details */}
          <View style={styles.serviceDetails}>
            {/* Service Title */}
            <Text style={styles.serviceTitle} numberOfLines={2}>
              {serviceData.title || 'Service Offer'}
            </Text>

            {/* Service Description */}
            {serviceData.description && (
              <Text style={styles.serviceDescription} numberOfLines={2}>
                {serviceData.description}
              </Text>
            )}

            {/* Price Section */}
            <View style={styles.priceSection}>
              {serviceData.customPrice && serviceData.customPrice !== serviceData.price ? (
                <View style={styles.priceComparison}>
                  <Text style={styles.originalPrice}>
                    Original: RM {serviceData.price}
                  </Text>
                  <Text style={styles.customPrice}>
                    Offer: RM {serviceData.customPrice}
                  </Text>
                </View>
              ) : (
                <Text style={styles.priceText}>
                  RM {serviceData.customPrice || serviceData.price || '0'}
                </Text>
              )}
            </View>

            {/* Category and Delivery Details */}
            <View style={styles.detailsRow}>
              {serviceData.category_name && (
                <Text style={styles.categoryText}>
                  📂 {serviceData.category_name}
                </Text>
              )}
              {serviceData.customDeliveryTime && (
                <Text style={styles.deliveryText}>
                  🚚 {serviceData.customDeliveryTime} days delivery
                </Text>
              )}
            </View>

            {/* Custom Description */}
            {serviceData.customDescription && (
              <View style={styles.customDescriptionContainer}>
                <Text style={styles.customDescriptionLabel}>Custom Details:</Text>
                <Text style={styles.customDescription} numberOfLines={2}>
                  {serviceData.customDescription}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Row: Buttons and Expiration */}
        <View style={styles.bottomRow}>
          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.viewButton} 
              onPress={handleViewService}
              activeOpacity={0.7}
            >
              <Text style={styles.viewButtonText}>View Service</Text>
            </TouchableOpacity>

            {isPending && !isExpired && (
              <>
                {isCurrentUser ? (
                  <TouchableOpacity 
                    style={styles.editButton} 
                    onPress={handleEdit}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={styles.rejectButton} 
                      onPress={handleReject}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.acceptButton} 
                      onPress={handleAccept}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>

          {/* Expiration */}
          {offerExpiresAt && !isExpired && (
            <Text style={styles.expirationText}>
              Expires {offerExpiresAt.toLocaleDateString()} at {offerExpiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        {/* Custom Offer Details Modal */}
        <Modal
          visible={showCustomOfferModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCustomOfferModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Custom Service Offer</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setShowCustomOfferModal(false)}
                  >
                    <X size={24} color={Colors.text.secondary} />
                  </TouchableOpacity>
                </View>

                {/* Service Image */}
                {serviceData.image_url ? (
                  <Image source={{ uri: serviceData.image_url }} style={styles.modalImage} />
                ) : (
                  <View style={styles.modalPlaceholderImage}>
                    <Tag size={40} color={Colors.text.secondary} />
                    <Text style={styles.placeholderText}>No Image</Text>
                  </View>
                )}

                {/* Service Details */}
                <View style={styles.modalContent}>
                  <Text style={styles.modalServiceTitle}>
                    {serviceData.title || 'Custom Service Offer'}
                  </Text>

                  {serviceData.description && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Description</Text>
                      <Text style={styles.modalSectionText}>
                        {serviceData.description}
                      </Text>
                    </View>
                  )}

                  {serviceData.customDescription && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Custom Details</Text>
                      <Text style={styles.modalSectionText}>
                        {serviceData.customDescription}
                      </Text>
                    </View>
                  )}

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Price</Text>
                    <Text style={styles.modalPrice}>
                      RM {serviceData.customPrice || serviceData.price || '0'}
                    </Text>
                  </View>

                  {serviceData.category_name && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Category</Text>
                      <Text style={styles.modalSectionText}>
                        {serviceData.category_name}
                      </Text>
                    </View>
                  )}

                  {serviceData.customDeliveryTime && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Delivery Time</Text>
                      <Text style={styles.modalSectionText}>
                        {serviceData.customDeliveryTime} days
                      </Text>
                    </View>
                  )}

                  <View style={styles.modalFooter}>
                    <Text style={styles.modalNote}>
                      This is a custom offer created specifically for this conversation.
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCustomOfferModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 16,
    width: 'auto',
    alignSelf: 'stretch',
  },
  myOffer: {
    alignSelf: 'stretch',
  },
  theirOffer: {
    alignSelf: 'stretch',
  },
  bubble: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  serviceImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
  },
  placeholderImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceDetails: {
    flex: 1,
    gap: 4,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: 20,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  priceSection: {
    marginBottom: 6,
  },
  priceComparison: {
    flexDirection: 'column',
    gap: 2,
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  customPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.main,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.main,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary.main,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  deliveryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.status.warning,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  customDescriptionContainer: {
    backgroundColor: Colors.background.secondary,
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary.main,
  },
  customDescriptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary.main,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.primary.main,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary.main,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.status.warning,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.status.warning,
  },
  rejectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.status.error,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.status.error,
  },
  acceptButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.status.success,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.white,
  },
  expirationText: {
    fontSize: 10,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: Colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.background.secondary,
  },
  modalPlaceholderImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  modalContent: {
    padding: 20,
  },
  modalServiceTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 20,
    lineHeight: 30,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalSectionText: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  modalPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary.main,
  },
  modalFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  modalNote: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalCloseButton: {
    margin: 20,
    marginTop: 0,
    backgroundColor: Colors.primary.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.white,
  },
});