import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ShoppingCart, Sparkles, Crown, Zap, Star } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { WalletService } from '@/lib/wallet-service';

interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  price: string;
  duration: string;
  icon: string;
  badge?: string;
  benefits: string[];
  stoneCost: number;
  type: 'feature_2x' | 'boost_instant' | 'showcase_max' | 'boost_feature_max';
}

interface PremiumFeaturesMarketplaceProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

const premiumFeatures: PremiumFeature[] = [
  {
    id: '1',
    name: 'Profile Boost',
    description: 'Get 3x more profile views',
    price: '50 Stones',
    duration: '7 days',
    icon: '🚀',
    stoneCost: 50,
    type: 'feature_2x',
    benefits: ['3x profile visibility', 'Priority in search results', 'Featured badge']
  },
  {
    id: '2',
    name: 'Premium Badge',
    description: 'Stand out with premium status',
    price: '100 Stones',
    duration: '30 days',
    icon: '👑',
    badge: 'MOST POPULAR',
    stoneCost: 100,
    type: 'boost_instant',
    benefits: ['Premium crown badge', 'Enhanced credibility', 'Priority support']
  },
  {
    id: '3',
    name: 'Super Likes',
    description: 'Send unlimited super likes',
    price: '75 Stones',
    duration: '14 days',
    icon: '💖',
    stoneCost: 75,
    type: 'showcase_max',
    benefits: ['Unlimited super likes', 'Higher match rate', 'Express interest']
  },
  {
    id: '4',
    name: 'Advanced Filters',
    description: 'Filter by detailed preferences',
    price: '120 Stones',
    duration: '30 days',
    icon: '🔍',
    stoneCost: 120,
    type: 'feature_2x',
    benefits: ['Age range filters', 'Location radius', 'Interest matching']
  },
  {
    id: '5',
    name: 'VIP Package',
    description: 'All premium features included',
    price: '200 Stones',
    duration: '30 days',
    icon: '⭐',
    badge: 'BEST VALUE',
    stoneCost: 200,
    type: 'boost_feature_max',
    benefits: ['All premium features', 'Priority matching', 'Exclusive content']
  },
  {
    id: '6',
    name: 'Incognito Mode',
    description: 'Browse profiles privately',
    price: '80 Stones',
    duration: '14 days',
    icon: '🕶️',
    stoneCost: 80,
    type: 'boost_instant',
    benefits: ['Anonymous browsing', 'Private profile views', 'Stealth mode']
  },
];

