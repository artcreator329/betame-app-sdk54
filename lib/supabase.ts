import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '<REDACTED_JWT>';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
});

// Service role key for admin operations (use with caution - server-side only)
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '<REDACTED_JWT>';

// Create admin client for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

module.exports = {
  supabase,
  supabaseAdmin
};