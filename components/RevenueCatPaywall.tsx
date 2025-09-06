import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import Purchases, { 
  PurchasesOffering, 
  PurchasesPackage,
  CustomerInfo 
} from 'react-native-purchases';
import { WalletService } from '@/lib/wallet-service';
import { RevenueCatIAPService, IAPProduct } from '@/lib/revenuecat-iap-service';

interface RevenueCatPaywallProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

interface PaywallPackage {
  rcPackage: PurchasesPackage;
  betacoins: number;
  isPopular?: boolean;
}

export function RevenueCatPaywall({ visible, onClose, onPurchaseSuccess }: RevenueCatPaywallProps) {
  const colors = useColors();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PaywallPackage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // BetaCoin mapping for our products
  const betacoinMapping: Record<string, number> = {
    'betacoins_new_20': 20,
    'betacoins_new_100': 100,
  };

  useEffect(() => {
    if (visible && Platform.OS === 'ios') {
      initializeRevenueCat();
    } else if (visible && Platform.OS !== 'ios') {
      setError('In-app purchases are only available on iOS. Please use web payment.');
      setIsLoading(false);
    }
  }, [visible]);

  const initializeRevenueCat = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Initializing RevenueCat Paywall...');

      // Use our improved RevenueCat service with fallback strategy
      const iapService = RevenueCatIAPService.getInstance();
      const initialized = await iapService.initialize();

      if (!initialized) {
        setError('RevenueCat service failed to initialize');
        return;
      }

      // Set user ID if available
      if (user?.id) {
        await iapService.setUser(user.id);
      }

      // Get products using our service (with fallback strategy)
      const products = iapService.getProducts();
      console.log('📦 Products loaded with fallback strategy:', products.length);

      if (products.length > 0) {
        // Convert IAPProduct to PaywallPackage format
        const paywallPackages: PaywallPackage[] = products.map((product) => {
          const isPopular = product.productId === 'betacoins_new_100';
          
          // Create a mock package if RevenueCat package is not available (fallback mode)
          const rcPackage = product.package || {
            identifier: product.productId,
            packageType: 'CUSTOM' as any,
            storeProduct: product.storeProduct,
            offeringIdentifier: 'fallback_offering',
          } as PurchasesPackage;
          
          return {
            rcPackage,
            betacoins: product.betacoinAmount,
            isPopular,
          };
        });

        // Sort packages by BetaCoin amount
        paywallPackages.sort((a, b) => a.betacoins - b.betacoins);
        
        setPackages(paywallPackages);
        console.log('✅ Paywall packages ready (with fallback support):', paywallPackages.length);
      } else {
        setError('No purchase options available. Please try again later.');
        console.log('❌ No products available after fallback attempts');
      }
    } catch (error: any) {
      console.error('❌ RevenueCat initialization failed:', error);
      
      // Handle specific RevenueCat configuration errors
      if (error.message?.includes('None of the products registered')) {
        setError('RevenueCat dashboard setup required. Please configure products and offerings in your RevenueCat dashboard.');
      } else {
        setError(error.message || 'Failed to load purchase options');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (paywallPackage: PaywallPackage) => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to make a purchase');
      return;
    }

    try {
      setIsPurchasing(true);
      console.log('🛒 Starting purchase:', paywallPackage.rcPackage.identifier);

      // Use our improved RevenueCat service for purchase
      const iapService = RevenueCatIAPService.getInstance();
      const result = await iapService.purchaseProduct(paywallPackage.rcPackage.identifier, user.id);
      
      if (result.success) {
        console.log('✅ Purchase successful:', paywallPackage.rcPackage.identifier);
        console.log('💰 BetaCoins added:', result.betacoinAmount);
        
        Alert.alert(
          'Purchase Successful!',
          `${result.betacoinAmount} BetaCoins have been added to your wallet.`,
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
        throw new Error(result.error || 'Purchase failed');
      }

    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      
      // Handle user cancellation gracefully
      if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        console.log('ℹ️ Purchase cancelled by user');
        return; // Don't show error for user cancellation
      }
      
      Alert.alert('Purchase Failed', error.message || 'An error occurred during purchase');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsPurchasing(true);
      console.log('🔄 Restoring purchases...');
      
      const customerInfo = await Purchases.restorePurchases();
      console.log('✅ Purchases restored:', customerInfo);
      
      Alert.alert('Restore Complete', 'Your purchases have been restored.');
    } catch (error: any) {
      console.error('❌ Restore failed:', error);
      Alert.alert('Restore Failed', error.message || 'Failed to restore purchases');
    } finally {
      setIsPurchasing(false);
    }
  };

  const renderPackage = (paywallPackage: PaywallPackage) => {
    const { rcPackage, betacoins, isPopular } = paywallPackage;
    const storeProduct = rcPackage.storeProduct;
    
    return (
      <TouchableOpacity
        key={rcPackage.identifier}
        style={[
          styles.packageCard,
          { borderColor: colors.border },
          isPopular && { borderColor: colors.primary, borderWidth: 2 }
        ]}
        onPress={() => handlePurchase(paywallPackage)}
        disabled={isPurchasing}
      >
        {isPopular && (
          <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.popularText, { color: colors.background }]}>Popular</Text>
          </View>
        )}
        
        <View style={styles.packageContent}>
          <Text style={[styles.betacoinAmount, { color: colors.text }]}>
            {betacoins} BetaCoins
          </Text>
          
          <Text style={[styles.packagePrice, { color: colors.primary }]}>
            {storeProduct?.priceString || `RM${betacoins === 20 ? '4.90' : '19.90'}`}
          </Text>
          
          <Text style={[styles.packageDescription, { color: colors.textSecondary }]}>
            {rcPackage.storeProduct?.description || `Purchase ${betacoins} BetaCoins`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Purchase BetaCoins</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading purchase options...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={initializeRevenueCat}
              >
                <Text style={[styles.retryButtonText, { color: colors.background }]}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Description */}
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Purchase BetaCoins to boost your services and unlock premium features in the BetaMe marketplace.
              </Text>

              {/* Packages */}
              <View style={styles.packagesContainer}>
                {packages.map(renderPackage)}
              </View>

              {/* Restore Button */}
              <TouchableOpacity
                style={[styles.restoreButton, { borderColor: colors.border }]}
                onPress={handleRestore}
                disabled={isPurchasing}
              >
                <Text style={[styles.restoreButtonText, { color: colors.textSecondary }]}>
                  Restore Purchases
                </Text>
              </TouchableOpacity>

              {/* Footer Info */}
              <Text style={[styles.footerInfo, { color: colors.textSecondary }]}>
                Purchases are processed securely through the App Store. 
                BetaCoins will be added to your wallet immediately after purchase.
              </Text>
            </>
          )}
        </View>

        {/* Loading Overlay */}
        {isPurchasing && (
          <View style={styles.loadingOverlay}>
            <View style={[styles.loadingModal, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Processing purchase...
              </Text>
            </View>
          </View>
        )}
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
    padding: 20,
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
    padding: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  packagesContainer: {
    gap: 16,
    marginBottom: 30,
  },
  packageCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  packageContent: {
    alignItems: 'center',
  },
  betacoinAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  packageDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  restoreButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  restoreButtonText: {
    fontSize: 16,
  },
  footerInfo: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModal: {
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
});

export default RevenueCatPaywall;