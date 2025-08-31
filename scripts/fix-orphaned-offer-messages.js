const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixOrphanedOfferMessages() {
  console.log('🔍 Finding and fixing orphaned offer messages...');
  
  try {
    // 1. Find all offer messages
    console.log('\n1. Finding all offer messages...');
    const { data: offerMessages, error: messageError } = await supabase
      .from('chat_messages')
      .select('id, offer_id, offer_status, created_at, chat_id')
      .eq('message_type', 'offer')
      .not('offer_id', 'is', null);
    
    if (messageError) {
      console.error('❌ Error fetching offer messages:', messageError);
      return;
    }
    
    console.log(`📊 Found ${offerMessages?.length || 0} offer messages`);
    
    // 2. Check which ones are orphaned
    console.log('\n2. Checking for orphaned messages...');
    const orphanedMessages = [];
    
    for (const message of offerMessages || []) {
      const { data: correspondingOffer } = await supabase
        .from('service_offers')
        .select('id')
        .eq('id', message.offer_id)
        .single();
      
      if (!correspondingOffer) {
        orphanedMessages.push(message);
        console.log(`❌ Orphaned: ${message.id} -> offer ${message.offer_id}`);
      }
    }
    
    console.log(`\n📊 Found ${orphanedMessages.length} orphaned messages`);
    
    if (orphanedMessages.length === 0) {
      console.log('✅ No orphaned messages found!');
      return;
    }
    
    // 3. Show options for fixing
    console.log('\n3. Orphaned messages details:');
    orphanedMessages.forEach((msg, index) => {
      console.log(`${index + 1}. Message ID: ${msg.id}`);
      console.log(`   Offer ID: ${msg.offer_id}`);
      console.log(`   Status: ${msg.offer_status}`);
      console.log(`   Created: ${msg.created_at}`);
      console.log(`   Chat ID: ${msg.chat_id}`);
      console.log('');
    });
    
    // 4. For now, just log the issue - don't auto-fix
    console.log('⚠️  These messages reference offers that no longer exist.');
    console.log('💡 Options to fix:');
    console.log('   1. Update offer_status to "expired" or "cancelled"');
    console.log('   2. Set offer_id to null');
    console.log('   3. Delete the messages (not recommended)');
    console.log('');
    console.log('🔧 The app has been updated to handle these gracefully.');
    console.log('   Rejection/cancellation will now work even with orphaned messages.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixOrphanedOfferMessages();