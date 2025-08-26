/**
 * Fix Missing Wallet Transactions
 * 
 * This script backfills missing wallet transactions for all paid jobs
 * that don't have corresponding transaction records.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMissingWalletTransactions() {
  console.log('🔧 Fixing Missing Wallet Transactions...\n');

  try {
    // Step 1: Get all paid jobs without transactions
    console.log('1️⃣ Finding paid jobs without transactions...');
    const { data: paidJobs, error: jobsError } = await supabase
      .from('active_jobs')
      .select('*')
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('❌ Error fetching paid jobs:', jobsError);
      return;
    }

    console.log(`📊 Found ${paidJobs.length} paid jobs`);

    // Step 2: Check which jobs are missing transactions
    console.log('\n2️⃣ Checking for missing transactions...');
    const jobsMissingTransactions = [];

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

      if (!hasBuyerTransaction || !hasSellerTransaction) {
        jobsMissingTransactions.push({
          job,
          missingBuyer: !hasBuyerTransaction,
          missingSeller: !hasSellerTransaction
        });
      }
    }

    console.log(`📊 Found ${jobsMissingTransactions.length} jobs missing transactions`);

    if (jobsMissingTransactions.length === 0) {
      console.log('✅ All paid jobs have transactions! No action needed.');
      return;
    }

    // Step 3: Create missing transactions
    console.log('\n3️⃣ Creating missing transactions...');
    let successCount = 0;
    let errorCount = 0;

    for (const { job, missingBuyer, missingSeller } of jobsMissingTransactions) {
      try {
        console.log(`📝 Processing job: ${job.id} (${job.title})`);

        // Create buyer transaction if missing
        if (missingBuyer) {
          const buyerTransaction = {
            user_id: job.buyer_id,
            type: 'service_payment',
            amount: -Math.round(job.price * 100), // Convert to cents (integer)
            description: `Payment for service: ${job.title}`
          };

          const { data: buyerResult, error: buyerError } = await supabase
            .from('transactions')
            .insert(buyerTransaction)
            .select()
            .single();

          if (buyerError) {
            console.error(`❌ Failed to create buyer transaction for job ${job.id}:`, buyerError);
            errorCount++;
            continue;
          } else {
            console.log(`✅ Created buyer transaction: ${buyerResult.id}`);
          }
        }

        // Create seller transaction if missing
        if (missingSeller) {
          const sellerTransaction = {
            user_id: job.service_provider_id,
            type: 'service_payment_received',
            amount: Math.round(job.price * 100), // Convert to cents (integer)
            description: `Payment received for service: ${job.title}`
          };

          const { data: sellerResult, error: sellerError } = await supabase
            .from('transactions')
            .insert(sellerTransaction)
            .select()
            .single();

          if (sellerError) {
            console.error(`❌ Failed to create seller transaction for job ${job.id}:`, sellerError);
            errorCount++;
            continue;
          } else {
            console.log(`✅ Created seller transaction: ${sellerResult.id}`);
          }
        }

        successCount++;

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error.message);
        errorCount++;
      }
    }

    // Step 4: Summary
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully processed: ${successCount} jobs`);
    console.log(`❌ Failed to process: ${errorCount} jobs`);
    console.log(`📊 Total jobs processed: ${jobsMissingTransactions.length}`);

    if (successCount > 0) {
      console.log('\n🎉 Missing wallet transactions have been fixed!');
      console.log('💡 Users will now see their order payments in the Transaction History.');
    } else {
      console.log('\n⚠️ No transactions were created. Please check the errors above.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
if (require.main === module) {
  fixMissingWalletTransactions()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixMissingWalletTransactions };
