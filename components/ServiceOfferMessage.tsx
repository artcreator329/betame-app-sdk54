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
  onCancelOffer?: (offerId: string) => void;
  onViewService?: (serviceId: string) => void;
  onViewOrderProgress?: () => void;
}

export function ServiceOfferMessage({
  message,
  isCurrentUser,
  onAcceptOffer,
  onRejectOffer,
  onEditOffer,
  onCancelOffer,
  onViewService,
  onViewOrderProgress,
}: ServiceOfferMessageProps) {
  const { serviceData, offerId, offerStatus, offerExpiresAt } = message;
  const [showOfferDetailsModal, setShowOfferDetailsModal] = useState(false);
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
  const isInProgress = offerStatus === 'in_progress';
  const isRejected = offerStatus === 'rejected';
  const isCancelled = offerStatus === 'cancelled';

  // Debug status flags
  console.log('🔍 ServiceOfferMessage: Status flags:', {
    isExpired,
    isPending,
    isAccepted,
    isInProgress,
    isRejected,
    isCancelled,
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

  const handleCancel = () => {
    if (!offerId) return;
    Alert.alert(
      'Cancel Offer',
      'Are you sure you want to cancel this service offer? This action cannot be undone.',
      [
        { text: 'Keep Offer', style: 'cancel' },
        {
          text: 'Cancel Offer',
          style: 'destructive',
          onPress: () => onCancelOffer?.(offerId),
        },
      ]
    );
  };

  const handleViewService = () => {
    console.log('🔗 ServiceOfferMessage: View Service clicked with serviceData:', serviceData);
    console.log('🔗 ServiceOfferMessage: Service ID:', serviceData.id);
    console.log('🔗 ServiceOfferMessage: Service title:', serviceData.title);
    console.log('🔗 ServiceOfferMessage: Hustle details check:', {
      startDate: serviceData.startDate,
      endDate: serviceData.endDate,
      preferredStartTime: serviceData.preferredStartTime,
      preferredEndTime: serviceData.preferredEndTime,
      locationAddress: serviceData.locationAddress,
      urgencyLevel: serviceData.urgencyLevel,
      workType: serviceData.workType,
      estimatedHours: serviceData.estimatedHours,
      requirements: serviceData.requirements,
      skillsRequired: serviceData.skillsRequired
    });
    
    // Always show the detailed offer modal for all service offers
    setShowOfferDetailsModal(true);
  };

  const getStatusConfig = () => {
    if (isExpired) return { color: Colors.text.secondary, bgColor: Colors.background.secondary, text: 'Expired' };
    if (isInProgress) return { color: '#007AFF', bgColor: Colors.background.secondary, text: 'In Progress' };
    if (isAccepted) return { color: Colors.status.success, bgColor: Colors.background.secondary, text: 'Accepted' };
    if (isRejected) return { color: Colors.status.error, bgColor: Colors.background.secondary, text: 'Rejected' };
    if (isCancelled) return { color: '#FF9500', bgColor: Colors.background.secondary, text: 'Cancelled' };
    return { color: Colors.primary.main, bgColor: Colors.background.secondary, text: 'Pending' };
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={[styles.container, isCurrentUser ? styles.myOffer : styles.theirOffer]}>
      <LinearGradient
        colors={isRejected ? ['#BDBDBD', '#9E9E9E', '#757575'] : ['#81C784', '#66BB6A', '#4CAF50']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.bubble, (isRejected || isCancelled) && styles.rejectedBubble]}
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
            <Text style={[styles.serviceTitle, (isRejected || isCancelled) && styles.rejectedText]} numberOfLines={2}>
              {serviceData.title || 'Service Offer'}
            </Text>

            {/* Service Description */}
            {serviceData.description && (
              <Text style={[styles.serviceDescription, (isRejected || isCancelled) && styles.rejectedText]} numberOfLines={2}>
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
                  <Text style={[styles.customPrice, (isRejected || isCancelled) && styles.rejectedText]}>
                    Offer: RM {serviceData.customPrice}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.priceText, (isRejected || isCancelled) && styles.rejectedText]}>
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

            {/* Hustle Job Attributes */}
            {(serviceData.startDate || serviceData.endDate || serviceData.locationAddress || serviceData.workType || serviceData.urgencyLevel) && (
              <View style={styles.hustleDetailsContainer}>
                <Text style={styles.hustleDetailsLabel}>Job Details:</Text>
                
                {/* Date Range */}
                {(serviceData.startDate || serviceData.endDate) && (
                  <View style={styles.hustleDetailRow}>
                    <Text style={styles.hustleDetailText}>
                      📅 {serviceData.startDate ? new Date(serviceData.startDate).toLocaleDateString() : 'TBD'} - {serviceData.endDate ? new Date(serviceData.endDate).toLocaleDateString() : 'TBD'}
                    </Text>
                  </View>
                )}
                
                {/* Time Preferences */}
                {(serviceData.preferredStartTime || serviceData.preferredEndTime) && (
                  <View style={styles.hustleDetailRow}>
                    <Text style={styles.hustleDetailText}>
                      ⏰ {serviceData.preferredStartTime || 'Flexible'} - {serviceData.preferredEndTime || 'Flexible'}
                    </Text>
                  </View>
                )}
                
                {/* Location */}
                {serviceData.locationAddress && (
                  <View style={styles.hustleDetailRow}>
                    <Text style={styles.hustleDetailText} numberOfLines={1}>
                      📍 {serviceData.locationAddress}
                    </Text>
                  </View>
                )}
                
                {/* Work Type & Urgency */}
                <View style={styles.hustleTagsRow}>
                  {serviceData.workType && (
                    <Text style={[styles.hustleTag, styles.workTypeTag]}>
                      🏢 {serviceData.workType.replace('_', ' ').toUpperCase()}
                    </Text>
                  )}
                  {serviceData.urgencyLevel && (
                    <Text style={[styles.hustleTag, styles.urgencyTag, 
                      serviceData.urgencyLevel === 'urgent' ? styles.urgentTag : 
                      serviceData.urgencyLevel === 'high' ? styles.highTag : styles.normalTag]}>
                      ⚡ {serviceData.urgencyLevel.toUpperCase()}
                    </Text>
                  )}
                </View>
                
                {/* Estimated Hours */}
                {serviceData.estimatedHours && (
                  <View style={styles.hustleDetailRow}>
                    <Text style={styles.hustleDetailText}>
                      ⏱️ Est. {serviceData.estimatedHours} hours
                    </Text>
                  </View>
                )}
                
                {/* Skills Required */}
                {serviceData.skillsRequired && serviceData.skillsRequired.length > 0 && (
                  <View style={styles.hustleDetailRow}>
                    <Text style={styles.hustleDetailText}>
                      🛠️ Skills: {serviceData.skillsRequired.join(', ')}
                    </Text>
                  </View>
                )}
                
                {/* Requirements */}
                {serviceData.requirements && (
                  <View style={styles.hustleDetailRow}>
                    <Text style={styles.hustleDetailText} numberOfLines={2}>
                      📋 {serviceData.requirements}
                    </Text>
                  </View>
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
                  <>
                    <TouchableOpacity 
                      style={styles.editButton} 
                      onPress={handleEdit}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.cancelButton} 
                      onPress={handleCancel}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
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
                {onViewOrderProgress && (
                  <TouchableOpacity 
                    style={styles.orderProgressButton}
                    onPress={onViewOrderProgress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.orderProgressButtonText}>View Order</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Show in progress state buttons */}
            {isInProgress && (
              <View style={styles.inProgressButtonContainer}>
                <View style={styles.inProgressButton}>
                  <Text style={styles.inProgressButtonText}>In Progress</Text>
                </View>
                {onViewOrderProgress && (
                  <TouchableOpacity 
                    style={styles.orderProgressButton}
                    onPress={onViewOrderProgress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.orderProgressButtonText}>View Order</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Show cancelled state buttons */}
            {isCancelled && (
              <View style={styles.cancelledButtonContainer}>
                <View style={styles.cancelledButton}>
                  <Text style={styles.cancelledButtonText}>Cancelled</Text>
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

        {/* Offer Details Modal */}
        <Modal
          visible={showOfferDetailsModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowOfferDetailsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Service Offer Details</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setShowOfferDetailsModal(false)}
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
                    {serviceData.title || 'Service Offer'}
                  </Text>

                  {/* Offer Status */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Offer Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                      <Text style={[styles.statusText, { color: statusConfig.color }]}>
                        {statusConfig.text}
                      </Text>
                    </View>
                  </View>

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
                    {serviceData.customPrice && serviceData.customPrice !== serviceData.price ? (
                      <View>
                        <Text style={styles.modalOriginalPrice}>
                          Original: RM {serviceData.price}
                        </Text>
                        <Text style={styles.modalPrice}>
                          Offer: RM {serviceData.customPrice}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.modalPrice}>
                        RM {serviceData.customPrice || serviceData.price || '0'}
                      </Text>
                    )}
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

                  {/* Job Details Summary - Show key hustle info prominently */}
                  {(serviceData.startDate || serviceData.endDate || serviceData.preferredStartTime || serviceData.preferredEndTime || serviceData.locationAddress || serviceData.urgencyLevel) && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>📋 Job Details</Text>
                      <View style={styles.jobSummaryContainer}>
                        {(serviceData.startDate || serviceData.endDate) && (
                          <Text style={styles.jobSummaryText}>
                            📅 {serviceData.startDate ? new Date(serviceData.startDate).toLocaleDateString() : 'TBD'} - {serviceData.endDate ? new Date(serviceData.endDate).toLocaleDateString() : 'TBD'}
                          </Text>
                        )}
                        {(serviceData.preferredStartTime || serviceData.preferredEndTime) && (
                          <Text style={styles.jobSummaryText}>
                            ⏰ {serviceData.preferredStartTime || 'Flexible'} - {serviceData.preferredEndTime || 'Flexible'}
                          </Text>
                        )}
                        {serviceData.locationAddress && (
                          <Text style={styles.jobSummaryText}>
                            📍 {serviceData.locationAddress}
                          </Text>
                        )}
                        {serviceData.urgencyLevel && (
                          <Text style={[styles.jobSummaryText, 
                            serviceData.urgencyLevel === 'urgent' ? { color: '#FF5722' } :
                            serviceData.urgencyLevel === 'high' ? { color: '#FF9800' } : 
                            { color: Colors.text.primary }
                          ]}>
                            ⚡ {serviceData.urgencyLevel.toUpperCase()} Priority
                          </Text>
                        )}
                        {serviceData.estimatedHours && (
                          <Text style={styles.jobSummaryText}>
                            ⏱️ Est. {serviceData.estimatedHours} hours
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Enhanced Date & Time Information */}
                  {(serviceData.startDate || serviceData.endDate) && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>📅 Job Schedule</Text>
                      <View style={styles.dateTimeContainer}>
                        {serviceData.startDate && (
                          <View style={styles.dateTimeRow}>
                            <Text style={styles.dateTimeLabel}>Start Date:</Text>
                            <Text style={styles.dateTimeValue}>
                              {new Date(serviceData.startDate).toLocaleDateString('en-MY', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </Text>
                          </View>
                        )}
                        {serviceData.endDate && (
                          <View style={styles.dateTimeRow}>
                            <Text style={styles.dateTimeLabel}>End Date:</Text>
                            <Text style={styles.dateTimeValue}>
                              {new Date(serviceData.endDate).toLocaleDateString('en-MY', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </Text>
                          </View>
                        )}
                        {serviceData.startDate && serviceData.endDate && (
                          <View style={styles.dateTimeRow}>
                            <Text style={styles.dateTimeLabel}>Duration:</Text>
                            <Text style={styles.dateTimeValue}>
                              {Math.ceil((new Date(serviceData.endDate).getTime() - new Date(serviceData.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {(serviceData.preferredStartTime || serviceData.preferredEndTime) && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>⏰ Working Hours</Text>
                      <View style={styles.timeContainer}>
                        <View style={styles.timeRow}>
                          <Text style={styles.timeLabel}>Preferred Hours:</Text>
                          <Text style={styles.timeValue}>
                            {serviceData.preferredStartTime || 'Flexible'} - {serviceData.preferredEndTime || 'Flexible'}
                          </Text>
                        </View>
                        {serviceData.estimatedHours && (
                          <View style={styles.timeRow}>
                            <Text style={styles.timeLabel}>Estimated Duration:</Text>
                            <Text style={styles.timeValue}>
                              {serviceData.estimatedHours} hours total
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Enhanced Location & Work Arrangement */}
                  {(serviceData.locationAddress || serviceData.workType) && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>📍 Work Location & Arrangement</Text>
                      <View style={styles.locationContainer}>
                        {serviceData.workType && (
                          <View style={styles.workTypeContainer}>
                            <View style={[styles.workTypeBadge, 
                              serviceData.workType === 'remote' ? styles.remoteBadge :
                              serviceData.workType === 'on_site' ? styles.onsiteBadge : styles.hybridBadge
                            ]}>
                              <Text style={[styles.workTypeText,
                                serviceData.workType === 'remote' ? styles.remoteText :
                                serviceData.workType === 'on_site' ? styles.onsiteText : styles.hybridText
                              ]}>
                                {serviceData.workType === 'remote' ? '🏠 Remote Work' :
                                 serviceData.workType === 'on_site' ? '🏢 On-site Work' : '🔄 Hybrid Work'}
                              </Text>
                            </View>
                            <Text style={styles.workTypeDescription}>
                              {serviceData.workType === 'remote' ? 'Work can be completed remotely from any location' :
                               serviceData.workType === 'on_site' ? 'Physical presence required at specified location' :
                               'Combination of remote and on-site work as needed'}
                            </Text>
                          </View>
                        )}
                        {serviceData.locationAddress && (
                          <View style={styles.addressContainer}>
                            <Text style={styles.addressLabel}>
                              {serviceData.workType === 'remote' ? 'Service Area:' : 'Work Location:'}
                            </Text>
                            <Text style={styles.addressValue}>
                              {serviceData.locationAddress}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {serviceData.urgencyLevel && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>⚡ Priority Level</Text>
                      <View style={styles.urgencyContainer}>
                        <View style={[styles.urgencyBadge,
                           serviceData.urgencyLevel === 'urgent' ? styles.urgentModalBadge :
                           serviceData.urgencyLevel === 'high' ? styles.highUrgencyModalBadge :
                           serviceData.urgencyLevel === 'medium' ? styles.mediumUrgencyModalBadge : styles.lowUrgencyModalBadge
                         ]}>
                           <Text style={[styles.urgencyModalText,
                             serviceData.urgencyLevel === 'urgent' ? styles.urgentModalText :
                             serviceData.urgencyLevel === 'high' ? styles.highUrgencyModalText :
                             serviceData.urgencyLevel === 'medium' ? styles.mediumUrgencyModalText : styles.lowUrgencyModalText
                           ]}>
                            {serviceData.urgencyLevel === 'urgent' ? '🔥 URGENT' :
                             serviceData.urgencyLevel === 'high' ? '⚠️ HIGH PRIORITY' :
                             serviceData.urgencyLevel === 'medium' ? '📋 MEDIUM PRIORITY' : '📝 LOW PRIORITY'}
                          </Text>
                        </View>
                        <Text style={styles.urgencyDescription}>
                          {serviceData.urgencyLevel === 'urgent' ? 'Immediate attention required - ASAP delivery' :
                           serviceData.urgencyLevel === 'high' ? 'High priority - Quick turnaround needed' :
                           serviceData.urgencyLevel === 'medium' ? 'Standard priority - Normal timeline' :
                           'Low priority - Flexible timeline'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {serviceData.skillsRequired && serviceData.skillsRequired.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Skills Required</Text>
                      <Text style={styles.modalSectionText}>
                        {serviceData.skillsRequired.join(', ')}
                      </Text>
                    </View>
                  )}

                  {serviceData.requirements && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Additional Requirements</Text>
                      <Text style={styles.modalSectionText}>
                        {serviceData.requirements}
                      </Text>
                    </View>
                  )}

                  {/* Enhanced Job Data Details */}
                  {serviceData.jobData && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>🎯 Related Job Posting</Text>
                      <View style={styles.jobDataContainer}>
                        <Text style={styles.modalJobTitle}>
                          {serviceData.jobData.title}
                        </Text>
                        <Text style={styles.modalSectionText}>
                          {serviceData.jobData.description}
                        </Text>
                        
                        <View style={styles.jobMetaContainer}>
                          {serviceData.jobData.budget_amount && (
                            <View style={styles.jobMetaRow}>
                              <Text style={styles.jobMetaLabel}>💰 Budget:</Text>
                              <Text style={styles.modalJobBudget}>
                                {serviceData.jobData.currency} {serviceData.jobData.budget_amount}
                              </Text>
                            </View>
                          )}
                          
                          {serviceData.jobData.payment_type && (
                            <View style={styles.jobMetaRow}>
                              <Text style={styles.jobMetaLabel}>💳 Payment:</Text>
                              <Text style={styles.jobPaymentType}>
                                {serviceData.jobData.payment_type.charAt(0).toUpperCase() + serviceData.jobData.payment_type.slice(1)}
                              </Text>
                            </View>
                          )}
                          
                          {serviceData.jobData.location_address && (
                            <View style={styles.jobMetaRow}>
                              <Text style={styles.jobMetaLabel}>📍 Job Location:</Text>
                              <Text style={styles.jobLocationText}>
                                {serviceData.jobData.location_address}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Debug Section - Show when hustle details are missing */}
                  {!(serviceData.startDate || serviceData.endDate || serviceData.preferredStartTime || serviceData.preferredEndTime || serviceData.locationAddress || serviceData.urgencyLevel || serviceData.workType || serviceData.estimatedHours || serviceData.requirements || serviceData.skillsRequired) && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>ℹ️ Job Details</Text>
                      <Text style={styles.modalSectionText}>
                        No specific job details were provided with this offer. This is a standard service offer without custom scheduling or location requirements.
                      </Text>
                    </View>
                  )}

                  {/* Enhanced Expiration Information */}
                  {offerExpiresAt && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>⏳ Offer Validity</Text>
                      <View style={styles.expirationContainer}>
                        <View style={[styles.expirationBadge, isExpired ? styles.expiredBadge : styles.activeBadge]}>
                          <Text style={[styles.expirationStatus, isExpired ? styles.expiredText : styles.activeText]}>
                            {isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}
                          </Text>
                        </View>
                        <View style={styles.expirationDetails}>
                          <Text style={styles.expirationLabel}>
                            {isExpired ? 'Expired on:' : 'Valid until:'}
                          </Text>
                          <Text style={[styles.expirationDateTime, isExpired && { color: Colors.status.error }]}>
                            {offerExpiresAt.toLocaleDateString('en-MY', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </Text>
                          <Text style={[styles.expirationTime, isExpired && { color: Colors.status.error }]}>
                            at {offerExpiresAt.toLocaleTimeString('en-MY', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </Text>
                          {!isExpired && (
                            <Text style={styles.timeRemaining}>
                              {(() => {
                                const now = new Date();
                                const timeLeft = offerExpiresAt.getTime() - now.getTime();
                                const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                                const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                
                                if (daysLeft > 0) {
                                  return `${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining`;
                                } else if (hoursLeft > 0) {
                                  return `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''} remaining`;
                                } else {
                                  return 'Expires soon';
                                }
                              })()
                            }
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Offer Creation Details */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>📋 Offer Information</Text>
                    <View style={styles.offerInfoContainer}>
                      <View style={styles.offerInfoRow}>
                        <Text style={styles.offerInfoLabel}>Offer Type:</Text>
                        <Text style={styles.offerInfoValue}>
                          {serviceData.isCustomOffer ? 'Custom Offer' : 'Standard Service'}
                        </Text>
                      </View>
                      
                      {message.timestamp && (
                        <View style={styles.offerInfoRow}>
                          <Text style={styles.offerInfoLabel}>Created:</Text>
                          <Text style={styles.offerInfoValue}>
                            {new Date(message.timestamp).toLocaleDateString('en-MY', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.modalFooter}>
                    <Text style={styles.modalNote}>
                      {serviceData.isCustomOffer ? 
                        'This is a custom offer created specifically for this conversation with tailored terms and conditions.' :
                        'This offer is based on an existing service with customized details for your specific requirements.'}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowOfferDetailsModal(false)}
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
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
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
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary.main,
  },
  modalOriginalPrice: {
    fontSize: 14,
    color: Colors.text.secondary,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  modalJobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  modalJobBudget: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.main,
    marginTop: 4,
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
    gap: 8,
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
  inProgressButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inProgressButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  inProgressButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.white,
  },
  orderProgressButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#34C759',
    alignItems: 'center',
  },
  orderProgressButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.white,
  },
  cancelledButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelledButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FF9500',
    alignItems: 'center',
  },
  cancelledButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.white,
  },
  // Hustle Job Attributes Styles
  hustleDetailsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  hustleDetailsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Cutive Mono',
  },
  hustleDetailRow: {
    marginBottom: 6,
  },
  hustleDetailText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 16,
  },
  hustleTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  hustleTag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  workTypeTag: {
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
  },
  urgencyTag: {
    color: '#FFFFFF',
  },
  urgentTag: {
    backgroundColor: '#F44336',
  },
  highTag: {
    backgroundColor: '#FF9800',
  },
  normalTag: {
    backgroundColor: '#2196F3',
  },
  // Enhanced Modal Styles
  dateTimeContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTimeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  dateTimeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  timeContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  locationContainer: {
    marginTop: 8,
  },
  workTypeContainer: {
    marginBottom: 16,
  },
  workTypeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  remoteBadge: {
    backgroundColor: '#E3F2FD',
  },
  onsiteBadge: {
    backgroundColor: '#F3E5F5',
  },
  hybridBadge: {
    backgroundColor: '#E8F5E8',
  },
  workTypeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  remoteText: {
    color: '#1976D2',
  },
  onsiteText: {
    color: '#7B1FA2',
  },
  hybridText: {
    color: '#388E3C',
  },
  workTypeDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  addressContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  urgencyContainer: {
    marginTop: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  urgentModalBadge: {
    backgroundColor: '#FFEBEE',
  },
  highUrgencyModalBadge: {
    backgroundColor: '#FFF3E0',
  },
  mediumUrgencyModalBadge: {
    backgroundColor: '#FFF8E1',
  },
  lowUrgencyModalBadge: {
    backgroundColor: '#F1F8E9',
  },
  urgencyModalText: {
    fontSize: 12,
    fontWeight: '700',
  },
  urgentModalText: {
    color: '#C62828',
  },
  highUrgencyModalText: {
    color: '#E65100',
  },
  mediumUrgencyModalText: {
    color: '#F57F17',
  },
  lowUrgencyModalText: {
    color: '#33691E',
  },
  urgencyDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  jobDataContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  jobMetaContainer: {
    marginTop: 12,
  },
  jobMetaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  jobLocationText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  jobSummaryContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  jobSummaryText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 8,
    lineHeight: 20,
  },
  expirationContainer: {
    marginTop: 8,
  },
  expirationBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  activeBadge: {
    backgroundColor: '#E8F5E8',
  },
  expiredBadge: {
    backgroundColor: '#FFEBEE',
  },
  expirationStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeText: {
    color: '#2E7D32',
  },
  expiredText: {
    color: '#C62828',
  },
  expirationDetails: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
  },
  expirationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  expirationDateTime: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  expirationTime: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  timeRemaining: {
    fontSize: 13,
    color: Colors.primary.main,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  offerInfoContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  offerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  offerInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
});