const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function emergencyConstraintFix() {
  console.log('🚨 EMERGENCY: Fixing active_jobs constraint violation...\n');
  
  try {
    // First, let's see what the current constraint actually allows
    console.log('1. Testing current constraint...');
    
    // Try to insert a test record with different statuses to see what fails
    const testStatuses = [
      'buyer_reviewing',
      'completed_confirmed', 
      'in_progress',
      'completed'
    ];
    
    for (const status of testStatuses) {
      console.log(`   Testing status: ${status}`);
      
      // Try a direct insert to see what the constraint allows
      const { data, error } = await supabase
        .from('active_jobs')
        .insert({
          buyer_id: '00000000-0000-0000-0000-000000000001',
          service_provider_id: '00000000-0000-0000-0000-000000000002',
          service_offer_id: '00000000-0000-0000-0000-000000000003',
          title: 'Test Job',
          price: 100,
          status: status
        })
        .select();
        
      if (error) {
        if (error.code === '23514') {
          console.log(`   ❌ CONSTRAINT VIOLATION: ${status} is NOT allowed`);
        } else {
          console.log(`   ❌ Other error: ${error.message}`);
        }
      } else {
        console.log(`   ✅ SUCCESS: ${status} is allowed`);
        // Clean up the test record
        if (data && data[0]) {
          await supabase.from('active_jobs').delete().eq('id', data[0].id);
        }
      }
    }
    
    console.log('\n🔧 APPLYING EMERGENCY FIX...');
    
    // Apply the constraint fix directly
    console.log('2. Dropping existing constraint...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE active_jobs DROP CONSTRAINT IF EXISTS active_jobs_status_check;'
    });
    
    if (dropError) {
      console.log('❌ Failed to drop constraint:', dropError.message);
    } else {
      console.log('✅ Constraint dropped');
    }
    
    console.log('3. Creating new permissive constraint...');
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE active_jobs ADD CONSTRAINT active_jobs_status_check 
            CHECK (status = ANY (ARRAY[
              'pending_confirmation'::text,
              'in_progress'::text,
              'completed'::text,
              'completed_confirmed'::text,
              'cancelled'::text,
              'disputed'::text,
              'revision_requested'::text,
              'revision_in_progress'::text,
              'revision_completed'::text,
              'payment_received'::text,
              'work_in_progress'::text,
              'work_completed'::text,
              'buyer_reviewing'::text,
              'refund_requested'::text,
              'partial_refund'::text
            ]));`
    });
    
    if (createError) {
      console.log('❌ Failed to create constraint:', createError.message);
    } else {
      console.log('✅ New constraint created');
    }
    
    // Test the fix
    console.log('\n4. Testing the fix...');
    const { data: testData, error: testError } = await supabase
      .from('active_jobs')
      .insert({
        buyer_id: '00000000-0000-0000-0000-000000000001',
        service_provider_id: '00000000-0000-0000-0000-000000000002',
        service_offer_id: '00000000-0000-0000-0000-000000000004',
        title: 'Test Job After Fix',
        price: 100,
        status: 'buyer_reviewing' // This was failing before
      })
      .select();
      
    if (testError) {
      console.log('❌ Fix failed:', testError.message);
      if (testError.code === '23514') {
        console.log('🚨 CONSTRAINT STILL BLOCKING!');
      }
    } else {
      console.log('✅ Fix successful! buyer_reviewing status now works');
      // Clean up
      if (testData && testData[0]) {
        await supabase.from('active_jobs').delete().eq('id', testData[0].id);
      }
    }
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
  }
}

emergencyConstraintFix().catch(console.error);