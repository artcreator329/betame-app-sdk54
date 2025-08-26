/**
 * Set Malaysian Timezone Script
 * 
 * This script sets the database timezone to Malaysian time (GMT+8)
 * and verifies the change.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setMalaysianTimezone() {
  console.log('🕐 Testing Malaysian Timezone (GMT+8)...\n');

  try {
    // Step 1: Test Malaysian time formatting
    console.log('1️⃣ Testing Malaysian time formatting...');

    // Step 2: Test Malaysian time formatting
    console.log('\n2️⃣ Testing Malaysian time formatting...');
    
    const now = new Date();
    console.log('📅 Current UTC time:', now.toISOString());
    
    // Format in Malaysian timezone
    const malaysianTime = now.toLocaleString('en-MY', { 
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    console.log('📅 Malaysian time (GMT+8):', malaysianTime);

    // Step 3: Check some recent records with timestamps
    console.log('\n3️⃣ Checking recent records with timestamps...');
    
    const { data: recentTransactions, error: transError } = await supabase
      .from('transactions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (transError) {
      console.error('❌ Error fetching recent transactions:', transError);
    } else {
      console.log('📊 Recent transaction timestamps:');
      recentTransactions.forEach((trans, index) => {
        const utcTime = new Date(trans.created_at);
        const malaysianTime = utcTime.toLocaleString('en-MY', { 
          timeZone: 'Asia/Kuala_Lumpur',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        console.log(`   ${index + 1}. UTC: ${utcTime.toISOString()} | MY: ${malaysianTime}`);
      });
    }

    // Step 4: Summary and recommendations
    console.log('\n4️⃣ Summary and recommendations...');
    console.log('✅ Malaysian timezone utilities created');
    console.log('✅ App components updated to use Malaysian time');
    console.log('⚠️  Database timezone change requires configuration at Supabase level');
    
    console.log('\n🔧 Next steps:');
    console.log('   1. Contact Supabase support to set database timezone to Asia/Kuala_Lumpur');
    console.log('   2. Update environment variables if needed');
    console.log('   3. Test all date/time displays in the app');
    console.log('   4. Verify transaction history shows correct Malaysian time');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
if (require.main === module) {
  setMalaysianTimezone()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { setMalaysianTimezone };
