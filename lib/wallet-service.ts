import { supabase } from './supabase';

export interface WalletData {
  id?: string;
  user_id: string;
  betame_stones: number;
  betame_credits: number;
  created_at?: string;
  updated_at?: string;
}

export interface PurchasedFeature {
  id?: string;
  user_id: string;
  feature_type: 'feature_2x' | 'boost_instant' | 'showcase_max' | 'boost_feature_max';
  feature_name: string;
  quantity: number;
  expires_at: string;
  created_at?: string;
}

export interface Transaction {
  id?: string;
  user_id: string;
  type: 'conversion' | 'feature_purchase' | 'stone_purchase' | 'credit_purchase' | 'daily_checkin' | 'referral_bonus' | 'service_payment' | 'service_payment_received';
  amount: number;
  description: string;
  created_at?: string;
}

export interface CheckInData {
  id?: string;
  user_id: string;
  last_checkin_date: string;
  streak_count: number;
  total_stones_earned: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReferralData {
  id?: string;
  referrer_id: string;
  referred_user_id: string;
  status: 'pending' | 'completed';
  stones_awarded: number;
  created_at?: string;
}

export class WalletService {
  /**
   * Get wallet data for a user
   */
  static async getWallet(userId: string): Promise<WalletData | null> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching wallet:', error);
        return null;
      }

      // Handle backward compatibility for column name changes
      if (data && data.premium_stones !== undefined && data.betame_stones === undefined) {
        data.betame_stones = data.premium_stones;
      }

