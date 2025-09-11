import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  Alert,
  Clipboard,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { X, Share2, Copy, MessageCircle, Mail, Link, Star } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { DeepLinkService } from '@/lib/deep-link-service';
import { Service } from '@/types/service';
import OptimizedImage from './OptimizedImage';
import { imageCacheService } from '@/lib/image-cache-service';

interface ServiceShareModalProps {
  visible: boolean;
  onClose: () => void;
  service: Service;
}

export default function ServiceShareModal({
  visible,
  onClose,
  service
}: ServiceShareModalProps) {
  const [copying, setCopying] = useState(false);
  const colors = useColors();

  // Generate service deep link
  const serviceLink = DeepLinkService.generateSmartServiceLink(
    service.id,
    service.title,
    service.description,
    service.provider_name
  );
  const displayName = service.provider_name || 'Service Provider';

  const getServiceImage = () => {
    if (service.image_url) {
      return imageCacheService.getMediumUrl(service.image_url);
    }
    return 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400';
  };

  const getLowestPrice = () => {
    const hasVariants = service.service_variants && service.service_variants.length > 0;
    if (!hasVariants) return service.price;

    const variantPrices = (service.service_variants || []).map(v => v.price).filter(price => price > 0);
    const validPrices = service.price > 0 ? [service.price, ...variantPrices] : variantPrices;
    return validPrices.length > 0 ? Math.min(...validPrices) : 0;
  };

  const createShareContent = () => {
    const price = getLowestPrice();
    const priceText = price > 0 ? `From ${service.currency}${price}` : 'View Details';
    
    return {
      title: `${service.title} - BetaMe`,
      message: `🌟 Check out this amazing service on BetaMe!\n\n📋 ${service.title}\n👤 By ${displayName}\n⭐ ${service.rating} (${service.review_count} reviews)\n💰 ${priceText}\n\n${service.description ? service.description.substring(0, 100) + (service.description.length > 100 ? '...' : '') : ''}\n\n📱 Get the BetaMe app: ${serviceLink}`,
      url: serviceLink
    };
  };

  const handleNativeShare = async () => {
    try {
      const shareContent = createShareContent();
      const result = await Share.share(shareContent);
      
      if (result.action === Share.sharedAction) {
        onClose();
      }
    } catch (error) {
      console.error('Error sharing service:', error);
      Alert.alert('Error', 'Unable to share service. Please try again.');
    }
  };

  const handleCopyLink = async () => {
    try {
      setCopying(true);
      await Clipboard.setString(serviceLink);
      
      Alert.alert(
        'Link Copied!',
        'Service link has been copied to your clipboard.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error copying link:', error);
      Alert.alert('Error', 'Unable to copy link. Please try again.');
    } finally {
      setCopying(false);
    }
  };

  const handleShareViaMessage = () => {
    const shareContent = createShareContent();
    Share.share({
      message: shareContent.message
    });
  };

  const handleShareViaEmail = () => {
    const shareContent = createShareContent();
    const subject = `Check out "${service.title}" on BetaMe`;
    const body = `Hi!\n\nI found this great service on BetaMe and thought you might be interested:\n\n${service.title}\nBy ${displayName}\n\n${service.description || 'Amazing service provider!'}\n\nRating: ${service.rating}⭐ (${service.review_count} reviews)\nPrice: ${getLowestPrice() > 0 ? `From ${service.currency}${getLowestPrice()}` : 'View Details'}\n\nCheck it out: ${serviceLink}\n\nIf you don't have the BetaMe app yet, you can download it from the link above.\n\nBest regards!`;
    
    Share.share({
      message: body,
      title: subject
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Share Service
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Service Preview */}
          <View style={[styles.servicePreview, { backgroundColor: colors.background.secondary }]}>
            <OptimizedImage
              source={getServiceImage()}
              style={styles.serviceImage}
              priority="normal"
              cachePolicy="memory-disk"
              showLoadingIndicator={false}
            />
            <View style={styles.serviceInfo}>
              <Text style={[styles.serviceName, { color: colors.text.primary }]} numberOfLines={2}>
                {service.title}
              </Text>
              <Text style={[styles.providerName, { color: colors.text.secondary }]} numberOfLines={1}>
                By {displayName}
              </Text>
              <View style={styles.ratingContainer}>
                <Star size={12} color="#FFD700" fill="#FFD700" />
                <Text style={[styles.rating, { color: colors.text.primary }]}>
                  {service.rating}
                </Text>
                <Text style={[styles.reviewCount, { color: colors.text.secondary }]}>
                  ({service.review_count})
                </Text>
              </View>
              <Text style={[styles.price, { color: colors.primary.main }]}>
                {getLowestPrice() > 0 ? `From ${service.currency}${getLowestPrice()}` : 'View Details'}
              </Text>
            </View>
          </View>

          {/* Share Options */}
          <View style={styles.shareOptions}>
            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.background.secondary }]}
              onPress={handleNativeShare}
            >
              <View style={[styles.shareIconContainer, { backgroundColor: colors.primary.main }]}>
                <Share2 size={20} color="white" />
              </View>
              <Text style={[styles.shareOptionText, { color: colors.text.primary }]}>
                Share via...
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.background.secondary }]}
              onPress={handleCopyLink}
              disabled={copying}
            >
              <View style={[styles.shareIconContainer, { backgroundColor: '#10B981' }]}>
                {copying ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Copy size={20} color="white" />
                )}
              </View>
              <Text style={[styles.shareOptionText, { color: colors.text.primary }]}>
                Copy Link
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.background.secondary }]}
              onPress={handleShareViaMessage}
            >
              <View style={[styles.shareIconContainer, { backgroundColor: '#3B82F6' }]}>
                <MessageCircle size={20} color="white" />
              </View>
              <Text style={[styles.shareOptionText, { color: colors.text.primary }]}>
                Message
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.background.secondary }]}
              onPress={handleShareViaEmail}
            >
              <View style={[styles.shareIconContainer, { backgroundColor: '#EF4444' }]}>
                <Mail size={20} color="white" />
              </View>
              <Text style={[styles.shareOptionText, { color: colors.text.primary }]}>
                Email
              </Text>
            </TouchableOpacity>
          </View>

          {/* Link Preview */}
          <View style={[styles.linkPreview, { backgroundColor: colors.background.secondary }]}>
            <Link size={16} color={colors.text.secondary} />
            <Text style={[styles.linkText, { color: colors.text.secondary }]} numberOfLines={1}>
              {serviceLink}
            </Text>
          </View>

          {/* Info Text */}
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            This link will open the service in the BetaMe app. If the recipient doesn't have the app, they'll be prompted to download it.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  servicePreview: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  serviceImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 14,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    marginLeft: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareOptions: {
    gap: 12,
    marginBottom: 20,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  shareIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  shareOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  linkPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  linkText: {
    fontSize: 12,
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});