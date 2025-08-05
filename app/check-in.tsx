import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Gift, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { WalletService } from '../lib/wallet-service';
import { useAuth } from '../contexts/AuthContext';
import { Image } from 'react-native';

const { width } = Dimensions.get('window');

interface CheckInDay {
  day: number;
  stones: number;
  claimed: boolean;
  isToday: boolean;
  bonus?: boolean;
}

export default function CheckInScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalStones, setTotalStones] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [isCheckedInToday, setIsCheckedInToday] = useState(false);
  const [lastCheckInDate, setLastCheckInDate] = useState<Date | null>(null);
  
  // Animation refs
  const flashAnimation = useRef(new Animated.Value(1)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (user?.id) {
      loadCheckInData();
    }
  }, [user]);

  const loadCheckInData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const [checkInStatus, walletData] = await Promise.all([
        WalletService.getCheckInStatus(user.id),
        WalletService.getWallet(user.id)
      ]);
      
      if (checkInStatus) {
        const today = new Date();
        const lastCheckIn = new Date(checkInStatus.last_checkin_date);
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const lastCheckInStart = new Date(lastCheckIn.getFullYear(), lastCheckIn.getMonth(), lastCheckIn.getDate());
        
        const daysDiff = Math.floor((todayStart.getTime() - lastCheckInStart.getTime()) / (1000 * 60 * 60 * 24));
        
        setLastCheckInDate(lastCheckIn);
        setCurrentStreak(checkInStatus.streak_count);
        
        // Reset streak if more than 1 day has passed
        if (daysDiff > 1) {
          setCurrentStreak(0);
          setCanCheckIn(true);
          setIsCheckedInToday(false);
        } else if (daysDiff === 1) {
          // Can check in today
          setCanCheckIn(true);
          setIsCheckedInToday(false);
        } else {
          // Already checked in today
          setCanCheckIn(false);
          setIsCheckedInToday(true);
        }
      } else {
        // First time user
        setCurrentStreak(0);
        setCanCheckIn(true);
        setIsCheckedInToday(false);
      }
      
      if (walletData) {
        setTotalStones(walletData.betame_stones);
      }
    } catch (error) {
      console.error('Error loading check-in data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Animation functions
  const triggerFlashAnimation = () => {
    Animated.sequence([
      Animated.timing(flashAnimation, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(flashAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(flashAnimation, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(flashAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const triggerScaleAnimation = () => {
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const checkInDays: CheckInDay[] = [
    { day: 1, stones: 1, claimed: currentStreak >= 1, isToday: currentStreak === 0 && canCheckIn },
    { day: 2, stones: 1, claimed: currentStreak >= 2, isToday: currentStreak === 1 && canCheckIn },
    { day: 3, stones: 1, claimed: currentStreak >= 3, isToday: currentStreak === 2 && canCheckIn },
    { day: 4, stones: 1, claimed: currentStreak >= 4, isToday: currentStreak === 3 && canCheckIn },
    { day: 5, stones: 1, claimed: currentStreak >= 5, isToday: currentStreak === 4 && canCheckIn },
    { day: 6, stones: 1, claimed: currentStreak >= 6, isToday: currentStreak === 5 && canCheckIn },
    { day: 7, stones: 2, claimed: currentStreak >= 7, isToday: currentStreak === 6 && canCheckIn, bonus: true },
  ];

  const handleCheckIn = async () => {
    if (!user?.id || !canCheckIn) {
      Alert.alert('Cannot Check In', 'You have already checked in today or there was an error.');
      return;
    }

    try {
      // Trigger animations immediately for better UX
      triggerFlashAnimation();
      triggerScaleAnimation();
      
      const result = await WalletService.dailyCheckIn(user.id);
      if (result.success) {
        // Update local state immediately
        setCanCheckIn(false);
        setIsCheckedInToday(true);
        
        // Reload data to get updated state from server
        await loadCheckInData();
        
        const reward = result.stones || 1;
        const newStreak = currentStreak + 1;
        
        // Reset streak if it reaches 7
        if (newStreak >= 7) {
          setTimeout(() => {
            Alert.alert(
              '🎉 Week Complete!', 
              `Amazing! You've completed a full week of check-ins and earned ${reward} stones! Your streak will reset and you can start a new 7-day journey.`,
              [{ text: 'Continue', onPress: () => loadCheckInData() }]
            );
          }, 800);
        } else if (reward > 1) {
          setTimeout(() => {
            Alert.alert('🎁 Streak Bonus!', `Congratulations! You've earned ${reward} stones including a streak bonus!`);
          }, 800);
        } else {
          setTimeout(() => {
            Alert.alert('✅ Check-in Successful!', `You've earned ${reward} stone! Keep your streak going!`);
          }, 800);
        }
      } else {
        Alert.alert('Check-in Failed', result.error || 'Failed to check in. Please try again.');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'An error occurred during check-in. Please try again.');
    }
  };

  const handleHistory = async () => {
    if (!user?.id) return;
    
    try {
      const transactions = await WalletService.getTransactionHistory(user.id);
      const checkInTransactions = transactions.filter(t => t.type === 'daily_checkin');
      
      if (checkInTransactions.length === 0) {
        Alert.alert('Check-in History', 'No check-in history found.');
        return;
      }
      
      const historyText = checkInTransactions
        .slice(0, 10) // Show last 10 check-ins
        .map(t => `${new Date(t.created_at!).toLocaleDateString()}: +${t.amount} stones`)
        .join('\n');
        
      Alert.alert('Recent Check-in History', historyText);
    } catch (error) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'Failed to load check-in history.');
    }
  };

  const renderCheckInDay = (dayData: CheckInDay) => {
    const { day, stones, claimed, isToday, bonus } = dayData;
    
    return (
      <View key={day} style={styles.dayContainer}>
        <View style={[
          styles.dayCard,
          claimed && styles.claimedCard,
          isToday && styles.todayCard,
          bonus && styles.bonusCard
        ]}>
          <Text style={[
            styles.dayNumber,
            claimed && styles.claimedText,
            isToday && styles.todayText
          ]}>+{day}</Text>
          
          <View style={styles.diamondContainer}>
            <Image 
              source={require('../assets/images/diamond.webp')}
              style={[styles.diamondImage, {
                opacity: claimed ? 1 : isToday ? 1 : 0.5
              }]}
            />
            {stones > 1 && (
              <Image 
                source={require('../assets/images/diamond.webp')}
                style={[styles.diamondImage, styles.bonusDiamond, {
                  opacity: claimed ? 1 : isToday ? 1 : 0.8
                }]}
              />
            )}
          </View>
          
          {claimed && (
            <View style={styles.checkMark}>
              <Text style={styles.checkMarkText}>✓</Text>
            </View>
          )}
          
          {bonus && (
            <View style={styles.bonusLabel}>
              <Text style={styles.bonusText}>Bonus Day</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check-in Bonus</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Stones Counter */}
        <View style={styles.diamondsHeader}>
          <View style={styles.diamondsCounter}>
            <Image 
              source={require('../assets/images/diamond.webp')}
              style={styles.headerDiamondImage}
            />
            <Text style={styles.diamondsCount}>{totalStones} Stones</Text>
          </View>
          <View style={styles.streakInfo}>
            <Text style={styles.streakText}>check in to earn extra stones everyday!</Text>
          </View>
        </View>

        {/* Current Status */}
        <Animated.View style={[
          styles.statusCard,
          {
            opacity: flashAnimation,
            transform: [{ scale: scaleAnimation }],
            backgroundColor: isCheckedInToday ? '#4CAF50' : '#f8f9fa'
          }
        ]}>
          <Text style={[styles.statusTitle, { color: isCheckedInToday ? '#fff' : '#333' }]}>Today's Reward</Text>
          <Text style={[styles.statusSubtitle, { color: isCheckedInToday ? '#fff' : '#007AFF' }]}>+1 Premium Stone</Text>
        </Animated.View>

        {/* Check-in Calendar */}
        <View style={styles.calendarContainer}>
          <View style={styles.daysGrid}>
            {checkInDays.map(renderCheckInDay)}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.checkInButton,
              !canCheckIn && styles.disabledButton
            ]}
            onPress={handleCheckIn}
            disabled={!canCheckIn || loading}
          >
            <LinearGradient
              colors={canCheckIn ? [Colors.primary.main, Colors.primary.dark] : [Colors.text.secondary, '#6D6D70']}
              style={styles.buttonGradient}
            >
              <Gift size={20} color="white" />
              <Text style={styles.checkInButtonText}>
                {canCheckIn ? 'Check-in' : 'Checked-in'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.historyButton} onPress={handleHistory}>
            <Clock size={20} color={Colors.primary.main} />
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
        </View>


      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  diamondsHeader: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  diamondsCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  diamondsCount: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  streakInfo: {
    alignItems: 'center',
  },
  streakText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: Colors.background.tertiary,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: Colors.primary.main,
    fontWeight: '500',
  },
  calendarContainer: {
    backgroundColor: Colors.background.tertiary,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: Colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  dayContainer: {
    width: (width - 80) / 7,
    marginBottom: 12,
  },
  dayCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
    position: 'relative',
  },
  claimedCard: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.status.success,
  },
  todayCard: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 2,
    borderColor: Colors.primary.main,
  },
  bonusCard: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.status.warning,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  claimedText: {
    color: Colors.status.success,
  },
  todayText: {
    color: Colors.primary.main,
  },
  diamondContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bonusDiamond: {
    marginLeft: -4,
  },
  diamondImage: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  headerDiamondImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  checkMark: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.status.success,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMarkText: {
    color: Colors.text.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  bonusLabel: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: Colors.status.warning,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  bonusText: {
    color: Colors.text.white,
    fontSize: 8,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  checkInButton: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  checkInButtonText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.tertiary,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary.main,
  },
  historyButtonText: {
    color: Colors.primary.main,
    fontSize: 16,
    fontWeight: '600',
  },

});