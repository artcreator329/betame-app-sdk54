#!/usr/bin/env node

/**
 * Clear cached notifications from the database and provide instructions for clearing app cache
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function clearCachedNotifications() {
  console.log('🧹 Clearing cached notifications...');
  
  try {
    // Delete all test notifications
    const { data: testData, error: testError } = await supabase
      .from('notifications')
      .delete()
      .or('title.like.%Test%,title.like.%test%,title.like.%Direct RPC%')
      .select();

    if (testError) {
      console.error('❌ Error deleting test notifications:', testError);
    } else {
      console.log(`✅ Deleted ${testData?.length || 0} test notifications from database`);
    }

    // Delete any notifications with test data
    const { data: debugData, error: debugError } = await supabase
      .from('notifications')
      .delete()
      .or('data->>test.eq.true,data->>debug.eq.true')
      .select();

    if (debugError) {
      console.error('❌ Error deleting debug notifications:', debugError);
    } else {
      console.log(`✅ Deleted ${debugData?.length || 0} debug notifications from database`);
    }

    console.log('\n🎉 Database cleanup completed!');
    console.log('\n📱 To clear app cache:');
    console.log('   1. Close the app completely');
    console.log('   2. Clear app data/cache from device settings');
    console.log('   3. Or restart the development server');
    console.log('   4. Reopen the app');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
clearCachedNotifications().then(() => {
  console.log('\n🏁 Cleanup finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
