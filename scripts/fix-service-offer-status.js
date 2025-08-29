#!/usr/bin/env node

/**
 * Fix Service Offer Status Issue
 * 
 * This script fixes the issue where service offers are paid but still show as pending
 * by properly linking active jobs to service offers and updating statuses.
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://rkcfgebgpixgfvggbwmc.supabase.co',
  '<REDACTED_JWT>'
);

async function fixServiceOfferStatus() {
  console.log('🔧 Fixing Service Offer Status Issues...\n');

  try {
    // Step 1: Find the problematic service offer and active job
    console.log('1️⃣ Finding problematic service offer and active job...');
    
    const { data: pendingOffers, error: offersError } = await supabase
      .from('service_offers')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (offersError) throw offersError;

    const { data: unlinkedJobs, error: jobsError } = await supabase
      .from('active_jobs')
      .select('*')
      .is('service_offer_id', null)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    console.log(`📊 Found ${pendingOffers.length} pending offers`);
    console.log(`📊 Found ${unlinkedJobs.length} unlinked paid jobs`);

    if (pendingOffers.length === 0 || unlinkedJobs.length === 0) {
      console.log('✅ No issues found to fix');
      return;
    }

    // Step 2: Match offers with jobs based on price, buyer, and service provider
    console.log('\n2️⃣ Matching offers with jobs...');
    
    const matches = [];
    
    for (const offer of pendingOffers) {
      for (const job of unlinkedJobs) {
        // Check if they match based on:
        // 1. Same buyer
        // 2. Same service provider
        // 3. Similar price (job price includes fees)
        const offerPrice = offer.custom_price || offer.original_price;
        const jobPrice = job.price;
        
        // Job price should be offer price + 2.2% fee
        const expectedJobPrice = offerPrice * 1.022;
        const priceDifference = Math.abs(jobPrice - expectedJobPrice);
        
        if (offer.buyer_id === job.buyer_id && 
            (offer.service_provider_id === job.service_provider_id || offer.seller_id === job.service_provider_id) &&
            priceDifference < 0.01) { // Allow small rounding differences
          
          matches.push({ offer, job });
          console.log(`✅ Match found: Offer ${offer.id} -> Job ${job.id}`);
          console.log(`   Offer price: ${offerPrice}, Job price: ${jobPrice}`);
          break;
        }
      }
    }

    if (matches.length === 0) {
      console.log('❌ No matches found between pending offers and unlinked jobs');
      return;
    }

    // Step 3: Fix the matches
    console.log(`\n3️⃣ Fixing ${matches.length} matches...\n`);
    
    let fixedCount = 0;
    let errorCount = 0;

    for (const { offer, job } of matches) {
      try {
        console.log(`🔧 Fixing offer ${offer.id} and job ${job.id}...`);

        // Update the active job to link it to the service offer
        const { error: jobUpdateError } = await supabase
          .from('active_jobs')
          .update({ 
            service_offer_id: offer.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        if (jobUpdateError) {
          console.error(`❌ Failed to update job ${job.id}:`, jobUpdateError.message);
          errorCount++;
          continue;
        }

        // Update service offer status to accepted
        const { error: offerUpdateError } = await supabase
          .from('service_offers')
          .update({ 
            status: 'accepted',
            updated_at: new Date().toISOString()
          })
          .eq('id', offer.id);

        if (offerUpdateError) {
          console.error(`❌ Failed to update offer ${offer.id}:`, offerUpdateError.message);
          errorCount++;
          continue;
        }

        // Update corresponding chat message status
        const { error: messageUpdateError } = await supabase
          .from('chat_messages')
          .update({ offer_status: 'accepted' })
          .eq('offer_id', offer.id);

        if (messageUpdateError) {
          console.error(`❌ Failed to update message for offer ${offer.id}:`, messageUpdateError.message);
          // Don't count as error since the main updates succeeded
        }

        console.log(`✅ Fixed offer ${offer.id} and job ${job.id}`);
        fixedCount++;

      } catch (error) {
        console.error(`❌ Error fixing offer ${offer.id} and job ${job.id}:`, error.message);
        errorCount++;
      }
    }

    // Step 4: Summary
    console.log('\n4️⃣ Fix Summary:');
    console.log(`   ✅ Matches fixed: ${fixedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (fixedCount > 0) {
      console.log('\n🎉 Service offer status issues have been fixed!');
      console.log('📱 The service offer should now show as "ACCEPTED" in the chat.');
      console.log('🔔 The service provider should have received a notification about the paid order.');
    }

    // Step 5: Verify the fix
    console.log('\n5️⃣ Verifying the fix...');
    
    const { data: updatedOffer, error: verifyError } = await supabase
      .from('service_offers')
      .select('*')
      .eq('id', matches[0]?.offer.id)
      .single();

    if (verifyError) {
      console.log('❌ Error verifying fix:', verifyError.message);
    } else if (updatedOffer) {
      console.log(`✅ Offer ${updatedOffer.id} status is now: ${updatedOffer.status}`);
      
      const { data: updatedMessage } = await supabase
        .from('chat_messages')
        .select('offer_status')
        .eq('offer_id', updatedOffer.id)
        .single();

      if (updatedMessage) {
        console.log(`✅ Chat message status is now: ${updatedMessage.offer_status}`);
      }
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

// Run the fix
fixServiceOfferStatus();