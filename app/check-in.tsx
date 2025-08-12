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
import { notificationScheduler } from '../lib/notification-scheduler';
import { Image } from 'react-native';

const { width, height } = Dimensions.get('window');

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
  const rotationAnimation = useRef(new Animated.Value(0)).current;
  
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
    { day: 4, stones: 2, claimed: currentStreak >= 4, isToday: currentStreak === 3 && canCheckIn },
    { day: 5, stones: 2, claimed: currentStreak >= 5, isToday: currentStreak === 4 && canCheckIn },
    { day: 6, stones: 2, claimed: currentStreak >= 6, isToday: currentStreak === 5 && canCheckIn },
    { day: 7, stones: 0, claimed: currentStreak >= 7, isToday: currentStreak === 6 && canCheckIn, bonus: true },
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
        
        // Record check-in with notification scheduler
        await notificationScheduler.recordCheckIn();
        
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
        } else {
          setTimeout(() => {
            Alert.alert('✅ Check-in Successful!', `You've earned ${reward} stones! Keep your streak going!`);
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
        .slice(-10) // Show last 10 transactions
        .reverse()
        .map(t => `${new Date(t.created_at!).toLocaleDateString()}: +${t.amount} stones`)
        .join('\n');
        
      Alert.alert('Recent Check-in History', historyText);
    } catch (error) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'Failed to load check-in history.');
    }
  };

  const getGradientColors = (day: number): [string, string, ...string[]] => {
    const baseBlue = '#4A90E2';
    const darkBlue = '#2E5BBA';
    
    if (day === 7) {
      return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    }
    
    // Gradient from light to dark blue
    const intensity = day / 7;
    const r = Math.floor(74 + (46 - 74) * intensity);
    const g = Math.floor(144 + (91 - 144) * intensity);
    const b = Math.floor(226 + (186 - 226) * intensity);
    
    return [`rgb(${r}, ${g}, ${b})`, darkBlue];
  };

  const getCardPosition = (index: number) => {
    const centerX = width / 2;
    const centerY = height * 0.25; // Position ferris wheel much higher
    const radius = Math.min(width, height) * 0.32; // Even larger radius to prevent blocking
    
    if (index === 6) {
      // Day 7 in center
      return {
        left: centerX - 60,
        top: centerY - 60,
        scale: 1.3,
        zIndex: 10,
      };
    }
    
    // Calculate angle for each card (6 cards around the circle)
    // Start from top (12 o'clock position) and go clockwise
    const angle = (index * 60 - 90) * (Math.PI / 180); // 60 degrees apart, starting from top
    
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    // Scale based on position (much more dramatic scaling from small to big)
    const scale = 0.5 + (index * 0.15);
    
    return {
      left: x - 60,
      top: y - 60,
      scale: Math.min(scale, 1.1),
      zIndex: index,
    };
  };

  const renderFerrisWheelCard = (dayData: CheckInDay, index: number) => {
    const { day, stones, claimed, isToday, bonus } = dayData;
    const position = getCardPosition(index);
    
    // Floating animation for Day 7
    const floatingAnimation = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      if (day === 7) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(floatingAnimation, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(floatingAnimation, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }, [day]);
    
    return (
      <Animated.View
        key={day}
        style={[
          styles.ferrisCard,
          {
            position: 'absolute',
            left: position.left,
            top: position.top,
            transform: [
              { scale: position.scale },
              ...(day === 7 ? [{
                translateY: floatingAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              }] : []),
            ],
            zIndex: position.zIndex,
          },
        ]}
      >
        <View style={styles.diamondContainer}>
          <Image 
            source={require('../assets/images/diamond-checkin.png')}
            style={[
              styles.diamondImage,
              claimed && styles.claimedDiamond,
              isToday && styles.todayDiamond,
            ]}
          />
          
          {/* Day Number */}
          <Text style={styles.dayLabel}>Day {day}</Text>
          
          {/* Stone Count */}
          <Text style={styles.stoneCount}>+{stones}</Text>
          
          {/* Check Mark for Claimed */}
          {claimed && (
            <View style={styles.checkMark}>
              <Text style={styles.checkMarkText}>✓</Text>
            </View>
          )}
          
          {/* Bonus Label for Day 7 */}
          {bonus && (
            <View style={styles.bonusLabel}>
              <Text style={styles.bonusText}>Bonus!</Text>
            </View>
          )}
          
          {/* Glow Effect for Claimed */}
          {claimed && <View style={styles.glowEffect} />}
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Check-in</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Ferris Wheel - Big and at the top */}
        <View style={styles.ferrisWheelContainer}>
          <View style={styles.ferrisWheel}>
            {checkInDays.map((dayData, index) => renderFerrisWheelCard(dayData, index))}
          </View>
        </View>

        {/* Stones Counter */}
        <View style={styles.stonesHeader}>
          <LinearGradient
            colors={['#007AFF', '#0056CC']}
            style={styles.stonesGradient}
          >
            <View style={styles.stonesContent}>
              <Image 
                source={require('../assets/images/diamond.webp')}
                style={styles.headerStoneImage}
              />
              <Text style={styles.stonesCount}>{totalStones}</Text>
              <Text style={styles.stonesLabel}>Total Stones</Text>
            </View>
          </LinearGradient>
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
              colors={canCheckIn ? ['#667eea', '#764ba2'] : ['#6c757d', '#495057']}
              style={styles.buttonGradient}
            >
              <Gift size={24} color="white" />
              <Text style={styles.checkInButtonText}>
                {canCheckIn ? 'Check-in Now!' : 'Already Checked-in'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.historyButton} onPress={handleHistory}>
            <Clock size={20} color={Colors.primary.main} />
            <Text style={styles.historyButtonText}>View History</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  ferrisWheelContainer: {
    height: height * 0.5,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 0,
    paddingTop: 10,
  },
  ferrisWheel: {
    width: width,
    height: height * 0.4,
    position: 'relative',
  },
  ferrisCard: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  diamondContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  diamondImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  claimedDiamond: {
    opacity: 0.9,
  },
  todayDiamond: {
    opacity: 1,
  },
  cardGradient: {
    flex: 1,
    padding: 8,
  },
  claimedGradient: {
    opacity: 0.8,
  },
  glowEffect: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 54,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  todayGradient: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayLabel: {
    position: 'absolute',
    top: 15,
    fontSize: 12,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  rewardContainer: {
    alignItems: 'center',
  },
  questionContainer: {
    alignItems: 'center',
  },
  questionMark: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
  },
  questionText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    opacity: 0.9,
  },
  stoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stoneImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  stoneCount: {
    position: 'absolute',
    bottom: 15,
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  checkMark: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMarkText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bonusLabel: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bonusText: {
    color: '#FF6B6B',
    fontSize: 8,
    fontWeight: '700',
  },
  centerHub: {
    position: 'absolute',
    top: '25%',
    left: '50%',
    marginLeft: -25,
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: Colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
  },
  hubGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubText: {
    fontSize: 24,
    fontWeight: '900',
    color: 'white',
  },
  stonesHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  stonesGradient: {
    borderRadius: 20,
    padding: 20,
  },
  stonesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  headerStoneImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  stonesCount: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  stonesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    opacity: 0.9,
  },
  actionButtons: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  checkInButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: Colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  checkInButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  historyButtonText: {
    color: Colors.primary.main,
    fontSize: 16,
    fontWeight: '600',
  },
});