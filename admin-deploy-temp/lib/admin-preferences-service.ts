import AsyncStorage from '@react-native-async-storage/async-storage';

export type AdminSignInPreference = 'dashboard' | 'app' | 'ask';

interface AdminPreferences {
  defaultSignInDestination: AdminSignInPreference;
  rememberChoice: boolean;
  lastChoiceTimestamp?: number;
}

class AdminPreferencesService {
  private static readonly STORAGE_KEY = 'admin_preferences';
  private static readonly CHOICE_EXPIRY_DAYS = 30; // Remember choice for 30 days

  /**
   * Get admin preferences for a user
   */
  async getPreferences(userId: string): Promise<AdminPreferences> {
    try {
      const key = `${AdminPreferencesService.STORAGE_KEY}_${userId}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (stored) {
        const preferences: AdminPreferences = JSON.parse(stored);
        
        // Check if choice has expired
        if (preferences.lastChoiceTimestamp) {
          const expiryTime = preferences.lastChoiceTimestamp + 
            (AdminPreferencesService.CHOICE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
          
          if (Date.now() > expiryTime) {
            // Choice has expired, reset to ask
            return {
              defaultSignInDestination: 'ask',
              rememberChoice: false
            };
          }
        }
        
        return preferences;
      }
      
      // Default preferences
      return {
        defaultSignInDestination: 'ask',
        rememberChoice: false
      };
    } catch (error) {
      console.error('AdminPreferences: Error getting admin preferences:', error);
      return {
        defaultSignInDestination: 'ask',
        rememberChoice: false
      };
    }
  }

  /**
   * Save admin preferences for a user
   */
  async savePreferences(userId: string, preferences: AdminPreferences): Promise<void> {
    try {
      const key = `${AdminPreferencesService.STORAGE_KEY}_${userId}`;
      const preferencesToSave = {
        ...preferences,
        lastChoiceTimestamp: Date.now()
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(preferencesToSave));
    } catch (error) {
      console.error('Error saving admin preferences:', error);
    }
  }

  /**
   * Save user's sign-in choice
   */
  async saveSignInChoice(
    userId: string, 
    choice: 'dashboard' | 'app', 
    rememberChoice: boolean = false
  ): Promise<void> {
    const preferences: AdminPreferences = {
      defaultSignInDestination: rememberChoice ? choice : 'ask',
      rememberChoice,
      lastChoiceTimestamp: Date.now()
    };
    
    await this.savePreferences(userId, preferences);
  }

  /**
   * Clear preferences for a user
   */
  async clearPreferences(userId: string): Promise<void> {
    try {
      const key = `${AdminPreferencesService.STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing admin preferences:', error);
    }
  }

  /**
   * Check if user should be asked for choice or auto-redirected
   */
  async shouldShowChoiceModal(userId: string): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    return preferences.defaultSignInDestination === 'ask' || !preferences.rememberChoice;
  }

  /**
   * Get auto-redirect destination if user has a saved preference
   */
  async getAutoRedirectDestination(userId: string): Promise<'dashboard' | 'app' | null> {
    const preferences = await this.getPreferences(userId);
    
    if (preferences.rememberChoice && preferences.defaultSignInDestination !== 'ask') {
      return preferences.defaultSignInDestination;
    }
    
    return null;
  }
}

export const adminPreferencesService = new AdminPreferencesService();
export default adminPreferencesService;