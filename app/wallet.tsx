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
import { ArrowLeft, Zap, TrendingUp, Trophy, CreditCard, Gift, Eye, Target, Sparkles, ShoppingBag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { WalletService, WalletData, PurchasedFeature } from '../lib/wallet-service';
import { useAuth } from '../contexts/AuthContext';
import { useColors, useTheme } from '@/contexts/ThemeContext';
import { BetaCoinPurchase } from '../components/BetaCoinPurchase';
import { ServiceSelectionModal } from '../components/ServiceSelectionModal';
import { Service } from '../lib/service-service';

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
    title: 'Boost Feature (Max visibility)',
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
  const [showBetaCoinPurchase, setShowBetaCoinPurchase] = useState(false);
  const [showServiceSelection, setShowServiceSelection] = useState(false);
  const [selectedPurchasedFeature, setSelectedPurchasedFeature] = useState<PurchasedFeature | null>(null);

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
      
      setWalletData(wallet || { user_id: user.id, betame_stones: 0, betame_betacoins: 0 });
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
      Alert.alert(
        'Insufficient Stones',
        'You don\'t have enough BetaMe stones to convert.',
        [
          { text: 'Cancel', style: 'cancel' as const },
          {
            text: 'Buy More BetaCoins',
            onPress: () => setShowBetaCoinPurchase(true),
          },
        ]
      );
      return;
    }
    if (amount < 10) {
      Alert.alert('Minimum Conversion', 'Minimum conversion is 10 BetaMe stones.');
      return;
    }
    
    const result = await WalletService.convertStonesToBetaCoins(user.id, amount);
    if (result.success && result.wallet) {
      setWalletData(result.wallet);
      setConvertAmount('10');
      const betaCoinsEarned = Math.floor(amount / 10);
      Alert.alert('Conversion Successful', `Converted ${amount} BetaMe stones to ${betaCoinsEarned} BetaCoin(s)!`);
    } else {
      Alert.alert('Conversion Failed', result.error || 'Failed to convert stones');
    }
  };

  const handleFeaturePurchase = (feature: Feature) => {
    if (!walletData) return;
    
    // Check if user has enough BetaCoins for at least 1 quantity
    if (walletData.betame_betacoins < feature.cost) {
      // Calculate how many stones needed to get enough BetaCoins
      const betaCoinsNeeded = feature.cost - walletData.betame_betacoins;
      const stonesNeeded = betaCoinsNeeded * 10; // 10 stones = 1 BetaCoin
      
      const alertButtons = [
         { text: 'Cancel', style: 'cancel' as const },
         {
           text: 'Buy BetaCoins',
           onPress: () => setShowBetaCoinPurchase(true),
         },
       ];
       
       if (walletData.betame_stones >= stonesNeeded) {
         alertButtons.push({
           text: 'Convert Stones',
           onPress: () => {
             setConvertAmount(stonesNeeded.toString());
             // Scroll to conversion section or highlight it
           },
         });
       }
       
       Alert.alert(
         'Insufficient BetaCoins',
         `You need ${betaCoinsNeeded} more BetaCoin(s) to purchase this feature. You can convert ${stonesNeeded} stones to get ${betaCoinsNeeded} BetaCoin(s), or purchase more BetaCoins directly.`,
         alertButtons
       );
      return;
    }
    
    setSelectedFeature(feature);
    setPurchaseQuantity(1);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = async () => {
    if (!user?.id || !selectedFeature || !walletData) return;
    
    const totalCost = selectedFeature.cost * purchaseQuantity;
    if (walletData.betame_betacoins < totalCost) {
      const betaCoinsNeeded = totalCost - walletData.betame_betacoins;
      const stonesNeeded = betaCoinsNeeded * 10;
      
      const alertButtons = [
        { text: 'Cancel', style: 'cancel' as const },
        {
          text: 'Buy BetaCoins',
          onPress: () => {
            setShowPurchaseModal(false);
            setShowBetaCoinPurchase(true);
          },
        },
      ];
      
      if (walletData.betame_stones >= stonesNeeded) {
        alertButtons.push({
          text: 'Convert Stones',
          onPress: () => {
            setShowPurchaseModal(false);
            setConvertAmount(stonesNeeded.toString());
          },
        });
      }
      
      Alert.alert(
        'Insufficient BetaCoins',
        `You need ${betaCoinsNeeded} more BetaCoin(s) for this purchase. You can convert ${stonesNeeded} stones to get ${betaCoinsNeeded} BetaCoin(s), or buy more BetaCoins directly.`,
        alertButtons
      );
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
    
    setSelectedPurchasedFeature(feature);
    setShowServiceSelection(true);
  };

  const handleServiceSelect = async (service: Service) => {
    if (!user?.id || !selectedPurchasedFeature) return;
    
    const result = await WalletService.applyFeatureToService(
      user.id,
      selectedPurchasedFeature.id!,
      service.id!
    );
    
    if (result.success) {
      await loadWalletData();
      Alert.alert(
        'Feature Applied!', 
        `${selectedPurchasedFeature.feature_name} has been applied to "${service.title}"!`
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to apply feature to service');
    }
    
    setSelectedPurchasedFeature(null);
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
        edges={['top', 'left', 'right', 'bottom']}
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
               <Text style={styles.balanceSubtextWithBg}>Convert to BetaCoins</Text>
             </View>
          </ImageBackground>

          <ImageBackground 
            source={require('../assets/images/coin-bg.jpeg')}
            style={styles.balanceCard}
            imageStyle={styles.balanceCardImage}
          >
            <View style={styles.balanceOverlay}>
               <View style={styles.balanceHeader}>
                 <Text style={styles.balanceLabelWithBg}>BetaCoin Wallet</Text>
                 <TouchableOpacity 
                   onPress={() => setShowBetaCoinPurchase(true)}
                   style={styles.marketplaceButton}
                 >
                   <ShoppingBag size={20} color="white" />
                 </TouchableOpacity>
               </View>
               <Text style={styles.balanceAmountWithBg}>{walletData?.betame_betacoins || 0} BetaCoins</Text>
               <TouchableOpacity 
                 onPress={() => setShowBetaCoinPurchase(true)}
                 style={styles.buyMoreButton}
               >
                 <Text style={styles.buyMoreText}>Purchase More BetaCoins</Text>
               </TouchableOpacity>
             </View>
          </ImageBackground>
        </View>

        {/* Conversion Section */}
        <View style={styles.conversionSection}>
          <Text style={[styles.conversionTitle, { color: colors.text.primary }]}>Convert your stones to BetaCoins!</Text>
          <Text style={[styles.conversionSubtitle, { color: colors.text.secondary }]}>Convert 10 premium stones into 1 BetaCoin</Text>
          
          <View style={[styles.conversionCard, { backgroundColor: colors.background.tertiary }]}>
            <View style={styles.conversionRow}>
              <View style={styles.conversionInput}>
                <TextInput
                  style={styles.input}
                  value={convertAmount}
                  onChangeText={setConvertAmount}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor="#7bb3f0"
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
            
            {/* Buy More Stones Option */}
            <View style={styles.buyMoreSection}>
              <Text style={[styles.buyMoreLabel, { color: colors.text.secondary }]}>Need more BetaCoins?</Text>
              <TouchableOpacity 
                style={[styles.buyMoreStoneButton, { backgroundColor: colors.primary.main }]}
                onPress={() => setShowBetaCoinPurchase(true)}
              >
                <ShoppingBag size={16} color="white" />
                <Text style={styles.buyMoreStoneText}>Purchase More BetaCoins</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Purchased Features */}
        <View style={styles.purchasedFeaturesSection}>
          <View style={styles.purchasedFeaturesHeader}>
            <Text style={[styles.purchasedFeaturesTitle, { color: colors.text.primary }]}>Your Purchased Features</Text>
            <View style={styles.purchasedFeaturesBadge}>
              <Text style={styles.purchasedFeaturesBadgeText}>{purchasedFeatures.length}</Text>
            </View>
          </View>
          
          {purchasedFeatures.length === 0 ? (
            <View style={[styles.purchasedFeaturesEmpty, { backgroundColor: colors.background.tertiary }]}>
              <View style={styles.emptyIconContainer}>
                <Sparkles size={32} color={colors.text.secondary} />
              </View>
              <Text style={[styles.emptyStateText, { color: colors.text.primary }]}>No features purchased yet</Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.text.secondary }]}>Purchase boost features below to enhance your service visibility</Text>
            </View>
          ) : (
            <View style={styles.purchasedFeaturesGrid}>
              {purchasedFeatures.map((feature) => {
                const featureConfig = availableFeatures.find(f => f.type === feature.feature_type);
                const expiryDate = new Date(feature.expires_at);
                const isExpiringSoon = (expiryDate.getTime() - Date.now()) < (7 * 24 * 60 * 60 * 1000); // 7 days
                
                return (
                  <TouchableOpacity
                    key={feature.id}
                    style={[styles.purchasedFeatureCard, { backgroundColor: colors.background.tertiary }]}
                    onPress={() => handleUseFeature(feature)}
                  >
                    {/* Feature Header */}
                    <View style={styles.purchasedFeatureHeader}>
                      <View style={[styles.purchasedFeatureIcon, { backgroundColor: featureConfig?.color || '#666' }]}>
                        {featureConfig?.icon || <Eye size={18} color="white" />}
                      </View>
                      <View style={styles.purchasedFeatureQuantity}>
                        <Text style={styles.purchasedFeatureQuantityText}>{feature.quantity}</Text>
                      </View>
                    </View>
                    
                    {/* Feature Content */}
                    <View style={styles.purchasedFeatureContent}>
                      <Text style={[styles.purchasedFeatureTitle, { color: colors.text.primary }]} numberOfLines={2}>
                        {feature.feature_name}
                      </Text>
                      
                      <View style={styles.purchasedFeatureDetails}>
                        <View style={styles.purchasedFeatureDetailRow}>
                          <Text style={[styles.purchasedFeatureDetailLabel, { color: colors.text.secondary }]}>Quantity:</Text>
                          <Text style={[styles.purchasedFeatureDetailValue, { color: colors.text.primary }]}>{feature.quantity} left</Text>
                        </View>
                        
                        <View style={styles.purchasedFeatureDetailRow}>
                          <Text style={[styles.purchasedFeatureDetailLabel, { color: colors.text.secondary }]}>Expires:</Text>
                          <Text style={[
                            styles.purchasedFeatureDetailValue, 
                            { color: isExpiringSoon ? colors.status.error : colors.text.primary }
                          ]}>
                            {expiryDate.toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Action Button */}
                      <View style={[styles.purchasedFeatureAction, { backgroundColor: colors.primary.main }]}>
                        <Text style={styles.purchasedFeatureActionText}>Tap to Apply</Text>
                      </View>
                      
                      {/* Expiry Warning */}
                      {isExpiringSoon && (
                        <View style={styles.expiryWarning}>
                          <Text style={styles.expiryWarningText}>⚠️ Expiring Soon</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Visibility Boosts */}
        <View style={styles.boostsSection}>
          <Text style={[styles.boostsTitle, { color: colors.text.primary }]}>Boost to Convert...</Text>
          <Text style={[styles.boostsSubtitle, { color: colors.text.secondary }]}>Different feature to make the listing extra visibility by using BetaCoins to boost</Text>
          
          {availableFeatures.map((feature, index) => {
            const bannerImages = [
              require('../assets/images/boost-banner/1-Feature.png'),
              require('../assets/images/boost-banner/2-Boost.png'),
              require('../assets/images/boost-banner/3-Showcase.png'),
              require('../assets/images/boost-banner/4-Boost Feature.png'),
            ];
            
            return (
              <TouchableOpacity
                key={feature.id}
                style={styles.boostBannerCard}
                onPress={() => handleFeaturePurchase(feature)}
              >
                <ImageBackground
                  source={bannerImages[index]}
                  style={styles.boostBannerImage}
                  imageStyle={styles.boostBannerImageStyle}
                >
                  {/* Gradient overlay for better text readability */}
                  <View style={styles.boostBannerGradient} />
                  
                  {/* Title at the top */}
                  <View style={styles.boostBannerTopSection}>
                    <Text style={styles.boostBannerTitle} numberOfLines={2} adjustsFontSizeToFit={true}>{feature.title}</Text>
                  </View>
                  
                  {/* Bottom section with description and price */}
                  <View style={styles.boostBannerBottomSection}>
                    <View style={styles.boostBannerContent}>
                      <Text style={styles.boostBannerDescription}>{feature.description}</Text>
                    </View>
                    <View style={styles.boostBannerPrice}>
                      <Text style={styles.boostBannerPriceText}>{feature.cost} BetaCoin</Text>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            );
          })}
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
                <Text style={styles.totalValue}>{(selectedFeature?.cost || 0) * purchaseQuantity} BetaCoins</Text>
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

        {/* BetaCoin Purchase */}
        <BetaCoinPurchase
          visible={showBetaCoinPurchase}
          onClose={() => setShowBetaCoinPurchase(false)}
          onPurchaseSuccess={() => {
            setShowBetaCoinPurchase(false);
            loadWalletData();
          }}
        />

        {/* Service Selection Modal */}
        <ServiceSelectionModal
          visible={showServiceSelection}
          onClose={() => {
            setShowServiceSelection(false);
            setSelectedPurchasedFeature(null);
          }}
          onServiceSelect={handleServiceSelect}
          featureTitle={selectedPurchasedFeature?.feature_name || ''}
        />
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
    backgroundColor: '#e6f3ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#b8e0ff',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a365d',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  conversionArrow: {
    fontSize: 20,
    color: '#4a90e2',
    marginHorizontal: 16,
  },
  conversionOutput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f3ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b8e0ff',
  },
  outputValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
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
  // New banner-based boost styles
  boostBannerCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  boostBannerImage: {
    height: 140,
    justifyContent: 'flex-end',
  },
  boostBannerImageStyle: {
    borderRadius: 12,
  },
  boostBannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  boostBannerTopSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 20,
    zIndex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  boostBannerBottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  boostBannerContent: {
    flex: 1,
    marginRight: 12,
  },
  boostBannerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.3,
    lineHeight: 26,
    flexWrap: 'wrap',
  },
  boostBannerDescription: {
    fontSize: 13,
    color: 'white',
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  boostBannerPrice: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostBannerPriceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFD700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  coinInner: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#FFED4E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8860B',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  // Enhanced Purchased Features Styles
  purchasedFeaturesSection: {
    padding: 20,
    paddingTop: 10,
  },
  purchasedFeaturesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  purchasedFeaturesTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  purchasedFeaturesBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  purchasedFeaturesBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  purchasedFeaturesEmpty: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  purchasedFeaturesGrid: {
    gap: 12,
  },
  purchasedFeatureCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  purchasedFeatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  purchasedFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  purchasedFeatureQuantity: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  purchasedFeatureQuantityText: {
    color: '#8B4513',
    fontSize: 14,
    fontWeight: '800',
  },
  purchasedFeatureContent: {
    gap: 12,
  },
  purchasedFeatureTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  purchasedFeatureDetails: {
    gap: 6,
  },
  purchasedFeatureDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  purchasedFeatureDetailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  purchasedFeatureDetailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  purchasedFeatureAction: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  purchasedFeatureActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  expiryWarning: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  expiryWarningText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
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
  marketplaceButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buyMoreButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  buyMoreText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buyMoreSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  buyMoreLabel: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  buyMoreStoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  buyMoreStoneText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});