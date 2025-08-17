import { supabase } from './supabase';
import { Session, User, AuthError } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  cover_photo_url?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  full_name?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

class AuthService {
  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ AuthService: Error getting session:', error);
        return null;
      }
      return session;
    } catch (error) {
      console.error('❌ AuthService: Exception getting session:', error);
      return null;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('❌ AuthService: Error getting user:', error);
        return null;
      }
      return user;
    } catch (error) {
      console.error('❌ AuthService: Exception getting user:', error);
      return null;
    }
  }

  // Refresh session
  async refreshSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      return { session, error };
    } catch (error) {
      console.error('❌ AuthService: Exception refreshing session:', error);
      return { session: null, error: error as AuthError };
    }
  }

  // Sign up with email and password
  async signUp({ email, password, full_name }: SignUpData): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: full_name || email.split('@')[0],
          },
          emailRedirectTo: 'betame://auth/verify-email',
        },
      });

      if (error) {
        console.error('Supabase auth signup error:', error);
        
        // Provide user-friendly error messages
        let userFriendlyMessage = error.message;
        
        if (error.message.includes('User already registered')) {
          userFriendlyMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (error.message.includes('Password should be at least')) {
          userFriendlyMessage = 'Password must be at least 6 characters long.';
        } else if (error.message.includes('Invalid email')) {
          userFriendlyMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('trigger') || error.message.includes('function')) {
          userFriendlyMessage = 'Database error saving new user. Please try again or contact support if the issue persists.';
        }
        
        return { 
          user: null, 
          error: { 
            ...error, 
            message: userFriendlyMessage 
          } as AuthError 
        };
      }

      return { user: data.user, error };
    } catch (err: any) {
      console.error('Unexpected signup error:', err);
      return { 
        user: null, 
        error: { 
          message: 'Database error saving new user. Please try again or contact support if the issue persists.',
          status: 500
        } as AuthError 
      };
    }
  }

  // Sign in with email and password
  async signIn({ email, password }: SignInData): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ AuthService: Sign in error:', error);
        
        // Provide more user-friendly error messages
        let userFriendlyMessage = error.message;
        
        if (error.message.includes('Invalid login credentials')) {
          userFriendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          userFriendlyMessage = 'Please check your email and click the verification link to activate your account.';
        } else if (error.message.includes('Too many requests')) {
          userFriendlyMessage = 'Too many sign-in attempts. Please wait a few minutes before trying again.';
        } else if (error.message.includes('User not found')) {
          userFriendlyMessage = 'No account found with this email address. Please check your email or sign up.';
        }
        
        return { 
          user: null, 
          error: { 
            ...error, 
            message: userFriendlyMessage 
          } as AuthError 
        };
      } else if (data.user) {
        console.log('✅ AuthService: User signed in successfully:', data.user.id);
      }

      return { user: data.user, error };
    } catch (error) {
      console.error('❌ AuthService: Sign in exception:', error);
      return { 
        user: null, 
        error: { 
          message: 'An unexpected error occurred during sign in. Please try again.',
          status: 500
        } as AuthError 
      };
    }
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'exp://192.168.1.1:8081', // Update with your app's redirect URL
        },
      });

      if (error) {
        console.error('❌ AuthService: Google sign in error:', error);
      }

      return { error };
    } catch (error) {
      console.error('❌ AuthService: Google sign in exception:', error);
      return { 
        error: { 
          message: 'An unexpected error occurred during Google sign in. Please try again.',
          status: 500
        } as AuthError 
      };
    }
  }

  // Sign in with Apple
  async signInWithApple(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'exp://192.168.1.1:8081', // Update with your app's redirect URL
        },
      });

      if (error) {
        console.error('❌ AuthService: Apple sign in error:', error);
      }

      return { error };
    } catch (error) {
      console.error('❌ AuthService: Apple sign in exception:', error);
      return { 
        error: { 
          message: 'An unexpected error occurred during Apple sign in. Please try again.',
          status: 500
        } as AuthError 
      };
    }
  }

  // Sign out
  async signOut(): Promise<{ error: AuthError | null }> {
    console.log('🔄 AuthService: Starting Supabase signOut...');
    try {
      const { error } = await supabase.auth.signOut();
      console.log('🔄 AuthService: Supabase signOut result:', { error });
      
      if (error) {
        console.error('❌ AuthService: Sign out error:', error);
      } else {
        console.log('✅ AuthService: User signed out successfully');
      }
      
      return { error };
    } catch (error) {
      console.error('❌ AuthService: Supabase signOut error:', error);
      return { error: error as AuthError };
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'betame://auth/reset-password',
      });

      if (error) {
        console.error('❌ AuthService: Reset password error:', error);
      }

      return { error };
    } catch (error) {
      console.error('❌ AuthService: Reset password exception:', error);
      return { 
        error: { 
          message: 'An unexpected error occurred while resetting password. Please try again.',
          status: 500
        } as AuthError 
      };
    }
  }

  // Update password
  async updatePassword(password: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error('❌ AuthService: Update password error:', error);
      }

      return { error };
    } catch (error) {
      console.error('❌ AuthService: Update password exception:', error);
      return { 
        error: { 
          message: 'An unexpected error occurred while updating password. Please try again.',
          status: 500
        } as AuthError 
      };
    }
  }

  // Update user profile
  async updateProfile(updates: { full_name?: string; avatar_url?: string }): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) {
        console.error('❌ AuthService: Update profile error:', error);
      }

      return { error };
    } catch (error) {
      console.error('❌ AuthService: Update profile exception:', error);
      return { 
        error: { 
          message: 'An unexpected error occurred while updating profile. Please try again.',
          status: 500
        } as AuthError 
      };
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      return !!session;
    } catch (error) {
      console.error('❌ AuthService: Error checking authentication:', error);
      return false;
    }
  }

  // Get user profile from database
  async getUserProfile(userId?: string): Promise<any> {
    try {
      const user = userId || (await this.getCurrentUser())?.id;
      if (!user) return null;

      // Fetch from profiles table (main profile data)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        return null;
      }

      // Fetch from user_profiles table (service provider-specific data)
      const { data: userProfileData, error: userProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user)
        .maybeSingle();

      // If user_profiles query fails with anything other than "no rows", log it
      if (userProfileError && userProfileError.code !== 'PGRST116') {
        console.error('Error fetching user profile data:', userProfileError);
      }

      // Merge the data, but only take service provider-specific fields from user_profiles
      // to avoid data inconsistency
      const mergedProfile = {
        ...profileData,
        // Only take service provider-specific fields from user_profiles
        is_service_provider: userProfileData?.is_service_provider || userProfileData?.is_seller || false,
        service_provider_badge: userProfileData?.service_provider_badge || userProfileData?.seller_badge,
        service_provider_badge_subtitle: userProfileData?.service_provider_badge_subtitle || userProfileData?.seller_badge_subtitle,
        service_provider_description: userProfileData?.service_provider_description || userProfileData?.seller_description,
        rating: userProfileData?.rating || profileData?.rating || 0,
        review_count: userProfileData?.review_count || profileData?.review_count || 0,
        // Ensure we have the user_id for consistency
        user_id: user,
      };



      return mergedProfile;
    } catch (error) {
      console.error('❌ AuthService: Exception fetching user profile:', error);
      return null;
    }
  }

  // Update user profile in database
  async updateUserProfile(updates: {
    full_name?: string;
    avatar_url?: string;
    cover_photo_url?: string;
    bio?: string;
    phone?: string;
    location?: string;
    date_of_birth?: string;
    gender?: string;
    is_verified?: boolean;
  }): Promise<{ data: any; error: any }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ AuthService: Update user profile error:', error);
      }

      return { data, error };
    } catch (error) {
      console.error('❌ AuthService: Update user profile exception:', error);
      return { 
        data: null, 
        error: { 
          message: 'An unexpected error occurred while updating profile. Please try again.',
          status: 500
        } 
      };
    }
  }

  // Become a service provider
  async becomeServiceProvider(): Promise<{ data: any; error: any }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      // Try to update existing user_profiles record first
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ is_service_provider: true })
        .eq('user_id', user.id);

      if (updateError && updateError.code === 'PGRST116') {
        // No existing record, create a new one
        const { data, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            is_service_provider: true,
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ AuthService: Error creating service provider profile:', insertError);
          return { data: null, error: insertError };
        }

        return { data, error: null };
      } else if (updateError) {
        console.error('❌ AuthService: Error updating service provider status:', updateError);
        return { data: null, error: updateError };
      }

      // Update was successful, fetch the updated profile
      const updatedProfile = await this.getUserProfile(user.id);
      return { data: updatedProfile, error: null };
    } catch (error) {
      console.error('❌ AuthService: Exception becoming service provider:', error);
      return { 
        data: null, 
        error: { 
          message: 'An unexpected error occurred while becoming a service provider. Please try again.',
          status: 500
        } 
      };
    }
  }
}

export const authService = new AuthService();
export default authService;