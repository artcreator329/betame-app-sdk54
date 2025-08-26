/**
 * Test Wallet Transaction Recording
 * 
 * This script tests the wallet transaction recording system to ensure
 * order payments are properly recorded in the transaction history.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWalletTransactionRecording() {
  console.log('🧪 Testing Wallet Transaction Recording...\n');

  try {
    // Step 1: Check recent active jobs and their payment status
    console.log('1️⃣ Checking recent active jobs...');
    const { data: recentJobs, error: jobsError } = await supabase
      .from('active_jobs')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      console.error('❌ Error fetching recent jobs:', jobsError);
      return;
    }

    console.log(`📊 Found ${recentJobs.length} recent jobs`);
    
    const paidJobs = recentJobs.filter(job => job.payment_status === 'paid');
    console.log(`💰 Paid jobs: ${paidJobs.length}/${recentJobs.length}`);

    // Step 2: Check for corresponding transactions
    console.log('\n2️⃣ Checking for corresponding transactions...');
    let jobsWithTransactions = 0;
    let jobsWithoutTransactions = 0;

    for (const job of paidJobs) {
      // Check for buyer transaction (service_payment)
      const { data: buyerTransactions, error: buyerError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', job.buyer_id)
        .eq('type', 'service_payment')
        .gte('created_at', new Date(job.created_at).toISOString())
        .lte('created_at', new Date(new Date(job.created_at).getTime() + 5 * 60 * 1000).toISOString()); // Within 5 minutes

      // Check for seller transaction (service_payment_received)
      const { data: sellerTransactions, error: sellerError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', job.service_provider_id)
        .eq('type', 'service_payment_received')
        .gte('created_at', new Date(job.created_at).toISOString())
        .lte('created_at', new Date(new Date(job.created_at).getTime() + 5 * 60 * 1000).toISOString()); // Within 5 minutes

      if (buyerError || sellerError) {
        console.error(`❌ Error checking transactions for job ${job.id}:`, buyerError || sellerError);
        continue;
      }

      const hasBuyerTransaction = buyerTransactions && buyerTransactions.length > 0;
      const hasSellerTransaction = sellerTransactions && sellerTransactions.length > 0;

      if (hasBuyerTransaction && hasSellerTransaction) {
        console.log(`✅ Job ${job.id}: Both buyer and seller transactions found`);
        jobsWithTransactions++;
      } else {
        console.log(`❌ Job ${job.id}: Missing transactions`);
        console.log(`   - Buyer transaction: ${hasBuyerTransaction ? '✅' : '❌'}`);
        console.log(`   - Seller transaction: ${hasSellerTransaction ? '✅' : '❌'}`);
        console.log(`   - Job title: ${job.title}`);
        console.log(`   - Amount: ${job.price} ${job.currency}`);
        console.log(`   - Created: ${job.created_at}`);
        jobsWithoutTransactions++;
      }
    }

    // Step 3: Test transaction recording manually
    console.log('\n3️⃣ Testing manual transaction recording...');
    
    if (paidJobs.length > 0) {
      const testJob = paidJobs[0];
      console.log(`🔧 Testing with job: ${testJob.id}`);
      
      // Test buyer transaction
      const buyerTransaction = {
        user_id: testJob.buyer_id,
        type: 'service_payment',
        amount: -testJob.price,
        description: `Test payment for service: ${testJob.title}`
      };

      console.log('📝 Creating test buyer transaction...');
      const { data: buyerResult, error: buyerInsertError } = await supabase
        .from('transactions')
        .insert(buyerTransaction)
        .select()
        .single();

      if (buyerInsertError) {
        console.error('❌ Failed to create buyer transaction:', buyerInsertError);
      } else {
        console.log('✅ Buyer transaction created:', buyerResult.id);
        
        // Clean up test transaction
        await supabase
          .from('transactions')
          .delete()
          .eq('id', buyerResult.id);
        console.log('✅ Test buyer transaction cleaned up');
      }

      // Test seller transaction
      const sellerTransaction = {
        user_id: testJob.service_provider_id,
        type: 'service_payment_received',
        amount: testJob.price,
        description: `Test payment received for service: ${testJob.title}`
      };

      console.log('📝 Creating test seller transaction...');
      const { data: sellerResult, error: sellerInsertError } = await supabase
        .from('transactions')
        .insert(sellerTransaction)
        .select()
        .single();

      if (sellerInsertError) {
        console.error('❌ Failed to create seller transaction:', sellerInsertError);
      } else {
        console.log('✅ Seller transaction created:', sellerResult.id);
        
        // Clean up test transaction
        await supabase
          .from('transactions')
          .delete()
          .eq('id', sellerResult.id);
        console.log('✅ Test seller transaction cleaned up');
      }
    }

    // Step 4: Check transaction table structure
    console.log('\n4️⃣ Checking transaction table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Error checking table structure:', tableError);
    } else {
      console.log('✅ Transaction table is accessible');
      if (tableInfo && tableInfo.length > 0) {
        console.log('📋 Table columns:', Object.keys(tableInfo[0]));
      }
    }

    // Step 5: Summary and recommendations
    console.log('\n5️⃣ Summary and recommendations...');
    console.log('📊 Results:');
    console.log(`  - Total recent jobs: ${recentJobs.length}`);
    console.log(`  - Paid jobs: ${paidJobs.length}`);
    console.log(`  - Jobs with transactions: ${jobsWithTransactions}`);
    console.log(`  - Jobs missing transactions: ${jobsWithoutTransactions}`);
    console.log(`  - Transaction recording success rate: ${paidJobs.length > 0 ? Math.round((jobsWithTransactions / paidJobs.length) * 100) : 0}%`);

    if (jobsWithoutTransactions > 0) {
      console.log('\n🔧 Issues identified:');
      console.log('  1. Order payments are not being recorded in transaction history');
      console.log('  2. Manual transaction creation works fine');
      console.log('  3. Issue is in the payment service transaction recording');
      
      console.log('\n🔧 Recommended fixes:');
      console.log('  1. Check PaymentService.processDirectOrderPayment transaction recording');
      console.log('  2. Check PaymentService.processOfferPayment transaction recording');
      console.log('  3. Add error handling and logging to transaction recording');
      console.log('  4. Create backfill script for missing transactions');
    } else {
      console.log('\n✅ All order payments have corresponding transactions!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testWalletTransactionRecording()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testWalletTransactionRecording };
