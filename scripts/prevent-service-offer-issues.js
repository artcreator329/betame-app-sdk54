#!/usr/bin/env node

/**
 * Prevent Service Offer Issues
 * 
 * This script adds database constraints and triggers to prevent service offer
 * status inconsistencies in the future.
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://rkcfgebgpixgfvggbwmc.supabase.co',
  '<REDACTED_JWT>'
);

async function preventServiceOfferIssues() {
  console.log('🛡️ Setting up preventive measures for service offer issues...\n');

  try {
    // Step 1: Create a function to automatically update chat message status when service offer status changes
    console.log('1️⃣ Creating trigger function to sync service offer status with chat messages...');
    
    const triggerFunction = `
      CREATE OR REPLACE FUNCTION sync_service_offer_status()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Update chat message status when service offer status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
          UPDATE chat_messages 
          SET offer_status = NEW.status,
              updated_at = NOW()
          WHERE offer_id = NEW.id;
          
          -- Log the sync
          RAISE NOTICE 'Synced offer % status from % to % in chat messages', NEW.id, OLD.status, NEW.status;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: triggerFunction
    });

    if (functionError) {
      console.log('Creating function via direct SQL...');
      // Try direct execution if RPC fails
      const { error: directError } = await supabase
        .from('_sql_exec')
        .insert({ sql: triggerFunction });
      
      if (directError) {
        console.log('⚠️ Could not create trigger function automatically. Please run this SQL manually:');
        console.log(triggerFunction);
      } else {
        console.log('✅ Trigger function created successfully');
      }
    } else {
      console.log('✅ Trigger function created successfully');
    }

    // Step 2: Create the trigger
    console.log('\n2️⃣ Creating trigger to automatically sync status changes...');
    
    const triggerSQL = `
      DROP TRIGGER IF EXISTS sync_service_offer_status_trigger ON service_offers;
      CREATE TRIGGER sync_service_offer_status_trigger
        AFTER UPDATE ON service_offers
        FOR EACH ROW
        EXECUTE FUNCTION sync_service_offer_status();
    `;

    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: triggerSQL
    });

    if (triggerError) {
      console.log('⚠️ Could not create trigger automatically. Please run this SQL manually:');
      console.log(triggerSQL);
    } else {
      console.log('✅ Trigger created successfully');
    }

    // Step 3: Create a monitoring function to detect inconsistencies
    console.log('\n3️⃣ Creating monitoring function...');
    
    const monitoringFunction = `
      CREATE OR REPLACE FUNCTION check_service_offer_consistency()
      RETURNS TABLE(
        offer_id UUID,
        offer_status TEXT,
        message_status TEXT,
        job_id UUID,
        job_payment_status TEXT,
        inconsistency_type TEXT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          so.id as offer_id,
          so.status as offer_status,
          cm.offer_status as message_status,
          aj.id as job_id,
          aj.payment_status as job_payment_status,
          CASE 
            WHEN so.status != cm.offer_status THEN 'status_mismatch'
            WHEN aj.payment_status = 'paid' AND so.status = 'pending' THEN 'paid_but_pending'
            WHEN aj.service_offer_id IS NULL AND aj.payment_status = 'paid' THEN 'unlinked_paid_job'
            ELSE 'unknown'
          END as inconsistency_type
        FROM service_offers so
        LEFT JOIN chat_messages cm ON cm.offer_id = so.id
        LEFT JOIN active_jobs aj ON aj.service_offer_id = so.id
        WHERE 
          so.status != cm.offer_status 
          OR (aj.payment_status = 'paid' AND so.status = 'pending')
          OR (aj.service_offer_id IS NULL AND aj.payment_status = 'paid');
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: monitoringError } = await supabase.rpc('exec_sql', {
      sql: monitoringFunction
    });

    if (monitoringError) {
      console.log('⚠️ Could not create monitoring function automatically. Please run this SQL manually:');
      console.log(monitoringFunction);
    } else {
      console.log('✅ Monitoring function created successfully');
    }

    // Step 4: Test the monitoring function
    console.log('\n4️⃣ Testing monitoring function...');
    
    try {
      const { data: inconsistencies, error: testError } = await supabase
        .rpc('check_service_offer_consistency');

      if (testError) {
        console.log('⚠️ Could not test monitoring function:', testError.message);
      } else {
        console.log(`📊 Found ${inconsistencies?.length || 0} inconsistencies`);
        
        if (inconsistencies && inconsistencies.length > 0) {
          console.log('🚨 Current inconsistencies:');
          inconsistencies.forEach((inc, index) => {
            console.log(`   ${index + 1}. Offer ${inc.offer_id}: ${inc.inconsistency_type}`);
          });
        } else {
          console.log('✅ No inconsistencies found');
        }
      }
    } catch (error) {
      console.log('⚠️ Could not test monitoring function:', error.message);
    }

    // Step 5: Create a cleanup function
    console.log('\n5️⃣ Creating cleanup function for future use...');
    
    const cleanupFunction = `
      CREATE OR REPLACE FUNCTION fix_service_offer_inconsistencies()
      RETURNS TABLE(
        fixed_offer_id UUID,
        action_taken TEXT
      ) AS $$
      DECLARE
        rec RECORD;
      BEGIN
        -- Fix status mismatches between service_offers and chat_messages
        FOR rec IN 
          SELECT so.id, so.status, cm.offer_status
          FROM service_offers so
          JOIN chat_messages cm ON cm.offer_id = so.id
          WHERE so.status != cm.offer_status
        LOOP
          UPDATE chat_messages 
          SET offer_status = rec.status,
              updated_at = NOW()
          WHERE offer_id = rec.id;
          
          RETURN QUERY SELECT rec.id, 'synced_message_status'::TEXT;
        END LOOP;
        
        -- Fix paid jobs with pending offers
        FOR rec IN
          SELECT so.id, aj.id as job_id
          FROM service_offers so
          JOIN active_jobs aj ON aj.service_offer_id = so.id
          WHERE aj.payment_status = 'paid' AND so.status = 'pending'
        LOOP
          UPDATE service_offers 
          SET status = 'accepted',
              updated_at = NOW()
          WHERE id = rec.id;
          
          UPDATE chat_messages 
          SET offer_status = 'accepted',
              updated_at = NOW()
          WHERE offer_id = rec.id;
          
          RETURN QUERY SELECT rec.id, 'fixed_paid_pending'::TEXT;
        END LOOP;
        
        RETURN;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: cleanupError } = await supabase.rpc('exec_sql', {
      sql: cleanupFunction
    });

    if (cleanupError) {
      console.log('⚠️ Could not create cleanup function automatically. Please run this SQL manually:');
      console.log(cleanupFunction);
    } else {
      console.log('✅ Cleanup function created successfully');
    }

    console.log('\n🎉 Preventive measures setup complete!');
    console.log('\n📋 Available functions:');
    console.log('   • check_service_offer_consistency() - Monitor for issues');
    console.log('   • fix_service_offer_inconsistencies() - Auto-fix issues');
    console.log('   • sync_service_offer_status() - Trigger function (auto-runs)');
    
    console.log('\n🔧 Usage examples:');
    console.log('   SELECT * FROM check_service_offer_consistency();');
    console.log('   SELECT * FROM fix_service_offer_inconsistencies();');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
preventServiceOfferIssues();