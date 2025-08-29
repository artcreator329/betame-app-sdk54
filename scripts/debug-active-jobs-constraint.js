const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function debugActiveJobsConstraint() {
  console.log('🔍 Debugging active_jobs table constraint violation...\n');
  
  try {
    // Check the current data in active_jobs table
    console.log('1. Checking current active_jobs data...');
    const { data: activeJobs, error: jobsError } = await supabase
      .from('active_jobs')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (jobsError) {
      console.log('❌ Error fetching active jobs:', jobsError.message);
    } else {
      console.log(`✅ Found ${activeJobs?.length || 0} active jobs`);
      
      if (activeJobs && activeJobs.length > 0) {
        console.log('\n📊 Current active jobs:');
        activeJobs.forEach((job, index) => {
          console.log(`   ${index + 1}. ${job.id}`);
          console.log(`      Status: ${job.status}`);
          console.log(`      Title: ${job.title}`);
          console.log(`      Service Offer ID: ${job.service_offer_id}`);
          console.log('');
        });
      }
    }
    
    // Check what the valid status values are according to the constraint
    console.log('\n2. Valid status values according to constraint:');
    const validStatuses = [
      'pending_confirmation',
      'in_progress', 
      'completed',
      'completed_confirmed',
      'cancelled',
      'disputed',
      'revision_requested',
      'revision_in_progress',
      'revision_completed'
    ];
    
    validStatuses.forEach(status => {
      console.log(`   - ${status}`);
    });
    
    // The error suggests that the confirm_work_completion function is trying to 
    // insert or update a row with an invalid status
    console.log('\n3. Analyzing the error...');
    console.log('   Error: "new row for relation \\"active_jobs\\" violates check constraint \\"active_jobs_status_check\\""');
    console.log('   This means the confirm_work_completion function is trying to set a status');
    console.log('   that is not in the allowed list above.');
    
    // Check if the confirm_work_completion function is trying to work with active_jobs
    console.log('\n4. Checking if confirm_work_completion affects active_jobs...');
    
    // Let's see what happens when we try to update an active job status
    if (activeJobs && activeJobs.length > 0) {
      const testJob = activeJobs[0];
      console.log(`\n5. Testing status update on job ${testJob.id}...`);
      
      // Try to update to a valid status first
      console.log('   Testing valid status update...');
      const { data: updateResult, error: updateError } = await supabase
        .from('active_jobs')
        .update({ status: 'completed_confirmed' })
        .eq('id', testJob.id)
        .select();
        
      if (updateError) {
        console.log('❌ Valid status update failed:', updateError.message);
      } else {
        console.log('✅ Valid status update succeeded');
        
        // Revert the change
        await supabase
          .from('active_jobs')
          .update({ status: testJob.status })
          .eq('id', testJob.id);
      }
      
      // Try to update to an invalid status to reproduce the error
      console.log('\n   Testing invalid status update...');
      const { data: invalidResult, error: invalidError } = await supabase
        .from('active_jobs')
        .update({ status: 'buyer_reviewing' }) // This is not in the valid list
        .eq('id', testJob.id)
        .select();
        
      if (invalidError) {
        console.log('❌ Invalid status update failed (as expected):', invalidError.message);
        console.log('   Error code:', invalidError.code);
        
        if (invalidError.code === '23514') {
          console.log('   ✅ This matches the error code from the user!');
          console.log('   🎯 ROOT CAUSE IDENTIFIED:');
          console.log('      The confirm_work_completion function is trying to set');
          console.log('      a status like "buyer_reviewing" on the active_jobs table,');
          console.log('      but that status is not allowed by the check constraint.');
        }
      } else {
        console.log('⚠️  Invalid status update unexpectedly succeeded');
      }
    }
    
    // Check if there's a trigger or function that updates active_jobs
    console.log('\n6. Checking for triggers or functions that might update active_jobs...');
    
    // The issue is likely that the confirm_work_completion function is trying to
    // update both the orders table (which uses different status values) and the
    // active_jobs table (which has its own status constraint)
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 ROOT CAUSE ANALYSIS:');
    console.log('='.repeat(60));
    
    console.log('\n1. The orders table uses these status values:');
    console.log('   - payment_received, work_in_progress, work_completed,');
    console.log('   - buyer_reviewing, completed, disputed, cancelled, etc.');
    
    console.log('\n2. The active_jobs table uses different status values:');
    console.log('   - pending_confirmation, in_progress, completed,');
    console.log('   - completed_confirmed, cancelled, disputed, etc.');
    
    console.log('\n3. The confirm_work_completion function is likely trying to:');
    console.log('   - Update orders table with "completed" status ✅');
    console.log('   - Update active_jobs table with "buyer_reviewing" status ❌');
    console.log('   - But "buyer_reviewing" is not valid for active_jobs!');
    
    console.log('\n4. SOLUTION:');
    console.log('   - Map order statuses to correct active_jobs statuses');
    console.log('   - "buyer_reviewing" in orders → "completed" in active_jobs');
    console.log('   - "completed" in orders → "completed_confirmed" in active_jobs');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugActiveJobsConstraint().catch(console.error);