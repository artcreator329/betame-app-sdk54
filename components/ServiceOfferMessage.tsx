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
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, X, Edit3, Clock, Tag } from 'lucide-react-native';
import { LiveChatMessage } from '../types/chat';
import { Colors } from '../constants/Colors';

interface ServiceOfferMessageProps {
  message: LiveChatMessage;
  isCurrentUser: boolean;
  onAcceptOffer?: (offerId: string) => void;
  onRejectOffer?: (offerId: string, reason?: string) => void;
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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Debug logging
  console.log('🔍 ServiceOfferMessage: Full message data:', message);
  console.log('🔍 ServiceOfferMessage: Service data:', serviceData);
  console.log('🔍 ServiceOfferMessage: Offer ID:', offerId);
  console.log('🔍 ServiceOfferMessage: Offer Status:', offerStatus);
  console.log('🔍 ServiceOfferMessage: Offer Expires At:', offerExpiresAt);

  if (!serviceData || !offerId) {
    console.log('❌ ServiceOfferMessage: Missing serviceData or offerId');
    return null;
  }

  const isExpired = offerExpiresAt && new Date() > offerExpiresAt;
  const isPending = offerStatus === 'pending' || !offerStatus;
  const isAccepted = offerStatus === 'accepted';
  const isRejected = offerStatus === 'rejected';

  // Debug status flags
  console.log('🔍 ServiceOfferMessage: Status flags:', {
    isExpired,
    isPending,
    isAccepted,
    isRejected,
    rawStatus: offerStatus
  });

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
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (!offerId) return;
    onRejectOffer?.(offerId, rejectReason.trim() || undefined);
    setShowRejectModal(false);
    setRejectReason('');
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
      <LinearGradient
        colors={isRejected ? ['#BDBDBD', '#9E9E9E', '#757575'] : ['#81C784', '#66BB6A', '#4CAF50']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.bubble, isRejected && styles.rejectedBubble]}
      >
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
            <Text style={[styles.serviceTitle, isRejected && styles.rejectedText]} numberOfLines={2}>
              {serviceData.title || 'Service Offer'}
            </Text>

            {/* Service Description */}
            {serviceData.description && (
              <Text style={[styles.serviceDescription, isRejected && styles.rejectedText]} numberOfLines={2}>
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
                  <Text style={[styles.customPrice, isRejected && styles.rejectedText]}>
                    Offer: RM {serviceData.customPrice}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.priceText, isRejected && styles.rejectedText]}>
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

            {/* Job Details */}
            {serviceData.jobData && (
              <View style={styles.jobDetailsContainer}>
                <Text style={styles.jobDetailsLabel}>Job Details:</Text>
                <Text style={styles.jobTitle} numberOfLines={1}>
                  📋 {serviceData.jobData.title}
                </Text>
                <Text style={styles.jobDescription} numberOfLines={2}>
                  {serviceData.jobData.description}
                </Text>
                <View style={styles.jobMetaRow}>
                  <Text style={styles.jobBudget}>
                    💰 {serviceData.jobData.budget_amount ? `${serviceData.jobData.currency} ${serviceData.jobData.budget_amount}` : 'Budget: Negotiable'}
                  </Text>
                  <Text style={styles.jobPaymentType}>
                    📊 {serviceData.jobData.payment_type}
                  </Text>
                </View>
                {serviceData.jobData.location_address && (
                  <Text style={styles.jobLocation} numberOfLines={1}>
                    📍 {serviceData.jobData.location_address}
                  </Text>
                )}
              </View>
            )}

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

            {/* Show rejected state buttons */}
            {isRejected && (
              <View style={styles.rejectedButtonContainer}>
                <View style={styles.rejectedButton}>
                  <Text style={styles.rejectedButtonText}>Rejected</Text>
                </View>
              </View>
            )}

            {/* Show accepted state buttons */}
            {isAccepted && (
              <View style={styles.acceptedButtonContainer}>
                <View style={styles.acceptedButton}>
                  <Text style={styles.acceptedButtonText}>Accepted</Text>
                </View>
              </View>
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

        {/* Reject Reason Modal */}
        <Modal
          visible={showRejectModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRejectModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.rejectModalContainer}>
              {/* Header */}
              <View style={styles.rejectModalHeader}>
                <Text style={styles.rejectModalTitle}>Reject Offer</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowRejectModal(false)}
                >
                  <X size={24} color={Colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={styles.rejectModalContent}>
                <Text style={styles.rejectModalDescription}>
                  Please provide a reason for rejecting this offer (optional):
                </Text>
                
                <TextInput
                  style={styles.rejectReasonInput}
                  placeholder="e.g., Price too high, timeline doesn't work, etc."
                  placeholderTextColor={Colors.text.secondary}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Buttons */}
              <View style={styles.rejectModalButtons}>
                <TouchableOpacity 
                  style={styles.rejectCancelButton}
                  onPress={() => setShowRejectModal(false)}
                >
                  <Text style={styles.rejectCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.rejectConfirmButton}
                  onPress={handleConfirmReject}
                >
                  <Text style={styles.rejectConfirmButtonText}>Reject Offer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 120,
  },
  rejectedBubble: {
    opacity: 0.7,
  },
  rejectedText: {
    opacity: 0.6,
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
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
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
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'line-through',
  },
  customPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
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
    color: '#2E7D32',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  deliveryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  jobDetailsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#81C784',
    marginBottom: 6,
  },
  jobDetailsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#81C784',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  jobDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
    marginBottom: 4,
  },
  jobMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  jobBudget: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A5D6A7',
    flex: 1,
  },
  jobPaymentType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A5D6A7',
    textTransform: 'capitalize',
  },
  jobLocation: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  customDescriptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFFFFF',
  },
  customDescriptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
  },
  rejectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D32F2F',
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
    color: 'rgba(255, 255, 255, 0.8)',
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
  // Reject Modal Styles
  rejectModalContainer: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: Colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  rejectModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  rejectModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  rejectModalContent: {
    padding: 20,
  },
  rejectModalDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  rejectReasonInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    minHeight: 100,
    maxHeight: 150,
  },
  rejectModalButtons: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  rejectCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  rejectCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  rejectConfirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.status.error,
    alignItems: 'center',
  },
  rejectConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.white,
  },
  // Rejected/Accepted State Styles
  rejectedButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rejectedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.status.error,
    alignItems: 'center',
  },
  rejectedButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.white,
  },
  acceptedButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.status.success,
    alignItems: 'center',
  },
  acceptedButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.white,
  },
});