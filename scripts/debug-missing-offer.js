const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugMissingOffer() {
  console.log('🔍 Debugging missing offer issue...');
  
  const offerId = 'ad8df4f0-cbbe-45d3-acce-a1102a3aca5e'; // From the logs
  
  try {
    // 1. Check if offer exists in service_offers table
    console.log('\n1. Checking if offer exists in service_offers table...');
    const { data: offer, error: offerError } = await supabase
      .from('service_offers')
      .select('*')
      .eq('id', offerId);
    
    if (offerError) {
      console.error('❌ Error querying service_offers:', offerError);
    } else {
      console.log('📊 Service offers found:', offer?.length || 0);
      if (offer && offer.length > 0) {
        console.log('✅ Offer exists:', offer[0]);
      } else {
        console.log('❌ Offer NOT found in service_offers table');
      }
    }
    
    // 2. Check if offer exists in chat_messages table
    console.log('\n2. Checking if offer exists in chat_messages table...');
    const { data: messages, error: messageError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('offer_id', offerId);
    
    if (messageError) {
      console.error('❌ Error querying chat_messages:', messageError);
    } else {
      console.log('💬 Chat messages found:', messages?.length || 0);
      if (messages && messages.length > 0) {
        console.log('✅ Messages exist:');
        messages.forEach(msg => {
          console.log({
            id: msg.id,
            offer_id: msg.offer_id,
            offer_status: msg.offer_status,
            message_type: msg.message_type,
            sender_id: msg.sender_id,
            created_at: msg.created_at
          });
        });
      } else {
        console.log('❌ No messages found with this offer_id');
      }
    }
    
    // 3. Search for similar offer IDs (in case of typo)
    console.log('\n3. Searching for similar offer IDs...');
    const { data: similarOffers, error: similarError } = await supabase
      .from('service_offers')
      .select('id, status, created_at')
      .ilike('id', `%${offerId.substring(0, 8)}%`)
      .limit(10);
    
    if (similarError) {
      console.error('❌ Error searching similar offers:', similarError);
    } else {
      console.log('🔍 Similar offers found:', similarOffers?.length || 0);
      if (similarOffers && similarOffers.length > 0) {
        similarOffers.forEach(offer => {
          console.log(`- ${offer.id} (${offer.status}) - ${offer.created_at}`);
        });
      }
    }
    
    // 4. Check recent offers to see the pattern
    console.log('\n4. Checking recent offers...');
    const { data: recentOffers, error: recentError } = await supabase
      .from('service_offers')
      .select('id, status, created_at, buyer_id, seller_id')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      console.error('❌ Error fetching recent offers:', recentError);
    } else {
      console.log('📅 Recent offers:');
      recentOffers?.forEach(offer => {
        console.log({
          id: offer.id,
          status: offer.status,
          created_at: offer.created_at,
          buyer_id: offer.buyer_id,
          seller_id: offer.seller_id
        });
      });
    }
    
    // 5. Check if there are orphaned chat messages
    console.log('\n5. Checking for orphaned chat messages...');
    const { data: orphanedMessages, error: orphanError } = await supabase
      .from('chat_messages')
      .select('id, offer_id, offer_status, created_at')
      .eq('message_type', 'offer')
      .not('offer_id', 'is', null)
      .limit(10);
    
    if (orphanError) {
      console.error('❌ Error checking orphaned messages:', orphanError);
    } else {
      console.log('🔍 Recent offer messages:');
      for (const msg of orphanedMessages || []) {
        // Check if corresponding offer exists
        const { data: correspondingOffer } = await supabase
          .from('service_offers')
          .select('id')
          .eq('id', msg.offer_id)
          .single();
        
        console.log({
          message_id: msg.id,
          offer_id: msg.offer_id,
          offer_status: msg.offer_status,
          created_at: msg.created_at,
          has_corresponding_offer: !!correspondingOffer
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugMissingOffer();