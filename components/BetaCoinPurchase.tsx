import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ImageBackground,
  Animated,
  Pressable,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ShoppingCart, Apple, CreditCard } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { WalletService } from '@/lib/wallet-service';
import CurlecPaymentService from '@/lib/curlec-payment-service';
import { RevenueCatIAPService } from '@/lib/revenuecat-iap-service';
import { BetaCoinPaywall } from './BetaCoinPaywall';

interface BetaCoinBundle {
  id: string;
  betacoins: number;
  priceValue: number;
  image: any; // Android/Web image
  imageIOS: any; // iOS image (required for iOS)
  badge?: string;
  iapProductId?: string; // iOS IAP product ID
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
    priceValue: 4.90,
    image: require('../assets/images/credit-purchase/RM5.png'),
    imageIOS: require('../assets/images/credit-purchase-ios/RM4.90.png'),
    iapProductId: 'betacoins_new_20',
  },
  {
    id: '2',
    betacoins: 100,
    priceValue: 19.90,
    image: require('../assets/images/credit-purchase/RM20.png'),
    imageIOS: require('../assets/images/credit-purchase-ios/RM19.90.png'),
    badge: 'Popular',
    iapProductId: 'betacoins_new_100',
  },
  {
    id: '3',
    betacoins: 250,
    priceValue: 34.90,
    image: require('../assets/images/credit-purchase/RM35.png'),
    imageIOS: require('../assets/images/credit-purchase-ios/RM34.90.png'),
    iapProductId: 'betacoins_new_250',
  },
  {
    id: '4',
    betacoins: 600,
    priceValue: 79.90,
    image: require('../assets/images/credit-purchase/RM80.png'),
    imageIOS: require('../assets/images/credit-purchase-ios/RM79.90.png'),
    iapProductId: 'betacoins_new_600',
  },
  {
    id: '5',
    betacoins: 1000,
    priceValue: 99.90,
    image: require('../assets/images/credit-purchase/RM100.png'),
    imageIOS: require('../assets/images/credit-purchase-ios/RM99.90.png'),
    badge: 'Best Value',
    iapProductId: 'betacoins_new_1000',
  },
  {
    id: '6',
    betacoins: 2000,
    priceValue: 179.90,
    image: require('../assets/images/credit-purchase/RM180.png'),
    imageIOS: require('../assets/images/credit-purchase-ios/RM179.90.png'),
    badge: 'Ultimate',
    iapProductId: 'betacoins_new_2000',
  },
];

