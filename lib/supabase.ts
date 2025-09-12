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
    // Longer timeout for storage uploads (especially for images)
    const timeoutMs = url.includes('/storage/') ? 90000 : 30000; // 90s for storage, 30s for other requests
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
    from: (bucket: string) => {
      const originalBucket = supabase.storage.from(bucket);
      
      return {
        // Include all original methods
        ...originalBucket,
        
        // Enhanced upload method with retry logic
        upload: async (path: string, file: any, options?: any) => {
          let lastError: any;
          
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              console.log(`🔄 Storage upload attempt ${attempt}/3 for path: ${path}`);
              const result = await originalBucket.upload(path, file, options);
              
              if (result.error) {
                console.error(`❌ Upload attempt ${attempt} failed:`, result.error);
                
                // Don't retry for certain errors
                if (result.error.message.includes('already exists') ||
                    result.error.message.includes('permission') ||
                    result.error.message.includes('invalid') ||
                    result.error.message.includes('duplicate')) {
                  console.log('🚫 Non-retryable error, stopping attempts');
                  return result;
                }
                
                lastError = result.error;
                if (attempt < 3) {
                  const delay = 2000 * attempt; // Exponential backoff: 2s, 4s, 6s
                  console.log(`⏳ Retrying in ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  continue;
                }
              } else {
                console.log(`✅ Upload attempt ${attempt} successful`);
                return result;
              }
              
              return result;
            } catch (error) {
              console.error(`❌ Upload attempt ${attempt} threw error:`, error);
              lastError = error;
              if (attempt < 3) {
                const delay = 2000 * attempt; // Exponential backoff: 2s, 4s, 6s
                console.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              }
            }
          }
          
          console.error('❌ All upload attempts failed, returning last error');
          return { data: null, error: lastError };
        },
        
        // Enhanced list method with retry logic
        list: async (path?: string, options?: any) => {
          let lastError: any;
          
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const result = await originalBucket.list(path, options);
              
              if (result.error) {
                console.error(`❌ List attempt ${attempt} failed:`, result.error);
                lastError = result.error;
                if (attempt < 2) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  continue;
                }
              } else {
                return result;
              }
              
              return result;
            } catch (error) {
              console.error(`❌ List attempt ${attempt} threw error:`, error);
              lastError = error;
              if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
              }
            }
          }
          
          return { data: null, error: lastError };
        },
        
        // Include getPublicUrl method (no retry needed as it's synchronous)
        getPublicUrl: (path: string, options?: any) => {
          return originalBucket.getPublicUrl(path, options);
        },
        
        // Include remove method with retry logic
        remove: async (paths: string[]) => {
          let lastError: any;
          
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const result = await originalBucket.remove(paths);
              
              if (result.error) {
                console.error(`❌ Remove attempt ${attempt} failed:`, result.error);
                lastError = result.error;
                if (attempt < 2) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  continue;
                }
              } else {
                return result;
              }
              
              return result;
            } catch (error) {
              console.error(`❌ Remove attempt ${attempt} threw error:`, error);
              lastError = error;
              if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
              }
            }
          }
          
          return { data: null, error: lastError };
        }
      };
    }
  }
};

export { supabaseWithRetry };