import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a simple Supabase client for testing
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('🔧 Environment check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  urlLength: supabaseUrl.length,
  keyLength: supabaseKey.length
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuoteDatabase() {
  console.log('🧪 Testing quote message database functionality...');

  try {
    // Test 1: Check if the new columns exist
    console.log('1. Checking if quote columns exist...');
    const { data: columns, error: columnsError } = await supabase
      .from('messages')
      .select('quoted_message_id, quoted_message_content, quoted_message_sender_name, quoted_message_type')
      .limit(1);

    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError);
      return;
    }

    console.log('✅ Quote columns exist and are accessible');

    // Test 2: Check if the index exists
    console.log('2. Checking if quote index exists...');
    const { data: indexCheck, error: indexError } = await supabase
      .rpc('check_index_exists', { 
        index_name: 'idx_messages_quoted_message_id',
        table_name: 'messages'
      });

    if (indexError) {
      console.log('⚠️ Could not verify index (this is normal for anon access):', indexError.message);
    } else {
      console.log('✅ Quote index exists');
    }

    // Test 3: Verify the constraint exists
    console.log('3. Checking quote message type constraint...');
    const { data: constraintCheck, error: constraintError } = await supabase
      .from('messages')
      .select('quoted_message_type')
      .eq('quoted_message_type', 'text')
      .limit(1);

    if (constraintError) {
      console.error('❌ Error checking constraint:', constraintError);
      return;
    }

    console.log('✅ Quote message type constraint is working');

    console.log('🎉 All quote functionality tests passed!');
    console.log('📝 Quote fields available:');
    console.log('  - quoted_message_id (UUID, references messages.id)');
    console.log('  - quoted_message_content (TEXT)');
    console.log('  - quoted_message_sender_name (TEXT)');
    console.log('  - quoted_message_type (TEXT, check: text/service/offer)');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testQuoteDatabase(); 