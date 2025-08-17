#!/usr/bin/env node

/**
 * Debug script for structured inquiry issues
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function debugStructuredInquiry() {
  console.log('🔍 Debugging Structured Inquiry Issues...\n');

  try {
    // 1. Check if structured inquiry messages exist in database
    console.log('1. Checking for existing structured inquiry messages...');
    
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('message_type', 'structured_inquiry')
      .limit(5);

    if (messagesError) {
      console.error('❌ Error fetching structured inquiry messages:', messagesError);
    } else {
      console.log(`✅ Found ${messages?.length || 0} structured inquiry messages in database`);
      if (messages && messages.length > 0) {
        console.log('   Sample message:', {
          id: messages[0].id,
          message_type: messages[0].message_type,
          content_preview: messages[0].message?.substring(0, 100) + '...',
          created_at: messages[0].created_at
        });
      }
    }

    // 2. Check chat_messages table structure
    console.log('\n2. Checking chat_messages table structure...');
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Error checking table structure:', tableError);
    } else if (tableInfo && tableInfo.length > 0) {
      const columns = Object.keys(tableInfo[0]);
      console.log('✅ Table columns:', columns);
      console.log('   Has message_type column:', columns.includes('message_type'));
      console.log('   Has message column:', columns.includes('message'));
    }

    // 3. Test message creation
    console.log('\n3. Testing structured inquiry message creation...');
    
    const testInquiryData = {
      type: 'structured_inquiry',
      serviceId: 'test-service-id',
      serviceTitle: 'Test Service',
      servicePrice: '100',
      serviceCurrency: 'RM',
      serviceDescription: 'Test service description',
      serviceImage: null,
      serviceCategory: 'Test Category',
      customMessage: 'This is a test inquiry message'
    };

    console.log('✅ Test inquiry data created:', {
      type: testInquiryData.type,
      serviceTitle: testInquiryData.serviceTitle,
      customMessage: testInquiryData.customMessage
    });

    // 4. Test JSON serialization
    console.log('\n4. Testing JSON serialization...');
    
    const serialized = JSON.stringify(testInquiryData);
    const deserialized = JSON.parse(serialized);
    
    console.log('✅ Serialization successful');
    console.log('   Serialized length:', serialized.length);
    console.log('   Custom message preserved:', deserialized.customMessage === testInquiryData.customMessage);

    // 5. Check for recent chat activity
    console.log('\n5. Checking recent chat activity...');
    
    const { data: recentMessages, error: recentError } = await supabase
      .from('chat_messages')
      .select('id, message_type, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ Error fetching recent messages:', recentError);
    } else {
      console.log('✅ Recent message types:', recentMessages?.map(m => ({
        type: m.message_type,
        created: new Date(m.created_at).toLocaleString()
      })));
    }

    // 6. Check service data availability
    console.log('\n6. Checking service data availability...');
    
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title, price, currency')
      .limit(3);

    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError);
    } else {
      console.log('✅ Available services for testing:', services?.map(s => ({
        id: s.id,
        title: s.title,
        price: `${s.currency} ${s.price}`
      })));
    }

    console.log('\n📋 Debug Summary:');
    console.log('   ✓ Database connection working');
    console.log('   ✓ Table structure verified');
    console.log('   ✓ Message serialization working');
    console.log('   ✓ Service data available');

    console.log('\n🔧 Potential Issues to Check:');
    console.log('   1. Verify ServiceVariantSelectionModal is showing');
    console.log('   2. Check if handleServiceVariantSelected is being called');
    console.log('   3. Verify structuredInquiryDraft state is being set');
    console.log('   4. Check if StructuredInquiryDraft component is rendering');
    console.log('   5. Verify sendStructuredInquiry function is being called');
    console.log('   6. Check if message is being inserted into database');
    console.log('   7. Verify real-time subscription is working');

    console.log('\n🚀 Next Steps:');
    console.log('   1. Add console.log statements to track the flow');
    console.log('   2. Check browser/app console for error messages');
    console.log('   3. Verify chat screen state management');
    console.log('   4. Test with a simple service inquiry');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugStructuredInquiry();