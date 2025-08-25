import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import CurlecPaymentService, { BetaCoinPackage } from '../lib/curlec-payment-service';
import Colors from '../constants/Colors';

interface BetaCoinPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BetaCoinPurchaseModal({ visible, onClose }: BetaCoinPurchaseModalProps) {
  const { user } = useAuth();
  const [packages, setPackages] = useState<BetaCoinPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<BetaCoinPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadBetaCoinPackages();
    }
  }, [visible]);

  const loadBetaCoinPackages = async () => {
    try {
      setPackagesLoading(true);
      const paymentService = CurlecPaymentService.getInstance();
      const packagesData = await paymentService.getBetaCoinPackages();
      setPackages(packagesData);
      
      // Select the first package by default
      if (packagesData.length > 0) {
        setSelectedPackage(packagesData[0]);
      }
    } catch (error) {
      console.error('Error loading BetaCoin packages:', error);
      Alert.alert('Error', 'Failed to load BetaCoin packages. Please try again.');
    } finally {
      setPackagesLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !user) {
      Alert.alert('Error', 'Please select a package and ensure you are logged in.');
      return;
    }

    try {
      setLoading(true);
      const paymentService = CurlecPaymentService.getInstance();

      // Create checkout session
      const response = await paymentService.createCheckoutSession({
        user_id: user.id,
        payment_type: 'betacoin_purchase',
        amount: selectedPackage.price,
        currency: selectedPackage.currency,
        success_url: `${process.env.EXPO_PUBLIC_APP_URL || 'https://yourapp.com'}/payment/success?checkout_id={CHECKOUT_ID}`,
        cancel_url: `${process.env.EXPO_PUBLIC_APP_URL || 'https://yourapp.com'}/payment/cancel`,
        metadata: {
          betacoin_amount: selectedPackage.betacoin_amount,
          package_id: selectedPackage.id,
          package_name: selectedPackage.name,
        },
      });

      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to create payment session');
        return;
      }

      // Open payment URL in browser
      if (response.checkout_url) {
        const supported = await Linking.canOpenURL(response.checkout_url);
        if (supported) {
          await Linking.openURL(response.checkout_url);
          onClose();
        } else {
          Alert.alert('Error', 'Cannot open payment page. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error creating payment session:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (priceInCents: number) => {
    return `RM ${(priceInCents / 100).toFixed(0)}`;
  };

  const formatBetaCoins = (amount: number) => {
    return amount.toString();
  };

  const getPackageIcon = (index: number) => {
    const icons = ['coins', 'stack', 'layers', 'grid', 'bag', 'trophy'];
    return icons[index] || 'coins';
  };

  const isPopular = (pkg: BetaCoinPackage) => {
    return pkg.betacoin_amount === 250;
  };

  const isBestValue = (pkg: BetaCoinPackage) => {
    return pkg.betacoin_amount === 2000;
  };

  if (packagesLoading) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
              <ActivityIndicator size="large" color={Colors.primary.main} />
              <Text style={{ marginTop: 10, fontSize: 16 }}>Loading packages...</Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ 
            flex: 1, 
            backgroundColor: '#e3f2fd', // Light blue background
            marginTop: 50,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}>
            {/* Header */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: 20,
              backgroundColor: 'white',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#e0e0e0',
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>Purchase BetaCoins</Text>
              <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={{ flex: 1, padding: 20 }}>
              {/* BetaCoins Description */}
              <Text style={{ 
                fontSize: 16, 
                color: Colors.primary.main, 
                lineHeight: 22, 
                marginBottom: 24,
                textAlign: 'center',
              }}>
                BetaCoins can be purchased or exchanged with Diamonds. Use BetaCoins to pay for services, boost your listings, and unlock premium features.
              </Text>

              {/* Package Selection */}
              <View style={{ marginBottom: 30 }}>
                {packages.map((pkg, index) => (
                  <TouchableOpacity
                    key={pkg.id}
                    style={{
                      backgroundColor: '#2c3e50', // Dark background for packages
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      position: 'relative',
                    }}
                    onPress={() => setSelectedPackage(pkg)}
                  >
                    {/* Popular/Best Value Badge */}
                    {(isPopular(pkg) || isBestValue(pkg)) && (
                      <View style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: '#3498db',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}>
                        <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>
                          {isPopular(pkg) ? 'Popular' : 'Best Value'}
                        </Text>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {/* Coin Icon */}
                      <View style={{ marginRight: 16 }}>
                        <Ionicons 
                          name={getPackageIcon(index) as any} 
                          size={32} 
                          color="#f39c12" 
                        />
                      </View>

                      {/* BetaCoin Amount */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="diamond" size={20} color="#f39c12" />
                          <Text style={{ 
                            fontSize: 18, 
                            fontWeight: 'bold', 
                            color: 'white',
                            marginLeft: 4,
                          }}>
                            {formatBetaCoins(pkg.betacoin_amount)}
                          </Text>
                        </View>
                        <Text style={{ 
                          fontSize: 14, 
                          color: '#bdc3c7',
                          marginTop: 2,
                        }}>
                          BetaCoins
                        </Text>
                      </View>

                      {/* Price */}
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ 
                          fontSize: 18, 
                          fontWeight: 'bold', 
                          color: 'white',
                        }}>
                          {formatPrice(pkg.price)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Important Notes */}
              <View style={{ 
                backgroundColor: 'white', 
                padding: 16, 
                borderRadius: 12, 
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#333' }}>
                  Important Notes:
                </Text>
                <Text style={{ fontSize: 12, color: '#666', lineHeight: 18 }}>
                  • BetaCoins are valid for 1 year from purchase{'\n'}
                  • Can be exchanged with Diamonds (10 diamonds = 1 BetaCoin)
                </Text>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={{ 
              padding: 20, 
              borderTopWidth: 1, 
              borderTopColor: '#e0e0e0',
              backgroundColor: 'white',
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: selectedPackage ? Colors.primary.main : '#ccc',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  opacity: loading ? 0.7 : 1,
                }}
                onPress={handlePurchase}
                disabled={!selectedPackage || loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                    Purchase {selectedPackage ? formatPrice(selectedPackage.price) : 'RM 0'}
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{ 
                  paddingVertical: 12, 
                  alignItems: 'center',
                  marginTop: 8,
                }}
                onPress={onClose}
              >
                <Text style={{ color: '#666', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
