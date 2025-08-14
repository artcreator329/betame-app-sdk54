import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { referralService, ReferralStats } from '@/lib/referral-service';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/contexts/ThemeContext';

interface ReferralStatsInlineProps {
  userId?: string;
}

export const ReferralStatsInline: React.FC<ReferralStatsInlineProps> = ({ userId }) => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);
  const colors = useColors();

  useEffect(() => {
    if (!currentUserId) {
      getCurrentUser();
    } else {
      loadReferralStats();
    }
  }, [currentUserId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadReferralStats = async () => {
    if (!currentUserId) return;
    
    try {
      const referralStats = await referralService.getReferralStats(currentUserId);
      setStats(referralStats);
    } catch (error) {
      console.error('Error loading referral stats:', error);
    }
  };

  if (!stats) {
    return (
      <Text style={[styles.statsText, { color: colors.text.secondary }]}>0 referrals • 0 credits earned</Text>
    );
  }

  return (
    <Text style={[styles.statsText, { color: colors.text.secondary }]}>
      {stats.totalReferrals} referrals • {stats.totalCreditsEarned} credits earned
    </Text>
  );
};

const styles = StyleSheet.create({
  statsText: {
    fontSize: 14,
    marginTop: 2,
  },
});