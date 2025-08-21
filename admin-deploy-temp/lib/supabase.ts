import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '<REDACTED_JWT>';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable persistent sessions using AsyncStorage
    storage: AsyncStorage,
    // Auto-refresh tokens to prevent session timeouts
    autoRefreshToken: true,
    // Persist session across app restarts
    persistSession: true,
    // Detect session in URL for deep linking
    detectSessionInUrl: false,
  },
  global: {
    // Set headers for better error handling
    headers: {
      'X-Client-Info': 'betame-app/1.0.0',
    },
  },
  // Configure fetch with timeout and retry logic
  fetch: (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    return fetch(url, {
      ...options,
      signal: controller.signal,
      // Add retry logic for network failures
      keepalive: true,
    }).finally(() => {
      clearTimeout(timeoutId);
    });
  },
});

// Service role key for admin operations (use with caution - server-side only)
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '<REDACTED_JWT>';

// Create admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Enhanced error handling wrapper
const supabaseWithRetry = {
  ...supabase,
  storage: {
    ...supabase.storage,
    from: (bucket: string) => ({
      ...supabase.storage.from(bucket),
      upload: async (path: string, file: any, options?: any) => {
        let lastError: any;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const result = await supabase.storage.from(bucket).upload(path, file, options);
            
            if (result.error) {
              // Don't retry for certain errors
              if (result.error.message.includes('already exists') ||
                  result.error.message.includes('permission') ||
                  result.error.message.includes('invalid')) {
                return result;
              }
              
              lastError = result.error;
              if (attempt < 3) {
                console.log(`Storage upload attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
              }
            }
            
            return result;
          } catch (error) {
            lastError = error;
            if (attempt < 3) {
              console.log(`Storage upload attempt ${attempt} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
          }
        }
        
        return { data: null, error: lastError };
      }
    })
  }
};

export { supabaseWithRetry };