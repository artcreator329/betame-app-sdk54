#!/usr/bin/env node

/**
 * Debug script to check order statuses and identify the PDF receipt issue
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseKey = '<REDACTED_JWT>';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOrderStatus() {
  console.log('🔍 Debugging Order Status and PDF Receipt Issue');
  console.log('=' .repeat(50));

  try {
    // 1. Check all order statuses
    console.log('\n1️⃣ Checking all order statuses...');
    
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, payment_released_at, service_title, amount, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return;
    }

    console.log(`📋 Found ${allOrders?.length || 0} orders`);
    
    if (allOrders && allOrders.length > 0) {
      const statusCounts = {};
      allOrders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });

      console.log('\n📊 Order Status Distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });

      console.log('\n📋 Recent Orders:');
      allOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.service_title} (${order.id})`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Amount: ${order.amount} BetaCoins`);
        console.log(`      Payment Released: ${order.payment_released_at || 'Not released'}`);
        console.log(`      Created: ${order.created_at}`);
        console.log('');
      });
    }

    // 2. Check the specific order from the logs
    console.log('\n2️⃣ Checking specific order from logs...');
    const problemOrderId = '74dc2a9d-8c73-4c8b-bdcf-c5482584ae15';
    
    const { data: problemOrder, error: problemOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', problemOrderId)
      .single();

    if (problemOrderError) {
      console.log(`❌ Problem order ${problemOrderId} not found:`, problemOrderError.message);
      
      // Check if it might be in a different table
      console.log('\n🔍 Checking other tables for this ID...');
      
      // Check active_jobs
      const { data: activeJob } = await supabase
        .from('active_jobs')
        .select('*')
        .eq('id', problemOrderId)
        .single();

      if (activeJob) {
        console.log('✅ Found in active_jobs table:');
        console.log(`   Title: ${activeJob.title}`);
        console.log(`   Status: ${activeJob.status}`);
        console.log(`   Payment Released: ${activeJob.payment_released_at || 'Not released'}`);
      }

      // Check job_status
      const { data: jobStatus } = await supabase
        .from('job_status')
        .select('*')
        .eq('id', problemOrderId)
        .single();

      if (jobStatus) {
        console.log('✅ Found in job_status table:');
        console.log(`   Status: ${jobStatus.current_status}`);
        console.log(`   Service Offer ID: ${jobStatus.service_offer_id}`);
      }

    } else {
      console.log(`✅ Problem Order Found: ${problemOrder.service_title}`);
      console.log(`   Status: ${problemOrder.status}`);
      console.log(`   Payment Released: ${problemOrder.payment_released_at || 'Not released'}`);
      console.log(`   Service Provider ID: ${problemOrder.service_provider_id || problemOrder.seller_id}`);
      console.log(`   Buyer ID: ${problemOrder.buyer_id}`);
      console.log(`   Amount: ${problemOrder.amount}`);
      console.log(`   Created: ${problemOrder.created_at}`);
      
      // Check for PDF receipt
      const { data: problemPDF } = await supabase
        .from('payment_release_pdfs')
        .select('*')
        .eq('job_id', problemOrderId);

      if (problemPDF && problemPDF.length > 0) {
        console.log('   ✅ PDF receipt exists');
        console.log(`   📄 Receipt Number: ${problemPDF[0].receipt_number}`);
        console.log(`   📄 PDF URL: ${problemPDF[0].pdf_file_url}`);
      } else {
        console.log('   ❌ No PDF receipt found');
      }
    }

    // 3. Check payment_release_pdfs table
    console.log('\n3️⃣ Checking payment_release_pdfs table...');
    
    const { data: allPDFs, error: pdfError } = await supabase
      .from('payment_release_pdfs')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(5);

    if (pdfError) {
      console.error('❌ Error fetching PDF receipts:', pdfError);
    } else {
      console.log(`📋 Found ${allPDFs?.length || 0} PDF receipts`);
      
      if (allPDFs && allPDFs.length > 0) {
        console.log('\n📄 Recent PDF Receipts:');
        allPDFs.forEach((pdf, index) => {
          console.log(`   ${index + 1}. ${pdf.job_title} (${pdf.job_id})`);
          console.log(`      Receipt: ${pdf.receipt_number}`);
          console.log(`      Generated: ${pdf.generated_at}`);
          console.log(`      Table Source: ${pdf.job_table_source}`);
          console.log('');
        });
      }
    }

    // 4. Check if there are orders that should have PDFs but don't
    console.log('\n4️⃣ Checking for orders that should have PDF receipts...');
    
    const { data: shouldHavePDF, error: shouldHavePDFError } = await supabase
      .from('orders')
      .select('id, service_title, status, payment_released_at, amount')
      .in('status', ['completed', 'payment_released'])
      .order('created_at', { ascending: false });

    if (shouldHavePDFError) {
      console.error('❌ Error checking orders that should have PDFs:', shouldHavePDFError);
    } else {
      console.log(`📋 Found ${shouldHavePDF?.length || 0} orders that should have PDF receipts`);
      
      if (shouldHavePDF && shouldHavePDF.length > 0) {
        for (const order of shouldHavePDF) {
          const { data: existingPDF } = await supabase
            .from('payment_release_pdfs')
            .select('id')
            .eq('job_id', order.id)
            .limit(1);

          const hasPDF = existingPDF && existingPDF.length > 0;
          console.log(`   ${hasPDF ? '✅' : '❌'} ${order.service_title} (${order.id})`);
          console.log(`      Status: ${order.status}, Payment Released: ${order.payment_released_at || 'No'}`);
          
          if (!hasPDF) {
            console.log(`      💡 Missing PDF receipt`);
          }
        }
      }
    }

    // 5. Summary
    console.log('\n5️⃣ Summary');
    console.log('=' .repeat(30));
    
    const totalOrders = allOrders?.length || 0;
    const completedOrders = allOrders?.filter(o => o.status === 'completed' || o.status === 'payment_released').length || 0;
    const ordersWithPaymentReleased = allOrders?.filter(o => o.payment_released_at).length || 0;
    const totalPDFs = allPDFs?.length || 0;
    
    console.log(`📊 Total Orders: ${totalOrders}`);
    console.log(`✅ Completed Orders: ${completedOrders}`);
    console.log(`💰 Orders with Payment Released: ${ordersWithPaymentReleased}`);
    console.log(`📄 Total PDF Receipts: ${totalPDFs}`);
    
    if (completedOrders > 0 && totalPDFs === 0) {
      console.log('\n❌ Issue Identified: Completed orders exist but no PDF receipts found');
      console.log('💡 Recommendation: PDF generation is not working properly');
    } else if (ordersWithPaymentReleased > totalPDFs) {
      console.log('\n⚠️ Issue Identified: Some orders with released payments are missing PDF receipts');
      console.log('💡 Recommendation: PDF generation may be failing for some orders');
    } else {
      console.log('\n✅ PDF receipt system appears to be working correctly');
    }

  } catch (error) {
    console.error('❌ Error in debug script:', error);
  }
}

// Run the debug
debugOrderStatus()
  .then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });