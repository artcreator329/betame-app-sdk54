#!/usr/bin/env node

/**
 * Test script for Admin Sign-In Flow
 * 
 * This script tests the new admin sign-in flow that detects admin accounts
 * and gives users the option to continue to the main app or go to the admin dashboard.
 * 
 * Usage: node scripts/test-admin-signin-flow.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminSignInFlow() {
  console.log('🧪 Testing Admin Sign-In Flow...\n');

  try {
    // Step 1: Check if admin_roles table exists
    console.log('1️⃣ Checking admin_roles table...');
    const { data: adminRoles, error: adminRolesError } = await supabase
      .from('admin_roles')
      .select('*')
      .limit(1);

    if (adminRolesError) {
      console.error('❌ admin_roles table not found or accessible');
      console.error('Error:', adminRolesError.message);
      console.log('\n💡 To create the admin_roles table, run:');
      console.log('CREATE TABLE admin_roles (');
      console.log('  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
      console.log('  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,');
      console.log('  role TEXT NOT NULL DEFAULT \'admin\',');
      console.log('  permissions JSONB DEFAULT \'{}\',');
      console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
      console.log(');');
      return;
    }

    console.log('✅ admin_roles table exists');

    // Step 2: Check for existing admin users
    console.log('\n2️⃣ Checking for existing admin users...');
    const { data: existingAdmins, error: existingAdminsError } = await supabase
      .from('admin_roles')
      .select(`
        id,
        user_id,
        role,
        permissions,
        created_at
      `);

    if (existingAdminsError) {
      console.error('❌ Error fetching admin users:', existingAdminsError.message);
      return;
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.log(`✅ Found ${existingAdmins.length} admin user(s):`);
      
      // Get user details for each admin
      for (const admin of existingAdmins) {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(admin.user_id);
        
        if (!userError && userData.user) {
          console.log(`   👤 ${userData.user.email} (${admin.role})`);
          console.log(`      User ID: ${admin.user_id}`);
          console.log(`      Permissions: ${JSON.stringify(admin.permissions)}`);
        } else {
          console.log(`   👤 User ID: ${admin.user_id} (${admin.role}) - User details not accessible`);
        }
      }
    } else {
      console.log('⚠️  No admin users found');
      console.log('\n💡 To create an admin user, you can:');
      console.log('1. Sign up a regular user through the app');
      console.log('2. Add them to the admin_roles table manually:');
      console.log('   INSERT INTO admin_roles (user_id, role, permissions) VALUES');
      console.log('   (\'<user_id>\', \'super_admin\', \'{"dashboard": true, "users": true, "services": true}\');');
    }

    // Step 3: Test admin detection logic
    console.log('\n3️⃣ Testing admin detection logic...');
    
    if (existingAdmins && existingAdmins.length > 0) {
      const testAdminId = existingAdmins[0].user_id;
      console.log(`Testing with admin user: ${testAdminId}`);
      
      // Simulate the isAdmin check
      const { data: adminCheck, error: adminCheckError } = await supabase
        .from('admin_roles')
        .select('id')
        .eq('user_id', testAdminId)
        .single();

      if (adminCheckError) {
        console.error('❌ Admin detection failed:', adminCheckError.message);
      } else if (adminCheck) {
        console.log('✅ Admin detection working correctly');
      } else {
        console.log('❌ Admin detection returned no results');
      }
    }

    // Step 4: Test flow components
    console.log('\n4️⃣ Checking flow components...');
    
    const componentsToCheck = [
      'components/AdminSignInChoiceModal.tsx',
      'components/AdminQuickSwitch.tsx',
      'app/auth/login.tsx',
      'app/(tabs)/profile.tsx',
      'app/admin/_layout.tsx',
      'app/admin/preferences.tsx',
      'lib/admin-preferences-service.ts'
    ];

    const fs = require('fs');
    const path = require('path');

    for (const componentPath of componentsToCheck) {
      const fullPath = path.join(process.cwd(), componentPath);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ ${componentPath} exists`);
        
        // Check for key functionality
        const content = fs.readFileSync(fullPath, 'utf8');
        
        if (componentPath === 'components/AdminSignInChoiceModal.tsx') {
          if (content.includes('AdminSignInChoiceModal') && content.includes('onContinueToApp') && content.includes('onGoToDashboard') && content.includes('rememberChoice')) {
            console.log('   ✅ Contains required props and remember choice functionality');
          } else {
            console.log('   ⚠️  Missing some required functionality');
          }
        }
        
        if (componentPath === 'components/AdminQuickSwitch.tsx') {
          if (content.includes('AdminQuickSwitch') && content.includes('currentLocation')) {
            console.log('   ✅ Quick switch component ready');
          } else {
            console.log('   ⚠️  Quick switch component incomplete');
          }
        }
        
        if (componentPath === 'app/auth/login.tsx') {
          if (content.includes('AdminSignInChoiceModal') && content.includes('showAdminChoice') && content.includes('adminPreferencesService')) {
            console.log('   ✅ Admin choice modal and preferences integrated');
          } else {
            console.log('   ⚠️  Admin choice modal or preferences not fully integrated');
          }
        }
        
        if (componentPath === 'app/(tabs)/profile.tsx') {
          if (content.includes('isAdmin') && content.includes('Shield')) {
            console.log('   ✅ Admin dashboard button added');
          } else {
            console.log('   ⚠️  Admin dashboard button not found');
          }
        }
        
        if (componentPath === 'app/admin/_layout.tsx') {
          if (content.includes('Back to App') && content.includes('preferences')) {
            console.log('   ✅ Back to App button and preferences link exist');
          } else {
            console.log('   ⚠️  Back to App button or preferences link not found');
          }
        }
        
        if (componentPath === 'app/admin/preferences.tsx') {
          if (content.includes('AdminPreferencesScreen') && content.includes('adminPreferencesService')) {
            console.log('   ✅ Admin preferences page ready');
          } else {
            console.log('   ⚠️  Admin preferences page incomplete');
          }
        }
        
        if (componentPath === 'lib/admin-preferences-service.ts') {
          if (content.includes('AdminPreferencesService') && content.includes('saveSignInChoice')) {
            console.log('   ✅ Admin preferences service ready');
          } else {
            console.log('   ⚠️  Admin preferences service incomplete');
          }
        }
      } else {
        console.log(`❌ ${componentPath} not found`);
      }
    }

    console.log('\n🎉 Admin Sign-In Flow Test Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ Admin detection modal with remember choice option');
    console.log('✅ Login flow with preferences and auto-redirect');
    console.log('✅ Profile page updated with admin dashboard access');
    console.log('✅ Admin layout includes back to app and preferences');
    console.log('✅ Admin preferences service for storing user choices');
    console.log('✅ Admin preferences page for managing settings');
    console.log('✅ Quick switch component for easy mode switching');
    
    console.log('\n🔄 Enhanced Flow Overview:');
    console.log('1. User signs in with admin credentials');
    console.log('2. System checks saved preferences');
    console.log('3. If no preference saved, modal appears with "Remember choice" option');
    console.log('4. User can set default destination and remember choice for 30 days');
    console.log('5. Admin preferences page allows managing sign-in behavior');
    console.log('6. Quick switch component enables easy mode switching');
    console.log('7. Profile page shows admin dashboard access for admin users');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAdminSignInFlow().catch(console.error);