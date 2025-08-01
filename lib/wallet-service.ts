import { supabase } from './supabase';

export interface WalletData {
  id?: string;
  user_id: string;
  premium_stones: number;
  betame_credits: number;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id?: string;
  user_id: string;
  type: 'conversion' | 'boost_purchase' | 'stone_purchase' | 'credit_purchase';
  amount: number;
  description: string;
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
      if (wallet.premium_stones < stonesAmount) {
        return { success: false, error: 'Insufficient premium stones' };
      }

      // Calculate credits (10 stones = 1 credit)
      const creditsToAdd = Math.floor(stonesAmount / 10);
      
      // Update wallet
      const updatedWallet = await this.updateWallet({
        ...wallet,
        premium_stones: wallet.premium_stones - stonesAmount,
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
        type: 'boost_purchase',
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
      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) {
        console.error('Error recording transaction:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in recordTransaction:', error);
      return null;
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
}