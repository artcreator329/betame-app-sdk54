#!/usr/bin/env node

/**
 * 🔍 REAL-TIME MONITOR: Offer Status Changes
 * 
 * This script monitors offer status changes in real-time to detect
 * any unwanted reversions from rejected back to pending.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Track status changes
const statusHistory = new Map();

function logStatusChange(offerId, oldStatus, newStatus, timestamp) {
  const now = new Date().toISOString();
  
  if (!statusHistory.has(offerId)) {
    statusHistory.set(offerId, []);
  }
  
  const history = statusHistory.get(offerId);
  history.push({
    timestamp: now,
    oldStatus,
    newStatus,
    dbTimestamp: timestamp
  });
  
  console.log(`\n🔄 STATUS CHANGE DETECTED:`);
  console.log(`   Offer ID: ${offerId}`);
  console.log(`   Change: ${oldStatus} → ${newStatus}`);
  console.log(`   Time: ${now}`);
  console.log(`   DB Time: ${timestamp}`);
  
  // Check for problematic reversion
  if (oldStatus === 'rejected' && newStatus === 'pending') {
    console.log('🚨 CRITICAL ALERT: REJECTED OFFER REVERTED TO PENDING!');
    console.log('🚨 This indicates the bilateral sync fix is not working!');
    console.log('🚨 IMMEDIATE ATTENTION REQUIRED!');
    
    // Show history for this offer
    console.log('\n📊 Status History for this offer:');
    history.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.oldStatus} → ${entry.newStatus} at ${entry.timestamp}`);
    });
  } else if (oldStatus === 'pending' && newStatus === 'rejected') {
    console.log('✅ GOOD: Offer properly rejected');
  } else if (oldStatus === 'pending' && newStatus === 'accepted') {
    console.log('✅ GOOD: Offer properly accepted');
  }
}

async function startMonitoring() {
  console.log('🔍 STARTING REAL-TIME OFFER STATUS MONITORING');
  console.log('=' .repeat(60));
  console.log('Watching for offer status changes...');
  console.log('Press Ctrl+C to stop monitoring\n');

  // Get initial state of all pending/recent offers
  const { data: initialOffers, error: initialError } = await supabase
    .from('chat_messages')
    .select('offer_id, offer_status, updated_at')
    .not('offer_id', 'is', null)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    .order('created_at', { ascending: false });

  if (initialError) {
    console.error('❌ Failed to get initial offers:', initialError);
    return;
  }

  console.log(`📊 Monitoring ${initialOffers?.length || 0} recent offers`);
  
  // Store initial states
  const currentStates = new Map();
  if (initialOffers) {
    initialOffers.forEach(offer => {
      if (offer.offer_id) {
        currentStates.set(offer.offer_id, {
          status: offer.offer_status,
          timestamp: offer.updated_at
        });
      }
    });
  }

  // Set up real-time subscription
  const subscription = supabase
    .channel('offer-status-monitor')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: 'offer_id=not.is.null'
      },
      (payload) => {
        const { new: newRecord, old: oldRecord } = payload;
        
        if (newRecord.offer_id && newRecord.offer_status !== oldRecord.offer_status) {
          const offerId = newRecord.offer_id;
          const oldStatus = oldRecord.offer_status;
          const newStatus = newRecord.offer_status;
          
          // Update our tracking
          currentStates.set(offerId, {
            status: newStatus,
            timestamp: newRecord.updated_at
          });
          
          logStatusChange(offerId, oldStatus, newStatus, newRecord.updated_at);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time monitoring active');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Real-time subscription error');
      }
    });

  // Periodic check for any missed changes
  setInterval(async () => {
    try {
      const { data: currentOffers, error } = await supabase
        .from('chat_messages')
        .select('offer_id, offer_status, updated_at')
        .not('offer_id', 'is', null)
        .gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('updated_at', { ascending: false });

      if (!error && currentOffers) {
        currentOffers.forEach(offer => {
          if (offer.offer_id) {
            const stored = currentStates.get(offer.offer_id);
            if (stored && stored.status !== offer.offer_status) {
              // Detected a change we missed
              logStatusChange(
                offer.offer_id, 
                stored.status, 
                offer.offer_status, 
                offer.updated_at
              );
              
              currentStates.set(offer.offer_id, {
                status: offer.offer_status,
                timestamp: offer.updated_at
              });
            } else if (!stored) {
              // New offer
              currentStates.set(offer.offer_id, {
                status: offer.offer_status,
                timestamp: offer.updated_at
              });
              console.log(`\n📝 NEW OFFER DETECTED: ${offer.offer_id} (${offer.offer_status})`);
            }
          }
        });
      }
    } catch (error) {
      console.error('⚠️ Periodic check error:', error);
    }
  }, 30000); // Check every 30 seconds

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping monitoring...');
    subscription.unsubscribe();
    
    // Show summary
    console.log('\n📊 MONITORING SUMMARY:');
    console.log(`   Tracked ${statusHistory.size} offers with status changes`);
    
    let problemCount = 0;
    statusHistory.forEach((history, offerId) => {
      const hasReversion = history.some(entry => 
        entry.oldStatus === 'rejected' && entry.newStatus === 'pending'
      );
      if (hasReversion) {
        problemCount++;
        console.log(`   ❌ ${offerId}: Had status reversion!`);
      }
    });
    
    if (problemCount === 0) {
      console.log('   ✅ No problematic status reversions detected');
      console.log('   🎉 Emergency bilateral sync appears to be working!');
    } else {
      console.log(`   🚨 ${problemCount} offers had problematic reversions`);
      console.log('   🚨 Emergency bilateral sync needs investigation!');
    }
    
    process.exit(0);
  });
}

// Start monitoring
startMonitoring().catch(console.error);