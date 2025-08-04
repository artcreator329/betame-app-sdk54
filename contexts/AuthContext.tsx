import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { authService } from '@/lib/auth-service';
import { supabaseChatService } from '@/lib/supabase-chat-service';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/lib/notification-service';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ user: User | null; error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: any) => Promise<{ data: any; error: any }>;
  refreshProfile: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const chatSubscriptionRef = useRef<(() => void) | null>(null);

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string) => {
    try {
      const profile = await authService.getUserProfile(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
                  chatId: payload.new.chat_id
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
        const session = await authService.getCurrentSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchUserProfile(session.user.id);
            // Set up global chat subscription for notifications
            setupChatSubscription(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

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
            await fetchUserProfile(session.user.id);
            // Set up global chat subscription for notifications
            setupChatSubscription(session.user.id);
          } else {
            console.log('🔄 AuthContext: User signed out, cleaning up state');
            setUserProfile(null);
            // Clean up chat subscription when user signs out
            cleanupChatSubscription();
          }
          
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      // Clean up chat subscription on unmount
      cleanupChatSubscription();
    };
  }, []);

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
      const result = await authService.signOut();
      console.log('🔄 AuthContext: SignOut result from service:', result);
      
      // Clean up chat subscription immediately
      cleanupChatSubscription();
      console.log('🔄 AuthContext: Chat subscription cleaned up');
      
      return result;
    } catch (error) {
      console.error('❌ AuthContext: SignOut error:', error);
      throw error;
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
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;