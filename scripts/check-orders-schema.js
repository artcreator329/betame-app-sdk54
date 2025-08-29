const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkOrdersSchema() {
  console.log('🔍 Checking orders table schema...\n');
  
  try {
    // Check the actual schema of the orders table
    console.log('1. Checking orders table columns...');
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(0);
      
    if (error) {
      console.log('❌ Error:', error);
      return;
    }
    
    // Try to insert a test order to see what columns are expected
    console.log('\n2. Testing order insertion with current schema...');
    
    // Get a real user ID for testing
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .limit(2);
      
    if (usersError || !users || users.length < 2) {
      console.log('❌ Need at least 2 users to test. Error:', usersError?.message);
      return;
    }
    
    const buyerId = users[0].id;
    const sellerId = users[1].id;
    
    console.log('   Using buyer ID:', buyerId);
    console.log('   Using seller ID:', sellerId);
    
    // Try to create a test order
    const testOrder = {
      service_offer_id: '00000000-0000-0000-0000-000000000001',
      buyer_id: buyerId,
      seller_id: sellerId, // Try with seller_id first
      amount: 100,
      platform_fee: 10,
      total_amount: 110,
      service_title: 'Test Service',
      service_description: 'Test Description'
    };
    
    console.log('\n3. Attempting to insert test order with seller_id...');
    const { data: insertResult1, error: insertError1 } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single();
      
    if (insertError1) {
      console.log('❌ Insert with seller_id failed:', insertError1.message);
      
      // Try with service_provider_id instead
      console.log('\n4. Attempting to insert test order with service_provider_id...');
      const testOrder2 = {
        ...testOrder,
        service_provider_id: sellerId
      };
      delete testOrder2.seller_id;
      
      const { data: insertResult2, error: insertError2 } = await supabase
        .from('orders')
        .insert(testOrder2)
        .select()
        .single();
        
      if (insertError2) {
        console.log('❌ Insert with service_provider_id also failed:', insertError2.message);
        console.log('   This suggests a schema mismatch or constraint issue.');
      } else {
        console.log('✅ Insert with service_provider_id succeeded!');
        console.log('   Order ID:', insertResult2.id);
        
        // Clean up the test order
        await supabase.from('orders').delete().eq('id', insertResult2.id);
        console.log('   Test order cleaned up.');
      }
    } else {
      console.log('✅ Insert with seller_id succeeded!');
      console.log('   Order ID:', insertResult1.id);
      
      // Clean up the test order
      await supabase.from('orders').delete().eq('id', insertResult1.id);
      console.log('   Test order cleaned up.');
    }
    
    // Check what columns actually exist
    console.log('\n5. Checking actual table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_columns', { table_name: 'orders' })
      .catch(() => null);
      
    if (tableInfo) {
      console.log('✅ Table columns:', tableInfo);
    } else {
      console.log('⚠️  Could not get table structure via RPC');
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkOrdersSchema().catch(console.error);