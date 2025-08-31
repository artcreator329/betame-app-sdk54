const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugOfferRejectionSync() {
  console.log('🔍 Debugging offer rejection synchronization...');
  
  const offerId = 'ad8df4f0-cbbe-45d3-acce-a1102a3aca5e'; // From the logs
  
  try {
    // 1. Check current offer status in database
    console.log('\n1. Checking current offer status in database...');
    const { data: offer, error: offerError } = await supabase
      .from('service_offers')
      .select('*')
      .eq('id', offerId)
      .single();
    
    if (offerError) {
      console.error('❌ Error fetching offer:', offerError);
      return;
    }
    
    console.log('📊 Current offer in database:', {
      id: offer.id,
      status: offer.status,
      rejection_reason: offer.rejection_reason,
      created_at: offer.created_at,
      updated_at: offer.updated_at
    });
    
    // 2. Check chat message status
    console.log('\n2. Checking chat message status...');
    const { data: messages, error: messageError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('offer_id', offerId);
    
    if (messageError) {
      console.error('❌ Error fetching messages:', messageError);
      return;
    }
    
    console.log('💬 Chat messages for this offer:');
    messages.forEach(msg => {
      console.log({
        id: msg.id,
        offer_status: msg.offer_status,
        message_type: msg.message_type,
        sender_id: msg.sender_id,
        created_at: msg.created_at
      });
    });
    
    // 3. Test rejection update
    console.log('\n3. Testing rejection update...');
    const { data: updateResult, error: updateError } = await supabase
      .from('service_offers')
      .update({ 
        status: 'rejected',
        rejection_reason: 'Test rejection for debugging',
        updated_at: new Date().toISOString()
      })
      .eq('id', offerId)
      .select();
    
    if (updateError) {
      console.error('❌ Error updating offer:', updateError);
      return;
    }
    
    console.log('✅ Update result:', updateResult);
    
    // 4. Verify the update
    console.log('\n4. Verifying the update...');
    const { data: verifyOffer, error: verifyError } = await supabase
      .from('service_offers')
      .select('*')
      .eq('id', offerId)
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying offer:', verifyError);
      return;
    }
    
    console.log('✅ Verified offer status:', {
      id: verifyOffer.id,
      status: verifyOffer.status,
      rejection_reason: verifyOffer.rejection_reason,
      updated_at: verifyOffer.updated_at
    });
    
    // 5. Check if there are any triggers or policies affecting this
    console.log('\n5. Checking for potential issues...');
    
    // Check RLS policies
    const { data: policies, error: policyError } = await supabase
      .rpc('get_table_policies', { table_name: 'service_offers' });
    
    if (!policyError && policies) {
      console.log('🔒 RLS Policies for service_offers:');
      policies.forEach(policy => {
        console.log(`- ${policy.policyname}: ${policy.cmd} (${policy.roles})`);
      });
    }
    
    // 6. Test chat message update
    console.log('\n6. Testing chat message update...');
    const { data: msgUpdateResult, error: msgUpdateError } = await supabase
      .from('chat_messages')
      .update({ offer_status: 'rejected' })
      .eq('offer_id', offerId)
      .select();
    
    if (msgUpdateError) {
      console.error('❌ Error updating chat message:', msgUpdateError);
    } else {
      console.log('✅ Chat message update result:', msgUpdateResult);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugOfferRejectionSync();