import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SessionManager {
  private static instance: SessionManager;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Initialize session management
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 SessionManager: Already initialized, skipping...');
      return;
    }

    try {
      console.log('🔄 SessionManager: Initializing session management...');
      
      // Check if we have a stored session
      const storedSession = await this.getStoredSession();
      if (storedSession) {
        console.log('✅ SessionManager: Found stored session');
      }

      // Set up session refresh interval
      this.setupSessionRefresh();
      
      this.isInitialized = true;
      console.log('✅ SessionManager: Session management initialized');
    } catch (error) {
      console.error('❌ SessionManager: Error initializing session management:', error);
      // Don't throw error, just log it to prevent app from crashing
      this.isInitialized = true; // Mark as initialized even on error
    }
  }

  /**
   * Get stored session from AsyncStorage
   */
  private async getStoredSession(): Promise<any> {
    try {
      const sessionData = await AsyncStorage.getItem('supabase.auth.token');
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('❌ SessionManager: Error getting stored session:', error);
      return null;
    }
  }

  /**
   * Setup automatic session refresh
   */
  private setupSessionRefresh(): void {
    // Clear existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh session every 25 minutes (before the 30-minute timeout)
    this.refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('🔄 SessionManager: Refreshing session...');
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            console.error('❌ SessionManager: Session refresh error:', error);
          } else {
            console.log('✅ SessionManager: Session refreshed successfully');
          }
        }
      } catch (error) {
        console.error('❌ SessionManager: Session refresh exception:', error);
      }
    }, 25 * 60 * 1000) as unknown as NodeJS.Timeout; // 25 minutes
  }

  /**
   * Manually refresh session
   */
  async refreshSession(): Promise<{ success: boolean; error?: any }> {
    try {
      console.log('🔄 SessionManager: Manually refreshing session...');
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ SessionManager: Manual session refresh error:', error);
        return { success: false, error };
      }
      
      if (session) {
        console.log('✅ SessionManager: Manual session refresh successful');
        return { success: true };
      } else {
        console.log('ℹ️ SessionManager: No session to refresh');
        return { success: false, error: 'No active session' };
      }
    } catch (error) {
      console.error('❌ SessionManager: Manual session refresh exception:', error);
      return { success: false, error };
    }
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('❌ SessionManager: Error checking session validity:', error);
      return false;
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('❌ SessionManager: Error getting current session:', error);
      return null;
    }
  }

  /**
   * Clear session data
   */
  async clearSession(): Promise<void> {
    try {
      console.log('🔄 SessionManager: Clearing session data...');
      
      // Clear refresh interval
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }

      // Clear stored session
      await AsyncStorage.removeItem('supabase.auth.token');
      
      console.log('✅ SessionManager: Session data cleared');
    } catch (error) {
      console.error('❌ SessionManager: Error clearing session data:', error);
    }
  }

  /**
   * Cleanup session manager
   */
  cleanup(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.isInitialized = false;
  }
}

export const sessionManager = SessionManager.getInstance();
export default sessionManager; 