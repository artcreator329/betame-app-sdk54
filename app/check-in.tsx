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
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Gift, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/Colors';
import { WalletService } from '../lib/wallet-service';
import { useAuth } from '../contexts/AuthContext';
import { notificationScheduler } from '../lib/notification-scheduler';
import { Image } from 'react-native';

const { width, height } = Dimensions.get('window');

interface CheckInDay {
  day: number;
  diamonds: number;
  claimed: boolean;
  isToday: boolean;
  bonus?: boolean;
}

export default function CheckInScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isDesktop = screenWidth > 768;
  const router = useRouter();
  const { user } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [isCheckedInToday, setIsCheckedInToday] = useState(false);
  const [lastCheckInDate, setLastCheckInDate] = useState<Date | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  
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
        setTotalDiamonds(walletData.betame_diamonds);
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
    { day: 1, diamonds: 1, claimed: currentStreak >= 1, isToday: currentStreak === 0 && canCheckIn },
    { day: 2, diamonds: 1, claimed: currentStreak >= 2, isToday: currentStreak === 1 && canCheckIn },
    { day: 3, diamonds: 1, claimed: currentStreak >= 3, isToday: currentStreak === 2 && canCheckIn },
    { day: 4, diamonds: 2, claimed: currentStreak >= 4, isToday: currentStreak === 3 && canCheckIn },
    { day: 5, diamonds: 2, claimed: currentStreak >= 5, isToday: currentStreak === 4 && canCheckIn },
    { day: 6, diamonds: 2, claimed: currentStreak >= 6, isToday: currentStreak === 5 && canCheckIn },
    { day: 7, diamonds: 0, claimed: currentStreak >= 7, isToday: currentStreak === 6 && canCheckIn, bonus: true },
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
        
        const reward = result.diamonds || 1;
        const newStreak = currentStreak + 1;
        
        // Reset streak if it reaches 7
        if (newStreak >= 7) {
          setTimeout(() => {
            Alert.alert(
              '🎉 Week Complete!', 
              `Amazing! You've completed a full week of check-ins and earned ${reward} diamonds! Your streak will reset and you can start a new 7-day journey.`,
              [{ text: 'Continue', onPress: () => loadCheckInData() }]
            );
          }, 800);
        } else {
          setTimeout(() => {
            Alert.alert('✅ Check-in Successful!', `You've earned ${reward} diamonds! Keep your streak going!`);
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
        if (Platform.OS === 'web') {
          // For web, show in a more web-friendly way
          setHistoryData([]);
          setShowHistory(true);
        } else {
          Alert.alert('Check-in History', 'No check-in history found.');
        }
        return;
      }
      
      if (Platform.OS === 'web') {
        // For web, show in a modal-like view
        setHistoryData(checkInTransactions.slice(-10).reverse());
        setShowHistory(true);
      } else {
        // For mobile, use Alert
        const historyText = checkInTransactions
          .slice(-10) // Show last 10 transactions
          .reverse()
          .map(t => `${new Date(t.created_at!).toLocaleDateString()}: +${t.amount} diamonds`)
          .join('\n');
          
        Alert.alert('Recent Check-in History', historyText);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      if (Platform.OS === 'web') {
        setHistoryData([]);
        setShowHistory(true);
      } else {
        Alert.alert('Error', 'Failed to load check-in history.');
      }
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
    if (isDesktop) {
      // Desktop layout - more compact and centered
      const centerX = 400; // Fixed center for desktop
      const centerY = 150; // Move up to prevent overlap
      const radius = 160; // Smaller radius for desktop
      
      if (index === 6) {
        // Day 7 in center
        return {
          left: centerX - 60,
          top: centerY - 60,
          scale: 1.2,
          zIndex: 10,
        };
      }
      
      // Calculate angle for each card (6 cards around the circle)
      const angle = (index * 60 - 90) * (Math.PI / 180);
      
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      // Scale based on position
      const scale = 0.6 + (index * 0.1);
      
      return {
        left: x - 60,
        top: y - 60,
        scale: Math.min(scale, 1.0),
        zIndex: index,
      };
    } else {
      // Mobile layout - original positioning but moved up
      const centerX = width / 2;
      const centerY = height * 0.2; // Move up from 0.25 to 0.2
      const radius = Math.min(width, height) * 0.28; // Reduce radius slightly
      
      if (index === 6) {
        return {
          left: centerX - 60,
          top: centerY - 60,
          scale: 1.3,
          zIndex: 10,
        };
      }
      
      const angle = (index * 60 - 90) * (Math.PI / 180);
      
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      const scale = 0.5 + (index * 0.15);
      
      return {
        left: x - 60,
        top: y - 60,
        scale: Math.min(scale, 1.1),
        zIndex: index,
      };
    }
  };

  const renderFerrisWheelCard = (dayData: CheckInDay, index: number) => {
    const { day, diamonds, claimed, isToday, bonus } = dayData;
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
          {/* Glow Effect for Claimed Diamonds */}
          {claimed && <View style={styles.glowEffect} />}
          
          <Image 
            source={require('../assets/images/diamond-checkin.png')}
            style={[
              styles.diamondImage,
              claimed ? styles.claimedDiamond : styles.unclaimedDiamond,
              isToday && styles.todayDiamond,
            ]}
          />
          
          {/* Color overlay for unclaimed diamonds */}
          {!claimed && <View style={styles.unclaimedOverlay} />}
          
          {/* Day Number */}
          <Text style={[
            styles.dayLabel,
            claimed ? styles.claimedDayLabel : styles.unclaimedDayLabel
          ]}>
            Day {day}
          </Text>
          
          {/* Diamond Count */}
          <Text style={[
            styles.diamondCount,
            claimed ? styles.claimedDiamondCount : styles.unclaimedDiamondCount,
            day === 7 && !claimed && styles.mysteryDiamondCount
          ]}>
            {day === 7 && !claimed ? '+?' : `+${diamonds}`}
          </Text>
          
          {/* Check Mark for Claimed */}
          {claimed && (
            <View style={styles.checkMark}>
              <Text style={styles.checkMarkText}>✓</Text>
            </View>
          )}
          
          {/* Mystery Label for Day 7 */}
          {bonus && (
            <View style={styles.bonusLabel}>
              <Text style={styles.bonusText}>Mystery</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Blur Gradient Background */}
      <View style={styles.backgroundContainer}>
        {/* Radial gradient background */}
        <LinearGradient
          colors={['#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1976D2', '#1565C0']}
          style={styles.radialGradient}
          start={{ x: 0.5, y: 0.25 }}
          end={{ x: 0.5, y: 1 }}
        />
        
        {/* Blur overlay for depth */}
        <BlurView intensity={20} style={styles.blurOverlay} />
        
        {/* Additional gradient layers for depth */}
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)', 'transparent']}
          style={styles.topGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
        />
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.2)']}
          style={styles.bottomGradient}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      {/* History Modal for Web */}
      {showHistory && Platform.OS === 'web' && (
        <View style={styles.historyModal}>
          <View style={styles.historyModalContent}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>Check-in History</Text>
              <TouchableOpacity 
                style={styles.historyModalClose}
                onPress={() => setShowHistory(false)}
              >
                <Text style={styles.historyModalCloseText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.historyModalBody}>
              {historyData.length === 0 ? (
                <Text style={styles.historyEmptyText}>No check-in history found.</Text>
              ) : (
                historyData.map((transaction, index) => (
                  <View key={index} style={styles.historyItem}>
                    <Text style={styles.historyDate}>
                      {new Date(transaction.created_at!).toLocaleDateString()}
                    </Text>
                    <Text style={styles.historyAmount}>+{transaction.amount} diamonds</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Desktop Container */}
      <View style={[isDesktop && styles.desktopContainer]}>
        {/* Header */}
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDesktop && styles.headerTitleDesktop]}>Daily Check-in</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={[styles.content, isDesktop && styles.contentDesktop]}>
          {/* Ferris Wheel - Compact on desktop */}
          <View style={[styles.ferrisWheelContainer, isDesktop && styles.ferrisWheelContainerDesktop]}>
            <View style={[styles.ferrisWheel, isDesktop && styles.ferrisWheelDesktop]}>
              {checkInDays.map((dayData, index) => renderFerrisWheelCard(dayData, index))}
            </View>
          </View>

          {/* Diamonds Counter */}
          <View style={[styles.diamondsHeader, isDesktop && styles.diamondsHeaderDesktop]}>
            <LinearGradient
              colors={['#007AFF', '#0056CC']}
              style={[styles.diamondsGradient, isDesktop && styles.diamondsGradientDesktop]}
            >
              <View style={styles.diamondsContent}>
                <Image 
                  source={require('../assets/images/diamond.webp')}
                  style={styles.headerDiamondImage}
                />
                <Text style={styles.diamondsCount}>{totalDiamonds}</Text>
                <Text style={styles.diamondsLabel}>Total Diamonds</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Action Buttons */}
          <View style={[styles.actionButtons, isDesktop && styles.actionButtonsDesktop]}>
            <TouchableOpacity 
              style={[
                styles.checkInButton,
                !canCheckIn && styles.disabledButton,
                isDesktop && styles.checkInButtonDesktop
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
            
            <TouchableOpacity 
              style={[styles.historyButton, isDesktop && styles.historyButtonDesktop]} 
              onPress={handleHistory}
              activeOpacity={0.7}
            >
              <Clock size={20} color={Colors.primary.main} />
              <Text style={styles.historyButtonText}>View History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  radialGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  ferrisWheelContainer: {
    height: height * 0.45,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 0,
    paddingTop: 10,
  },
  ferrisWheel: {
    width: width,
    height: height * 0.35,
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
    opacity: 1,
  },
  unclaimedDiamond: {
    opacity: 0.4,
  },
  todayDiamond: {
    opacity: 1,
  },
  unclaimedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(158, 158, 158, 0.3)',
    borderRadius: 50,
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
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 58,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4A90E2',
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 12,
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
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  claimedDayLabel: {
    color: '#1a1a1a',
  },
  unclaimedDayLabel: {
    color: '#9E9E9E',
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
  diamondInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  diamondInfoImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  diamondCount: {
    position: 'absolute',
    bottom: 15,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  claimedDiamondCount: {
    color: '#1a1a1a',
  },
  unclaimedDiamondCount: {
    color: '#9E9E9E',
  },
  mysteryDiamondCount: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6B6B',
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
  diamondsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 20,
  },
  diamondsGradient: {
    borderRadius: 20,
    padding: 20,
  },
  diamondsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  headerDiamondImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  diamondsCount: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  diamondsLabel: {
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
  // New styles for desktop layout
  desktopContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDesktop: {
    width: '100%',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  headerTitleDesktop: {
    fontSize: 24,
  },
  contentDesktop: {
    width: '100%',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  ferrisWheelContainerDesktop: {
    height: 400, // Fixed height for desktop
    marginTop: 0,
    paddingTop: 20,
    marginBottom: 20,
  },
  ferrisWheelDesktop: {
    width: 800,
    height: 360,
    position: 'relative',
    alignSelf: 'center',
  },
  diamondsHeaderDesktop: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginTop: 40,
  },
  diamondsGradientDesktop: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
  },
  actionButtonsDesktop: {
    width: '100%',
    marginTop: 20,
    marginBottom: 0,
  },
  checkInButtonDesktop: {
    marginBottom: 16,
  },
  historyButtonDesktop: {
    marginTop: 8,
  },
  // New styles for history modal
  historyModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  historyModalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  historyModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  historyModalClose: {
    padding: 5,
  },
  historyModalCloseText: {
    fontSize: 24,
    color: '#555',
  },
  historyModalBody: {
    maxHeight: '70%',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  historyAmount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  historyEmptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});