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

interface BetaCoinBundle {
  id: string;
  betacoins: number;
  price: string;
  priceValue: number;
  validity: string;
  image: any;
  badge?: string;
}

interface BetaCoinPurchaseProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

const betacoinBundles: BetaCoinBundle[] = [
  {
    id: '1',
    betacoins: 20,
    price: 'RM 5',
    priceValue: 5,
    validity: '1-year validity',
    image: require('../assets/images/credit-purchase/RM5.png'),
  },
  {
    id: '2',
    betacoins: 100,
    price: 'RM 20',
    priceValue: 20,
    validity: '1-year validity',
    image: require('../assets/images/credit-purchase/RM20.png'),
  },
  {
    id: '3',
    betacoins: 250,
    price: 'RM 35',
    priceValue: 35,
    validity: '1-year validity',
    image: require('../assets/images/credit-purchase/RM35.png'),
    badge: 'Popular',
  },
  {
    id: '4',
    betacoins: 600,
    price: 'RM 80',
    priceValue: 80,
    validity: '1-year validity',
    image: require('../assets/images/credit-purchase/RM80.png'),
  },
  {
    id: '5',
    betacoins: 1000,
    price: 'RM 100',
    priceValue: 100,
    validity: '1-year validity',
    image: require('../assets/images/credit-purchase/RM100.png'),
  },
  {
    id: '6',
    betacoins: 2000,
    price: 'RM 180',
    priceValue: 180,
    validity: '1-year validity',
    image: require('../assets/images/credit-purchase/RM180.png'),
    badge: 'Best Value',
  },
];

export function BetaCoinPurchase({ visible, onClose, onPurchaseSuccess }: BetaCoinPurchaseProps) {
  const colors = useColors();
  const { user } = useAuth();
  const [selectedBundle, setSelectedBundle] = useState<BetaCoinBundle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async (bundle: BetaCoinBundle) => {
    if (!user) {
      Alert.alert('Error', 'Please log in to purchase BetaCoins');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add BetaCoins to wallet
      const result = await WalletService.addBetaCoins(user.id, bundle.betacoins);
      
      if (result.success) {
        Alert.alert(
          'Purchase Successful!',
          `${bundle.betacoins} BetaCoins have been added to your wallet.`,
          [
            {
              text: 'OK',
              onPress: () => {
                onPurchaseSuccess();
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Purchase Failed', result.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderBundle = (bundle: BetaCoinBundle) => (
    <TouchableOpacity
      key={bundle.id}
      style={[styles.bundleCard, { borderColor: colors.border.main }]}
      onPress={() => handlePurchase(bundle)}
      disabled={isProcessing}
    >
      <ImageBackground
        source={bundle.image}
        style={styles.bundleImage}
        imageStyle={styles.bundleImageStyle}
      >
        {bundle.badge && (
          <View style={[styles.badge, { backgroundColor: colors.primary.main }]}>
            <Text style={styles.badgeText}>{bundle.badge}</Text>
          </View>
        )}
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.bundleGradient}
        >
          <View style={styles.bundleContent}>
            <View style={styles.bundleHeader}>
              <Sparkles size={20} color="#FFD700" />
              <Text style={styles.bundleCredits}>{bundle.betacoins} BetaCoins</Text>
            </View>
            
            <Text style={styles.bundlePrice}>{bundle.price}</Text>
            <Text style={styles.bundleValidity}>{bundle.validity}</Text>
            <Text style={styles.processingFee}>+2.2% processing fee</Text>
            
            <View style={[styles.purchaseButton, { backgroundColor: colors.primary.main }]}>
              <ShoppingCart size={16} color="white" />
              <Text style={styles.purchaseButtonText}>
                {isProcessing ? 'Processing...' : 'Purchase'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background.main }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.main }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Purchase BetaCoins
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.description}>
            <Text style={[styles.descriptionText, { color: colors.text.secondary }]}>
              BetaCoins can be purchased with a 2.2% processing fee or exchanged with Diamond Stones. 
              Use BetaCoins to pay for services, boost your listings, and unlock premium features.
            </Text>
          </View>

          <View style={styles.bundlesGrid}>
            {betacoinBundles.map(renderBundle)}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.text.secondary }]}>
              • All purchases include 2.2% processing fee{'\n'}
              • BetaCoins are valid for 1 year from purchase{'\n'}
              • Can be exchanged with Diamond Stones (10 stones = 1 BetaCoin)
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  description: {
    paddingVertical: 20,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  bundlesGrid: {
    gap: 16,
  },
  bundleCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bundleImage: {
    height: 200,
    justifyContent: 'flex-end',
  },
  bundleImageStyle: {
    borderRadius: 16,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bundleGradient: {
    padding: 16,
  },
  bundleContent: {
    gap: 8,
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bundleCredits: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  bundlePrice: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  bundleValidity: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  processingFee: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});