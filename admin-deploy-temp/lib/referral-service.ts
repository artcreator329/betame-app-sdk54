import { supabase } from './supabase';

export interface ReferralCode {
  id: string;
  user_id: string;
  referral_code: string;
  total_referrals: number;
  total_betacoins_earned: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  status: 'pending' | 'signup_completed' | 'first_job_completed' | 'completed';
  signup_betacoins_awarded: number;
  first_job_betacoins_awarded: number;
  total_betacoins_earned: number;
  first_job_completed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  totalBetaCoinsEarned: number;
  pendingReferrals: number;
  completedReferrals: number;
  referralCode: string;
}

class ReferralService {
  // Get user's referral code
  async getUserReferralCode(userId: string): Promise<ReferralCode | null> {
    try {
      console.log('Fetching referral code for user:', userId);
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching referral code:', error);
        return null;
      }

      console.log('Found referral code:', data);
      return data;
    } catch (error) {
      console.error('Error in getUserReferralCode:', error);
      return null;
    }
  }

  // Create referral code for user (if not exists)
  async createReferralCode(userId: string): Promise<ReferralCode | null> {
    try {
      console.log('Creating referral code for user:', userId);
      
      // First check if user already has a code
      const existingCode = await this.getUserReferralCode(userId);
      if (existingCode) {
        console.log('User already has referral code:', existingCode);
        return existingCode;
      }

      // Generate unique code
      console.log('Generating new referral code...');
      const { data, error } = await supabase.rpc('generate_referral_code', {
        user_id_param: userId
      });

      if (error) {
        console.error('Error generating referral code:', error);
        return null;
      }

      console.log('Generated referral code:', data);

      // Insert the code
      const { data: insertData, error: insertError } = await supabase
        .from('referral_codes')
        .insert({
          user_id: userId,
          referral_code: data
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting referral code:', insertError);
        return null;
      }

      console.log('Successfully created referral code:', insertData);
      return insertData;
    } catch (error) {
      console.error('Error in createReferralCode:', error);
      return null;
    }
  }

  // Handle referral signup
  async handleReferralSignup(referredUserId: string, referralCode: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('handle_referral_signup', {
        referred_user_id: referredUserId,
        referral_code_param: referralCode
      });

      if (error) {
        console.error('Error handling referral signup:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in handleReferralSignup:', error);
      return false;
    }
  }

  // Handle first job completion
  async handleFirstJobCompletion(referredUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('handle_referral_first_job', {
        referred_user_id: referredUserId
      });

      if (error) {
        console.error('Error handling first job completion:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in handleFirstJobCompletion:', error);
      return false;
    }
  }

  // Get referral statistics for user
  async getReferralStats(userId: string): Promise<ReferralStats | null> {
    try {
      // Get or create referral code
      let referralCode = await this.getUserReferralCode(userId);
      if (!referralCode) {
        // Create referral code if it doesn't exist
        referralCode = await this.createReferralCode(userId);
        if (!referralCode) {
          console.error('Failed to create referral code for user:', userId);
          return null;
        }
      }

      // Get referral statistics
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId);

      if (error) {
        console.error('Error fetching referral stats:', error);
        return null;
      }

      const totalReferrals = referrals.length;
      const totalBetaCoinsEarned = referrals.reduce((sum, ref) => sum + ref.total_betacoins_earned, 0);
      const pendingReferrals = referrals.filter(ref => 
        ref.status === 'pending' || ref.status === 'signup_completed'
      ).length;
      const completedReferrals = referrals.filter(ref => 
        ref.status === 'first_job_completed' || ref.status === 'completed'
      ).length;

      return {
        totalReferrals,
        totalBetaCoinsEarned,
        pendingReferrals,
        completedReferrals,
        referralCode: referralCode.referral_code
      };
    } catch (error) {
      console.error('Error in getReferralStats:', error);
      return null;
    }
  }

  // Get user's referrals with details
  async getUserReferrals(userId: string): Promise<Referral[]> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred_user:profiles!referrals_referred_user_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user referrals:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserReferrals:', error);
      return [];
    }
  }

  // Validate referral code
  async validateReferralCode(referralCode: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('referral_code', referralCode)
        .eq('is_active', true)
        .single();

      if (error) {
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in validateReferralCode:', error);
      return false;
    }
  }

  // Generate referral link
  generateReferralLink(referralCode: string): string {
    // Use a smart link that can handle both app installation and deep linking
    // This will redirect to app store if app not installed, or open app if installed
    const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://betame.com.my';
    return `${baseUrl}/install?ref=${referralCode}`;
  }

  // Check if user was referred
  async checkUserReferralStatus(userId: string): Promise<Referral | null> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', userId)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in checkUserReferralStatus:', error);
      return null;
    }
  }

  // Track job completion for referral system
  async trackJobCompletion(sellerId: string): Promise<void> {
    try {
      // Check if this seller was referred and hasn't completed first job yet
      const referralStatus = await this.checkUserReferralStatus(sellerId);
      
      if (referralStatus && referralStatus.status === 'signup_completed') {
        // This is their first job completion
        await this.handleFirstJobCompletion(sellerId);
      }
    } catch (error) {
      console.error('Error in trackJobCompletion:', error);
    }
  }
}

export const referralService = new ReferralService();