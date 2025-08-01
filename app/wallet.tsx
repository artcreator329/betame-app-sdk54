import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, Zap, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface VisibilityBoost {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: React.ReactNode;
  color: string;
}

const visibilityBoosts: VisibilityBoost[] = [
  {
    id: '1',
    title: '2x Visibility!',
    description: 'Feature your listing in the home page & dedicated section',
    cost: 100,
    icon: <Star size={20} color="white" />,
    color: '#FF6B35',
  },
  {
    id: '2',
    title: 'Instant Visibility!',
    description: 'Bring your listing to top in relevant section',
    cost: 50,
    icon: <Zap size={20} color="white" />,
    color: '#4ECDC4',
  },
  {
    id: '3',
    title: 'Max Visibility!',
    description: 'Pin your listing on top of the relevant section',
    cost: 50,
    icon: <TrendingUp size={20} color="white" />,
    color: '#45B7D1',
  },
];

export default function WalletScreen() {
  const router = useRouter();
  const [premiumStones, setPremiumStones] = useState(9);
  const [betameCredits, setBetameCredits] = useState(12);
  const [convertAmount, setConvertAmount] = useState('10');

  const handleConvert = () => {
    const amount = parseInt(convertAmount);
    if (amount > premiumStones) {
      Alert.alert('Insufficient Stones', 'You don\'t have enough premium stones to convert.');
      return;
    }
    if (amount < 10) {
      Alert.alert('Minimum Conversion', 'Minimum conversion is 10 premium stones.');
      return;
    }
    
    const creditsToAdd = Math.floor(amount / 10);
    setPremiumStones(prev => prev - amount);
    setBetameCredits(prev => prev + creditsToAdd);
    setConvertAmount('10');
    Alert.alert('Conversion Successful', `Converted ${amount} premium stones to ${creditsToAdd} BetaMe credit(s)!`);
  };

  const handleBoostPurchase = (boost: VisibilityBoost) => {
    if (betameCredits < boost.cost) {
      Alert.alert('Insufficient Credits', 'You don\'t have enough BetaMe credits for this boost.');
      return;
    }
    
    Alert.alert(
      'Purchase Boost',
      `Purchase ${boost.title} for ${boost.cost} BetaMe credits?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: () => {
            setBetameCredits(prev => prev - boost.cost);
            Alert.alert('Success', `${boost.title} activated!`);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Wallet Balances */}
        <View style={styles.balanceSection}>
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Premium Stones</Text>
              <View style={styles.stoneIcon}>
                <Text style={styles.stoneEmoji}>💎</Text>
              </View>
            </View>
            <Text style={styles.balanceAmount}>{premiumStones} Stones</Text>
          </View>

          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>BetaMe Credit Wallet</Text>
              <View style={styles.creditIcon}>
                <Text style={styles.creditText}>B</Text>
              </View>
            </View>
            <Text style={styles.balanceAmount}>{betameCredits} Credits</Text>
            <Text style={styles.balanceSubtext}>Can buy BetaMe credits</Text>
          </View>
        </View>

        {/* Conversion Section */}
        <View style={styles.conversionSection}>
          <Text style={styles.conversionTitle}>Convert your stones to Credits!</Text>
          <Text style={styles.conversionSubtitle}>Convert 10 premium stones into 1 BetaMe credit</Text>
          
          <View style={styles.conversionCard}>
            <View style={styles.conversionRow}>
              <View style={styles.conversionInput}>
                <TextInput
                  style={styles.input}
                  value={convertAmount}
                  onChangeText={setConvertAmount}
                  keyboardType="numeric"
                  placeholder="10"
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

        {/* Visibility Boosts */}
        <View style={styles.boostsSection}>
          <Text style={styles.boostsTitle}>Boost to Convert...</Text>
          <Text style={styles.boostsSubtitle}>Different feature to make the listing extra visibility by using BetaMe credits to boost</Text>
          
          {visibilityBoosts.map((boost) => (
            <TouchableOpacity
              key={boost.id}
              style={styles.boostCard}
              onPress={() => handleBoostPurchase(boost)}
            >
              <View style={[styles.boostIcon, { backgroundColor: boost.color }]}>
                {boost.icon}
              </View>
              <View style={styles.boostContent}>
                <Text style={styles.boostTitle}>{boost.title}</Text>
                <Text style={styles.boostDescription}>{boost.description}</Text>
              </View>
              <View style={styles.boostPrice}>
                <Text style={styles.boostPriceText}>{boost.cost}</Text>
                <Text style={styles.boostPriceLabel}>B</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  placeholder: {
    width: 24,
  },
  balanceSection: {
    padding: 20,
    gap: 16,
  },
  balanceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
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
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  stoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stoneEmoji: {
    fontSize: 16,
  },
  creditIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
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
    color: '#1D1D1F',
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  conversionSection: {
    padding: 20,
  },
  conversionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  conversionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
  },
  conversionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
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
  conversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  conversionInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginRight: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  conversionArrow: {
    fontSize: 20,
    color: '#8E8E93',
    marginHorizontal: 16,
  },
  conversionOutput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
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
    color: '#1D1D1F',
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
    color: '#1D1D1F',
    marginBottom: 8,
  },
  boostsSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    lineHeight: 20,
  },
  boostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
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
    color: '#1D1D1F',
    marginBottom: 4,
  },
  boostDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  boostPrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boostPriceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  boostPriceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 4,
  },
});