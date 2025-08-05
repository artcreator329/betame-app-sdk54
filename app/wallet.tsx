import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Zap, TrendingUp, Trophy, CreditCard, Gift, Eye, Target, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { WalletService, WalletData, PurchasedFeature } from '../lib/wallet-service';
import { useAuth } from '../contexts/AuthContext';
import { useColors, useTheme } from '@/contexts/ThemeContext';

interface Feature {
  id: string;
  type: 'feature_2x' | 'boost_instant' | 'showcase_max' | 'boost_feature_max';
  title: string;
  description: string;
  cost: number;
  icon: React.ReactNode;
  color: string;
  validity: string;
}

// Move availableFeatures inside component to access colors
const getAvailableFeatures = (colors: any): Feature[] => [
  {
    id: 'feature_2x',
    type: 'feature_2x',
    title: 'Feature (2x visibility)',
    description: 'Feature your listing in the homepage & dedicated section! Valid for 2 weeks when people search related/relevant services.',
    cost: 100,
    icon: <Eye size={20} color="white" />,
    color: colors.status.success,
    validity: '2 weeks'
  },
  {
    id: 'boost_instant',
    type: 'boost_instant',
    title: 'Boost (instant visibility)',
    description: 'Bump your listing to top in relevant section. It shown when people click on the categories, on top for a week.',
    cost: 20,
    icon: <Zap size={20} color="white" />,
    color: colors.status.warning,
    validity: '1 week'
  },
  {
    id: 'showcase_max',
    type: 'showcase_max',
    title: 'Showcase (Max visibility)',
    description: 'Pin your listing at the top of relevant section. Valid for 2 weeks when people search related/relevant service.',
    cost: 50,
    icon: <Target size={20} color="white" />,
    color: colors.primary.main,
    validity: '2 weeks'
  },
  {
    id: 'boost_feature_max',
    type: 'boost_feature_max',
    title: 'Boost Feature (Max visibility for All)',
    description: 'Feature your listing in the homepage & dedicated section! Valid for 2 weeks when people not even search related/relevant services.',
    cost: 200,
    icon: <Sparkles size={20} color="white" />,
    color: colors.status.info,
    validity: '2 weeks'
  },
];

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const { isDarkMode } = useTheme();
  const availableFeatures = getAvailableFeatures(colors);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [purchasedFeatures, setPurchasedFeatures] = useState<PurchasedFeature[]>([]);
  const [convertAmount, setConvertAmount] = useState('10');
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  useEffect(() => {
    if (user?.id) {
      loadWalletData();
    }
  }, [user]);

  const loadWalletData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const [wallet, features] = await Promise.all([
        WalletService.getWallet(user.id),
        WalletService.getPurchasedFeatures(user.id)
      ]);
      
      setWalletData(wallet || { user_id: user.id, betame_stones: 0, betame_credits: 0 });
      setPurchasedFeatures(features);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!user?.id || !walletData) return;
    
    const amount = parseInt(convertAmount);
    if (amount > walletData.betame_stones) {
      Alert.alert('Insufficient Stones', 'You don\'t have enough BetaMe stones to convert.');
      return;
    }
    if (amount < 10) {
      Alert.alert('Minimum Conversion', 'Minimum conversion is 10 BetaMe stones.');
      return;
    }
    
    const result = await WalletService.convertStonesToCredits(user.id, amount);
    if (result.success && result.wallet) {
      setWalletData(result.wallet);
      setConvertAmount('10');
      const creditsEarned = Math.floor(amount / 10);
      Alert.alert('Conversion Successful', `Converted ${amount} BetaMe stones to ${creditsEarned} BetaMe credit(s)!`);
    } else {
      Alert.alert('Conversion Failed', result.error || 'Failed to convert stones');
    }
  };

  const handleFeaturePurchase = (feature: Feature) => {
    setSelectedFeature(feature);
    setPurchaseQuantity(1);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = async () => {
    if (!user?.id || !selectedFeature || !walletData) return;
    
    const totalCost = selectedFeature.cost * purchaseQuantity;
    if (walletData.betame_credits < totalCost) {
      Alert.alert('Insufficient Credits', 'You don\'t have enough BetaMe credits for this purchase.');
      return;
    }
    
    const result = await WalletService.purchaseFeature(user.id, selectedFeature.type, purchaseQuantity);
    if (result.success) {
      setShowPurchaseModal(false);
      await loadWalletData();
      Alert.alert('Purchase Successful', `${purchaseQuantity}x ${selectedFeature.title} added to your wallet!`);
    } else {
      Alert.alert('Purchase Failed', result.error || 'Failed to purchase feature');
    }
  };

  const handleUseFeature = async (feature: PurchasedFeature) => {
    if (!user?.id) return;
    
    Alert.alert(
      'Use Feature',
      `Use 1x ${feature.feature_name}? This will reduce your available quantity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use',
          onPress: async () => {
            const result = await WalletService.useFeature(user.id!, feature.id!);
            if (result.success) {
              await loadWalletData();
              Alert.alert('Feature Used', `${feature.feature_name} has been applied!`);
            } else {
              Alert.alert('Error', result.error || 'Failed to use feature');
            }
          },
        },
      ]
    );
  };

  const navigateToCheckIn = () => {
    router.push('/check-in');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <Text>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <SafeAreaView 
        style={[styles.container, { backgroundColor: colors.background.primary }]}
        edges={['left', 'right', 'bottom']}
      >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.headerContainer, { backgroundColor: colors.background.primary }]}>
          <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Wallet</Text>
            <TouchableOpacity onPress={navigateToCheckIn}>
              <Trophy size={24} color={colors.status.warning} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Balances */}
        <View style={styles.balanceSection}>
          <ImageBackground 
            source={require('../assets/images/diamond-bg.jpeg')}
            style={styles.balanceCard}
            imageStyle={styles.balanceCardImage}
          >
            <View style={styles.balanceOverlay}>
               <View style={styles.balanceHeader}>
                 <Text style={styles.balanceLabelWithBg}>Premium Stones</Text>
               </View>
               <Text style={styles.balanceAmountWithBg}>{walletData?.betame_stones || 0} Stones</Text>
             </View>
          </ImageBackground>

          <ImageBackground 
            source={require('../assets/images/coin-bg.jpeg')}
            style={styles.balanceCard}
            imageStyle={styles.balanceCardImage}
          >
            <View style={styles.balanceOverlay}>
               <View style={styles.balanceHeader}>
                 <Text style={styles.balanceLabelWithBg}>BetaMe Credit Wallet</Text>
               </View>
               <Text style={styles.balanceAmountWithBg}>{walletData?.betame_credits || 0} Credits</Text>
               <Text style={styles.balanceSubtextWithBg}>Can buy BetaMe credits</Text>
             </View>
          </ImageBackground>
        </View>

        {/* Conversion Section */}
        <View style={styles.conversionSection}>
          <Text style={[styles.conversionTitle, { color: colors.text.primary }]}>Convert your stones to Credits!</Text>
          <Text style={[styles.conversionSubtitle, { color: colors.text.secondary }]}>Convert 10 premium stones into 1 BetaMe credit</Text>
          
          <View style={[styles.conversionCard, { backgroundColor: colors.background.tertiary }]}>
            <View style={styles.conversionRow}>
              <View style={styles.conversionInput}>
                <TextInput
                  style={styles.input}
                  value={convertAmount}
                  onChangeText={setConvertAmount}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
                <Text style={styles.inputLabel}>💎</Text>
              </View>
              <Text style={styles.conversionArrow}>→</Text>
              <View style={styles.conversionOutput}>
                <Text style={styles.outputValue}>{Math.floor(parseInt(convertAmount || '0') / 10)}</Text>
                <Text style={styles.outputLabel}>B</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.convertButton} onPress={handleConvert}>
              <Text style={styles.convertButtonText}>Convert</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Purchased Features */}
        <View style={styles.boostsSection}>
          <Text style={[styles.boostsTitle, { color: colors.text.primary }]}>Your Purchased Features</Text>
          {purchasedFeatures.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.background.tertiary }]}>
              <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>No features purchased yet</Text>
            </View>
          ) : (
            purchasedFeatures.map((feature) => {
              const featureConfig = availableFeatures.find(f => f.type === feature.feature_type);
              return (
                <TouchableOpacity
                  key={feature.id}
                  style={[styles.boostCard, { backgroundColor: colors.background.tertiary }]}
                  onPress={() => handleUseFeature(feature)}
                >
                  <View style={[styles.boostIcon, { backgroundColor: featureConfig?.color || '#666' }]}>
                    {featureConfig?.icon || <Eye size={20} color="white" />}
                  </View>
                  <View style={styles.boostContent}>
                    <Text style={[styles.boostTitle, { color: colors.text.primary }]}>{feature.feature_name}</Text>
                    <Text style={[styles.boostDescription, { color: colors.text.secondary }]}>Quantity: {feature.quantity} | Expires: {new Date(feature.expires_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.boostPrice}>
                    <Text style={[styles.boostPriceText, { color: colors.text.primary }]}>{feature.quantity}</Text>
                    <Text style={styles.boostPriceLabel}>Left</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Visibility Boosts */}
        <View style={styles.boostsSection}>
          <Text style={[styles.boostsTitle, { color: colors.text.primary }]}>Boost to Convert...</Text>
          <Text style={[styles.boostsSubtitle, { color: colors.text.secondary }]}>Different feature to make the listing extra visibility by using BetaMe credits to boost</Text>
          
          {availableFeatures.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[styles.boostCard, { backgroundColor: colors.background.tertiary }]}
              onPress={() => handleFeaturePurchase(feature)}
            >
              <View style={[styles.boostIcon, { backgroundColor: feature.color }]}>
                {feature.icon}
              </View>
              <View style={styles.boostContent}>
                <Text style={[styles.boostTitle, { color: colors.text.primary }]}>{feature.title}</Text>
                <Text style={[styles.boostDescription, { color: colors.text.secondary }]}>{feature.description}</Text>
              </View>
              <View style={styles.boostPrice}>
                <Text style={[styles.boostPriceText, { color: colors.text.primary }]}>{feature.cost}</Text>
                <Text style={styles.boostPriceLabel}>B</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Purchase Modal */}
        <Modal
          visible={showPurchaseModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPurchaseModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background.tertiary }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Purchase {selectedFeature?.title}</Text>
              <Text style={[styles.modalDescription, { color: colors.text.secondary }]}>{selectedFeature?.description}</Text>
              
              <View style={styles.quantitySection}>
                <Text style={[styles.quantityLabel, { color: colors.text.primary }]}>Quantity:</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.quantityValue, { color: colors.text.primary }]}>{purchaseQuantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setPurchaseQuantity(purchaseQuantity + 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.totalSection}>
                <Text style={[styles.totalLabel, { color: colors.text.primary }]}>Total Cost:</Text>
                <Text style={styles.totalValue}>{(selectedFeature?.cost || 0) * purchaseQuantity} Credits</Text>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}
                  onPress={() => setShowPurchaseModal(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.purchaseButton, { backgroundColor: colors.primary.main }]}
                  onPress={confirmPurchase}
                >
                  <Text style={styles.purchaseButtonText}>Purchase</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 24,
  },
  balanceSection: {
    padding: 20,
    gap: 16,
  },
  balanceCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 20,
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  balanceCardImage: {
    borderRadius: 12,
  },
  balanceOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 20,
    margin: -20,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  balanceLabelWithBg: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  stoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stoneImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  stoneEmoji: {
    fontSize: 16,
  },
  creditIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  balanceAmountWithBg: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  balanceSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  balanceSubtextWithBg: {
    fontSize: 14,
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  conversionSection: {
    padding: 20,
  },
  conversionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  conversionSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  conversionCard: {
    borderRadius: 12,
    padding: 20,
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  conversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  conversionInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginRight: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  conversionArrow: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.8)',
    marginHorizontal: 16,
  },
  conversionOutput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  outputValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  outputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 8,
  },
  convertButton: {
    backgroundColor: '#E91E63',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  convertButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  boostsSection: {
    padding: 20,
  },
  boostsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  boostsSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  boostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  boostIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  boostContent: {
    flex: 1,
  },
  boostTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  boostDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  boostPrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boostPriceText: {
    fontSize: 18,
    fontWeight: '700',
  },
  boostPriceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 4,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
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
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD700',
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
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  purchaseButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    marginLeft: 8,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});