export function BetaCoinPurchase({ visible, onClose, onPurchaseSuccess }: BetaCoinPurchaseProps) {
  const colors = useColors();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{bundle: BetaCoinBundle, fees: any} | null>(null);
  const [showRevenueCatPaywall, setShowRevenueCatPaywall] = useState(false);

  // Show RevenueCat Paywall for iOS, custom UI for Android
  useEffect(() => {
    if (Platform.OS === 'ios' && visible) {
      console.log('🍎 iOS device detected, using RevenueCat Paywall');
      setShowRevenueCatPaywall(true);
    } else if (Platform.OS !== 'ios') {
      console.log('🤖 Non-iOS device detected, using Curlec payment system');
    }
  }, [visible]);

  const initializeIAP = async () => {
    // Only initialize IAP on iOS
    if (Platform.OS !== 'ios') {
      console.log('📱 IAP not available on this platform, using Curlec instead');
      return;
    }

    try {
      const iapService = RevenueCatIAPService.getInstance();
      const initialized = await iapService.initialize();
      
      if (initialized) {
        // Get IAP products
        const products = iapService.getProducts();
        // setIapProducts(products); // Commented out - state not needed for RevenueCatPaywall
        console.log('✅ RevenueCat IAP initialized with', products.length, 'products');
        
        // Check IAP status for user feedback
        const status = await iapService.getIAPStatus();
        if (!status.canPurchase) {
          console.log('⚠️ IAP Status:', status.message);
          // Could show a toast or alert here if needed
        }
        
        // If no products are available, try refreshing
        if (products.length === 0) {
          console.log('🔄 No products found, attempting to refresh...');
          await iapService.refreshProducts();
          const refreshedProducts = iapService.getProducts();
          // setIapProducts(refreshedProducts); // Commented out - state not needed for RevenueCatPaywall
          console.log('🔄 After refresh:', refreshedProducts.length, 'products available');
        }
      } else {
        console.log('⚠️ RevenueCat IAP initialization failed, falling back to Curlec');
      }
    } catch (error) {
      console.error('Failed to initialize RevenueCat IAP:', error);
    }
  };

  const handlePurchase = async (bundle: BetaCoinBundle) => {
    if (!user) {
      Alert.alert('Error', 'Please log in to purchase BetaCoins');
      return;
    }

    // No fees applied - user pays exactly the bundle price
    const fees = {
      baseAmount: bundle.priceValue,
      processingFee: 0,
      totalAmount: bundle.priceValue
    };
    
    // Show custom confirmation modal
    setConfirmationData({ bundle, fees });
    setShowConfirmation(true);
  };

  const handleConfirmPurchase = () => {
    if (confirmationData) {
      setShowConfirmation(false);
      processPurchase(confirmationData.bundle, confirmationData.fees);
    }
  };

  const handleCancelPurchase = () => {
    setShowConfirmation(false);
    setConfirmationData(null);
  };

  const handleRestorePurchases = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to restore purchases');
      return;
    }

    // Only available on iOS with RevenueCat
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Not Available',
        'Purchase restoration is only available on iOS. Android users can check their transaction history in the wallet.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsProcessing(true);
    try {
      const iapService = RevenueCatIAPService.getInstance();
      const result = await iapService.restorePurchases();

      if (result) {
        Alert.alert(
          'Purchases Restored',
          'Your previous purchases have been restored. BetaCoins will be added to your wallet.',
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
        Alert.alert('Restore Failed', 'Failed to restore purchases');
      }
    } catch (error) {
      console.error('Restore purchases error:', error);
      Alert.alert('Restore Failed', 'Failed to restore purchases');
    } finally {
      setIsProcessing(false);
    }
  };

  const processPurchase = async (bundle: BetaCoinBundle, fees: any) => {
    if (!user) {
      Alert.alert('Error', 'Please log in to purchase BetaCoins');
      return;
    }

    setIsProcessing(true);
    
    try {
      if (Platform.OS === 'ios') {
        // Use RevenueCat IAP on iOS
        await processIAPPurchase(bundle);
      } else {
        // Use Curlec on Android/Web
        await processCurlecPurchase(bundle);
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processIAPPurchase = async (bundle: BetaCoinBundle) => {
    if (!bundle.iapProductId) {
      Alert.alert('Error', 'IAP product not configured for this bundle');
      return;
    }

    try {
      const iapService = RevenueCatIAPService.getInstance();
      
      // Check if IAP is available before attempting purchase
      const status = await iapService.getIAPStatus();
      if (!status.canPurchase) {
        Alert.alert(
          'Purchase Not Available',
          status.message + '\n\nPlease ensure StoreKit configuration is properly set up in Xcode and try again.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      
      const result = await iapService.purchaseProduct(bundle.iapProductId, user!.id);
      
      if (result.success) {
        Alert.alert(
          'Purchase Initiated',
          'Your purchase is being processed through the App Store. BetaCoins will be added to your wallet once the transaction is complete.',
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
        // Show error message with StoreKit troubleshooting
        Alert.alert(
          'Purchase Failed',
          (result.error || 'Failed to initiate purchase') + '\n\nPlease check:\n• StoreKit configuration is properly linked\n• Product IDs match exactly\n• StoreKit testing is enabled in Xcode scheme',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('IAP purchase error:', error);
      Alert.alert(
        'Purchase Failed',
        'Failed to initiate in-app purchase.\n\nTroubleshooting:\n• Ensure StoreKit configuration is linked in Xcode\n• Check that product IDs match exactly\n• Verify StoreKit testing is enabled\n• Try restarting the app',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const processCurlecPurchase = async (bundle: BetaCoinBundle) => {
    try {
      const paymentService = CurlecPaymentService.getInstance();

      // Create Curlec payment session
      const response = await paymentService.createCheckoutSession({
        user_id: user!.id,
        payment_type: 'betacoin_purchase',
        amount: Math.round(bundle.priceValue * 100), // Convert to cents
        currency: 'MYR',
        success_url: 'betame://payment/success',
        cancel_url: 'betame://payment/cancel',
        metadata: {
          betacoin_amount: bundle.betacoins,
          package_id: bundle.id,
          package_name: `${bundle.betacoins} BetaCoins`,
        },
      });

      if (!response.success) {
        Alert.alert('Payment Error', response.error || 'Failed to create payment session');
        return;
      }

      // Open Curlec payment page in browser
      if (response.checkout_url) {
        const supported = await Linking.canOpenURL(response.checkout_url);
        if (supported) {
          await Linking.openURL(response.checkout_url);
          onClose(); // Close the modal after redirecting
        } else {
          Alert.alert('Error', 'Cannot open payment page. Please try again.');
        }
      } else {
        Alert.alert('Error', 'No payment URL received');
      }
    } catch (error) {
      console.error('Curlec payment error:', error);
      Alert.alert('Payment Failed', 'Failed to create payment session');
    }
  };

  const renderBundle = (bundle: BetaCoinBundle) => {
    return (
      <Animated.View key={bundle.id}>
        <Pressable
          style={({ pressed }) => [
            styles.bundleCard,
            { borderColor: colors.border.main },
            {
              transform: [{ scale: pressed ? 0.98 : 1 }],
              opacity: pressed ? 0.9 : isProcessing ? 0.5 : 1,
            }
          ]}
          onPress={() => handlePurchase(bundle)}
          disabled={isProcessing}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
          <ImageBackground
            source={Platform.OS === 'ios' ? bundle.imageIOS : bundle.image}
            style={styles.bundleImage}
            imageStyle={styles.bundleImageStyle}
            onLoad={() => {
              console.log(`🍎 iOS: Loading ${bundle.betacoins} BetaCoins image:`, 
                Platform.OS === 'ios' ? 'iOS image' : 'Android/Web image');
            }}
          >
            {bundle.badge && (
              <View style={[styles.badge, { backgroundColor: colors.primary.main }]}>
                <Text style={styles.badgeText}>{bundle.badge}</Text>
              </View>
            )}
            

            
            <ImageBackground
              source={Platform.OS === 'ios' ? bundle.imageIOS : bundle.image}
              style={styles.bundleContent}
              imageStyle={styles.bundleImageStyle}
              onLoad={() => {
                console.log(`🍎 iOS: Loading ${bundle.betacoins} BetaCoins content image:`, 
                  Platform.OS === 'ios' ? 'iOS image' : 'Android/Web image');
              }}
            >
              <View style={styles.bundleContentOverlay} />
            </ImageBackground>
          </ImageBackground>
        </Pressable>
      </Animated.View>
    );
  };

  const getPaymentMethodIcon = () => {
    if (Platform.OS === 'ios') {
      return <Apple size={16} color={colors.text.secondary} />;
    } else {
      return <CreditCard size={16} color={colors.text.secondary} />;
    }
  };

  const getPaymentMethodText = () => {
    if (Platform.OS === 'ios') {
      return 'Apple App Store';
    } else {
      return 'Credit Card / Online Banking';
    }
  };

  // iOS: Use RevenueCat Paywall
  if (Platform.OS === 'ios') {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={visible}
        onRequestClose={onClose}
      >
        <BetaCoinPaywall
          onClose={onClose}
          onPurchaseSuccess={(betacoins) => {
            onPurchaseSuccess();
          }}
        />
      </Modal>
    );
  }

  // Android/Web: Use custom Curlec payment UI
  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.main }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {isProcessing ? 'Processing Payment...' : 'Purchase BetaCoins'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isProcessing}>
            <X size={24} color={isProcessing ? colors.text.secondary : colors.text.primary} />
          </TouchableOpacity>
        </View>

        {!showConfirmation ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.description}>
              <Text style={[styles.descriptionText, { color: colors.text.secondary }]}>
                BetaCoins can be purchased or exchanged with Diamonds. 
                Use BetaCoins to pay for services, boost your listings, and unlock premium features.
              </Text>
            </View>

            {/* Payment Method Info */}
            <View style={[styles.paymentMethodInfo, { backgroundColor: colors.background.secondary }]}>
              <View style={styles.paymentMethodRow}>
                {getPaymentMethodIcon()}
                <Text style={[styles.paymentMethodText, { color: colors.text.secondary }]}>
                  Payment via {getPaymentMethodText()}
                </Text>
              </View>
            </View>

            <View style={styles.bundlesGrid}>
              {betacoinBundles.map(renderBundle)}
            </View>

            <View style={styles.footer}>
              <View style={styles.infoCard}>
                <View style={styles.infoItem}>
                  <View style={[styles.bulletPoint, { backgroundColor: colors.primary.main }]} />
                  <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                    BetaCoins are valid for 1 year from purchase
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <View style={[styles.bulletPoint, { backgroundColor: colors.primary.main }]} />
                  <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                    Can be exchanged with Diamonds (10 diamonds = 1 BetaCoin)
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.confirmationContainer}>
            {/* Header with coin animation */}
            <View style={styles.confirmationHeader}>
              <View style={[styles.coinContainer, { backgroundColor: colors.primary.main }]}>
                <Text style={styles.coinIcon}>💰</Text>
              </View>
              <Text style={[styles.confirmationTitle, { color: colors.text.primary }]}>
                Confirm Purchase
              </Text>
              <Text style={[styles.confirmationSubtitle, { color: colors.text.secondary }]}>
                You're about to purchase BetaCoins via {getPaymentMethodText()}
              </Text>
            </View>

            {confirmationData && (
              <View style={styles.confirmationContent}>
                {/* BetaCoin Amount */}
                <View style={[styles.confirmationCard, { backgroundColor: colors.background.secondary }]}>
                  <View style={styles.confirmationRow}>
                    <Text style={[styles.confirmationLabel, { color: colors.text.secondary }]}>
                      BetaCoins
                    </Text>
                    <Text style={[styles.confirmationValue, { color: colors.primary.main }]}>
                      {confirmationData?.bundle.betacoins}
                    </Text>
                  </View>
                </View>

                {/* Price Breakdown */}
                <View style={[styles.confirmationCard, { backgroundColor: colors.background.secondary }]}>
                  <View style={styles.confirmationRow}>
                    <Text style={[styles.confirmationTotalLabel, { color: colors.text.primary }]}>
                      Total Amount
                    </Text>
                    <Text style={[styles.confirmationTotalValue, { color: colors.primary.main }]}>
                      RM{confirmationData?.fees.totalAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.confirmationActions}>
              <TouchableOpacity 
                style={[styles.confirmationButton, styles.cancelButton, { borderColor: colors.border.main }]}
                onPress={handleCancelPurchase}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <LinearGradient
                colors={[colors.primary.main, colors.primary.light]}
                style={[styles.confirmationButton, styles.confirmButton]}
              >
                <TouchableOpacity 
                  style={styles.confirmButtonInner}
                  onPress={handleConfirmPurchase}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <ShoppingCart size={20} color="white" />
                  )}
                  <Text style={styles.confirmButtonText}>
                    {isProcessing ? 'Processing...' : 'Confirm Purchase'}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        )}
      </View>
    </Modal>

    {/* Loading Overlay */}
    {isProcessing && (
      <Modal
        visible={isProcessing}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingContainer, { backgroundColor: colors.background.secondary }]}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={[styles.loadingText, { color: colors.text.primary }]}>
              Processing Payment...
            </Text>
            <Text style={[styles.loadingSubtext, { color: colors.text.secondary }]}>
              Please wait while we redirect you to the payment gateway
            </Text>
          </View>
        </View>
      </Modal>
    )}
    </>
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
  paymentMethodInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMethodSubtext: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
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
  // Confirmation Modal Styles
  confirmationContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  confirmationHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  coinContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  coinIcon: {
    fontSize: 28,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  confirmationContent: {
    marginBottom: 24,
  },
  confirmationCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  confirmationLabel: {
    fontSize: 16,
    flex: 1,
  },
  confirmationValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  confirmationDivider: {
    height: 1,
    marginVertical: 12,
    opacity: 0.3,
  },
  confirmationTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  confirmationTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmationButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cancelButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
  },
  confirmButton: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  confirmButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },

});