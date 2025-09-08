import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  useColorScheme,
  Platform,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { RevenueCatIAPService, IAPProduct } from '@/lib/revenuecat-iap-service';
import { useAuth } from '@/contexts/AuthContext';
import { LightTheme, DarkTheme } from '@/constants/Colors';

const { width: screenWidth } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && screenWidth >= 1024;

interface BetaCoinPaywallProps {
  onClose?: () => void;
  onPurchaseSuccess?: (betacoins: number) => void;
}

export function BetaCoinPaywall({ onClose, onPurchaseSuccess }: BetaCoinPaywallProps) {
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : LightTheme;
  const { user } = useAuth();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnims = useRef(
    Array(6).fill(0).map(() => new Animated.Value(0.9))
  ).current;

  useEffect(() => {
    loadProducts();
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Fade in and slide up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger product card animations
    scaleAnims.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: 1,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    });
  };

  const loadProducts = async () => {
    try {
      const iapService = RevenueCatIAPService.getInstance();
      await iapService.initialize();
      
      if (user?.id) {
        await iapService.setUser(user.id);
      }
      
      const availableProducts = iapService.getProducts();
      
      // Sort products from lowest to highest amount
      const sortedProducts = availableProducts.sort((a, b) => a.betacoinAmount - b.betacoinAmount);
      setProducts(sortedProducts);
      
      // Auto-select most popular (100 BetaCoins)
      if (sortedProducts.length > 0) {
        const popularProduct = sortedProducts.find(p => p.betacoinAmount === 100);
        setSelectedProduct(popularProduct?.productId || sortedProducts[0].productId);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedProduct || !user?.id) return;

    setPurchasing(true);
    try {
      const iapService = RevenueCatIAPService.getInstance();
      const result = await iapService.purchaseProduct(selectedProduct, user.id);
      
      if (result.success) {
        // Success animation
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        onPurchaseSuccess?.(result.betacoinAmount || 0);
        Alert.alert(
          '🎉 Purchase Successful!',
          `${result.betacoinAmount} BetaCoins have been added to your wallet.`,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert('Purchase Failed', result.error || 'Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const getProductBadge = (amount: number) => {
    switch (amount) {
      case 100: return { text: 'MOST POPULAR', color: theme.status.success };
      case 1000: return { text: 'BEST VALUE', color: theme.primary.main };
      case 2000: return { text: 'ULTIMATE', color: '#FFD700' };
      default: return null;
    }
  };

  const getSavingsPercentage = (amount: number, price: number) => {
    const baseRate = 4.90 / 20; // RM0.245 per coin for smallest pack
    const actualRate = price / amount;
    const savings = ((baseRate - actualRate) / baseRate) * 100;
    return savings > 0 ? Math.round(savings) : 0;
  };

  const getProductImage = (price: string) => {
    const imageMap: Record<string, any> = {
      'RM4.90': require('../assets/images/credit-purchase-ios/RM4.90.png'),
      'RM19.90': require('../assets/images/credit-purchase-ios/RM19.90.png'),
      'RM34.90': require('../assets/images/credit-purchase-ios/RM34.90.png'),
      'RM79.90': require('../assets/images/credit-purchase-ios/RM79.90.png'),
      'RM99.90': require('../assets/images/credit-purchase-ios/RM99.90.png'),
      'RM179.90': require('../assets/images/credit-purchase-ios/RM179.90.png'),
    };
    return imageMap[price];
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colorScheme === 'dark' ? '#0f1419' : '#f8fafc' }]}>
        <ActivityIndicator size="large" color={theme.primary.main} />
        <Text style={[styles.loadingText, { color: theme.text.primary }]}>
          Loading BetaCoin packages...
        </Text>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: colorScheme === 'dark' ? '#0f1419' : '#f8fafc',
          opacity: fadeAnim,
        }
      ]}
    >
      {/* Header with gradient */}
      <LinearGradient
        colors={theme.primary.gradient}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <BlurView intensity={20} style={styles.headerBlur}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>BetaCoins Store</Text>
              <Text style={styles.headerSubtitle}>
                Boost your services and unlock premium features
              </Text>
            </View>
            
          </View>
        </BlurView>
      </LinearGradient>

      {/* Products Grid */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
      >
        <Animated.View 
          style={[
            styles.productsContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {products.map((product, index) => {
            const badge = getProductBadge(product.betacoinAmount);
            const savings = getSavingsPercentage(product.betacoinAmount, product.priceAmount);
            const isSelected = selectedProduct === product.productId;
            
            return (
              <Animated.View
                key={product.productId}
                  style={[
                    styles.productCard,
                    { 
                      transform: [{ scale: scaleAnims[index] }],
                      backgroundColor: '#ffffff',
                      borderWidth: isSelected ? 5 : 0,
                      borderColor: isSelected ? theme.primary.main : 'transparent',
                      elevation: isSelected ? 8 : 4,
                      shadowColor: isSelected ? theme.primary.main : '#000',
                      shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                      shadowOpacity: isSelected ? 0.3 : 0.1,
                      shadowRadius: isSelected ? 8 : 4,
                    }
                  ]}
              >
                <TouchableOpacity
                  onPress={() => setSelectedProduct(product.productId)}
                  style={styles.productTouchable}
                  activeOpacity={0.8}
                >
                  {/* Badge */}
                  {badge && (
                    <View style={[styles.badge, { backgroundColor: badge.color }]}>
                      <Text style={styles.badgeText}>{badge.text}</Text>
                    </View>
                  )}

                  {/* Product Image Bar */}
                  <View style={styles.imageContainer}>
                    <Image 
                      source={getProductImage(product.price)}
                      style={styles.productImage}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <View style={[styles.selectedIndicator, { backgroundColor: theme.primary.main }]}>
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Features */}
        <View style={[styles.featuresContainer, { 
          backgroundColor: colorScheme === 'dark' ? '#1a2332' : '#ffffff',
          borderWidth: 1,
          borderColor: colorScheme === 'dark' ? '#334155' : 'rgba(0, 0, 0, 0.1)',
        }]}>
          <Text style={[styles.featuresTitle, { 
            color: colorScheme === 'dark' ? '#e2e8f0' : '#1e293b',
            fontWeight: '700',
          }]}>
            What can you do with BetaCoins?
          </Text>
          {[
            { icon: 'trending-up', text: 'Boost your service visibility' },
            { icon: 'star', text: 'Feature your services on homepage' },
            { icon: 'flash', text: 'Get priority in search results' },
            { icon: 'gift', text: 'Send tips to service providers' },
          ].map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name={feature.icon as any} size={20} color={theme.primary.main} />
              <Text style={[styles.featureText, { 
                color: colorScheme === 'dark' ? '#94a3b8' : '#475569',
                fontWeight: '500',
              }]}>
                {feature.text}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Purchase Button */}
      <View style={[styles.footer, { 
        backgroundColor: colorScheme === 'dark' ? '#0f1419' : '#ffffff',
        borderTopColor: colorScheme === 'dark' ? '#334155' : 'rgba(0, 0, 0, 0.1)',
      }]}>
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={!selectedProduct || purchasing}
          style={styles.purchaseButton}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              !selectedProduct || purchasing 
                ? [theme.interactive.disabled, theme.interactive.disabled]
                : theme.primary.gradient
            }
            style={styles.purchaseButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.purchaseButtonText}>
                  Purchase {
                    products.find(p => p.productId === selectedProduct)?.betacoinAmount || ''
                  } BetaCoins
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
          <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>
            Maybe Later
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  header: {
    height: 180,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  headerBlur: {
    flex: 1,
    padding: 20,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 10,
    zIndex: 1,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  scrollContentDesktop: {
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 40,
  },
  productsContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  productCard: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'visible',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: 80,
    position: 'relative',
  },
  productTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 100,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 15,
    borderRadius: 12,
  },
  featuresContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  purchaseButton: {
    marginBottom: 10,
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
  },
});
