/**
 * Fix Missing Service Transactions
 * 
 * This script backfills missing service payment transactions for recent orders
 * that were created without proper transaction recording.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mock FeeService for calculations
class FeeService {
  static get BUYER_FEE_RATE() { return 0.022; }
  static get SELLER_FEE_RATE() { return 0.11; }
  static get MINIMUM_SELLER_FEE() { return 4.90; }

  static calculateFees(amount, currency = 'RM') {
    const baseAmount = amount;
    
    // Buyer pays 2.2% processing fee on top
    const buyerFee = Math.round((baseAmount * this.BUYER_FEE_RATE) * 100) / 100;
    const buyerTotal = baseAmount + buyerFee;
    
    // Seller platform fee: 11% or RM4.90, whichever is higher
    const calculatedSellerFee = Math.round((baseAmount * this.SELLER_FEE_RATE) * 100) / 100;
    const platformFee = Math.max(calculatedSellerFee, this.MINIMUM_SELLER_FEE);
    const sellerReceives = baseAmount - platformFee;

    return {
      baseAmount,
      buyerFee,
      buyerTotal,
      sellerReceives,
      platformFee,
      currency
    };
  }
}

async function fixMissingServiceTransactions() {
  console.log('🔧 Fixing Missing Service Transactions...\n');

  try {
    // Step 1: Find recent jobs without transactions
    console.log('1️⃣ Finding recent jobs without transactions...');
    const { data: recentJobs, error: jobsError } = await supabase
      .from('active_jobs')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('❌ Error fetching recent jobs:', jobsError);
      return;
    }

    console.log(`📊 Found ${recentJobs.length} recent jobs`);

    // Step 2: Check which jobs are missing transactions
    console.log('\n2️⃣ Checking for missing transactions...');
    const jobsMissingTransactions = [];

    for (const job of recentJobs) {
      // Check for buyer transaction (service_payment)
      const { data: buyerTransactions, error: buyerError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', job.buyer_id)
        .eq('type', 'service_payment')
        .gte('created_at', new Date(job.created_at).toISOString())
        .lte('created_at', new Date(new Date(job.created_at).getTime() + 5 * 60 * 1000).toISOString()); // Within 5 minutes

      if (buyerError) {
        console.error(`❌ Error checking buyer transactions for job ${job.id}:`, buyerError);
        continue;
      }

      const hasBuyerTransaction = buyerTransactions && buyerTransactions.length > 0;

      if (!hasBuyerTransaction) {
        jobsMissingTransactions.push(job);
      }
    }

    console.log(`📊 Found ${jobsMissingTransactions.length} jobs missing transactions`);

    if (jobsMissingTransactions.length === 0) {
      console.log('✅ All recent jobs have transactions! No action needed.');
      return;
    }

    // Step 3: Create missing transactions
    console.log('\n3️⃣ Creating missing transactions...');
    let successCount = 0;
    let errorCount = 0;

    for (const job of jobsMissingTransactions) {
      try {
        console.log(`📝 Processing job: ${job.id} (${job.title})`);

        // Calculate fees
        const feeCalculation = FeeService.calculateFees(job.price);
        const buyerTotal = feeCalculation.buyerTotal; // Order Price + 2.2%

        console.log(`💰 Fee calculation for RM ${job.price}:`);
        console.log(`   - Buyer fee (2.2%): RM ${feeCalculation.buyerFee}`);
        console.log(`   - Buyer total: RM ${buyerTotal}`);
        console.log(`   - Platform fee: RM ${feeCalculation.platformFee}`);

        // Check if buyer has sufficient BetaCoins
        const { data: buyerWallet, error: walletError } = await supabase
          .from('wallets')
          .select('betame_betacoins')
          .eq('user_id', job.buyer_id)
          .single();

        if (walletError || !buyerWallet) {
          console.error(`❌ Error fetching buyer wallet for job ${job.id}:`, walletError);
          errorCount++;
          continue;
        }

        if (buyerWallet.betame_betacoins < buyerTotal) {
          console.error(`❌ Insufficient BetaCoins for job ${job.id}: Need ${buyerTotal}, have ${buyerWallet.betame_betacoins}`);
          errorCount++;
          continue;
        }

        // Deduct BetaCoins from buyer (convert to integer)
        const { error: updateError } = await supabase
          .from('wallets')
          .update({
            betame_betacoins: Math.floor(buyerWallet.betame_betacoins - buyerTotal),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', job.buyer_id);

        if (updateError) {
          console.error(`❌ Error updating buyer wallet for job ${job.id}:`, updateError);
          errorCount++;
          continue;
        }

        // Create buyer transaction
        const { error: buyerTransactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: job.buyer_id,
            type: 'service_payment',
            amount: -Math.round(buyerTotal * 100), // Convert to cents (integer)
            description: `Payment for service: ${job.title} (including ${feeCalculation.buyerFee} processing fee)`,
            created_at: job.created_at // Use job creation time
          });

        if (buyerTransactionError) {
          console.error(`❌ Error creating buyer transaction for job ${job.id}:`, buyerTransactionError);
          errorCount++;
          continue;
        }

        // Update job with payment details for admin release
        const { error: jobUpdateError } = await supabase
          .from('active_jobs')
          .update({
            payment_amount: job.price, // Original order price
            buyer_fee: feeCalculation.buyerFee, // 2.2% fee
            platform_fee: feeCalculation.platformFee, // 11% or RM4.90, whichever higher
            total_paid: buyerTotal, // Total amount buyer paid
            payment_status: 'paid_escrow', // New status: paid and held in escrow
            escrow_ready_for_release: false // Will be set to true when admin confirms
          })
          .eq('id', job.id);

        if (jobUpdateError) {
          console.error(`❌ Error updating job for job ${job.id}:`, jobUpdateError);
          errorCount++;
          continue;
        }

        console.log(`✅ Created transaction for job ${job.id}: RM ${buyerTotal} deducted from buyer`);
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
      console.log('\n🎉 Missing service transactions have been fixed!');
      console.log('💡 Users will now see their service payments in the Transaction History.');
      console.log('💡 Jobs are now set up for the new payment release flow.');
    } else {
      console.log('\n⚠️ No transactions were created. Please check the errors above.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
if (require.main === module) {
  fixMissingServiceTransactions()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixMissingServiceTransactions };
