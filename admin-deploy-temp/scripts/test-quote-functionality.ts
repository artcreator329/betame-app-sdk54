import { supabase } from '../lib/supabase';

async function testQuoteFunctionality() {
  console.log('🧪 Testing quote message functionality...');

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

    // Test 2: Insert a test message with quote
    console.log('2. Testing message insertion with quote...');
    
    const testMessage = {
      chat_id: 'test-chat-id',
      sender_id: 'test-sender-id',
      sender_name: 'Test User',
      sender_image: 'https://example.com/avatar.jpg',
      message: 'This is a quoted message',
      quoted_message_id: null, // We'll set this after creating the original message
      quoted_message_content: 'Original message content',
      quoted_message_sender_name: 'Original Sender',
      quoted_message_type: 'text',
      message_type: 'text',
      is_hidden: false,
      is_reported: false,
    };

    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert(testMessage)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting test message:', insertError);
      return;
    }

    console.log('✅ Test message with quote inserted successfully:', insertedMessage.id);

    // Test 3: Update the message to reference itself as a quote (for testing)
    console.log('3. Testing quote reference...');
    
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        quoted_message_id: insertedMessage.id,
        quoted_message_content: 'This message quotes itself for testing',
        quoted_message_sender_name: 'Test User',
        quoted_message_type: 'text'
      })
      .eq('id', insertedMessage.id);

    if (updateError) {
      console.error('❌ Error updating message with quote:', updateError);
      return;
    }

    console.log('✅ Quote reference updated successfully');

    // Test 4: Query the message with quote
    console.log('4. Testing quote retrieval...');
    
    const { data: quotedMessage, error: queryError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', insertedMessage.id)
      .single();

    if (queryError) {
      console.error('❌ Error querying quoted message:', queryError);
      return;
    }

    console.log('✅ Quoted message retrieved successfully');
    console.log('📝 Quote details:', {
      quotedMessageId: quotedMessage.quoted_message_id,
      quotedContent: quotedMessage.quoted_message_content,
      quotedSender: quotedMessage.quoted_message_sender_name,
      quotedType: quotedMessage.quoted_message_type
    });

    // Test 5: Clean up test data
    console.log('5. Cleaning up test data...');
    
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', insertedMessage.id);

    if (deleteError) {
      console.error('❌ Error cleaning up test data:', deleteError);
      return;
    }

    console.log('✅ Test data cleaned up successfully');
    console.log('🎉 All quote functionality tests passed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testQuoteFunctionality(); 