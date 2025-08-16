#!/usr/bin/env node

/**
 * Demo script for Admin Sign-In Flow
 * 
 * This script demonstrates the enhanced admin sign-in flow with preferences
 * and provides interactive examples of the functionality.
 * 
 * Usage: node scripts/demo-admin-signin-flow.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simulate AsyncStorage for demo purposes
const mockStorage = new Map();

class MockAdminPreferencesService {
  static STORAGE_KEY = 'admin_preferences';
  static CHOICE_EXPIRY_DAYS = 30;

  async getPreferences(userId) {
    const key = `${MockAdminPreferencesService.STORAGE_KEY}_${userId}`;
    const stored = mockStorage.get(key);
    
    if (stored) {
      const preferences = JSON.parse(stored);
      
      // Check if choice has expired
      if (preferences.lastChoiceTimestamp) {
        const expiryTime = preferences.lastChoiceTimestamp + 
          (MockAdminPreferencesService.CHOICE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        
        if (Date.now() > expiryTime) {
          return {
            defaultSignInDestination: 'ask',
            rememberChoice: false
          };
        }
      }
      
      return preferences;
    }
    
    return {
      defaultSignInDestination: 'ask',
      rememberChoice: false
    };
  }

  async savePreferences(userId, preferences) {
    const key = `${MockAdminPreferencesService.STORAGE_KEY}_${userId}`;
    const preferencesToSave = {
      ...preferences,
      lastChoiceTimestamp: Date.now()
    };
    
    mockStorage.set(key, JSON.stringify(preferencesToSave));
  }

  async saveSignInChoice(userId, choice, rememberChoice = false) {
    const preferences = {
      defaultSignInDestination: rememberChoice ? choice : 'ask',
      rememberChoice,
      lastChoiceTimestamp: Date.now()
    };
    
    await this.savePreferences(userId, preferences);
  }

  async shouldShowChoiceModal(userId) {
    const preferences = await this.getPreferences(userId);
    return preferences.defaultSignInDestination === 'ask' || !preferences.rememberChoice;
  }

  async getAutoRedirectDestination(userId) {
    const preferences = await this.getPreferences(userId);
    
    if (preferences.rememberChoice && preferences.defaultSignInDestination !== 'ask') {
      return preferences.defaultSignInDestination;
    }
    
    return null;
  }
}

async function simulateAdminSignIn(userId, userEmail) {
  console.log(`\n🔐 Simulating admin sign-in for: ${userEmail}`);
  console.log(`👤 User ID: ${userId}`);
  
  const preferencesService = new MockAdminPreferencesService();
  
  // Step 1: Check if user is admin
  console.log('\n1️⃣ Checking admin status...');
  const { data: adminCheck, error } = await supabase
    .from('admin_roles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error || !adminCheck) {
    console.log('❌ User is not an admin');
    console.log('➡️  Redirecting to main app: /(tabs)');
    return;
  }
  
  console.log('✅ User is an admin');
  
  // Step 2: Check preferences
  console.log('\n2️⃣ Checking user preferences...');
  const shouldShowModal = await preferencesService.shouldShowChoiceModal(userId);
  
  if (!shouldShowModal) {
    console.log('✅ User has saved preferences');
    const destination = await preferencesService.getAutoRedirectDestination(userId);
    const route = destination === 'dashboard' ? '/admin' : '/(tabs)';
    console.log(`➡️  Auto-redirecting to: ${route}`);
    return;
  }
  
  console.log('⚠️  No saved preferences found');
  console.log('📱 Showing AdminSignInChoiceModal...');
  
  // Step 3: Simulate modal interaction
  console.log('\n3️⃣ Modal Options:');
  console.log('   🏠 Continue to Main App');
  console.log('   📊 Go to Admin Dashboard');
  console.log('   ☑️  Remember my choice (30 days)');
  
  // Simulate user choice
  const choices = ['app', 'dashboard'];
  const randomChoice = choices[Math.floor(Math.random() * choices.length)];
  const rememberChoice = Math.random() > 0.5;
  
  console.log(`\n👆 User selected: ${randomChoice === 'app' ? 'Main App' : 'Admin Dashboard'}`);
  console.log(`💾 Remember choice: ${rememberChoice ? 'Yes' : 'No'}`);
  
  // Step 4: Save preference and redirect
  if (rememberChoice) {
    await preferencesService.saveSignInChoice(userId, randomChoice, true);
    console.log('✅ Preference saved for 30 days');
  }
  
  const route = randomChoice === 'dashboard' ? '/admin' : '/(tabs)';
  console.log(`➡️  Redirecting to: ${route}`);
}

async function demonstratePreferencesManagement(userId) {
  console.log(`\n⚙️  Demonstrating Preferences Management for User: ${userId}`);
  
  const preferencesService = new MockAdminPreferencesService();
  
  // Show current preferences
  console.log('\n📋 Current Preferences:');
  const currentPrefs = await preferencesService.getPreferences(userId);
  console.log(`   Default Destination: ${currentPrefs.defaultSignInDestination}`);
  console.log(`   Remember Choice: ${currentPrefs.rememberChoice}`);
  
  // Simulate preference changes
  console.log('\n🔄 Simulating preference changes...');
  
  // Set to always go to dashboard
  await preferencesService.savePreferences(userId, {
    defaultSignInDestination: 'dashboard',
    rememberChoice: true
  });
  console.log('✅ Set default to Admin Dashboard with remember enabled');
  
  // Test the preference
  const shouldShow = await preferencesService.shouldShowChoiceModal(userId);
  const destination = await preferencesService.getAutoRedirectDestination(userId);
  console.log(`   Should show modal: ${shouldShow}`);
  console.log(`   Auto-redirect to: ${destination}`);
  
  // Reset preferences
  await preferencesService.savePreferences(userId, {
    defaultSignInDestination: 'ask',
    rememberChoice: false
  });
  console.log('🔄 Reset preferences to defaults');
}

async function demonstrateQuickSwitch() {
  console.log('\n🔄 Demonstrating Quick Switch Functionality');
  
  const locations = ['app', 'admin'];
  
  for (const location of locations) {
    console.log(`\n📍 Current location: ${location === 'app' ? 'Main App' : 'Admin Dashboard'}`);
    
    const targetLocation = location === 'app' ? 'admin' : 'app';
    const targetRoute = targetLocation === 'admin' ? '/admin' : '/(tabs)';
    const buttonText = targetLocation === 'admin' ? 'Switch to Admin Dashboard' : 'Switch to Main App';
    const icon = targetLocation === 'admin' ? '🛡️' : '🏠';
    
    console.log(`   ${icon} ${buttonText}`);
    console.log(`   ➡️  Would navigate to: ${targetRoute}`);
  }
}

async function runDemo() {
  console.log('🎭 Admin Sign-In Flow Demo');
  console.log('=' .repeat(50));
  
  try {
    // Get admin users for demo
    const { data: adminUsers, error } = await supabase
      .from('admin_roles')
      .select('user_id')
      .limit(1);

    if (error || !adminUsers || adminUsers.length === 0) {
      console.log('❌ No admin users found for demo');
      console.log('💡 Please create an admin user first using the test script');
      return;
    }

    const adminUserId = adminUsers[0].user_id;
    
    // Get user details
    const { data: userData } = await supabase.auth.admin.getUserById(adminUserId);
    const userEmail = userData.user?.email || 'admin@example.com';

    // Demo scenarios
    console.log('\n🎬 Scenario 1: First-time admin sign-in');
    await simulateAdminSignIn(adminUserId, userEmail);
    
    console.log('\n🎬 Scenario 2: Admin with saved preferences');
    await demonstratePreferencesManagement(adminUserId);
    await simulateAdminSignIn(adminUserId, userEmail);
    
    console.log('\n🎬 Scenario 3: Quick switch functionality');
    await demonstrateQuickSwitch();
    
    console.log('\n🎉 Demo Complete!');
    console.log('\n📚 Key Features Demonstrated:');
    console.log('✅ Admin detection and modal presentation');
    console.log('✅ User preference storage and retrieval');
    console.log('✅ Auto-redirect based on saved preferences');
    console.log('✅ Preference management and reset');
    console.log('✅ Quick switch between app modes');
    
    console.log('\n🔗 Related Components:');
    console.log('📱 AdminSignInChoiceModal.tsx - Choice modal with remember option');
    console.log('⚙️  AdminPreferencesService.ts - Preference storage service');
    console.log('🏗️  AdminPreferencesScreen.tsx - Preferences management UI');
    console.log('🔄 AdminQuickSwitch.tsx - Quick mode switching component');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
runDemo().catch(console.error);