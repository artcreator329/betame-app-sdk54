import { supabase, supabaseAdmin } from './supabase';

export interface WalletData {
  id?: string;
  user_id: string;
  betame_diamonds: number;
  betame_betacoins: number;
  cash: number;
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
  type: 'conversion' | 'feature_purchase' | 'betacoin_purchase' | 'daily_checkin' | 'referral_bonus' | 'service_payment' | 'service_payment_received';
  amount: number;
  description: string;
  created_at?: string;
}

export interface CheckInData {
  id?: string;
  user_id: string;
  last_checkin_date: string;
  streak_count: number;
  total_diamonds_earned: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReferralData {
  id?: string;
  referrer_id: string;
  referred_user_id: string;
  status: 'pending' | 'completed';
  diamonds_awarded: number;
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
        console.log('✅ Found existing wallet for user:', userId, 'with', data.betame_betacoins, 'BetaCoins');
        
        // Handle backward compatibility for column name changes
                if (data.premium_stones !== undefined && data.betame_diamonds === undefined) {
          data.betame_diamonds = data.premium_stones;
        }

        // Ensure betame_diamonds has a value
        if (data.betame_diamonds === null || data.betame_diamonds === undefined) {
          data.betame_diamonds = data.premium_stones || 0;
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
        betame_diamonds: 0, // New users start with zero diamonds
        betame_betacoins: 0, // New users start with zero BetaCoins
        cash: 0, // New users start with zero cash
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

      console.log('✅ Created new wallet for user:', userId, 'with', data.betame_diamonds, 'diamonds and', data.betame_betacoins, 'BetaCoins');
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
        console.log('✅ Admin found wallet for user:', userId, 'with', data.betame_betacoins, 'BetaCoins');
        
        // Handle backward compatibility
                if (data.premium_stones !== undefined && data.betame_diamonds === undefined) {
          data.betame_diamonds = data.premium_stones;
        }

        if (data.betame_diamonds === null || data.betame_diamonds === undefined) {
          data.betame_diamonds = data.premium_stones || 0;
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
          betame_diamonds: walletData.betame_diamonds,
          betame_betacoins: walletData.betame_betacoins,
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
   * Convert premium diamonds to BetaCoins
   */
  static async convertDiamondsToBetaCoins(
    userId: string,
    diamondsAmount: number
  ): Promise<{ success: boolean; wallet?: WalletData; error?: string }> {
    try {
      // Get current wallet
      const wallet = await this.getWallet(userId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      // Check if user has enough diamonds
      if (wallet.betame_diamonds < diamondsAmount) {
        return { success: false, error: 'Insufficient BetaMe diamonds' };
      }

      // Calculate BetaCoins (10 diamonds = 1 BetaCoin)
      const betaCoinsToAdd = Math.floor(diamondsAmount / 10);
      
      // Update wallet
      const updatedWallet = await this.updateWallet({
        ...wallet,
        betame_diamonds: wallet.betame_diamonds - diamondsAmount,
        betame_betacoins: wallet.betame_betacoins + betaCoinsToAdd,
      });

      if (!updatedWallet) {
        return { success: false, error: 'Failed to update wallet' };
      }

      // Record transaction
      await this.recordTransaction({
        user_id: userId,
        type: 'conversion',
        amount: diamondsAmount,
        description: `Converted ${diamondsAmount} diamonds to ${betaCoinsToAdd} BetaCoins`,
      });

      return { success: true, wallet: updatedWallet };
    } catch (error) {
      console.error('Error in convertDiamondsToBetaCoins:', error);
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

      // Check if user has enough BetaCoins
      if (wallet.betame_betacoins < boostCost) {
        return { success: false, error: 'Insufficient BetaCoins' };
      }

      // Update wallet
      const updatedWallet = await this.updateWallet({
        ...wallet,
        betame_betacoins: wallet.betame_betacoins - boostCost,
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

      // Check if user has enough BetaCoins
      if (wallet.betame_betacoins < amount) {
        return { 
          success: false, 
          error: `Insufficient BetaCoins. You have ${wallet.betame_betacoins} BetaCoins but need ${amount}` 
        };
      }

      // Update wallet - deduct BetaCoins
      const updatedWallet = await this.updateWallet({
        ...wallet,
        betame_betacoins: wallet.betame_betacoins - amount,
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

      console.log(`✅ Service payment processed: ${amount} BetaCoins deducted for ${serviceTitle}`);
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

      // Update wallet - add BetaCoins using admin access (cross-user operation)
      const updatedWallet = await this.updateWalletAdmin({
        ...wallet,
        betame_betacoins: wallet.betame_betacoins + amount,
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

      console.log(`✅ Service payment received: ${amount} BetaCoins added for ${serviceTitle}`);
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
   * Daily check-in to earn BetaMe diamonds
   */
  static async dailyCheckIn(userId: string): Promise<{ success: boolean; diamonds?: number; streak?: number; error?: string }> {
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

      // Calculate streak and diamonds
      let newStreak = 1;
      let diamondsToAward = 1;
      
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

      // Specific diamond amounts for first 7 days
      if (newStreak <= 7) {
        if (newStreak <= 3) {
          diamondsToAward = 1; // Days 1-3: 1 diamond each
        } else if (newStreak <= 6) {
          diamondsToAward = 2; // Days 4-6: 2 diamonds each
        } else {
          diamondsToAward = Math.floor(Math.random() * 6) + 5; // Day 7: Random 5-10 diamonds
        }
      } else if (newStreak % 30 === 0) {
        diamondsToAward = 10; // Monthly bonus
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
            total_diamonds_earned: checkInData.total_diamonds_earned + diamondsToAward,
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
            total_diamonds_earned: diamondsToAward,
            updated_at: new Date().toISOString(),
          });
        upsertError = error;
      }

      if (upsertError) {
        console.error('Error updating check-in:', upsertError);
        return { success: false, error: 'Failed to update check-in' };
      }

      // Update wallet diamonds
      const wallet = await this.getWallet(userId);
      if (wallet) {
        await this.updateWallet({
          ...wallet,
          betame_diamonds: wallet.betame_diamonds + diamondsToAward,
        });
      }

      // Record transaction
      try {
        await this.recordTransaction({
          user_id: userId,
          type: 'daily_checkin',
          amount: diamondsToAward,
          description: `Daily check-in reward (Day ${newStreak}) - ${diamondsToAward} diamonds`,
        });
        console.log('Daily check-in transaction recorded successfully');
      } catch (transactionError) {
        console.error('Failed to record daily check-in transaction:', transactionError);
        // Don't fail the entire check-in if transaction recording fails
        // The user still gets their diamonds and check-in is recorded
      }

      return { success: true, diamonds: diamondsToAward, streak: newStreak };
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
   * Purchase a feature with BetaCoins
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
      if (!wallet || wallet.betame_betacoins < totalCost) {
        return { success: false, error: 'Insufficient BetaCoins' };
      }

      // Deduct BetaCoins
      await this.updateWallet({
        ...wallet,
        betame_betacoins: wallet.betame_betacoins - totalCost,
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
   * Apply a purchased feature to a specific service
   */
  static async applyFeatureToService(
    userId: string,
    featureId: string,
    serviceId: string
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

      // Decrease feature quantity
      const { error: updateError } = await supabase
        .from('purchased_features')
        .update({ quantity: feature.quantity - 1 })
        .eq('id', featureId);

      if (updateError) {
        console.error('Error using feature:', updateError);
        return { success: false, error: 'Failed to use feature' };
      }

      // Apply the feature to the service based on feature type
      const featureUpdates: any = {};
      const featureExpiry = new Date();
      
      switch (feature.feature_type) {
        case 'feature_2x':
          featureUpdates.is_trending = true;
          featureExpiry.setDate(featureExpiry.getDate() + 14); // 2 weeks
          break;
        case 'boost_instant':
          featureUpdates.is_nearby = true;
          featureExpiry.setDate(featureExpiry.getDate() + 7); // 1 week
          break;
        case 'showcase_max':
          featureUpdates.is_trending = true;
          featureUpdates.is_nearby = true;
          featureExpiry.setDate(featureExpiry.getDate() + 14); // 2 weeks
          break;
        case 'boost_feature_max':
          featureUpdates.is_trending = true;
          featureUpdates.is_nearby = true;
          featureExpiry.setDate(featureExpiry.getDate() + 14); // 2 weeks
          break;
      }

      // Update the service with the boost features
      const { error: serviceUpdateError } = await supabase
        .from('services')
        .update({
          ...featureUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId)
        .eq('user_id', userId); // Ensure user owns the service

      if (serviceUpdateError) {
        console.error('Error applying feature to service:', serviceUpdateError);
        return { success: false, error: 'Failed to apply feature to service' };
      }

      // Record the feature application
      const { error: recordError } = await supabase
        .from('service_feature_applications')
        .insert({
          user_id: userId,
          service_id: serviceId,
          feature_type: feature.feature_type,
          feature_name: feature.feature_name,
          applied_at: new Date().toISOString(),
          expires_at: featureExpiry.toISOString(),
        });

      if (recordError) {
        console.error('Error recording feature application:', recordError);
        // Don't fail the operation if recording fails
      }

      return { success: true };
    } catch (error) {
      console.error('Error in applyFeatureToService:', error);
      return { success: false, error: 'Failed to apply feature to service' };
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

      const bonusDiamonds = 100;

      // Add referral record
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referred_user_id: referredUserId,
          status: 'completed',
          diamonds_awarded: bonusDiamonds,
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
          betame_diamonds: wallet.betame_diamonds + bonusDiamonds,
        });
      }

      // Record transaction
      await this.recordTransaction({
        user_id: referrerId,
        type: 'referral_bonus',
        amount: bonusDiamonds,
        description: `Referral bonus for inviting user`,
      });

      return { success: true };
    } catch (error) {
      console.error('Error in processReferralBonus:', error);
      return { success: false, error: 'Referral processing failed' };
    }
  }

  /**
   * Add BetaCoins to user's wallet (for BetaCoin purchases)
   */
  static async addBetaCoins(
    userId: string,
    betaCoinsAmount: number,
    transactionDetails?: {
      transactionAmount?: number;
      processingFee?: number;
      baseAmount?: number;
    }
  ): Promise<{ success: boolean; wallet?: WalletData; error?: string }> {
    try {
      // Get current wallet
      const wallet = await this.getWallet(userId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      // Update wallet with new BetaCoins
      const updatedWallet = await this.updateWallet({
        ...wallet,
        betame_betacoins: wallet.betame_betacoins + betaCoinsAmount,
      });

      if (!updatedWallet) {
        return { success: false, error: 'Failed to update wallet' };
      }

      // Record transaction with fee details
      const transactionAmount = transactionDetails?.transactionAmount || betaCoinsAmount;
      const processingFee = transactionDetails?.processingFee || 0;
      const description = `Purchased ${betaCoinsAmount} BetaCoins (Total: RM${transactionAmount.toFixed(2)})`;

      // Record transaction
      await this.recordTransaction({
        user_id: userId,
        type: 'betacoin_purchase',
        amount: betaCoinsAmount,
        description,
      });

      return { success: true, wallet: updatedWallet };
    } catch (error) {
      console.error('Error in addBetaCoins:', error);
      return { success: false, error: 'Failed to add BetaCoins' };
    }
  }

  /**
   * Add cash to user's wallet (for service payments, refunds, etc.)
   */
  static async addCash(
    userId: string,
    cashAmount: number,
    description?: string
  ): Promise<{ success: boolean; wallet?: WalletData; error?: string }> {
    try {
      // Get current wallet
      const wallet = await this.getWallet(userId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      // Update wallet with new cash
      const updatedWallet = await this.updateWallet({
        ...wallet,
        cash: wallet.cash + cashAmount,
      });

      if (!updatedWallet) {
        return { success: false, error: 'Failed to update wallet' };
      }

      // Record transaction
      await this.recordTransaction({
        user_id: userId,
        type: 'service_payment_received',
        amount: cashAmount,
        description: description || `Added RM${cashAmount.toFixed(2)} to wallet`,
      });

      return { success: true, wallet: updatedWallet };
    } catch (error) {
      console.error('Error in addCash:', error);
      return { success: false, error: 'Failed to add cash' };
    }
  }

  /**
   * Withdraw cash from user's wallet
   */
  static async withdrawCash(
    userId: string,
    cashAmount: number,
    description?: string
  ): Promise<{ success: boolean; wallet?: WalletData; error?: string }> {
    try {
      // Get current wallet
      const wallet = await this.getWallet(userId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      // Check if user has enough cash
      if (wallet.cash < cashAmount) {
        return { success: false, error: 'Insufficient cash balance' };
      }

      // Update wallet with reduced cash
      const updatedWallet = await this.updateWallet({
        ...wallet,
        cash: wallet.cash - cashAmount,
      });

      if (!updatedWallet) {
        return { success: false, error: 'Failed to update wallet' };
      }

      // Record transaction
      await this.recordTransaction({
        user_id: userId,
        type: 'service_payment',
        amount: cashAmount,
        description: description || `Withdrew RM${cashAmount.toFixed(2)} from wallet`,
      });

      return { success: true, wallet: updatedWallet };
    } catch (error) {
      console.error('Error in withdrawCash:', error);
      return { success: false, error: 'Failed to withdraw cash' };
    }
  }

  /**
   * Get cash balance for user
   */
  static async getCashBalance(userId: string): Promise<number> {
    try {
      const wallet = await this.getWallet(userId);
      return wallet?.cash || 0;
    } catch (error) {
      console.error('Error in getCashBalance:', error);
      return 0;
    }
  }
}