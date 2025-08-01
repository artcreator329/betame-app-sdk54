import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Gift, Clock, Calendar, Diamond } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface CheckInDay {
  day: number;
  diamonds: number;
  claimed: boolean;
  isToday: boolean;
  bonus?: boolean;
}

export default function CheckInScreen() {
  const router = useRouter();
  const [currentStreak, setCurrentStreak] = useState(3);
  const [totalDiamonds, setTotalDiamonds] = useState(9);
  const [canCheckIn, setCanCheckIn] = useState(true);
  
  const checkInDays: CheckInDay[] = [
    { day: 1, diamonds: 1, claimed: true, isToday: false },
    { day: 2, diamonds: 1, claimed: true, isToday: false },
    { day: 3, diamonds: 1, claimed: true, isToday: false },
    { day: 4, diamonds: 1, claimed: false, isToday: true },
    { day: 5, diamonds: 1, claimed: false, isToday: false },
    { day: 6, diamonds: 1, claimed: false, isToday: false },
    { day: 7, diamonds: 2, claimed: false, isToday: false, bonus: true },
  ];

  const handleCheckIn = () => {
    if (!canCheckIn) {
      Alert.alert('Already Checked In', 'You have already checked in today. Come back tomorrow!');
      return;
    }

    const todayIndex = checkInDays.findIndex(day => day.isToday);
    if (todayIndex !== -1) {
      const todayReward = checkInDays[todayIndex].diamonds;
      setTotalDiamonds(prev => prev + todayReward);
      setCurrentStreak(prev => prev + 1);
      setCanCheckIn(false);
      
      Alert.alert(
        'Check-in Successful! 🎉',
        `You earned ${todayReward} premium diamond${todayReward > 1 ? 's' : ''}!`,
        [{ text: 'Great!', style: 'default' }]
      );
    }
  };

  const handleHistory = () => {
    Alert.alert('Check-in History', 'Check-in history feature coming soon!');
  };

  const renderCheckInDay = (dayData: CheckInDay) => {
    const { day, diamonds, claimed, isToday, bonus } = dayData;
    
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
            <Diamond 
              size={16} 
              color={claimed ? '#4CAF50' : isToday ? '#007AFF' : '#8E8E93'}
              fill={claimed ? '#4CAF50' : isToday ? '#007AFF' : 'transparent'}
            />
            {diamonds > 1 && (
              <Diamond 
                size={16} 
                color={claimed ? '#4CAF50' : isToday ? '#007AFF' : '#FF9800'}
                fill={claimed ? '#4CAF50' : isToday ? '#007AFF' : '#FF9800'}
                style={styles.bonusDiamond}
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
          <ArrowLeft size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check-in Bonus</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Diamonds Counter */}
        <View style={styles.diamondsHeader}>
          <View style={styles.diamondsCounter}>
            <Diamond size={20} color="#007AFF" fill="#007AFF" />
            <Text style={styles.diamondsCount}>{totalDiamonds} Diamonds</Text>
          </View>
          <View style={styles.streakInfo}>
            <Text style={styles.streakText}>check in to earn extra diamonds everyday!</Text>
          </View>
        </View>

        {/* Current Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Today's Reward</Text>
          <Text style={styles.statusSubtitle}>+1 Premium Diamond</Text>
        </View>

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
            disabled={!canCheckIn}
          >
            <LinearGradient
              colors={canCheckIn ? ['#007AFF', '#0056CC'] : ['#8E8E93', '#6D6D70']}
              style={styles.buttonGradient}
            >
              <Gift size={20} color="white" />
              <Text style={styles.checkInButtonText}>
                {canCheckIn ? 'Earn' : 'Claimed'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.historyButton} onPress={handleHistory}>
            <Clock size={20} color="#007AFF" />
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Ad Banner Placeholder */}
        <View style={styles.adBanner}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E8E']}
            style={styles.adGradient}
          >
            <View style={styles.adContent}>
              <Text style={styles.adTitle}>WE ARE</Text>
              <Text style={styles.adTitle}>HIRING</Text>
              <View style={styles.adDetails}>
                <Text style={styles.adSubtitle}>MANAGE</Text>
                <Text style={styles.adSubtitle}>CONTENT SPECIALIST</Text>
                <Text style={styles.adSubtitle}>SUPERVISORY</Text>
                <Text style={styles.adSubtitle}>COPYWRITER</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Featured Services Preview */}
        <View style={styles.featuredSection}>
          <Text style={styles.featuredTitle}>People also search...</Text>
          <View style={styles.featuredGrid}>
            <View style={styles.featuredItem}>
              <View style={styles.featuredImage} />
              <Text style={styles.featuredText}>1 Stop Cleaning</Text>
              <Text style={styles.featuredPrice}>From RM30</Text>
            </View>
            <View style={styles.featuredItem}>
              <View style={styles.featuredImage} />
              <Text style={styles.featuredText}>Xiao Ming - Airport Transfer</Text>
              <Text style={styles.featuredPrice}>From RM110</Text>
            </View>
          </View>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  diamondsHeader: {
    backgroundColor: 'white',
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
    color: '#1D1D1F',
  },
  streakInfo: {
    alignItems: 'center',
  },
  streakText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
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
    color: '#1D1D1F',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  calendarContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
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
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
    position: 'relative',
  },
  claimedCard: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  todayCard: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  bonusCard: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  claimedText: {
    color: '#4CAF50',
  },
  todayText: {
    color: '#007AFF',
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
  checkMark: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMarkText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bonusLabel: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#FF9800',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  bonusText: {
    color: 'white',
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
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  historyButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  adBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    height: 120,
  },
  adGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  adContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  adDetails: {
    alignItems: 'flex-end',
  },
  adSubtitle: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.9,
  },
  featuredSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  featuredGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  featuredItem: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 8,
  },
  featuredText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  featuredPrice: {
    fontSize: 12,
    color: '#8E8E93',
  },
});