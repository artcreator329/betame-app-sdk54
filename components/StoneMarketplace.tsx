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
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ShoppingCart, Sparkles } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { WalletService } from '@/lib/wallet-service';

interface StoneBundle {
  id: string;
  stones: number;
  price: string;
  validity: string;
  emoji: string;
  badge?: string;
  badgeColor?: string;
}

interface StoneMarketplaceProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

const stoneBundles: StoneBundle[] = [
  {
    id: '1',
    stones: 20,
    price: 'RM 5',
    validity: '1-year validity',
    emoji: '💎',
  },
  {
    id: '2',
    stones: 100,
    price: 'RM 20',
    validity: '1-year validity',
    emoji: '💰',
    badge: 'MOST POPULAR',
    badgeColor: '#FF4444',
  },
  {
    id: '3',
    stones: 250,
    price: 'RM 35',
    validity: '1-year validity',
    emoji: '🪙',
  },
  {
    id: '4',
    stones: 600,
    price: 'RM 80',
    validity: '1-year validity',
    emoji: '💸',
  },
  {
    id: '5',
    stones: 1000,
    price: 'RM 100',
    validity: '1-year validity',
    emoji: '💰',
    badge: 'SUPER DEAL',
    badgeColor: '#FF6B35',
  },
  {
    id: '6',
    stones: 2000,
    price: 'RM 180',
    validity: '1-year validity',
    emoji: '🏆',
  },
];

export function StoneMarketplace({ visible, onClose, onPurchaseSuccess }: StoneMarketplaceProps) {
  const colors = useColors();
  const { user } = useAuth();
  const [selectedBundle, setSelectedBundle] = useState<StoneBundle | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const handleBundlePress = (bundle: StoneBundle) => {
    setSelectedBundle(bundle);
    setShowConfirmModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedBundle || !user?.id) return;
    
    setPurchasing(true);
    try {
      // Simulate purchase API call
      // In a real app, this would integrate with a payment processor
      const result = await WalletService.addStones(user.id, selectedBundle.stones);
      
      if (result.success) {
        Alert.alert(
          'Purchase Successful!',
          `You have successfully purchased ${selectedBundle.stones} stones for ${selectedBundle.price}!`,
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
          colors={[colors.primary.main, colors.primary.dark || colors.primary.main]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Image 
                source={require('../assets/images/icon.png')} 
                style={styles.headerIcon}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>BETAME Marketplace</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Subtitle */}
        <LinearGradient
          colors={['#2D1B69', '#1A1A2E']}
          style={styles.subtitleContainer}
        >
          <View style={styles.subtitleContent}>
            <Sparkles size={20} color="#FFD700" style={styles.sparkleIcon} />
            <Text style={styles.subtitle}>Maximize your savings</Text>
            <Text style={styles.subtitleSecondary}>with bigger bundles!</Text>
            <Sparkles size={16} color="#FFD700" style={styles.sparkleIconSmall} />
          </View>
        </LinearGradient>

        {/* Stone Bundles */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.bundlesContainer}>
            {stoneBundles.map((bundle) => (
              <TouchableOpacity
              key={bundle.id}
              style={[
                styles.bundleCard,
                selectedBundle?.id === bundle.id && styles.selectedCard,
              ]}
              onPress={() => setSelectedBundle(bundle)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={selectedBundle?.id === bundle.id ? ['#667eea', '#764ba2'] : ['#ffffff', '#f8f9fa']}
                style={styles.cardGradient}
              >
                {bundle.badge && (
                  <LinearGradient
                    colors={bundle.badge === 'MOST POPULAR' ? ['#FF6B35', '#FF8E53'] : ['#FFD700', '#FFA500']}
                    style={styles.badge}
                  >
                    <Text style={styles.badgeText}>{bundle.badge}</Text>
                  </LinearGradient>
                )}
                
                <View style={styles.bundleContent}>
                  <View style={styles.bundleLeft}>
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.iconContainer}
                    >
                      <Text style={styles.iconText}>{bundle.emoji}</Text>
                    </LinearGradient>
                    <View style={styles.bundleInfo}>
                      <View style={styles.stoneAmount}>
                        <Text style={styles.stoneIcon}>💎</Text>
                        <Text style={[styles.stoneCount, { color: selectedBundle?.id === bundle.id ? '#ffffff' : '#2c3e50' }]}>{bundle.stones}</Text>
                      </View>
                      <Text style={[styles.validity, { color: selectedBundle?.id === bundle.id ? '#e8eaf6' : '#7f8c8d' }]}>{bundle.validity}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.bundleRight}>
                    <LinearGradient
                      colors={['#11998e', '#38ef7d']}
                      style={styles.priceContainer}
                    >
                      <Text style={styles.price}>{bundle.price}</Text>
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
              
              {selectedBundle && (
                <View style={styles.modalBundleInfo}>
                  <Text style={styles.modalEmoji}>{selectedBundle.emoji}</Text>
                  <Text style={[styles.modalBundleText, { color: colors.text.primary }]}>
                    {selectedBundle.stones} Premium Stones
                  </Text>
                  <Text style={[styles.modalPrice, { color: colors.primary.main }]}>
                    {selectedBundle.price}
                  </Text>
                  <Text style={[styles.modalValidity, { color: colors.text.secondary }]}>
                    {selectedBundle.validity}
                  </Text>
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
                  <ShoppingCart size={16} color="white" style={styles.purchaseIcon} />
                  <Text style={styles.purchaseButtonText}>
                    {purchasing ? 'Processing...' : 'Purchase'}
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
  bundlesContainer: {
    padding: 20,
    gap: 12,
  },
  bundleCard: {
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
    top: -6,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  bundleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bundleLeft: {
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
  bundleInfo: {
    flex: 1,
  },
  stoneAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stoneIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  stoneCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  bundleRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  validity: {
    fontSize: 14,
  },
  priceContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalBundleInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalBundleText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalValidity: {
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
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
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  purchaseIcon: {
    marginRight: 8,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});