export function PremiumFeaturesMarketplace({ visible, onClose, onPurchaseSuccess }: PremiumFeaturesMarketplaceProps) {
  const colors = useColors();
  const { user } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState<PremiumFeature | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const handleFeaturePress = (feature: PremiumFeature) => {
    setSelectedFeature(feature);
    setShowConfirmModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedFeature || !user?.id) return;
    
    setPurchasing(true);
    try {
      // Check if user has enough stones
      const walletData = await WalletService.getWallet(user.id);
      if (!walletData) {
        Alert.alert('Error', 'Unable to fetch wallet data');
        return;
      }
      
      if (walletData.betame_stones < selectedFeature.stoneCost) {
        Alert.alert(
          'Insufficient Stones',
          `You need ${selectedFeature.stoneCost} stones to purchase this feature. You currently have ${walletData.betame_stones} stones.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Buy Stones', onPress: () => {
              setShowConfirmModal(false);
              onClose();
              // Navigate to stone marketplace
            }}
          ]
        );
        return;
      }

      // Simulate feature purchase
        const result = await WalletService.purchaseFeature(user.id, selectedFeature.type, 1);
      
      if (result.success) {
        Alert.alert(
          'Purchase Successful!',
          `You have successfully activated ${selectedFeature.name} for ${selectedFeature.duration}!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowConfirmModal(false);
                onPurchaseSuccess();
              },
            },
          ]
        );
      } else {
        Alert.alert('Purchase Failed', result.error || 'Failed to complete purchase');
      }
    } catch (error) {
      Alert.alert('Purchase Failed', 'An error occurred during purchase');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {/* Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Image 
                source={require('../assets/images/icon.png')} 
                style={styles.headerIcon}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>Premium Features</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Subtitle */}
        <LinearGradient
          colors={['#4A148C', '#6A1B9A']}
          style={styles.subtitleContainer}
        >
          <View style={styles.subtitleContent}>
            <Crown size={20} color="#FFD700" style={styles.sparkleIcon} />
            <Text style={styles.subtitle}>Unlock premium features</Text>
            <Text style={styles.subtitleSecondary}>and enhance your experience!</Text>
            <Star size={16} color="#FFD700" style={styles.sparkleIconSmall} />
          </View>
        </LinearGradient>

        {/* Premium Features */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.featuresContainer}>
            {premiumFeatures.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={[
                  styles.featureCard,
                  selectedFeature?.id === feature.id && styles.selectedCard,
                ]}
                onPress={() => setSelectedFeature(feature)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={selectedFeature?.id === feature.id ? ['#667eea', '#764ba2'] : ['#ffffff', '#f8f9fa']}
                  style={styles.cardGradient}
                >
                  {feature.badge && (
                    <LinearGradient
                      colors={feature.badge === 'MOST POPULAR' ? ['#FF6B35', '#FF8E53'] : ['#4CAF50', '#66BB6A']}
                      style={styles.badge}
                    >
                      <Text style={styles.badgeText}>{feature.badge}</Text>
                    </LinearGradient>
                  )}
                  
                  <View style={styles.featureContent}>
                    <View style={styles.featureLeft}>
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.iconContainer}
                      >
                        <Text style={styles.iconText}>{feature.icon}</Text>
                      </LinearGradient>
                      <View style={styles.featureInfo}>
                        <Text style={[styles.featureName, { color: selectedFeature?.id === feature.id ? '#ffffff' : '#2c3e50' }]}>
                          {feature.name}
                        </Text>
                        <Text style={[styles.featureDescription, { color: selectedFeature?.id === feature.id ? '#e8eaf6' : '#7f8c8d' }]}>
                          {feature.description}
                        </Text>
                        <Text style={[styles.duration, { color: selectedFeature?.id === feature.id ? '#e8eaf6' : '#95a5a6' }]}>
                          {feature.duration}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.featureRight}>
                      <LinearGradient
                        colors={['#FF6B35', '#FF8E53']}
                        style={styles.priceContainer}
                      >
                        <Text style={styles.price}>{feature.price}</Text>
                      </LinearGradient>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Purchase Confirmation Modal */}
        <Modal
          visible={showConfirmModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background.tertiary }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Confirm Purchase</Text>
              
              {selectedFeature && (
                <View style={styles.modalFeatureInfo}>
                  <Text style={styles.modalEmoji}>{selectedFeature.icon}</Text>
                  <Text style={[styles.modalFeatureText, { color: colors.text.primary }]}>
                    {selectedFeature.name}
                  </Text>
                  <Text style={[styles.modalPrice, { color: colors.primary.main }]}>
                    {selectedFeature.price}
                  </Text>
                  <Text style={[styles.modalDuration, { color: colors.text.secondary }]}>
                    Duration: {selectedFeature.duration}
                  </Text>
                  
                  <View style={styles.benefitsList}>
                    <Text style={[styles.benefitsTitle, { color: colors.text.primary }]}>Benefits:</Text>
                    {selectedFeature.benefits.map((benefit, index) => (
                      <Text key={index} style={[styles.benefitItem, { color: colors.text.secondary }]}>
                        • {benefit}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}
                  onPress={() => setShowConfirmModal(false)}
                  disabled={purchasing}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text.primary }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.purchaseButton, { backgroundColor: colors.primary.main }]}
                  onPress={handlePurchase}
                  disabled={purchasing}
                >
                  <Zap size={16} color="white" style={styles.purchaseIcon} />
                  <Text style={styles.purchaseButtonText}>
                    {purchasing ? 'Processing...' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  subtitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 12,
  },
  subtitleContent: {
    alignItems: 'center',
    position: 'relative',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitleSecondary: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: '#E0E0E0',
  },
  sparkleIcon: {
    position: 'absolute',
    top: -10,
    left: -30,
  },
  sparkleIconSmall: {
    position: 'absolute',
    bottom: -8,
    right: -25,
  },
  scrollView: {
    flex: 1,
  },
  featuresContainer: {
    padding: 20,
    gap: 12,
  },
  featureCard: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  selectedCard: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
    color: 'white',
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    marginBottom: 2,
  },
  duration: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  featureRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  priceContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  modalFeatureInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalFeatureText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalPrice: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalDuration: {
    fontSize: 14,
    marginBottom: 16,
  },
  benefitsList: {
    alignSelf: 'stretch',
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  benefitItem: {
    fontSize: 13,
    marginBottom: 4,
    paddingLeft: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  purchaseButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  purchaseIcon: {
    marginRight: 4,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});