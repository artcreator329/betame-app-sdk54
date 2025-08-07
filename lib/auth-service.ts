import { supabase } from './supabase';
import { Session, User, AuthError } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
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
        // Check if it's a database trigger error
        if (error.message.includes('trigger') || error.message.includes('function')) {
          return { 
            user: null, 
            error: { 
              ...error, 
              message: 'Database error saving new user. Please try again or contact support if the issue persists.' 
            } as AuthError 
          };
        }
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

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ AuthService: Exception fetching user profile:', error);
      return null;
    }
  }

  // Update user profile in database
  async updateUserProfile(updates: {
    full_name?: string;
    avatar_url?: string;
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
}

export const authService = new AuthService();
export default authService;