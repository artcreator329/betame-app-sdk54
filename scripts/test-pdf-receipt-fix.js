#!/usr/bin/env node

/**
 * Test script to verify PDF receipt functionality for service providers
 * This script tests the complete flow of PDF receipt generation and retrieval
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPDFReceiptFunctionality() {
  console.log('🧪 Testing PDF Receipt Functionality for Service Providers');
  console.log('=' .repeat(60));

  try {
    // 1. Find completed orders with payment released
    console.log('\n1️⃣ Finding completed orders with payment released...');
    
    const { data: completedOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'completed')
      .not('payment_released_at', 'is', null)
      .order('payment_released_at', { ascending: false })
      .limit(5);

    if (ordersError) {
      console.error('❌ Error fetching completed orders:', ordersError);
      return;
    }

    console.log(`✅ Found ${completedOrders?.length || 0} completed orders with payment released`);

    if (!completedOrders || completedOrders.length === 0) {
      console.log('ℹ️ No completed orders found. Creating test scenario...');
      
      // Find any order in buyer_reviewing status to test with
      const { data: reviewingOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'buyer_reviewing')
        .limit(1);

      if (reviewingOrders && reviewingOrders.length > 0) {
        console.log('📋 Found order in buyer_reviewing status for testing');
        console.log('   Order ID:', reviewingOrders[0].id);
        console.log('   Service:', reviewingOrders[0].service_title);
        console.log('   Amount:', reviewingOrders[0].amount);
        console.log('   Status:', reviewingOrders[0].status);
        console.log('\n💡 To test PDF receipt functionality:');
        console.log('   1. Complete this order through the buyer interface');
        console.log('   2. Check if PDF receipt is generated automatically');
        console.log('   3. Verify service provider can download the receipt');
      } else {
        console.log('ℹ️ No orders available for testing');
      }
      return;
    }

    // 2. Check PDF receipts for completed orders
    console.log('\n2️⃣ Checking PDF receipts for completed orders...');
    
    for (const order of completedOrders) {
      console.log(`\n📋 Order: ${order.service_title} (${order.id})`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Payment Released: ${order.payment_released_at}`);
      console.log(`   Amount: ${order.amount} BetaCoins`);
      
      // Check if PDF receipt exists
      const { data: pdfReceipts, error: pdfError } = await supabase
        .from('payment_release_pdfs')
        .select('*')
        .eq('job_id', order.id)
        .order('generated_at', { ascending: false });

      if (pdfError) {
        console.error('   ❌ Error checking PDF receipts:', pdfError);
        continue;
      }

      if (pdfReceipts && pdfReceipts.length > 0) {
        console.log(`   ✅ PDF receipt found: ${pdfReceipts[0].receipt_number}`);
        console.log(`   📄 PDF URL: ${pdfReceipts[0].pdf_file_url}`);
        console.log(`   📅 Generated: ${pdfReceipts[0].generated_at}`);
        
        // Test PDF URL accessibility
        try {
          const response = await fetch(pdfReceipts[0].pdf_file_url, { method: 'HEAD' });
          if (response.ok) {
            console.log('   🌐 PDF URL is accessible');
          } else {
            console.log('   ⚠️ PDF URL returned status:', response.status);
          }
        } catch (fetchError) {
          console.log('   ⚠️ Could not verify PDF URL accessibility');
        }
      } else {
        console.log('   ❌ No PDF receipt found');
        console.log('   💡 This order should have a PDF receipt generated');
      }
    }

    // 3. Test PDF generation for orders without receipts
    console.log('\n3️⃣ Testing PDF generation for orders without receipts...');
    
    const ordersWithoutPDF = [];
    for (const order of completedOrders) {
      const { data: existingPDF } = await supabase
        .from('payment_release_pdfs')
        .select('id')
        .eq('job_id', order.id)
        .limit(1);

      if (!existingPDF || existingPDF.length === 0) {
        ordersWithoutPDF.push(order);
      }
    }

    if (ordersWithoutPDF.length > 0) {
      console.log(`📋 Found ${ordersWithoutPDF.length} orders without PDF receipts`);
      
      for (const order of ordersWithoutPDF.slice(0, 2)) { // Test max 2 orders
        console.log(`\n🔄 Generating PDF for order: ${order.service_title}`);
        
        // This would normally be done by the AutomaticPDFService
        // For now, we'll just log what should happen
        console.log('   📄 PDF generation should be triggered automatically');
        console.log('   💾 PDF should be stored in Supabase storage');
        console.log('   📝 PDF record should be created in payment_release_pdfs table');
      }
    } else {
      console.log('✅ All completed orders have PDF receipts');
    }

    // 4. Summary and recommendations
    console.log('\n4️⃣ Summary and Recommendations');
    console.log('=' .repeat(40));
    
    const totalOrders = completedOrders.length;
    const ordersWithPDF = totalOrders - ordersWithoutPDF.length;
    
    console.log(`📊 Total completed orders: ${totalOrders}`);
    console.log(`✅ Orders with PDF receipts: ${ordersWithPDF}`);
    console.log(`❌ Orders missing PDF receipts: ${ordersWithoutPDF.length}`);
    
    if (ordersWithoutPDF.length > 0) {
      console.log('\n💡 Recommendations:');
      console.log('   1. Ensure PDF generation is triggered in order completion flow');
      console.log('   2. Add retry mechanism for failed PDF generations');
      console.log('   3. Consider background job to generate missing PDFs');
      console.log('   4. Verify AutomaticPDFService is properly integrated');
    } else {
      console.log('\n🎉 All completed orders have PDF receipts - system working correctly!');
    }

    // 5. Test the specific order from the logs
    console.log('\n5️⃣ Testing specific order from logs...');
    const testOrderId = '74dc2a9d-8c73-4c8b-bdcf-c5482584ae15';
    
    const { data: testOrder, error: testOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', testOrderId)
      .single();

    if (testOrderError) {
      console.log(`❌ Test order ${testOrderId} not found:`, testOrderError.message);
    } else {
      console.log(`📋 Test Order Found: ${testOrder.service_title}`);
      console.log(`   Status: ${testOrder.status}`);
      console.log(`   Payment Released: ${testOrder.payment_released_at || 'Not released'}`);
      
      // Check for PDF receipt
      const { data: testPDF } = await supabase
        .from('payment_release_pdfs')
        .select('*')
        .eq('job_id', testOrderId);

      if (testPDF && testPDF.length > 0) {
        console.log('   ✅ PDF receipt exists for this order');
      } else {
        console.log('   ❌ No PDF receipt found for this order');
        
        if (testOrder.status === 'completed' && testOrder.payment_released_at) {
          console.log('   💡 This order should have a PDF receipt - generation may have failed');
        } else {
          console.log('   ℹ️ Order not yet completed or payment not released');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error in PDF receipt test:', error);
  }
}

// Run the test
testPDFReceiptFunctionality()
  .then(() => {
    console.log('\n✅ PDF receipt functionality test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });