/**
 * Cron job script for auto-releasing payments
 * This should be run every hour to check for orders ready for auto-release
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function autoReleasePayments() {
  const startTime = new Date();
  console.log(`🕐 Auto-release job started at ${startTime.toISOString()}`);

  try {
    // Call the auto-release function
    const { data: releasedCount, error } = await supabase.rpc('auto_release_payments');

    // Generate PDFs for auto-released payments
    if (releasedCount > 0) {
      console.log('📄 Generating PDFs for auto-released payments...');
      
      // Get the auto-released orders
      const { data: autoReleasedOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, service_title, service_provider_id, seller_id, buyer_id, amount, platform_fee, payment_released_at')
        .eq('status', 'completed')
        .not('payment_released_at', 'is', null)
        .gte('payment_released_at', new Date(Date.now() - 60000).toISOString()) // Orders released in the last minute
        .order('payment_released_at', { ascending: false });

      if (!ordersError && autoReleasedOrders) {
        for (const order of autoReleasedOrders) {
          try {
            // Generate PDF for each auto-released order
            const { data: pdfResult, error: pdfError } = await supabase.functions.invoke('generate-payment-release-pdf', {
              body: {
                orderId: order.id,
                tableSource: 'orders'
              }
            });

            if (pdfError) {
              console.error(`❌ PDF generation failed for order ${order.id}:`, pdfError);
            } else {
              console.log(`✅ PDF generated for auto-released order ${order.id}`);
            }
          } catch (pdfError) {
            console.error(`❌ Error generating PDF for order ${order.id}:`, pdfError);
          }
        }
      }
    }

    if (error) {
      throw error;
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log(`✅ Auto-release completed successfully`);
    console.log(`📊 Released payments: ${releasedCount}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🕐 Completed at: ${endTime.toISOString()}`);

    // Log to a monitoring system or database if needed
    if (releasedCount > 0) {
      await logAutoReleaseActivity(releasedCount, duration);
    }

    return {
      success: true,
      releasedCount,
      duration,
      timestamp: endTime.toISOString(),
    };

  } catch (error) {
    console.error('❌ Auto-release job failed:', error.message);
    console.error('Stack trace:', error.stack);

    // Log error for monitoring
    await logAutoReleaseError(error);

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

async function logAutoReleaseActivity(releasedCount, duration) {
  try {
    // You could create a separate table for logging auto-release activities
    // For now, we'll just add a timeline event for monitoring
    console.log(`📝 Logging auto-release activity: ${releasedCount} payments released`);
    
    // This could be expanded to include more detailed logging
    // such as storing in a monitoring table or sending to external services
    
  } catch (error) {
    console.error('Failed to log auto-release activity:', error.message);
  }
}

async function logAutoReleaseError(error) {
  try {
    console.log('📝 Logging auto-release error for monitoring');
    
    // In a production environment, you might want to:
    // 1. Send alerts to administrators
    // 2. Log to error tracking services (Sentry, etc.)
    // 3. Store error details in a monitoring table
    
  } catch (logError) {
    console.error('Failed to log auto-release error:', logError.message);
  }
}

async function checkSystemHealth() {
  console.log('🏥 Checking system health...');

  try {
    // Check database connectivity
    const { data, error } = await supabase
      .from('orders')
      .select('count(*)')
      .limit(1);

    if (error) throw error;

    // Check for orders that might be stuck
    const { data: stuckOrders, error: stuckError } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .eq('status', 'buyer_reviewing')
      .lt('auto_release_at', new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()); // 25 hours ago

    if (stuckError) throw stuckError;

    if (stuckOrders && stuckOrders.length > 0) {
      console.log(`⚠️  Found ${stuckOrders.length} potentially stuck orders`);
      // You might want to alert administrators about these
    }

    console.log('✅ System health check passed');
    return true;

  } catch (error) {
    console.error('❌ System health check failed:', error.message);
    return false;
  }
}

async function getAutoReleaseStats() {
  try {
    // Get orders ready for auto-release
    const { data: readyOrders, error: readyError } = await supabase
      .from('orders')
      .select('id, amount, auto_release_at')
      .eq('status', 'buyer_reviewing')
      .eq('dispute_status', 'none')
      .lte('auto_release_at', new Date().toISOString());

    if (readyError) throw readyError;

    // Get orders in review period
    const { data: reviewOrders, error: reviewError } = await supabase
      .from('orders')
      .select('id, amount, auto_release_at')
      .eq('status', 'buyer_reviewing')
      .eq('dispute_status', 'none')
      .gt('auto_release_at', new Date().toISOString());

    if (reviewError) throw reviewError;

    const stats = {
      readyForRelease: readyOrders?.length || 0,
      totalReadyAmount: readyOrders?.reduce((sum, order) => sum + order.amount, 0) || 0,
      inReviewPeriod: reviewOrders?.length || 0,
      totalReviewAmount: reviewOrders?.reduce((sum, order) => sum + order.amount, 0) || 0,
    };

    console.log('📊 Auto-release stats:');
    console.log(`   Ready for release: ${stats.readyForRelease} orders (${stats.totalReadyAmount} BetaCoins)`);
    console.log(`   In review period: ${stats.inReviewPeriod} orders (${stats.totalReviewAmount} BetaCoins)`);

    return stats;

  } catch (error) {
    console.error('Failed to get auto-release stats:', error.message);
    return null;
  }
}

// Main execution function
async function main() {
  console.log('🚀 Starting auto-release cron job');
  console.log('=' .repeat(50));

  // Check system health first
  const healthOk = await checkSystemHealth();
  if (!healthOk) {
    console.log('❌ System health check failed, aborting auto-release');
    process.exit(1);
  }

  // Get current stats
  await getAutoReleaseStats();

  // Run auto-release
  const result = await autoReleasePayments();

  console.log('=' .repeat(50));
  console.log('🏁 Auto-release cron job completed');

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Unhandled error in main:', error);
    process.exit(1);
  });
}

module.exports = {
  autoReleasePayments,
  checkSystemHealth,
  getAutoReleaseStats,
};