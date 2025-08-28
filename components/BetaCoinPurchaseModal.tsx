import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BetaCoinPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BetaCoinPurchaseModal({ visible, onClose }: BetaCoinPurchaseModalProps) {
  const colors = useColors();
  const [selectedAmount, setSelectedAmount] = useState<number>(100);

  const amounts = [50, 100, 200, 500, 1000];

  const handlePurchase = () => {
    Alert.alert(
      'Purchase Confirmation',
      `Are you sure you want to purchase ${selectedAmount} BetaCoins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Purchase', onPress: () => {
          // Handle purchase logic here
          Alert.alert('Success', 'BetaCoins purchased successfully!');
          onClose();
        }}
      ]
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ 
            flex: 1, 
            backgroundColor: colors.background.primary,
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
              backgroundColor: colors.background.tertiary,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.main,
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text.primary }}>Purchase BetaCoins</Text>
              <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={{ flex: 1, padding: 20 }}>
              <Text style={{ fontSize: 16, color: colors.text.secondary, marginBottom: 20 }}>
                Choose the amount of BetaCoins you want to purchase:
              </Text>

              {amounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.amountOption,
                    { 
                      backgroundColor: selectedAmount === amount ? colors.primary.main : colors.background.secondary,
                      borderColor: colors.border.main,
                    }
                  ]}
                  onPress={() => setSelectedAmount(amount)}
                >
                  <Text style={[
                    styles.amountText,
                    { color: selectedAmount === amount ? colors.text.white : colors.text.primary }
                  ]}>
                    {amount} BetaCoins
                  </Text>
                  <Text style={[
                    styles.priceText,
                    { color: selectedAmount === amount ? colors.text.white : colors.text.secondary }
                  ]}>
                    RM {(amount * 0.1).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={{ marginTop: 30 }}>
                <TouchableOpacity
                  style={[styles.purchaseButton, { backgroundColor: colors.primary.main }]}
                  onPress={handlePurchase}
                >
                  <Text style={[styles.purchaseButtonText, { color: colors.text.white }]}>
                    Purchase {selectedAmount} BetaCoins for RM {(selectedAmount * 0.1).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  amountOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  priceText: {
    fontSize: 14,
  },
  purchaseButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
