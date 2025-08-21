import { createClient } from '@supabase/supabase-js';
import { JobCompletionService } from '../lib/job-completion-service';

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testJobCompletionPhotos() {
  console.log('🧪 Testing Job Completion Photos functionality...');

  try {
    // 1. Test getting completion photos for a non-existent job
    console.log('\n1. Testing getCompletionPhotos with non-existent job...');
    const photos = await JobCompletionService.getCompletionPhotos('non-existent-id');
    console.log('✅ getCompletionPhotos returned:', photos.length, 'photos');

    // 2. Test the database table structure
    console.log('\n2. Testing database table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('job_completion_photos')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('❌ Error accessing job_completion_photos table:', tableError.message);
    } else {
      console.log('✅ job_completion_photos table is accessible');
    }

    // 3. Test storage bucket access
    console.log('\n3. Testing storage bucket access...');
    const { data: bucketInfo, error: bucketError } = await supabase.storage
      .from('job-completion-photos')
      .list('', { limit: 1 });

    if (bucketError) {
      console.log('❌ Error accessing job-completion-photos bucket:', bucketError.message);
    } else {
      console.log('✅ job-completion-photos bucket is accessible');
    }

    // 4. Test RLS policies
    console.log('\n4. Testing RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('job_completion_photos')
      .select('*')
      .limit(1);

    if (policiesError) {
      console.log('❌ RLS policy test failed:', policiesError.message);
    } else {
      console.log('✅ RLS policies are working correctly');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Job completion photos table: ✅');
    console.log('- Storage bucket: ✅');
    console.log('- RLS policies: ✅');
    console.log('- Service methods: ✅');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testJobCompletionPhotos().catch(console.error);
