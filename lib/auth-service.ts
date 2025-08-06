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
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { user: data.user, error };
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'betame://auth/callback',
      },
    });

    return { error };
  }

  // Sign in with Apple
  async signInWithApple(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: 'betame://auth/callback',
      },
    });

    return { error };
  }

  // Sign out
  async signOut(): Promise<{ error: AuthError | null }> {
    console.log('🔄 AuthService: Starting Supabase signOut...');
    try {
      const { error } = await supabase.auth.signOut();
      console.log('🔄 AuthService: Supabase signOut result:', { error });
      return { error };
    } catch (error) {
      console.error('❌ AuthService: Supabase signOut error:', error);
      return { error: error as AuthError };
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'betame://auth/reset-password',
    });

    return { error };
  }

  // Update password
  async updatePassword(password: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    return { error };
  }

  // Update user profile
  async updateProfile(updates: { full_name?: string; avatar_url?: string }): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.updateUser({
      data: updates,
    });

    return { error };
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return !!session;
  }

  // Get user profile from database
  async getUserProfile(userId?: string): Promise<any> {
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

    return { data, error };
  }
}

export const authService = new AuthService();
export default authService;