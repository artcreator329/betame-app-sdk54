import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import RevenueCatIAPService from '@/lib/revenuecat-iap-service';

export default function RevenueCatTest() {
  const colors = useColors();
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  useEffect(() => {
    if (user) {
      initializeRevenueCat();
    }
  }, [user]);

  const initializeRevenueCat = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const iapService = RevenueCatIAPService.getInstance();
      
      // Initialize the service
      const initialized = await iapService.initialize();
      setIsInitialized(initialized);

      if (initialized) {
        // Set the user ID
        await iapService.setUser(user.id);
        
        // Load products
        const loadedProducts = iapService.getProducts();
        setProducts(loadedProducts);
        
        // Get customer info
        const info = await iapService.getCustomerInfo();
        setCustomerInfo(info);
        
        console.log('✅ RevenueCat initialized successfully');
        console.log('Products loaded:', loadedProducts.length);
        console.log('Customer info:', info);
      } else {
        Alert.alert('Initialization Failed', 'Failed to initialize RevenueCat service');
      }
    } catch (error) {
      console.error('❌ RevenueCat initialization error:', error);
      Alert.alert('Error', 'Failed to initialize RevenueCat service');
    } finally {
      setIsLoading(false);
    }
  };

  const testPurchase = async (productId: string) => {
    if (!user) {
      Alert.alert('Error', 'Please log in to test purchases');
      return;
    }

    setIsLoading(true);
    try {
      const iapService = RevenueCatIAPService.getInstance();
      const result = await iapService.purchaseProduct(productId, user.id);
      
      if (result.success) {
        Alert.alert(
          'Purchase Initiated',
          `Purchase started for ${result.betacoinAmount} BetaCoins. Check your wallet!`
        );
        
        // Refresh customer info
        const info = await iapService.getCustomerInfo();
        setCustomerInfo(info);
      } else {
        Alert.alert('Purchase Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('❌ Purchase test error:', error);
      Alert.alert('Error', 'Purchase test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testRestorePurchases = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to restore purchases');
      return;
    }

    setIsLoading(true);
    try {
      const iapService = RevenueCatIAPService.getInstance();
      const success = await iapService.restorePurchases();
      
      if (success) {
        Alert.alert('Success', 'Purchases restored successfully');
        
        // Refresh customer info
        const info = await iapService.getCustomerInfo();
        setCustomerInfo(info);
      } else {
        Alert.alert('Failed', 'Failed to restore purchases');
      }
    } catch (error) {
      console.error('❌ Restore purchases error:', error);
      Alert.alert('Error', 'Failed to restore purchases');
    } finally {
      setIsLoading(false);
    }
  };

  const checkActivePurchases = async () => {
    if (!user) return;

    try {
      const iapService = RevenueCatIAPService.getInstance();
      const hasPurchases = await iapService.hasActivePurchases();
      
      Alert.alert(
        'Active Purchases',
        hasPurchases ? 'User has active purchases' : 'No active purchases found'
      );
    } catch (error) {
      console.error('❌ Check active purchases error:', error);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.content}>
          <Ionicons name="person-circle-outline" size={64} color={colors.text.secondary} />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Please Log In
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            You need to be logged in to test RevenueCat integration
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Ionicons name="card-outline" size={48} color={colors.primary.main} />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            RevenueCat Test
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Test the RevenueCat integration for BetaCoin purchases
          </Text>
        </View>

        {/* Status Section */}
        <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Service Status
          </Text>
          
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.text.secondary }]}>
              Initialized:
            </Text>
            <View style={[styles.statusIndicator, { 
              backgroundColor: isInitialized ? colors.success : colors.error 
            }]}>
              <Text style={styles.statusText}>
                {isInitialized ? '✅' : '❌'}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.text.secondary }]}>
              Products Loaded:
            </Text>
            <Text style={[styles.statusValue, { color: colors.text.primary }]}>
              {products.length}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.text.secondary }]}>
              User ID:
            </Text>
            <Text style={[styles.statusValue, { color: colors.text.primary }]}>
              {user.id}
            </Text>
          </View>
        </View>

        {/* Actions Section */}
        <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Test Actions
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary.main }]}
            onPress={initializeRevenueCat}
            disabled={isLoading}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.buttonText}>
              {isInitialized ? 'Reinitialize' : 'Initialize RevenueCat'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.secondary.main }]}
            onPress={testRestorePurchases}
            disabled={isLoading || !isInitialized}
          >
            <Ionicons name="download" size={20} color="white" />
            <Text style={styles.buttonText}>Restore Purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.info.main }]}
            onPress={checkActivePurchases}
            disabled={isLoading || !isInitialized}
          >
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.buttonText}>Check Active Purchases</Text>
          </TouchableOpacity>
        </View>

        {/* Products Section */}
        {products.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Available Products ({products.length})
            </Text>
            
            {products.map((product, index) => (
              <View key={index} style={[styles.productCard, { borderColor: colors.border.main }]}>
                <View style={styles.productInfo}>
                  <Text style={[styles.productTitle, { color: colors.text.primary }]}>
                    {product.title}
                  </Text>
                  <Text style={[styles.productDescription, { color: colors.text.secondary }]}>
                    {product.description}
                  </Text>
                  <Text style={[styles.productPrice, { color: colors.primary.main }]}>
                    {product.price} - {product.betacoinAmount} BetaCoins
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: colors.success }]}
                  onPress={() => testPurchase(product.productId)}
                  disabled={isLoading || !isInitialized}
                >
                  <Text style={styles.testButtonText}>Test Purchase</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Customer Info Section */}
        {customerInfo && (
          <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Customer Information
            </Text>
            
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              Original App User ID: {customerInfo.originalAppUserId}
            </Text>
            
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              Consumable Purchases: {customerInfo.consumablePurchases?.length || 0}
            </Text>
            
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              Non-Consumable Purchases: {customerInfo.nonConsumablePurchases?.length || 0}
            </Text>
            
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              Active Entitlements: {customerInfo.entitlements?.active ? Object.keys(customerInfo.entitlements.active).length : 0}
            </Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
              Processing...
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: 'white',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '500',
  },
  testButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
