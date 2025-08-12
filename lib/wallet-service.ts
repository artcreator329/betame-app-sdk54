import { supabase, supabaseAdmin } from './supabase';

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
   * Get wallet data for a user, create one if it doesn't exist
   */
  static async getWallet(userId: string): Promise<WalletData | null> {
    try {
      console.log('🔍 Getting wallet for user:', userId);
      
      // First try to get existing wallet
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('🔍 Wallet query result:', { data: !!data, error: error?.code, message: error?.message });

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - wallet doesn't exist
          console.log('📝 No wallet found, creating new wallet for user:', userId);
          return await this.createWallet(userId);
        } else if (error.code === 'PGRST301') {
          // RLS policy violation - user not authenticated properly
          console.error('🔐 RLS policy violation - user not authenticated properly:', error);
          console.error('🔐 This suggests the user session may be invalid');
          return null;
        } else {
          console.error('❌ Unknown error fetching wallet:', error);
          return null;
        }
      }

      // If wallet exists, return it
      if (data) {
        console.log('✅ Found existing wallet for user:', userId, 'with', data.betame_credits, 'credits');
        
        // Handle backward compatibility for column name changes
        if (data.premium_stones !== undefined && data.betame_stones === undefined) {
          data.betame_stones = data.premium_stones;
        }
        
        // Ensure betame_stones has a value
        if (data.betame_stones === null || data.betame_stones === undefined) {
          data.betame_stones = data.premium_stones || 0;
        }
        
        return data;
      }

      // If no wallet exists, create one with default values
      console.log('📝 No wallet data returned, creating new wallet for user:', userId);
      return await this.createWallet(userId);
    } catch (error) {
      console.error('❌ Exception in getWallet:', error);
      return null;
    }
  }

  /**
   * Create a new wallet for a user with default values
   */
  static async createWallet(userId: string): Promise<WalletData | null> {
    try {
      const defaultWallet: WalletData = {
        user_id: userId,
        betame_stones: 10, // Default starting stones
        betame_credits: 5, // Default starting credits
      };

      // Use admin client to bypass RLS when creating wallets for other users
      // This is necessary when user A triggers wallet creation for user B (e.g., service payments)
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .insert(defaultWallet)
        .select()
        .single();

      if (error) {
        console.error('Error creating wallet:', error);
        return null;
      }

      console.log('✅ Created new wallet for user:', userId, 'with', data.betame_stones, 'stones and', data.betame_credits, 'credits');
      return data;
    } catch (error) {
      console.error('Error in createWallet:', error);
      return null;
    }
  }

  /**
   * Ensure wallet exists for user, create if it doesn't
   * This is useful to call during user authentication/signup
   */
  static async ensureWalletExists(userId: string): Promise<WalletData | null> {
    try {
      // Try to get existing wallet first
      const existingWallet = await this.getWallet(userId);
      if (existingWallet) {
        return existingWallet;
      }

      // If no wallet exists, getWallet will create one automatically
      // But let's be explicit about it for logging
      console.log('🔄 Ensuring wallet exists for user:', userId);
      return await this.getWallet(userId);
    } catch (error) {
      console.error('Error in ensureWalletExists:', error);
      return null;
    }
  }

  /**
   * Admin method to get wallet bypassing RLS (for debugging/admin operations)
   */
  static async getWalletAdmin(userId: string): Promise<WalletData | null> {
    try {
      console.log('🔍 Admin getting wallet for user:', userId);
      
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Admin error fetching wallet:', error);
        return null;
      }

      if (data) {
        console.log('✅ Admin found wallet for user:', userId, 'with', data.betame_credits, 'credits');
        
        // Handle backward compatibility
        if (data.premium_stones !== undefined && data.betame_stones === undefined) {
          data.betame_stones = data.premium_stones;
        }
        
        if (data.betame_stones === null || data.betame_stones === undefined) {
          data.betame_stones = data.premium_stones || 0;
        }
        
        return data;
      }

      console.log('📝 Admin: No wallet found for user:', userId);
      return null;
    } catch (error) {
      console.error('❌ Admin exception in getWallet:', error);
      return null;
    }
  }

  /**
   * Admin method to update wallet bypassing RLS (for cross-user operations)
   */
  static async updateWalletAdmin(walletData: WalletData): Promise<WalletData | null> {
    try {
      console.log('🔧 Admin updating wallet for user:', walletData.user_id);
      
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .update({
          betame_stones: walletData.betame_stones,
          betame_credits: walletData.betame_credits,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', walletData.user_id)
        .select()
        .single();

      if (error) {
        console.error('❌ Admin error updating wallet:', error);
        return null;
      }

      console.log('✅ Admin updated wallet for user:', walletData.user_id);
      return data;
    } catch (error) {
      console.error('❌ Admin exception in updateWallet:', error);
      return null;
    }
  }

  /**
   * Admin method to record transaction bypassing RLS (for cross-user operations)
   */
  static async recordTransactionAdmin(transaction: Transaction): Promise<Transaction | null> {
    try {
      console.log('📝 Admin recording transaction:', transaction);
      
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .insert([{
          user_id: transaction.user_id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Admin error recording transaction:', error);
        throw error;
      }

      console.log('✅ Admin transaction recorded successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Admin exception recording transaction:', error);
      throw error;
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
   * Process service payment
   */
  static async processServicePayment(
    userId: string,
    amount: number,
    serviceTitle: string,
    serviceId?: string
  ): Promise<{ success: boolean; wallet?: WalletData; error?: string }> {
    try {
      // Get user's wallet (this will create one if it doesn't exist)
      const wallet = await this.getWallet(userId);
      if (!wallet) {
        return { success: false, error: 'Failed to get or create wallet' };
      }

      // Check if user has enough credits
      if (wallet.betame_credits < amount) {
        return { 
          success: false, 
          error: `Insufficient credits. You have ${wallet.betame_credits} credits but need ${amount}` 
        };
      }

      // Update wallet - deduct credits
      const updatedWallet = await this.updateWallet({
        ...wallet,
        betame_credits: wallet.betame_credits - amount,
      });

      if (!updatedWallet) {
        return { success: false, error: 'Failed to update wallet' };
      }

      // Record payment transaction
      await this.recordTransaction({
        user_id: userId,
        type: 'service_payment',
        amount: -amount, // Negative amount for payment
        description: `Payment for service: ${serviceTitle}`,
      });

      console.log(`✅ Service payment processed: ${amount} credits deducted for ${serviceTitle}`);
      return { success: true, wallet: updatedWallet };
    } catch (error) {
      console.error('Error in processServicePayment:', error);
      return { success: false, error: 'Payment processing failed' };
    }
  }

  /**
   * Record service payment received (for service providers)
   */
  static async recordServicePaymentReceived(
    providerId: string,
    amount: number,
    serviceTitle: string,
    serviceId?: string
  ): Promise<{ success: boolean; wallet?: WalletData; error?: string }> {
    try {
      console.log('💰 Processing service payment received for provider:', providerId, 'amount:', amount);

      // Get provider's wallet using admin access (cross-user operation)
      let wallet = await this.getWalletAdmin(providerId);
      if (!wallet) {
        console.log('📝 Creating wallet for provider:', providerId);
        wallet = await this.createWallet(providerId);
        if (!wallet) {
          return { success: false, error: 'Failed to create provider wallet' };
        }
      }

      // Update wallet - add credits using admin access (cross-user operation)
      const updatedWallet = await this.updateWalletAdmin({
        ...wallet,
        betame_credits: wallet.betame_credits + amount,
      });

      if (!updatedWallet) {
        return { success: false, error: 'Failed to update provider wallet' };
      }

      // Record payment received transaction using admin access (cross-user operation)
      await this.recordTransactionAdmin({
        user_id: providerId,
        type: 'service_payment_received',
        amount: amount, // Positive amount for received payment
        description: `Payment received for service: ${serviceTitle}${serviceId ? ` (ID: ${serviceId})` : ''}`,
      });

      console.log(`✅ Service payment received: ${amount} credits added for ${serviceTitle}`);
      return { success: true, wallet: updatedWallet };
    } catch (error) {
      console.error('Error in recordServicePaymentReceived:', error);
      return { success: false, error: 'Payment recording failed' };
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

      // Specific stone amounts for first 7 days
      if (newStreak <= 7) {
        if (newStreak <= 3) {
          stonesToAward = 1; // Days 1-3: 1 stone each
        } else if (newStreak <= 6) {
          stonesToAward = 2; // Days 4-6: 2 stones each
        } else {
          stonesToAward = Math.floor(Math.random() * 6) + 5; // Day 7: Random 5-10 stones
        }
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
          description: `Daily check-in reward (Day ${newStreak}) - ${stonesToAward} stones`,
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