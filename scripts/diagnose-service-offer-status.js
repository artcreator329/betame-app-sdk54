#!/usr/bin/env node

/**
 * Diagnose Service Offer Status Issue
 * 
 * This script checks for service offers that have been paid but still show as pending
 * and fixes the status inconsistencies.
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://rkcfgebgpixgfvggbwmc.supabase.co',
  '<REDACTED_JWT>'
);

async function diagnoseServiceOfferStatus() {
  console.log('🔍 Diagnosing Service Offer Status Issues...\n');

  try {
    // Step 1: Check all service offers
    console.log('1️⃣ Checking all service offers...');
    const { data: allOffers, error: offersError } = await supabase
      .from('service_offers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (offersError) throw offersError;

    console.log(`📊 Found ${allOffers.length} recent service offers`);
    
    if (allOffers.length > 0) {
      console.log('\n📋 Recent service offers:');
      allOffers.forEach((offer, index) => {
        console.log(`   ${index + 1}. ID: ${offer.id}`);
        console.log(`      Status: ${offer.status}`);
        console.log(`      Price: ${offer.custom_price || offer.original_price}`);
        console.log(`      Created: ${new Date(offer.created_at).toLocaleString()}`);
        console.log(`      Buyer: ${offer.buyer_id}`);
        console.log(`      Service Provider: ${offer.service_provider_id || offer.seller_id}`);
        console.log('');
      });
    }

    // Step 2: Check for orders that correspond to service offers
    console.log('2️⃣ Checking orders linked to service offers...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.log('❌ Error checking orders:', ordersError.message);
    } else {
      console.log(`📊 Found ${orders.length} recent orders`);
      
      if (orders.length > 0) {
        console.log('\n📋 Recent orders:');
        orders.forEach((order, index) => {
          console.log(`   ${index + 1}. ID: ${order.id}`);
          console.log(`      Service Offer ID: ${order.service_offer_id}`);
          console.log(`      Status: ${order.status}`);
          console.log(`      Amount: ${order.amount}`);
          console.log(`      Created: ${new Date(order.created_at).toLocaleString()}`);
          console.log('');
        });
      }
    }

    // Step 3: Check for active jobs
    console.log('3️⃣ Checking active jobs...');
    const { data: activeJobs, error: jobsError } = await supabase
      .from('active_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      console.log('❌ Error checking active jobs:', jobsError.message);
    } else {
      console.log(`📊 Found ${activeJobs.length} recent active jobs`);
      
      if (activeJobs.length > 0) {
        console.log('\n📋 Recent active jobs:');
        activeJobs.forEach((job, index) => {
          console.log(`   ${index + 1}. ID: ${job.id}`);
          console.log(`      Service Offer ID: ${job.service_offer_id}`);
          console.log(`      Status: ${job.status}`);
          console.log(`      Payment Status: ${job.payment_status}`);
          console.log(`      Price: ${job.price}`);
          console.log(`      Created: ${new Date(job.created_at).toLocaleString()}`);
          console.log('');
        });
      }
    }

    // Step 4: Check chat messages with offers
    console.log('4️⃣ Checking chat messages with service offers...');
    const { data: chatMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('message_type', 'offer')
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.log('❌ Error checking chat messages:', messagesError.message);
    } else {
      console.log(`📊 Found ${chatMessages.length} recent offer messages`);
      
      if (chatMessages.length > 0) {
        console.log('\n📋 Recent offer messages:');
        chatMessages.forEach((message, index) => {
          console.log(`   ${index + 1}. Message ID: ${message.id}`);
          console.log(`      Offer ID: ${message.offer_id}`);
          console.log(`      Offer Status: ${message.offer_status}`);
          console.log(`      Custom Price: ${message.custom_price}`);
          console.log(`      Created: ${new Date(message.created_at).toLocaleString()}`);
          console.log('');
        });
      }
    }

    // Step 5: Check for payment transactions
    console.log('5️⃣ Checking payment transactions...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('payment_type', 'service_payment')
      .order('created_at', { ascending: false })
      .limit(10);

    if (paymentsError) {
      console.log('❌ Error checking payments:', paymentsError.message);
    } else {
      console.log(`📊 Found ${payments.length} recent service payments`);
      
      if (payments.length > 0) {
        console.log('\n📋 Recent service payments:');
        payments.forEach((payment, index) => {
          console.log(`   ${index + 1}. Payment ID: ${payment.id}`);
          console.log(`      Order ID: ${payment.order_id}`);
          console.log(`      Status: ${payment.status}`);
          console.log(`      Amount: ${payment.amount}`);
          console.log(`      Created: ${new Date(payment.created_at).toLocaleString()}`);
          console.log('');
        });
      }
    }

    // Step 6: Look for inconsistencies
    console.log('6️⃣ Looking for status inconsistencies...\n');
    
    // Find service offers that have corresponding active jobs but are still pending
    if (allOffers.length > 0 && activeJobs.length > 0) {
      const pendingOffers = allOffers.filter(offer => offer.status === 'pending');
      const jobOfferIds = new Set(activeJobs.map(job => job.service_offer_id).filter(Boolean));
      
      const inconsistentOffers = pendingOffers.filter(offer => jobOfferIds.has(offer.id));
      
      if (inconsistentOffers.length > 0) {
        console.log('🚨 FOUND INCONSISTENCIES:');
        console.log(`   ${inconsistentOffers.length} service offers are marked as 'pending' but have active jobs`);
        console.log('\n📋 Inconsistent offers:');
        
        inconsistentOffers.forEach((offer, index) => {
          const relatedJob = activeJobs.find(job => job.service_offer_id === offer.id);
          console.log(`   ${index + 1}. Offer ID: ${offer.id}`);
          console.log(`      Offer Status: ${offer.status} (should be 'accepted')`);
          console.log(`      Job ID: ${relatedJob?.id}`);
          console.log(`      Job Status: ${relatedJob?.status}`);
          console.log(`      Job Payment Status: ${relatedJob?.payment_status}`);
          console.log('');
        });

        // Step 7: Fix the inconsistencies
        console.log('7️⃣ Fixing status inconsistencies...\n');
        
        let fixedCount = 0;
        let errorCount = 0;

        for (const offer of inconsistentOffers) {
          try {
            console.log(`🔧 Fixing offer ${offer.id}...`);
            
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
              // Don't count as error since offer was updated successfully
            }

            console.log(`✅ Fixed offer ${offer.id}`);
            fixedCount++;

          } catch (error) {
            console.error(`❌ Error fixing offer ${offer.id}:`, error.message);
            errorCount++;
          }
        }

        console.log('\n📊 Fix Summary:');
        console.log(`   ✅ Offers fixed: ${fixedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);

        if (fixedCount > 0) {
          console.log('\n🎉 Status inconsistencies have been fixed!');
          console.log('📱 Service offers should now show as "ACCEPTED" in the chat.');
        }

      } else {
        console.log('✅ No status inconsistencies found');
      }
    }

    // Step 8: Check for missing notifications
    console.log('\n8️⃣ Checking for missing order notifications...');
    
    if (activeJobs.length > 0) {
      const jobIds = activeJobs.map(job => job.id);
      
      const { data: notifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'order')
        .in('data->>orderId', jobIds);

      if (notificationsError) {
        console.log('❌ Error checking notifications:', notificationsError.message);
      } else {
        const notificationJobIds = new Set(
          notifications.map(n => n.data?.orderId).filter(Boolean)
        );
        
        const jobsWithoutNotifications = activeJobs.filter(job => 
          !notificationJobIds.has(job.id)
        );

        if (jobsWithoutNotifications.length > 0) {
          console.log(`🚨 Found ${jobsWithoutNotifications.length} active jobs without notifications`);
          
          // Create missing notifications
          let notificationsCreated = 0;
          
          for (const job of jobsWithoutNotifications) {
            try {
              // Get buyer profile
              const { data: buyerProfile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', job.buyer_id)
                .single();

              const buyerName = buyerProfile?.full_name || 'Customer';
              const buyerImage = buyerProfile?.avatar_url || '';

              const notificationData = {
                user_id: job.service_provider_id,
                type: 'order',
                title: `New Order from ${buyerName}`,
                message: `Payment received for "${job.title}" - ${job.currency} ${job.price}`,
                data: {
                  orderId: job.id,
                  participantId: job.buyer_id,
                  participantName: buyerName,
                  participantImage: buyerImage,
                  serviceTitle: job.title,
                  amount: job.price,
                  currency: job.currency,
                  orderStatus: job.status,
                  isBackfilled: true,
                  backfilledAt: new Date().toISOString()
                },
                created_at: job.created_at,
                is_read: false
              };

              const { error: notificationError } = await supabase
                .from('notifications')
                .insert(notificationData);

              if (notificationError) {
                console.error(`❌ Failed to create notification for job ${job.id}:`, notificationError.message);
              } else {
                console.log(`✅ Created notification for job ${job.id}`);
                notificationsCreated++;
              }

            } catch (error) {
              console.error(`❌ Error creating notification for job ${job.id}:`, error.message);
            }
          }

          console.log(`📊 Created ${notificationsCreated} missing notifications`);
        } else {
          console.log('✅ All active jobs have notifications');
        }
      }
    }

    console.log('\n🎉 Diagnosis complete!');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    process.exit(1);
  }
}

// Run the diagnosis
diagnoseServiceOfferStatus();