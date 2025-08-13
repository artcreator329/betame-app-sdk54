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

interface CreditBundle {
  id: string;
  credits: number;
  price: string;
  priceValue: number;
  validity: string;
  image: any;
  badge?: string;
}

interface CreditPurchaseProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

const creditBundles: CreditBundle[] = [
  {
    id: '1',
    credits: 5,
    price: 'RM 5',
    priceValue: 5,
    validity: '1-year validity',
    image: require('../assets/images/credit-purchase/RM5.png'),
  },
  {
    id: '2',
    credits: 20,
    price: 'RM 20',
    priceValue: 20,
    validity: '1-year validity',
    image: require('../assets/images/credit-purchase/RM20.png'),
    badge: 'POPULAR',
  },
  {
    id: '3',
    credits: 35,
    price: 'RM 35',
    priceValue: 35,
    validity: '1-year validity',
    image: require('../assets/images/credit-purchase/RM35.png'),
  },
  {
    id: '4',
    credits: 80,
    price: 'RM 80',
    priceValue: 80,
    validity: '1-year validity',
    image: require('../assets/images/credit-purchase/RM80.png'),
  },
  {
    id: '5',
    credits: 100,
    price: 'RM 100',
    priceValue: 100,
    validity: '1-year validity',
    image: require('../assets/images/credit-purchase/RM100.png'),
    badge: 'BEST VALUE',
  },
  {
    id: '6',
    credits: 180,
    price: 'RM 180',
    priceValue: 180,
    validity: '1-year validity',
    image: require('../assets/images/credit-purchase/RM180.png'),
  },
];

export function CreditPurchase({ visible, onClose, onPurchaseSuccess }: CreditPurchaseProps) {
  const colors = useColors();
  const { user } = useAuth();
  const [selectedBundle, setSelectedBundle] = useState<CreditBundle | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const handleBundlePress = (bundle: CreditBundle) => {
    setSelectedBundle(bundle);
    setShowConfirmModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedBundle || !user?.id) return;
    
    setPurchasing(true);
    try {
      // Simulate purchase API call
      // In a real app, this would integrate with a payment processor
      const result = await WalletService.addCredits(user.id, selectedBundle.credits);
      
      if (result.success) {
        Alert.alert(
          'Purchase Successful!',
          `You have successfully purchased ${selectedBundle.credits} credits for ${selectedBundle.price}!`,
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
              <Text style={styles.headerTitle}>Purchase Credits</Text>
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
            <Text style={styles.subtitle}>Choose your credit package</Text>
            <Text style={styles.subtitleSecondary}>Tap any banner to purchase instantly!</Text>
            <Sparkles size={16} color="#FFD700" style={styles.sparkleIconSmall} />
          </View>
        </LinearGradient>

        {/* Credit Purchase Banners */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.bundlesContainer}>
            {creditBundles.map((bundle) => (
              <TouchableOpacity
                key={bundle.id}
                style={[
                  styles.bannerButton,
                  selectedBundle?.id === bundle.id && styles.selectedBanner,
                ]}
                onPress={() => handleBundlePress(bundle)}
                activeOpacity={0.8}
              >
                {bundle.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{bundle.badge}</Text>
                  </View>
                )}
                <Image 
                  source={bundle.image} 
                  style={styles.bannerImage}
                  resizeMode="contain"
                />
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
                  <Image 
                    source={selectedBundle.image} 
                    style={styles.modalBundleImage}
                    resizeMode="contain"
                  />
                  <Text style={[styles.modalBundleText, { color: colors.text.primary }]}>
                    {selectedBundle.credits} BetaMe Credits
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 8,
    alignItems: 'stretch',
  },
  bannerButton: {
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  selectedBanner: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#667eea',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bannerImage: {
    width: '100%',
    height: 100,
    borderRadius: 16,
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
  modalBundleImage: {
    width: 240,
    height: 70,
    marginBottom: 16,
    borderRadius: 12,
  },
  modalBundleText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
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