      return data;
    } catch (error) {
      console.error('Error in getWallet:', error);
      return null;
    }
  }

  /**
   * Create or update wallet data
   */
  static async updateWallet(walletData: WalletData): Promise<WalletData | null> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .upsert({
          ...walletData,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating wallet:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateWallet:', error);
      return null;
    }
  }

  /**
   * Convert premium stones to BetaMe credits
   */
  static async convertStonesToCredits(
    userId: string,
    stonesAmount: number
  ): Promise<{ success: boolean; wallet?: WalletData; error?: string }> {
    try {
      // Get current wallet
      const wallet = await this.getWallet(userId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      // Check if user has enough stones
      if (wallet.betame_stones < stonesAmount) {
        return { success: false, error: 'Insufficient BetaMe stones' };
      }

      // Calculate credits (10 stones = 1 credit)
      const creditsToAdd = Math.floor(stonesAmount / 10);
      
      // Update wallet
      const updatedWallet = await this.updateWallet({
        ...wallet,
        betame_stones: wallet.betame_stones - stonesAmount,
        betame_credits: wallet.betame_credits + creditsToAdd,
      });

      if (!updatedWallet) {
        return { success: false, error: 'Failed to update wallet' };
      }

      // Record transaction
      await this.recordTransaction({
        user_id: userId,
        type: 'conversion',
        amount: stonesAmount,
        description: `Converted ${stonesAmount} stones to ${creditsToAdd} credits`,
      });

      return { success: true, wallet: updatedWallet };
    } catch (error) {
      console.error('Error in convertStonesToCredits:', error);
      return { success: false, error: 'Conversion failed' };
    }
  }

  /**
   * Purchase visibility boost
   */
  static async purchaseBoost(
    userId: string,
    boostCost: number,
    boostTitle: string
  ): Promise<{ success: boolean; wallet?: WalletData; error?: string }> {
    try {
      // Get current wallet
      const wallet = await this.getWallet(userId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      // Check if user has enough credits
      if (wallet.betame_credits < boostCost) {
        return { success: false, error: 'Insufficient BetaMe credits' };
      }

      // Update wallet
      const updatedWallet = await this.updateWallet({
        ...wallet,
        betame_credits: wallet.betame_credits - boostCost,
      });

      if (!updatedWallet) {
        return { success: false, error: 'Failed to update wallet' };
      }

      // Record transaction
      await this.recordTransaction({
        user_id: userId,
        type: 'feature_purchase',
        amount: boostCost,
        description: `Purchased ${boostTitle}`,
      });

      return { success: true, wallet: updatedWallet };
    } catch (error) {
      console.error('Error in purchaseBoost:', error);
      return { success: false, error: 'Purchase failed' };
    }
  }

  /**
   * Record a transaction
   */
  static async recordTransaction(transaction: Transaction): Promise<Transaction | null> {
    try {
      console.log('Recording transaction:', transaction);
      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) {
        console.error('Error recording transaction:', error);
        console.error('Transaction data:', transaction);
        throw new Error(`Failed to record transaction: ${error.message}`);
      }

      console.log('Transaction recorded successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in recordTransaction:', error);
      throw error; // Re-throw to ensure calling code knows about the failure
    }
  }

  /**
   * Get transaction history for a user
   */
  static async getTransactionHistory(userId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTransactionHistory:', error);
      return [];
    }
  }

  /**
   * Daily check-in to earn BetaMe stones
   */
  static async dailyCheckIn(userId: string): Promise<{ success: boolean; stones?: number; streak?: number; error?: string }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current check-in data
      const { data: checkInData, error: checkInError } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (checkInError && checkInError.code !== 'PGRST116') {
        console.error('Error fetching check-in data:', checkInError);
        return { success: false, error: 'Failed to fetch check-in data' };
      }

      // Check if already checked in today
      if (checkInData && checkInData.last_checkin_date === today) {
        return { success: false, error: 'Already checked in today' };
      }

      // Calculate streak and stones
      let newStreak = 1;
      let stonesToAward = 1;
      
      if (checkInData) {
        const lastCheckIn = new Date(checkInData.last_checkin_date);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day
          newStreak = checkInData.streak_count + 1;
        } else {
          // Streak broken
          newStreak = 1;
        }
      }

      // Bonus stones for streak milestones
      if (newStreak === 7) {
        stonesToAward = 5; // Bonus for 7-day streak
      } else if (newStreak % 30 === 0) {
        stonesToAward = 10; // Monthly bonus
      }

      // Update or insert check-in data
      let upsertError;
      if (checkInData) {
        // Update existing record
        const { error } = await supabase
          .from('checkins')
          .update({
            last_checkin_date: today,
            streak_count: newStreak,
            total_stones_earned: checkInData.total_stones_earned + stonesToAward,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        upsertError = error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('checkins')
          .insert({
            user_id: userId,
            last_checkin_date: today,
            streak_count: newStreak,
            total_stones_earned: stonesToAward,
            updated_at: new Date().toISOString(),
          });
        upsertError = error;
      }

      if (upsertError) {
        console.error('Error updating check-in:', upsertError);
        return { success: false, error: 'Failed to update check-in' };
      }

      // Update wallet stones
      const wallet = await this.getWallet(userId);
      if (wallet) {
        await this.updateWallet({
          ...wallet,
          betame_stones: wallet.betame_stones + stonesToAward,
        });
      }

      // Record transaction
      try {
        await this.recordTransaction({
          user_id: userId,
          type: 'daily_checkin',
          amount: stonesToAward,
          description: `Daily check-in reward (Day ${newStreak})`,
        });
        console.log('Daily check-in transaction recorded successfully');
      } catch (transactionError) {
        console.error('Failed to record daily check-in transaction:', transactionError);
        // Don't fail the entire check-in if transaction recording fails
        // The user still gets their stones and check-in is recorded
      }

      return { success: true, stones: stonesToAward, streak: newStreak };
    } catch (error) {
      console.error('Error in dailyCheckIn:', error);
      return { success: false, error: 'Check-in failed' };
    }
  }

  /**
   * Get check-in status for a user
   */
  static async getCheckInStatus(userId: string): Promise<CheckInData | null> {
    try {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching check-in status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCheckInStatus:', error);
      return null;
    }
  }

  /**
   * Purchase a feature with credits
   */
  static async purchaseFeature(
    userId: string,
    featureType: 'feature_2x' | 'boost_instant' | 'showcase_max' | 'boost_feature_max',
    quantity: number = 1
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const featurePrices = {
        feature_2x: 100,
        boost_instant: 20,
        showcase_max: 50,
        boost_feature_max: 200,
      };

      const featureNames = {
        feature_2x: 'Feature (2x visibility)',
        boost_instant: 'Boost (instant visibility)',
        showcase_max: 'Showcase (Max visibility)',
        boost_feature_max: 'Boost Feature (Max visibility for All)',
      };

      const totalCost = featurePrices[featureType] * quantity;
      
      // Check wallet balance
      const wallet = await this.getWallet(userId);
      if (!wallet || wallet.betame_credits < totalCost) {
        return { success: false, error: 'Insufficient BetaMe credits' };
      }

      // Deduct credits
      await this.updateWallet({
        ...wallet,
        betame_credits: wallet.betame_credits - totalCost,
      });

      // Add purchased feature
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year validity

      const { error: featureError } = await supabase
        .from('purchased_features')
        .insert({
          user_id: userId,
          feature_type: featureType,
          feature_name: featureNames[featureType],
          quantity: quantity,
          expires_at: expiresAt.toISOString(),
        });

      if (featureError) {
        console.error('Error adding purchased feature:', featureError);
        return { success: false, error: 'Failed to add feature' };
      }

      // Record transaction
      await this.recordTransaction({
        user_id: userId,
        type: 'feature_purchase',
        amount: totalCost,
        description: `Purchased ${quantity}x ${featureNames[featureType]}`,
      });

      return { success: true };
    } catch (error) {
      console.error('Error in purchaseFeature:', error);
      return { success: false, error: 'Purchase failed' };
    }
  }

  /**
   * Get purchased features for a user
   */
  static async getPurchasedFeatures(userId: string): Promise<PurchasedFeature[]> {
    try {
      const { data, error } = await supabase
        .from('purchased_features')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .gt('quantity', 0)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchased features:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPurchasedFeatures:', error);
      return [];
    }
  }

  /**
   * Use a purchased feature
   */
  static async useFeature(
    userId: string,
    featureId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: feature, error: fetchError } = await supabase
        .from('purchased_features')
        .select('*')
        .eq('id', featureId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !feature) {
        return { success: false, error: 'Feature not found' };
      }

      if (feature.quantity <= 0) {
        return { success: false, error: 'Feature already used' };
      }

      if (new Date(feature.expires_at) < new Date()) {
        return { success: false, error: 'Feature expired' };
      }

      // Decrease quantity
      const { error: updateError } = await supabase
        .from('purchased_features')
        .update({ quantity: feature.quantity - 1 })
        .eq('id', featureId);

      if (updateError) {
        console.error('Error using feature:', updateError);
        return { success: false, error: 'Failed to use feature' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in useFeature:', error);
      return { success: false, error: 'Failed to use feature' };
    }
  }

  /**
   * Process referral bonus
   */
  static async processReferralBonus(
    referrerId: string,
    referredUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if referral already exists
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', referrerId)
        .eq('referred_user_id', referredUserId)
        .single();

      if (existingReferral) {
        return { success: false, error: 'Referral already processed' };
      }

      const bonusStones = 100;

      // Add referral record
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referred_user_id: referredUserId,
          status: 'completed',
          stones_awarded: bonusStones,
        });

      if (referralError) {
        console.error('Error adding referral:', referralError);
        return { success: false, error: 'Failed to process referral' };
      }

      // Update referrer's wallet
      const wallet = await this.getWallet(referrerId);
      if (wallet) {
        await this.updateWallet({
          ...wallet,
          betame_stones: wallet.betame_stones + bonusStones,
        });
      }

      // Record transaction
      await this.recordTransaction({
        user_id: referrerId,
        type: 'referral_bonus',
        amount: bonusStones,
        description: `Referral bonus for inviting user`,
      });

      return { success: true };
    } catch (error) {
      console.error('Error in processReferralBonus:', error);
      return { success: false, error: 'Referral processing failed' };
    }
  }

  /**
   * Add stones to user's wallet (for stone purchases)
   */
  static async addStones(
    userId: string,
    stonesAmount: number
  ): Promise<{ success: boolean; wallet?: WalletData; error?: string }> {
    try {
      // Get current wallet
      const wallet = await this.getWallet(userId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      // Update wallet with new stones
      const updatedWallet = await this.updateWallet({
        ...wallet,
        betame_stones: wallet.betame_stones + stonesAmount,
      });

      if (!updatedWallet) {
        return { success: false, error: 'Failed to update wallet' };
      }

      // Record transaction
      await this.recordTransaction({
        user_id: userId,
        type: 'stone_purchase',
        amount: stonesAmount,
        description: `Purchased ${stonesAmount} premium stones`,
      });

      return { success: true, wallet: updatedWallet };
    } catch (error) {
      console.error('Error in addStones:', error);
      return { success: false, error: 'Failed to add stones' };
    }
  }
}