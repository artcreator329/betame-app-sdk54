const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDatabaseFunctions() {
  console.log('🔍 Checking database functions and schema...\n');
  
  try {
    // Check if orders table exists
    console.log('1. Checking if orders table exists...');
    const { data: ordersCheck, error: ordersError } = await supabase
      .from('orders')
      .select('count(*)')
      .limit(1);
      
    if (ordersError) {
      console.log('❌ Orders table error:', ordersError.message);
      if (ordersError.code === '42P01') {
        console.log('   The orders table does not exist!');
        console.log('   You need to run the database migration first.');
        return;
      }
    } else {
      console.log('✅ Orders table exists');
    }
    
    // Test the confirm_work_completion function with dummy data
    console.log('\n2. Testing confirm_work_completion function...');
    const { data, error } = await supabase.rpc('confirm_work_completion', {
      p_order_id: '00000000-0000-0000-0000-000000000001',
      p_buyer_id: '00000000-0000-0000-0000-000000000002'
    });
    
    if (error) {
      console.log('❌ Function error:', error);
      if (error.code === '42883') {
        console.log('   The confirm_work_completion function does not exist!');
        console.log('   You need to run the database migration to create it.');
      }
    } else {
      console.log('✅ Function exists and can be called (returned:', data, ')');
    }
    
    // Test other functions
    const functions = [
      'mark_work_completed',
      'raise_dispute',
      'process_payment_release',
      'auto_release_payments',
      'add_order_timeline_event'
    ];
    
    console.log('\n3. Testing other order management functions...');
    for (const funcName of functions) {
      try {
        // Just test if the function exists by calling it with dummy data
        const { error } = await supabase.rpc(funcName, {});
        
        if (error && error.code === '42883') {
          console.log(`❌ Function ${funcName} does not exist`);
        } else {
          console.log(`✅ Function ${funcName} exists`);
        }
      } catch (err) {
        console.log(`❌ Function ${funcName} test failed:`, err.message);
      }
    }
    
    // Check if we have the correct schema
    console.log('\n4. Checking table schema...');
    const tables = ['orders', 'order_timeline', 'temporary_payouts', 'dispute_communications'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(0); // Just check if table exists
          
        if (error) {
          console.log(`❌ Table ${table} error:`, error.message);
        } else {
          console.log(`✅ Table ${table} exists`);
        }
      } catch (err) {
        console.log(`❌ Table ${table} check failed:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkDatabaseFunctions().catch(console.error);