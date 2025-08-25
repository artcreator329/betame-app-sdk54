import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BetaCoinPurchaseModal from '../components/BetaCoinPurchaseModal';
import Colors from '../constants/Colors';

export default function BetaCoinPurchaseTestPage() {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="diamond" size={64} color={Colors.primary.main} />
          <Text style={styles.title}>BetaCoin Purchase Test</Text>
          <Text style={styles.subtitle}>
            Test the BetaCoin purchase modal with Curlec payment integration
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Available Packages:</Text>
          <Text style={styles.infoText}>
            • 20 BetaCoins - RM 5{'\n'}
            • 100 BetaCoins - RM 20{'\n'}
            • 250 BetaCoins - RM 35 (Popular){'\n'}
            • 600 BetaCoins - RM 80{'\n'}
            • 1000 BetaCoins - RM 100{'\n'}
            • 2000 BetaCoins - RM 180 (Best Value)
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowPurchaseModal(true)}
        >
          <Ionicons name="diamond" size={24} color="white" />
          <Text style={styles.buttonText}>Open BetaCoin Purchase</Text>
        </TouchableOpacity>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How to Test:</Text>
          <Text style={styles.instructionsText}>
            1. Tap the button above{'\n'}
            2. Select a BetaCoin package{'\n'}
            3. Tap "Purchase" to proceed to Curlec{'\n'}
            4. Use test card: 4242424242424242{'\n'}
            5. Complete the payment flow{'\n'}
            6. Verify BetaCoins are added to wallet
          </Text>
        </View>
      </View>

      <BetaCoinPurchaseModal
        visible={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  button: {
    backgroundColor: Colors.primary.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 32,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructions: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f57c00',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
