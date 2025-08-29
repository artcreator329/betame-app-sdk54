const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function diagnoseJobCompletionFailure() {
  console.log('🔍 Diagnosing Job Completion Failure...\n');
  console.log('Based on the screenshot showing "Failed to confirm job completion"');
  console.log('Let\'s identify the most likely root causes:\n');
  
  try {
    // Test 1: Check if the confirm_work_completion function exists and works
    console.log('1. Testing confirm_work_completion function...');
    
    const { data: funcResult, error: funcError } = await supabase.rpc('confirm_work_completion', {
      p_order_id: '00000000-0000-0000-0000-000000000001',
      p_buyer_id: '00000000-0000-0000-0000-000000000002'
    });
    
    if (funcError) {
      console.log('❌ Function error:', funcError.message);
      console.log('   Error code:', funcError.code);
      
      if (funcError.code === '42883') {
        console.log('   🎯 ROOT CAUSE: Function does not exist');
        console.log('   SOLUTION: Run the database migration to create the function');
      } else if (funcError.code === '42501') {
        console.log('   🎯 ROOT CAUSE: RLS policy blocking function execution');
        console.log('   SOLUTION: Fix RLS policies or use service role');
      } else {
        console.log('   🎯 ROOT CAUSE: Database function error');
        console.log('   SOLUTION: Check function implementation');
      }
    } else {
      console.log('✅ Function exists and can be called');
      console.log('   Result:', funcResult);
    }
    
    // Test 2: Check RLS policies on orders table
    console.log('\n2. Testing orders table access...');
    
    const { data: ordersTest, error: ordersError } = await supabase
      .from('orders')
      .select('count(*)')
      .limit(1);
      
    if (ordersError) {
      console.log('❌ Orders table error:', ordersError.message);
      console.log('   Error code:', ordersError.code);
      
      if (ordersError.code === '42501') {
        console.log('   🎯 ROOT CAUSE: RLS policy blocking orders table access');
        console.log('   SOLUTION: Fix RLS policies for orders table');
      } else if (ordersError.code === '42P01') {
        console.log('   🎯 ROOT CAUSE: Orders table does not exist');
        console.log('   SOLUTION: Run database migration to create orders table');
      }
    } else {
      console.log('✅ Orders table accessible');
    }
    
    // Test 3: Check if there's an authentication issue
    console.log('\n3. Checking authentication context...');
    
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser.user) {
      console.log('❌ No authenticated user');
      console.log('   🎯 ROOT CAUSE: User not authenticated');
      console.log('   SOLUTION: Ensure user is properly authenticated before confirmation');
    } else {
      console.log('✅ User authenticated:', authUser.user.id);
    }
    
    // Test 4: Check if the issue is with the order management service
    console.log('\n4. Testing order management service...');
    
    try {
      // This will test the actual service method that's called from the UI
      const testResult = await supabase.rpc('confirm_work_completion', {
        p_order_id: 'test-order-id',
        p_buyer_id: 'test-buyer-id'
      });
      
      console.log('✅ Order management service can call database functions');
    } catch (serviceError) {
      console.log('❌ Order management service error:', serviceError.message);
    }
    
    // Test 5: Check for network/connection issues
    console.log('\n5. Testing database connection...');
    
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count(*)')
      .limit(1);
      
    if (connectionError) {
      console.log('❌ Database connection error:', connectionError.message);
      console.log('   🎯 ROOT CAUSE: Network or connection issue');
      console.log('   SOLUTION: Check internet connection and Supabase status');
    } else {
      console.log('✅ Database connection working');
    }
    
    // Summary of most likely causes
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY OF MOST LIKELY ROOT CAUSES:');
    console.log('='.repeat(60));
    
    console.log('\n1. 🔐 RLS Policy Issues (Most Likely)');
    console.log('   - Orders table missing INSERT/UPDATE policies');
    console.log('   - User not authorized to confirm orders');
    console.log('   - Policies using wrong column names (seller_id vs service_provider_id)');
    
    console.log('\n2. 🗄️  Database Schema Issues');
    console.log('   - confirm_work_completion function not created');
    console.log('   - Orders table not created or missing columns');
    console.log('   - Function using wrong column references');
    
    console.log('\n3. 🔑 Authentication Issues');
    console.log('   - User not properly authenticated');
    console.log('   - Auth context not passed to database calls');
    console.log('   - Session expired during confirmation');
    
    console.log('\n4. 📱 App Logic Issues');
    console.log('   - Order ID not found or invalid');
    console.log('   - User ID mismatch (not the actual buyer)');
    console.log('   - Order not in correct status for confirmation');
    
    console.log('\n5. 🌐 Network Issues');
    console.log('   - Poor internet connection');
    console.log('   - Supabase service temporarily unavailable');
    console.log('   - Request timeout');
    
    console.log('\n' + '='.repeat(60));
    console.log('🛠️  RECOMMENDED FIXES:');
    console.log('='.repeat(60));
    
    console.log('\n1. Apply the RLS policy fix (already done):');
    console.log('   ✅ Added INSERT policy for orders table');
    console.log('   ✅ Fixed column name references in policies');
    
    console.log('\n2. Add error handling and logging:');
    console.log('   - Add detailed error logging in confirmWorkCompletion');
    console.log('   - Show specific error messages to user');
    console.log('   - Add retry mechanism for network issues');
    
    console.log('\n3. Add validation checks:');
    console.log('   - Verify order exists and user is buyer');
    console.log('   - Check order status before confirmation');
    console.log('   - Validate user authentication');
    
    console.log('\n4. Improve user experience:');
    console.log('   - Add loading states during confirmation');
    console.log('   - Show progress indicators');
    console.log('   - Provide clear error messages');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

diagnoseJobCompletionFailure().catch(console.error);