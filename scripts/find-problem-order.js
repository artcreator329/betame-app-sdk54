#!/usr/bin/env node

/**
 * Script to find the specific order from the logs and understand the table structure
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseKey = '<REDACTED_JWT>';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findProblemOrder() {
  console.log('🔍 Finding the problem order from logs');
  console.log('=' .repeat(40));

  const problemOrderId = '74dc2a9d-8c73-4c8b-bdcf-c5482584ae15';
  console.log(`Looking for order ID: ${problemOrderId}`);

  try {
    // Check all possible tables
    const tables = [
      'orders',
      'active_jobs', 
      'job_status',
      'escrow_transactions',
      'service_offers'
    ];

    for (const table of tables) {
      console.log(`\n🔍 Checking ${table} table...`);
      
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('id', problemOrderId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            console.log(`   ❌ Not found in ${table}`);
          } else {
            console.log(`   ❌ Error querying ${table}:`, error.message);
          }
        } else if (data) {
          console.log(`   ✅ Found in ${table}!`);
          console.log('   📋 Data:', JSON.stringify(data, null, 2));
          
          // If found in active_jobs, check related tables
          if (table === 'active_jobs') {
            console.log('\n🔗 Checking related data...');
            
            // Check if there's a corresponding order
            const { data: relatedOrder } = await supabase
              .from('orders')
              .select('*')
              .eq('service_offer_id', data.service_offer_id || data.id);
            
            if (relatedOrder && relatedOrder.length > 0) {
              console.log('   📋 Related orders:', relatedOrder);
            }
          }
        }
      } catch (tableError) {
        console.log(`   ❌ Error accessing ${table}:`, tableError.message);
      }
    }

    // Also check if it might be a service_offer_id instead
    console.log('\n🔍 Checking if this might be a service_offer_id...');
    
    const { data: ordersByOffer } = await supabase
      .from('orders')
      .select('*')
      .eq('service_offer_id', problemOrderId);

    if (ordersByOffer && ordersByOffer.length > 0) {
      console.log('✅ Found orders with this service_offer_id:');
      ordersByOffer.forEach(order => {
        console.log(`   📋 Order: ${order.id}`);
        console.log(`      Service: ${order.service_title}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Payment Released: ${order.payment_released_at || 'No'}`);
      });
    }

    // Check recent orders and active_jobs to understand the system
    console.log('\n📊 System Overview:');
    
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, service_title, status, payment_released_at, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`📋 Recent Orders (${recentOrders?.length || 0}):`);
    if (recentOrders && recentOrders.length > 0) {
      recentOrders.forEach(order => {
        console.log(`   ${order.service_title} - ${order.status} (${order.id})`);
      });
    }

    const { data: recentActiveJobs } = await supabase
      .from('active_jobs')
      .select('id, title, status, payment_released_at, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`\n🔧 Recent Active Jobs (${recentActiveJobs?.length || 0}):`);
    if (recentActiveJobs && recentActiveJobs.length > 0) {
      recentActiveJobs.forEach(job => {
        console.log(`   ${job.title} - ${job.status} (${job.id})`);
      });
    }

    // Check payment_release_pdfs to see what's there
    const { data: allPDFs } = await supabase
      .from('payment_release_pdfs')
      .select('job_id, job_title, job_table_source, generated_at')
      .order('generated_at', { ascending: false })
      .limit(10);

    console.log(`\n📄 PDF Receipts (${allPDFs?.length || 0}):`);
    if (allPDFs && allPDFs.length > 0) {
      allPDFs.forEach(pdf => {
        console.log(`   ${pdf.job_title} - ${pdf.job_table_source} (${pdf.job_id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error in search:', error);
  }
}

findProblemOrder()
  .then(() => {
    console.log('\n✅ Search completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Search failed:', error);
    process.exit(1);
  });