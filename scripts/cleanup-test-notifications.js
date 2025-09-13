#!/usr/bin/env node

/**
 * Clean up test notifications from the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function cleanupTestNotifications() {
  console.log('🧹 Cleaning up test notifications...');
  
  try {
    // Delete all notifications with "Direct RPC Test" title
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('title', 'Direct RPC Test')
      .select();

    if (error) {
      console.error('❌ Error deleting test notifications:', error);
      return;
    }

    console.log(`✅ Deleted ${data?.length || 0} test notifications`);
    
    // Also clean up any other test notifications
    const { data: otherTestData, error: otherTestError } = await supabase
      .from('notifications')
      .delete()
      .or('title.like.%Test%,title.like.%test%')
      .select();

    if (otherTestError) {
      console.error('❌ Error deleting other test notifications:', otherTestError);
    } else {
      console.log(`✅ Deleted ${otherTestData?.length || 0} other test notifications`);
    }

    console.log('🎉 Test notification cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupTestNotifications().then(() => {
  console.log('\n🏁 Cleanup finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
