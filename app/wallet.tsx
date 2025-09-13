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
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Zap, TrendingUp, Trophy, CreditCard, Gift, Eye, Target, Sparkles, ShoppingBag, History, Plus, Minus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { WalletService, WalletData, PurchasedFeature } from '../lib/wallet-service';
import { useAuth } from '../contexts/AuthContext';
import { useColors, useTheme } from '@/contexts/ThemeContext';
import { BetaCoinPurchase } from '../components/BetaCoinPurchase';
import { ServiceSelectionModal } from '../components/ServiceSelectionModal';
import { TransactionHistory } from '../components/TransactionHistory';
import DesktopWrapper from '@/components/DesktopWrapper';
import ResponsiveGrid, { GridCard } from '@/components/ResponsiveGrid';
import { Service } from '../lib/service-service';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && width >= 1024;

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
  const { smartBack } = useSmartNavigation();
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
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);

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
      
      setWalletData(wallet || { user_id: user.id, betame_diamonds: 0, betame_betacoins: 0, cash: 0 });
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
    if (amount > walletData.betame_diamonds) {
      Alert.alert(
        'Insufficient Diamonds',
        'You don\'t have enough BetaMe diamonds to convert.',
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
      Alert.alert('Minimum Conversion', 'Minimum conversion is 10 BetaMe diamonds.');
      return;
    }
    
    const result = await WalletService.convertDiamondsToBetaCoins(user.id, amount);
    if (result.success && result.wallet) {
      setWalletData(result.wallet);
      setConvertAmount('10');
      const betaCoinsEarned = Math.floor(amount / 10);
      Alert.alert('Conversion Successful', `Converted ${amount} BetaMe diamonds to ${betaCoinsEarned} BetaCoin(s)!`);
    } else {
      Alert.alert('Conversion Failed', result.error || 'Failed to convert diamonds');
    }
  };

  const handleConvertAllDiamonds = async () => {
    if (!user?.id || !walletData) return;
    
    const availableDiamonds = walletData.betame_diamonds;
    if (availableDiamonds < 10) {
      Alert.alert(
        'Insufficient Diamonds',
        'You need at least 10 diamonds to convert to BetaCoins.',
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
    
    // Show input dialog for amount selection
    Alert.prompt(
      'Convert Diamonds to BetaCoins',
      `You have ${availableDiamonds} diamonds available.\n\nRate: 10 diamonds = 1 BetaCoin\n\nEnter amount to convert (minimum 10):`,
      [
        { text: 'Cancel', style: 'cancel' as const },
        {
          text: 'Convert',
          style: 'default' as const,
          onPress: async (inputAmount) => {
            if (!inputAmount) {
              Alert.alert('Invalid Amount', 'Please enter a valid amount.');
              return;
            }
            
            const amount = parseInt(inputAmount);
            if (isNaN(amount) || amount < 10) {
              Alert.alert('Invalid Amount', 'Please enter at least 10 diamonds.');
              return;
            }
            
            if (amount > availableDiamonds) {
              Alert.alert('Insufficient Diamonds', `You only have ${availableDiamonds} diamonds available.`);
              return;
            }
            
            // Round down to nearest 10
            const diamondsToConvert = Math.floor(amount / 10) * 10;
            const betaCoinsEarned = Math.floor(diamondsToConvert / 10);
            
            if (diamondsToConvert === 0) {
              Alert.alert('Invalid Amount', 'Amount must be at least 10 diamonds.');
              return;
            }
            
            const result = await WalletService.convertDiamondsToBetaCoins(user.id, diamondsToConvert);
            if (result.success && result.wallet) {
              setWalletData(result.wallet);
              Alert.alert('Conversion Successful', `Converted ${diamondsToConvert} BetaMe diamonds to ${betaCoinsEarned} BetaCoin(s)!`);
            } else {
              Alert.alert('Conversion Failed', result.error || 'Failed to convert diamonds');
            }
          },
        },
      ],
      'plain-text',
      '10'
    );
  };

  const handleIncrementDiamonds = () => {
    const currentAmount = parseInt(convertAmount) || 10;
    const newAmount = currentAmount + 10; // Increment by 10 to keep it in multiples of 10
    console.log('Incrementing diamonds:', currentAmount, '->', newAmount);
    if (!walletData || newAmount <= walletData.betame_diamonds) {
      setConvertAmount(newAmount.toString());
    } else {
      Alert.alert('Maximum Diamonds', `You can only convert up to ${walletData.betame_diamonds} diamonds.`);
    }
  };

  const handleDecrementDiamonds = () => {
    const currentAmount = parseInt(convertAmount) || 10;
    const newAmount = Math.max(10, currentAmount - 10); // Decrement by 10 to keep it in multiples of 10
    console.log('Decrementing diamonds:', currentAmount, '->', newAmount);
    setConvertAmount(newAmount.toString());
  };

  const handleWithdrawCash = () => {
    if (!walletData || walletData.cash <= 0) {
      Alert.alert('No Cash Available', 'You don\'t have any cash to withdraw.');
      return;
    }

    Alert.prompt(
      'Withdraw Cash',
      `Enter amount to withdraw (max: RM${walletData.cash.toFixed(2)})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          onPress: async (amount) => {
            if (!amount || !user?.id) return;
            
            const withdrawAmount = parseFloat(amount);
            if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
              Alert.alert('Invalid Amount', 'Please enter a valid amount.');
              return;
            }

            if (withdrawAmount < 10) {
              Alert.alert('Minimum Withdrawal', 'Minimum withdrawal amount is RM10.');
              return;
            }

            if (withdrawAmount > walletData.cash) {
              Alert.alert('Insufficient Balance', `You only have RM${walletData.cash.toFixed(2)} available.`);
              return;
            }

            const result = await WalletService.withdrawCash(user.id, withdrawAmount, 'Cash withdrawal');
            if (result.success) {
              await loadWalletData();
              Alert.alert('Withdrawal Successful', `RM${withdrawAmount.toFixed(2)} has been withdrawn from your wallet.`);
            } else {
              Alert.alert('Withdrawal Failed', result.error || 'Failed to withdraw cash');
            }
          }
        }
      ],
      'plain-text',
      walletData.cash.toString()
    );
  };



  const handleFeaturePurchase = (feature: Feature) => {
    if (!walletData) return;
    
    // Check if user has enough BetaCoins for at least 1 quantity
    if (walletData.betame_betacoins < feature.cost) {
      // Calculate how many diamonds needed to get enough BetaCoins
      const betaCoinsNeeded = feature.cost - walletData.betame_betacoins;
      const diamondsNeeded = betaCoinsNeeded * 10; // 10 diamonds = 1 BetaCoin
      
      const alertButtons = [
         { text: 'Cancel', style: 'cancel' as const },
         {
           text: 'Buy BetaCoins',
           onPress: () => setShowBetaCoinPurchase(true),
         },
       ];
       
       if (walletData.betame_diamonds >= diamondsNeeded) {
         alertButtons.push({
           text: 'Convert Diamonds',
           onPress: () => {
             setConvertAmount(diamondsNeeded.toString());
             // Scroll to conversion section or highlight it
           },
         });
       }
       
       Alert.alert(
         'Insufficient BetaCoins',
         `You need ${betaCoinsNeeded} more BetaCoin(s) to purchase this feature. You can convert ${diamondsNeeded} diamonds to get ${betaCoinsNeeded} BetaCoin(s), or purchase more BetaCoins directly.`,
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
      const diamondsNeeded = betaCoinsNeeded * 10;
      
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
      
      if (walletData.betame_diamonds >= diamondsNeeded) {
        alertButtons.push({
          text: 'Convert Diamonds',
          onPress: () => {
            setShowPurchaseModal(false);
            setConvertAmount(diamondsNeeded.toString());
          },
        });
      }
      
      Alert.alert(
        'Insufficient BetaCoins',
        `You need ${betaCoinsNeeded} more BetaCoin(s) for this purchase. You can convert ${diamondsNeeded} diamonds to get ${betaCoinsNeeded} BetaCoin(s), or buy more BetaCoins directly.`,
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
      <DesktopWrapper scrollable={true} className="wallet-screen">
        <View style={[styles.contentWrapper, { backgroundColor: colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.headerContainer, { backgroundColor: colors.background.primary }]}>
          <View style={[styles.header, isDesktop && styles.headerDesktop, { backgroundColor: colors.background.tertiary }]}>
            <TouchableOpacity onPress={smartBack}>
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, isDesktop && styles.headerTitleDesktop, { color: colors.text.primary }]}>Wallet</Text>
            <View style={[styles.headerActions, isDesktop && styles.headerActionsDesktop]}>
              <TouchableOpacity 
                onPress={() => setShowTransactionHistory(true)}
                style={[styles.headerButton, isDesktop && styles.headerButtonDesktop]}
              >
                <History size={24} color={colors.text.primary} />
                {isDesktop && <Text style={[styles.headerButtonText, { color: colors.text.primary }]}>History</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={navigateToCheckIn} style={[styles.headerButton, isDesktop && styles.headerButtonDesktop]}>
                <Trophy size={24} color={colors.status.warning} />
                {isDesktop && <Text style={[styles.headerButtonText, { color: colors.text.primary }]}>Check-in</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Wallet Balances - Mobile Only */}
        {!isDesktop && (
        <View style={[styles.balanceSection, isDesktop && styles.balanceSectionDesktop]}>
          <TouchableOpacity 
            style={[styles.balanceCard, isDesktop && styles.balanceCardDesktop]}
            onPress={handleConvertAllDiamonds}
            activeOpacity={0.8}
          >
            <ImageBackground 
              source={require('../assets/images/diamond-bg.jpeg')}
              style={styles.balanceCardInner}
              imageStyle={styles.balanceCardImage}
            >
              <View style={styles.balanceOverlay}>
                 <View style={styles.balanceHeader}>
                   <Text style={styles.balanceLabelWithBg}>Premium Diamonds</Text>
                 </View>
                 <Text style={styles.balanceAmountWithBg}>{walletData?.betame_diamonds || 0} Diamonds</Text>
                 <Text style={styles.balanceSubtextWithBg}>Tap to convert to BetaCoins</Text>
               </View>
            </ImageBackground>
          </TouchableOpacity>

          <View style={[styles.balanceCard, isDesktop && styles.balanceCardDesktop]}>
            <ImageBackground 
              source={require('../assets/images/coin-bg.jpeg')}
              style={styles.balanceCardInner}
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

          <View style={[styles.balanceCard, isDesktop && styles.balanceCardDesktop]}>
            <ImageBackground 
              source={require('../assets/images/cash-background.png')}
              style={styles.balanceCardInner}
              imageStyle={styles.balanceCardImage}
            >
              <View style={styles.balanceOverlay}>
                 <View style={styles.balanceHeader}>
                   <Text style={styles.balanceLabelWithBg}>Cash Balance</Text>
                 </View>
                 <Text style={styles.balanceAmountWithBg}>RM {walletData?.cash || 0}</Text>
                 <Text style={styles.withdrawalNotice}>Minimum withdrawal amount: RM10</Text>
                 <TouchableOpacity 
                   onPress={() => handleWithdrawCash()}
                   style={styles.buyMoreButton}
                 >
                   <Text style={styles.buyMoreText}>Withdraw Cash</Text>
                 </TouchableOpacity>
               </View>
            </ImageBackground>
          </View>
        </View>
        )}

        {/* Desktop Layout - Completely Redesigned */}
        {isDesktop ? (
          <View style={styles.desktopMainContainer}>
            {/* Top Row - Balance Cards */}
            <View style={styles.desktopBalanceRow}>
              <TouchableOpacity 
                style={[styles.balanceCard, styles.balanceCardDesktopNew]}
                onPress={handleConvertAllDiamonds}
                activeOpacity={0.8}
              >
                <ImageBackground 
                  source={require('../assets/images/diamond-bg.jpeg')}
                  style={styles.balanceCardInner}
                  imageStyle={styles.balanceCardImage}
                >
                  <View style={styles.balanceOverlay}>
                     <View style={styles.balanceHeader}>
                       <Text style={styles.balanceLabelWithBg}>Premium Diamonds</Text>
                     </View>
                     <Text style={styles.balanceAmountWithBg}>{walletData?.betame_diamonds || 0} Diamonds</Text>
                     <Text style={styles.balanceSubtextWithBg}>Tap to convert to BetaCoins</Text>
                   </View>
                </ImageBackground>
              </TouchableOpacity>

              <View style={[styles.balanceCard, styles.balanceCardDesktopNew]}>
                <ImageBackground 
                  source={require('../assets/images/coin-bg.jpeg')}
                  style={styles.balanceCardInner}
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

              <View style={[styles.balanceCard, styles.balanceCardDesktopNew]}>
                <ImageBackground 
                  source={require('../assets/images/cash-background.png')}
                  style={styles.balanceCardInner}
                  imageStyle={styles.balanceCardImage}
                >
                  <View style={styles.balanceOverlay}>
                     <View style={styles.balanceHeader}>
                       <Text style={styles.balanceLabelWithBg}>Cash Balance</Text>
                     </View>
                     <Text style={styles.balanceAmountWithBg}>RM {walletData?.cash || 0}</Text>
                     <Text style={styles.withdrawalNotice}>Minimum withdrawal amount: RM10</Text>
                     <TouchableOpacity 
                       onPress={() => handleWithdrawCash()}
                       style={styles.buyMoreButton}
                     >
                       <Text style={styles.buyMoreText}>Withdraw Cash</Text>
                     </TouchableOpacity>
                   </View>
                </ImageBackground>
              </View>
            </View>

            {/* Main Content Row - Three Column Layout */}
            <View style={styles.desktopContentRow}>
              {/* Left Column - Transaction History */}
              <View style={styles.desktopColumn}>
                <View style={[styles.desktopSection, { backgroundColor: colors.background.tertiary }]}>
                  <View style={styles.desktopSectionHeader}>
                    <Text style={[styles.desktopSectionTitle, { color: colors.text.primary }]}>Transaction History</Text>
                    <TouchableOpacity 
                      onPress={() => setShowTransactionHistory(true)}
                      style={[styles.desktopViewAllButton, { backgroundColor: colors.primary.main }]}
                    >
                      <History size={16} color="white" />
                      <Text style={styles.desktopViewAllText}>View All</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={[styles.desktopTransactionCard, { backgroundColor: colors.background.primary }]}
                    onPress={() => setShowTransactionHistory(true)}
                  >
                    <View style={[styles.desktopTransactionIcon, { backgroundColor: colors.primary.main }]}>
                      <TrendingUp size={24} color="white" />
                    </View>
                    <View style={styles.desktopTransactionInfo}>
                      <Text style={[styles.desktopTransactionTitle, { color: colors.text.primary }]}>
                        View All Transactions
                      </Text>
                      <Text style={[styles.desktopTransactionSubtitle, { color: colors.text.secondary }]}>
                        Diamonds, BetaCoins, and cash history
                      </Text>
                    </View>
                    <ArrowLeft size={20} color={colors.text.secondary} style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Center Column - Conversion */}
              <View style={styles.desktopColumn}>
                <View style={[styles.desktopSection, { backgroundColor: colors.background.tertiary }]}>
                  <View style={styles.desktopSectionHeader}>
                    <Text style={[styles.desktopSectionTitle, { color: colors.text.primary }]}>Convert Diamonds</Text>
                  </View>
                  <View style={[styles.desktopConversionCard, { backgroundColor: colors.background.primary }]}>
                    <Text style={[styles.desktopConversionSubtitle, { color: colors.text.secondary }]}>10 diamonds = 1 BetaCoin</Text>
                    
                    <View style={styles.desktopConversionRow}>
                      <View style={[styles.desktopConversionInput, { backgroundColor: colors.background.secondary, borderColor: colors.border.main }]}>
                        <View style={styles.desktopInputContainer}>
                          <TouchableOpacity 
                            style={styles.desktopIncrementButton}
                            onPress={handleDecrementDiamonds}
                            activeOpacity={0.6}
                          >
                            <Minus size={20} color={colors.primary.main} />
                          </TouchableOpacity>
                          <View style={styles.desktopNumberSection}>
                            <TextInput
                              style={[styles.desktopInput, { color: colors.text.primary }]}
                              value={convertAmount}
                              onChangeText={(text) => {
                                const numericValue = text.replace(/[^0-9]/g, '');
                                if (numericValue === '' || (parseInt(numericValue) >= 10 && parseInt(numericValue) % 10 === 0)) {
                                  setConvertAmount(numericValue);
                                }
                              }}
                              keyboardType="numeric"
                              placeholder="10"
                              placeholderTextColor={colors.text.secondary}
                              maxLength={4}
                            />
                            <Text style={styles.desktopInputLabel}>💎</Text>
                          </View>
                          <TouchableOpacity 
                            style={styles.desktopIncrementButton}
                            onPress={handleIncrementDiamonds}
                            activeOpacity={0.6}
                          >
                            <Plus size={20} color={colors.primary.main} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.desktopConversionArrow}>
                        <Text style={[styles.desktopConversionArrowText, { color: colors.primary.main }]}>→</Text>
                      </View>
                      <View style={[styles.desktopConversionOutput, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
                        <Text style={[styles.desktopOutputValue, { color: colors.text.primary }]}>{Math.floor(parseInt(convertAmount || '0') / 10)}</Text>
                        <Text style={styles.desktopOutputLabel}>BetaCoins</Text>
                      </View>
                    </View>
                    
                    <View style={[styles.desktopDiamondInfo, { backgroundColor: colors.background.secondary }]}>
                      <Text style={styles.desktopDiamondEmoji}>💎</Text>
                      <Text style={[styles.desktopDiamondText, { color: colors.text.primary }]}>
                        {walletData?.betame_diamonds || 0} diamonds available
                      </Text>
                    </View>
                    
                    <TouchableOpacity style={[styles.desktopConvertButton, { backgroundColor: colors.primary.main }]} onPress={handleConvert}>
                      <Text style={styles.desktopConvertButtonText}>Convert</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Right Column - Purchased Features */}
              <View style={styles.desktopColumn}>
                <View style={[styles.desktopSection, { backgroundColor: colors.background.tertiary }]}>
                  <View style={styles.desktopSectionHeader}>
                    <Text style={[styles.desktopSectionTitle, { color: colors.text.primary }]}>Your Features</Text>
                    <View style={styles.desktopFeaturesBadge}>
                      <Text style={styles.desktopFeaturesBadgeText}>{purchasedFeatures.length}</Text>
                    </View>
                  </View>
                  
                  {purchasedFeatures.length === 0 ? (
                    <View style={[styles.desktopEmptyState, { backgroundColor: colors.background.primary }]}>
                      <View style={styles.desktopEmptyIcon}>
                        <Sparkles size={32} color={colors.text.secondary} />
                      </View>
                      <Text style={[styles.desktopEmptyText, { color: colors.text.primary }]}>No features purchased yet</Text>
                      <Text style={[styles.desktopEmptySubtext, { color: colors.text.secondary }]}>Purchase boost features below</Text>
                    </View>
                  ) : (
                    <View style={styles.desktopFeaturesList}>
                      {purchasedFeatures.map((feature) => {
                        const featureConfig = availableFeatures.find(f => f.type === feature.feature_type);
                        const expiryDate = new Date(feature.expires_at);
                        const isExpiringSoon = (expiryDate.getTime() - Date.now()) < (7 * 24 * 60 * 60 * 1000);
                        
                        return (
                          <TouchableOpacity
                            key={feature.id}
                            style={[styles.desktopFeatureCard, { backgroundColor: colors.background.primary }]}
                            onPress={() => handleUseFeature(feature)}
                          >
                            <View style={[styles.desktopFeatureIcon, { backgroundColor: featureConfig?.color || '#666' }]}>
                              {featureConfig?.icon || <Eye size={18} color="white" />}
                            </View>
                            <View style={styles.desktopFeatureInfo}>
                              <Text style={[styles.desktopFeatureTitle, { color: colors.text.primary }]} numberOfLines={1}>
                                {feature.feature_name}
                              </Text>
                              <Text style={[styles.desktopFeatureDetails, { color: colors.text.secondary }]}>
                                {feature.quantity} left • Expires {expiryDate.toLocaleDateString()}
                              </Text>
                            </View>
                            <View style={[styles.desktopFeatureAction, { backgroundColor: colors.primary.main }]}>
                              <Text style={styles.desktopFeatureActionText}>Apply</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Bottom Row - Boost Features */}
            <View style={styles.desktopBoostRow}>
              <View style={[styles.desktopBoostSection, { backgroundColor: colors.background.tertiary }]}>
                <View style={styles.desktopBoostHeader}>
                  <Text style={[styles.desktopBoostTitle, { color: colors.text.primary }]}>Boost Your Services</Text>
                  <Text style={[styles.desktopBoostSubtitle, { color: colors.text.secondary }]}>Enhance visibility with BetaCoins</Text>
                </View>
                <View style={styles.desktopBoostGrid}>
                  {availableFeatures.map((feature, index) => {
                    const bannerImages = [
                      require('../assets/images/boost-banner/2-Boost.png'),
                      require('../assets/images/boost-banner/3-Showcase.png'),
                      require('../assets/images/boost-banner/1-Feature.png'),
                      require('../assets/images/boost-banner/4-Boost Feature.png'),
                    ];
                    
                    return (
                      <TouchableOpacity
                        key={feature.id}
                        style={styles.desktopBoostCard}
                        onPress={() => handleFeaturePurchase(feature)}
                      >
                        <ImageBackground
                          source={bannerImages[index]}
                          style={styles.desktopBoostImage}
                          imageStyle={styles.desktopBoostImageStyle}
                        >
                          <View style={styles.desktopBoostGradient} />
                          <View style={styles.desktopBoostContent}>
                            <Text style={styles.desktopBoostCardTitle} numberOfLines={2}>{feature.title}</Text>
                            <Text style={styles.desktopBoostCardDescription}>{feature.description}</Text>
                            <View style={styles.desktopBoostPrice}>
                              <Text style={styles.desktopBoostPriceText}>{feature.cost} BetaCoin</Text>
                            </View>
                          </View>
                        </ImageBackground>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* Mobile Layout - Original Structure */
          <>
        {/* Transaction History Quick Access */}
        <View style={[styles.transactionSection, isDesktop && styles.transactionSectionDesktop]}>
          <View style={styles.transactionHeader}>
            <Text style={[styles.transactionTitle, { color: colors.text.primary }]}>Recent Transactions</Text>
            <TouchableOpacity 
              onPress={() => setShowTransactionHistory(true)}
              style={[styles.viewAllButton, { backgroundColor: colors.primary.main }]}
            >
              <History size={16} color="white" />
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[styles.transactionQuickAccess, { backgroundColor: colors.background.tertiary }]}
            onPress={() => setShowTransactionHistory(true)}
          >
            <View style={styles.transactionQuickContent}>
              <View style={[styles.transactionQuickIcon, { backgroundColor: colors.primary.main }]}>
                <TrendingUp size={24} color="white" />
              </View>
              <View style={styles.transactionQuickInfo}>
                <Text style={[styles.transactionQuickTitle, { color: colors.text.primary }]}>
                  Transaction History
                </Text>
                <Text style={[styles.transactionQuickSubtitle, { color: colors.text.secondary }]}>
                  View all your Diamonds, BetaCoins, and cash transactions
                </Text>
              </View>
              <ArrowLeft size={20} color={colors.text.secondary} style={{ transform: [{ rotate: '180deg' }] }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Conversion Section */}
        <View style={[styles.conversionSection, isDesktop && styles.conversionSectionDesktop]}>
          <View style={[styles.conversionContent, isDesktop && styles.conversionContentDesktop]}>
            <Text style={[styles.conversionTitle, { color: colors.text.primary }]}>Convert your diamonds to BetaCoins!</Text>
            <Text style={[styles.conversionSubtitle, { color: colors.text.secondary }]}>Convert 10 premium diamonds into 1 BetaCoin</Text>
          
          <View style={[styles.conversionCard, { backgroundColor: colors.background.tertiary }]}>
            <View style={styles.conversionRow}>
              <View style={[styles.conversionInput, { backgroundColor: colors.background.primary, borderColor: colors.border.main }]}>
                <View style={styles.inputContainer}>
                  <TouchableOpacity 
                    style={styles.incrementButton}
                    onPress={handleDecrementDiamonds}
                    activeOpacity={0.6}
                  >
                    <Minus size={20} color={colors.primary.main} />
                  </TouchableOpacity>
                  <View style={styles.numberSection}>
                    <TextInput
                      style={[styles.input, { color: colors.text.primary }]}
                      value={convertAmount}
                      onChangeText={(text) => {
                        // Only allow numeric input and ensure it's a multiple of 10
                        const numericValue = text.replace(/[^0-9]/g, '');
                        if (numericValue === '' || (parseInt(numericValue) >= 10 && parseInt(numericValue) % 10 === 0)) {
                          setConvertAmount(numericValue);
                        }
                      }}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={colors.text.secondary}
                      maxLength={4}
                    />
                    <Text style={styles.inputLabel}>💎</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.incrementButton}
                    onPress={handleIncrementDiamonds}
                    activeOpacity={0.6}
                  >
                    <Plus size={20} color={colors.primary.main} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.conversionArrowContainer}>
                <Text style={[styles.conversionArrow, { color: colors.primary.main }]}>→</Text>
              </View>
              <View style={[styles.conversionOutput, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
                <Text style={[styles.outputValue, { color: colors.text.primary }]}>{Math.floor(parseInt(convertAmount || '0') / 10)}</Text>
                <Text style={styles.outputLabel}>BetaCoins</Text>
              </View>
            </View>
            
            {/* Current Diamond Count Display - moved above Convert button */}
            <View style={[styles.currentDiamondDisplaySmall, { backgroundColor: colors.background.secondary }]}>
              <View style={styles.diamondCountContainerSmall}>
                <Text style={styles.diamondEmojiSmall}>💎</Text>
                <Text style={[styles.currentDiamondTextSmall, { color: colors.text.primary }]}>
                  You currently have{' '}
                  <Text style={[styles.diamondCountSmall, { color: colors.primary.main }]}>
                    {walletData?.betame_diamonds || 0} diamonds
                  </Text>
                  {' '}available for conversion
                </Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.convertButton} onPress={handleConvert}>
              <Text style={styles.convertButtonText}>Convert</Text>
            </TouchableOpacity>
            
            {/* Buy More Diamonds Option */}
            <View style={styles.buyMoreSection}>
              <Text style={[styles.buyMoreLabel, { color: colors.text.secondary }]}>Need more BetaCoins?</Text>
              <TouchableOpacity 
                style={[styles.buyMoreDiamondButton, { backgroundColor: colors.primary.main }]}
                onPress={() => setShowBetaCoinPurchase(true)}
              >
                <ShoppingBag size={16} color="white" />
                <Text style={styles.buyMoreDiamondText}>Purchase More BetaCoins</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </View>

        {/* Purchased Features */}
        <View style={[styles.purchasedFeaturesSection, isDesktop && styles.purchasedFeaturesSectionDesktop]}>
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
          </>
        )}


        {/* Visibility Boosts - Mobile Only */}
        {!isDesktop && (
        <View style={[styles.boostsSection, isDesktop && styles.boostsSectionDesktop]}>
          <Text style={[styles.boostsTitle, { color: colors.text.primary }]}>Boost to Convert...</Text>
          <Text style={[styles.boostsSubtitle, { color: colors.text.secondary }]}>Different feature to make the listing extra visibility by using BetaCoins to boost</Text>
          
          {availableFeatures.map((feature, index) => {
            const bannerImages = [
              require('../assets/images/boost-banner/2-Boost.png'),
              require('../assets/images/boost-banner/3-Showcase.png'),
              require('../assets/images/boost-banner/1-Feature.png'),
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
        )}

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

        {/* Transaction History Modal */}
        {user?.id && (
          <TransactionHistory
            visible={showTransactionHistory}
            onClose={() => setShowTransactionHistory(false)}
            userId={user.id}
          />
        )}
        </View>
      </DesktopWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingBottom: 20,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  placeholder: {
    width: 24,
  },
  balanceSection: {
    padding: 20,
    gap: 2,
  },
  balanceSectionDesktop: {
    flexDirection: 'row',
    padding: 32,
    gap: 8,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  balanceCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 8,
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
  balanceCardDesktop: {
    flex: 1,
    maxWidth: 400,
    padding: 0,
  },
  balanceCardInner: {
    borderRadius: 12,
    padding: 16,
    overflow: 'hidden',
    flex: 1,
  },
  balanceCardImage: {
    borderRadius: 12,
  },
  balanceOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    margin: -16,
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
  diamondIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
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
  withdrawalNotice: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  conversionSection: {
    padding: 20,
  },
  conversionSectionDesktop: {
    padding: 32,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  conversionContent: {
    flex: 1,
  },
  conversionContentDesktop: {
    maxWidth: 800,
    alignSelf: 'center',
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
    marginBottom: 24,
    gap: 12,
  },
  conversionInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  numberSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 8,
  },
  incrementButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a365d',
    minWidth: 40,
  },
  inputLabel: {
    fontSize: 16,
    marginLeft: 6,
  },
  conversionArrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
  },
  conversionArrow: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  conversionOutput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flex: 1,
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outputValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  outputLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 10,
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
  boostsSectionDesktop: {
    padding: 32,
    maxWidth: 1200,
    alignSelf: 'center',
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
  purchasedFeaturesSectionDesktop: {
    padding: 32,
    maxWidth: 1200,
    alignSelf: 'center',
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
  buyMoreDiamondButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  buyMoreDiamondText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Transaction History Styles
  transactionSection: {
    padding: 20,
    paddingTop: 10,
  },
  transactionSectionDesktop: {
    padding: 32,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  transactionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  viewAllText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionQuickAccess: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionQuickContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionQuickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  transactionQuickInfo: {
    flex: 1,
  },
  transactionQuickTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  transactionQuickSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Current Diamond Count Display Styles
  currentDiamondDisplay: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  diamondCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  diamondEmoji: {
    fontSize: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  currentDiamondText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    flex: 1,
  },
  diamondCount: {
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Small diamond display styles (moved above Convert button)
  currentDiamondDisplaySmall: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  diamondCountContainerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diamondEmojiSmall: {
    fontSize: 16,
  },
  currentDiamondTextSmall: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
  },
  diamondCountSmall: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Desktop Layout Styles
  desktopMainContent: {
    flexDirection: 'row',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    gap: 24,
    paddingHorizontal: 32,
  },
  desktopLeftColumn: {
    flex: 1,
    minWidth: 0, // Allow flex shrinking
  },
  desktopRightColumn: {
    flex: 1,
    minWidth: 0, // Allow flex shrinking
  },
  // Desktop Boost Features Grid
  boostsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  boostBannerCardDesktop: {
    width: '48%',
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
  boostBannerImageDesktop: {
    height: 120,
    justifyContent: 'flex-end',
  },
  // Completely New Desktop Layout Styles
  desktopMainContainer: {
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
    gap: 32,
  },
  // Header Styles
  headerDesktop: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 40,
    marginBottom: 24,
  },
  headerTitleDesktop: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerActionsDesktop: {
    gap: 20,
  },
  headerButtonDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Balance Row
  desktopBalanceRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  balanceCardDesktopNew: {
    flex: 1,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  // Content Row
  desktopContentRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  desktopColumn: {
    flex: 1,
    minWidth: 0,
  },
  desktopSection: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  desktopSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  desktopSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  desktopViewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  desktopViewAllText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // Transaction Card
  desktopTransactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  desktopTransactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  desktopTransactionInfo: {
    flex: 1,
  },
  desktopTransactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  desktopTransactionSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  // Conversion Card
  desktopConversionCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  desktopConversionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  desktopConversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  desktopConversionInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  desktopInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopIncrementButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopNumberSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopInput: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 50,
  },
  desktopInputLabel: {
    fontSize: 18,
  },
  desktopConversionArrow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
  },
  desktopConversionArrowText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  desktopConversionOutput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  desktopOutputValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  desktopOutputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 8,
  },
  desktopDiamondInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  desktopDiamondEmoji: {
    fontSize: 16,
  },
  desktopDiamondText: {
    fontSize: 14,
    fontWeight: '500',
  },
  desktopConvertButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  desktopConvertButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Features
  desktopFeaturesBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  desktopFeaturesBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  desktopEmptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  desktopEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  desktopEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  desktopEmptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  desktopFeaturesList: {
    gap: 12,
  },
  desktopFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  desktopFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  desktopFeatureInfo: {
    flex: 1,
  },
  desktopFeatureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  desktopFeatureDetails: {
    fontSize: 12,
    lineHeight: 16,
  },
  desktopFeatureAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  desktopFeatureActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // Boost Section
  desktopBoostRow: {
    marginBottom: 32,
  },
  desktopBoostSection: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  desktopBoostHeader: {
    marginBottom: 24,
  },
  desktopBoostTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  desktopBoostSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  desktopBoostGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  desktopBoostCard: {
    flex: 1,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  desktopBoostImage: {
    height: 140,
    justifyContent: 'flex-end',
  },
  desktopBoostImageStyle: {
    borderRadius: 12,
  },
  desktopBoostGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  desktopBoostContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 2,
  },
  desktopBoostCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  desktopBoostCardDescription: {
    fontSize: 12,
    color: 'white',
    lineHeight: 16,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  desktopBoostPrice: {
    alignItems: 'flex-start',
  },
  desktopBoostPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});