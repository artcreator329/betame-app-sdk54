import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { authService } from '@/lib/auth-service';
import { supabaseChatService } from '@/lib/supabase-chat-service';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/lib/notification-service';
import { adminService } from '@/lib/admin-service';
import { WalletService } from '@/lib/wallet-service';


interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ user: User | null; error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: any) => Promise<{ data: any; error: any }>;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const chatSubscriptionRef = useRef<(() => void) | null>(null);
  const sessionRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string) => {
    try {
      const profile = await authService.getUserProfile(userId);
      setUserProfile(profile);
      
      // Check admin status
      const adminStatus = await adminService.isAdmin(userId);
      console.log('🔍 AuthContext: Admin status for user', userId, ':', adminStatus);
      setIsAdmin(adminStatus);
      
      // Ensure wallet exists for the user
      console.log('🔄 AuthContext: Ensuring wallet exists for user:', userId);
      await WalletService.ensureWalletExists(userId);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Refresh session to prevent timeouts
  const refreshSession = async () => {
    try {
      console.log('🔄 AuthContext: Refreshing session...');
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ AuthContext: Session refresh failed:', error);
        // If refresh fails, try to get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        } else {
          // Session is truly invalid, sign out
          console.log('🔄 AuthContext: Session invalid, signing out...');
          await signOut();
        }
      } else if (refreshedSession) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
        console.log('✅ AuthContext: Session refreshed successfully');
      }
    } catch (error) {
      console.error('❌ AuthContext: Session refresh exception:', error);
    }
  };

  // Setup session refresh interval
  const setupSessionRefresh = () => {
    // Clear existing interval
    if (sessionRefreshIntervalRef.current) {
      clearInterval(sessionRefreshIntervalRef.current);
    }
    
    // Refresh session every 25 minutes to prevent timeouts
    sessionRefreshIntervalRef.current = setInterval(async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          console.log('🔄 AuthContext: Auto-refreshing session...');
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            console.error('❌ AuthContext: Auto session refresh error:', error);
          } else {
            console.log('✅ AuthContext: Auto session refresh successful');
          }
        }
      } catch (error) {
        console.error('❌ AuthContext: Auto session refresh exception:', error);
      }
    }, 25 * 60 * 1000) as unknown as NodeJS.Timeout; // 25 minutes
  };

  // Clean up session refresh interval
  const cleanupSessionRefresh = () => {
    if (sessionRefreshIntervalRef.current) {
      clearInterval(sessionRefreshIntervalRef.current);
      sessionRefreshIntervalRef.current = null;
    }
  };

  // Setup DIRECT chat subscription for notifications
  const setupChatSubscription = (userId: string) => {
    console.log('🚨🚨🚨 AuthContext: Setting up DIRECT chat subscription for user:', userId);
    console.log('🚨 THIS SHOULD CREATE NOTIFICATIONS FOR INCOMING MESSAGES!');
    
    // Clean up existing subscription
    if (chatSubscriptionRef.current) {
      console.log('🔔 AuthContext: Cleaning up existing subscription');
      chatSubscriptionRef.current();
      chatSubscriptionRef.current = null;
    }
    
    // Set up DIRECT subscription to chat_messages table
    const channel = supabase
      .channel(`direct_notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          console.log('🚨🚨🚨 AuthContext: NEW MESSAGE DETECTED!!! 🚨🚨🚨');
          console.log('Message details:', payload.new);
          
          // Skip if this is the user's own message
          if (payload.new.sender_id === userId) {
            console.log('🔔 AuthContext: Skipping own message');
            return;
          }
          
          try {
            // Check if this message belongs to a chat involving this user
            const { data: chat } = await supabase
              .from('chats')
              .select('id')
              .eq('id', payload.new.chat_id)
              .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
              .single();

            if (chat) {
              console.log('🔔 AuthContext: Message is for this user, creating notification...');
              
              // Get participant info
              const participant = await supabaseChatService.getParticipantById(payload.new.sender_id);
              
              if (participant) {
                console.log('🔔 AuthContext: Creating notification from:', participant.name);
                await notificationService.addChatNotification({
                  participantId: payload.new.sender_id,
                  participantName: participant.name,
                  participantImage: participant.image,
                  message: payload.new.message,
                  chatId: payload.new.chat_id,
                  senderId: payload.new.sender_id
                });
                console.log('🎉🎉🎉 AuthContext: NOTIFICATION CREATED SUCCESSFULLY!!! 🎉🎉🎉');
              }
            }
          } catch (error) {
            console.error('❌ AuthContext: Error creating notification:', error);
          }
        }
      )
      .subscribe();

    // Store cleanup function
    chatSubscriptionRef.current = () => {
      console.log('🔔 AuthContext: Unsubscribing from direct chat notifications');
      channel.unsubscribe();
    };
    
    console.log('🔔 AuthContext: DIRECT subscription set up successfully');
  };

  // Clean up chat subscription
  const cleanupChatSubscription = () => {
    if (chatSubscriptionRef.current) {
      chatSubscriptionRef.current();
      chatSubscriptionRef.current = null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        console.log('🔄 AuthContext: Getting initial session...');
        
        const session = await authService.getCurrentSession();
        console.log('🔄 AuthContext: Session result:', !!session);
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('✅ AuthContext: User authenticated, setting up profile and chat');
            // Fetch profile in background, don't block loading
            fetchUserProfile(session.user.id);
            // Set up global chat subscription for notifications
            setupChatSubscription(session.user.id);
            // Setup session refresh
            setupSessionRefresh();
          } else {
            console.log('ℹ️ AuthContext: No initial session found');
          }
          
          // Set loading to false immediately after setting session
          console.log('🔄 AuthContext: Setting loading to false');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ AuthContext: Error getting initial session:', error);
        if (mounted) {
          console.log('🔄 AuthContext: Setting loading to false after error');
          setLoading(false);
        }
      }
    }

    console.log('🔄 AuthContext: Starting getInitialSession...');
    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthContext: Auth state change event:', event, 'Session:', !!session);
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('🔄 AuthContext: User authenticated, setting up profile and chat');
            // Fetch profile in background, don't block
            fetchUserProfile(session.user.id);
            // Set up global chat subscription for notifications
            setupChatSubscription(session.user.id);
            // Setup session refresh
            setupSessionRefresh();
          } else {
            console.log('🔄 AuthContext: User signed out, cleaning up state');
            setUserProfile(null);
            setIsAdmin(false);
            // Clean up chat subscription when user signs out
            cleanupChatSubscription();
            // Clean up session refresh
            cleanupSessionRefresh();
          }
        }
      }
    );

    return () => {
      console.log('🔄 AuthContext: Cleaning up auth state effect');
      mounted = false;
      subscription?.unsubscribe();
      // Clean up chat subscription on unmount
      cleanupChatSubscription();
      // Clean up session refresh on unmount
      cleanupSessionRefresh();
    };
  }, []); // Empty dependency array to ensure this only runs once

  // Sign in function
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.signIn({ email, password });
      return result;
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    try {
      const result = await authService.signUp({ email, password, full_name: fullName });
      
      if (result.error) {
        console.error('AuthContext signup error:', result.error);
      } else if (result.user) {
        console.log('User signed up successfully:', result.user.id);
      }
      
      return result;
    } catch (error) {
      console.error('AuthContext signup exception:', error);
      return {
        user: null,
        error: {
          message: 'Database error saving new user. Please try again or contact support if the issue persists.'
        }
      };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await authService.signInWithGoogle();
      return result;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Apple
  const signInWithApple = async () => {
    setLoading(true);
    try {
      const result = await authService.signInWithApple();
      return result;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    console.log('🔄 AuthContext: Starting signOut process...');
    setLoading(true);
    try {
      // Clean up session refresh first
      cleanupSessionRefresh();
      
      const result = await authService.signOut();
      console.log('🔄 AuthContext: SignOut result from service:', result);
      
      // Clean up chat subscription immediately
      cleanupChatSubscription();
      console.log('🔄 AuthContext: Chat subscription cleaned up');
      
      // Clear local state immediately regardless of result
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setIsAdmin(false);
      console.log('🔄 AuthContext: Local state cleared');
      
      return result;
    } catch (error) {
      console.error('❌ AuthContext: SignOut error:', error);
      // Still clear local state even on error
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setIsAdmin(false);
      // Return error instead of throwing
      return { error: error as any };
    } finally {
      setLoading(false);
      console.log('🔄 AuthContext: SignOut process completed');
    }
  };

  // Update profile function
  const updateProfile = async (updates: any) => {
    const result = await authService.updateUserProfile(updates);
    if (!result.error && result.data) {
      setUserProfile(result.data);
    }
    return result;
  };

  // Refresh profile function
  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    userProfile,
    isAdmin,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signOut,
    updateProfile,
    refreshProfile,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;