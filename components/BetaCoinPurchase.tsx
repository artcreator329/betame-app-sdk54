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
  Animated,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ShoppingCart, Sparkles } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { WalletService } from '@/lib/wallet-service';
import { FeeService } from '@/lib/fee-service';

interface BetaCoinBundle {
  id: string;
  betacoins: number;
  priceValue: number;
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
    priceValue: 5,
    image: require('../assets/images/credit-purchase/RM5.png'),
  },
  {
    id: '2',
    betacoins: 100,
    priceValue: 20,
    image: require('../assets/images/credit-purchase/RM20.png'),
  },
  {
    id: '3',
    betacoins: 250,
    priceValue: 35,
    image: require('../assets/images/credit-purchase/RM35.png'),
    badge: 'Popular',
  },
  {
    id: '4',
    betacoins: 600,
    priceValue: 80,
    image: require('../assets/images/credit-purchase/RM80.png'),
  },
  {
    id: '5',
    betacoins: 1000,
    priceValue: 100,
    image: require('../assets/images/credit-purchase/RM100.png'),
  },
  {
    id: '6',
    betacoins: 2000,
    priceValue: 180,
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

    // Calculate fees for this purchase
    const fees = FeeService.calculateBetaCoinPurchaseFees(bundle.priceValue);
    
    // Show confirmation with fee breakdown
    Alert.alert(
      'Confirm Purchase',
      `BetaCoins: ${bundle.betacoins}\nBase Price: RM${bundle.priceValue.toFixed(2)}\nProcessing Fee (2.2%): RM${fees.processingFee.toFixed(2)}\nTotal: RM${fees.totalAmount.toFixed(2)}`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          onPress: () => processPurchase(bundle, fees)
        }
      ]
    );
  };

  const processPurchase = async (bundle: BetaCoinBundle, fees: any) => {
    if (!user) {
      Alert.alert('Error', 'Please log in to purchase BetaCoins');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate payment processing with fees
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Record the transaction with the total amount including fees
      const result = await WalletService.addBetaCoins(user.id, bundle.betacoins, {
        transactionAmount: fees.totalAmount,
        processingFee: fees.processingFee,
        baseAmount: fees.baseAmount
      });
      
      if (result.success) {
        Alert.alert(
          'Purchase Successful!',
          `${bundle.betacoins} BetaCoins have been added to your wallet.\nTotal paid: RM${fees.totalAmount.toFixed(2)} (including RM${fees.processingFee.toFixed(2)} processing fee)`,
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

  const renderBundle = (bundle: BetaCoinBundle) => {
    const fees = FeeService.calculateBetaCoinPurchaseFees(bundle.priceValue);
    
    return (
      <Animated.View key={bundle.id}>
        <Pressable
          style={({ pressed }) => [
            styles.bundleCard,
            { borderColor: colors.border.main },
            {
              transform: [{ scale: pressed ? 0.98 : 1 }],
              opacity: pressed ? 0.9 : 1,
            }
          ]}
          onPress={() => handlePurchase(bundle)}
          disabled={isProcessing}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
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
        
        <ImageBackground
          source={bundle.image}
          style={styles.bundleContent}
          imageStyle={styles.bundleImageStyle}
        >
          <View style={styles.bundleContentOverlay} />
        </ImageBackground>
      </ImageBackground>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
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
            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <View style={[styles.bulletPoint, { backgroundColor: colors.primary.main }]} />
                <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                  All purchases include 2.2% processing fee
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <View style={[styles.bulletPoint, { backgroundColor: colors.primary.main }]} />
                <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                  BetaCoins are valid for 1 year from purchase
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <View style={[styles.bulletPoint, { backgroundColor: colors.primary.main }]} />
                <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                  Can be exchanged with Diamond Stones (10 stones = 1 BetaCoin)
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <View style={[styles.bulletPoint, { backgroundColor: colors.primary.main }]} />
                <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                  Service providers pay 11% or RM4.90 platform fee (whichever higher)
                </Text>
              </View>
            </View>
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
    gap: 8,
    paddingTop: 16,
  },
  bundleCard: {
    borderRadius: 20,
    overflow: 'visible',
    marginBottom: 4,
    backgroundColor: '#1A1A1A',
    height: 64,
    marginTop: 8,
  },
  bundleImage: {
    height: '100%',
    width: '100%',
    backgroundColor: 'transparent',
  },
  bundleImageStyle: {
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    right: 8,
    top: -6,
    backgroundColor: '#0891B2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bundleContent: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  bundleContentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.01)', // Very subtle overlay for depth
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
    paddingHorizontal: 8,
  },
  infoCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 12,
    flexShrink: 0,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});