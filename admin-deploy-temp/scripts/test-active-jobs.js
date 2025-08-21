const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testActiveJobs() {
  console.log('🧪 Testing ActiveJobService...');

  try {
    // Test 1: Check if we can read from the table
    console.log('📖 Test 1: Reading from active_jobs table...');
    const { data: readData, error: readError } = await supabase
      .from('active_jobs')
      .select('*')
      .limit(5);

    if (readError) {
      console.error('❌ Read test failed:', readError);
      return;
    }

    console.log('✅ Read test passed. Current records:', readData.length);

    // Test 2: Check table structure
    console.log('🔍 Test 2: Checking table structure...');
    const { data: structureData, error: structureError } = await supabase
      .from('active_jobs')
      .select('id, buyer_id, service_provider_id, title, price, status')
      .limit(1);

    if (structureError) {
      console.error('❌ Structure test failed:', structureError);
      return;
    }

    console.log('✅ Structure test passed. Available fields:', Object.keys(structureData[0] || {}));

    // Test 3: Test job creation (with a real user ID if available)
    console.log('📝 Test 3: Testing job creation...');
    
    // First, let's get a real user ID from the database
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.log('⚠️  No users found, skipping job creation test');
      return;
    }

    const testUserId = users[0].id;
    console.log('👤 Using test user ID:', testUserId);

    // Test job creation
    const testJobData = {
      buyer_id: testUserId,
      service_provider_id: testUserId,
      title: 'Test Service Order',
      description: 'This is a test service order to verify the system works',
      price: 150.00,
      currency: 'RM',
      delivery_time: '7 days',
      status: 'in_progress',
      progress_percentage: 0,
      payment_status: 'paid',
      started_at: new Date().toISOString()
    };

    const { data: newJob, error: createError } = await supabase
      .from('active_jobs')
      .insert(testJobData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Job creation test failed:', createError);
      return;
    }

    console.log('✅ Job creation test passed!');
    console.log('📋 Created job:', {
      id: newJob.id,
      title: newJob.title,
      price: newJob.price,
      status: newJob.status
    });

    // Clean up - delete the test job
    const { error: deleteError } = await supabase
      .from('active_jobs')
      .delete()
      .eq('id', newJob.id);

    if (deleteError) {
      console.error('⚠️  Failed to clean up test job:', deleteError);
    } else {
      console.log('🧹 Test job cleaned up successfully');
    }

    console.log('🎉 All tests passed! The ActiveJobService should work correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testActiveJobs();
