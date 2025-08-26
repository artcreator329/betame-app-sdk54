#!/usr/bin/env node

/**
 * Cleanup script to remove all test orders and payment transactions
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co'
const supabaseServiceKey = '<REDACTED_JWT>'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupTestData() {
  console.log('🧹 Starting cleanup of test data...\n')
  
  try {
    // Step 1: Delete test active jobs
    console.log('📝 Step 1: Cleaning up test active jobs...')
    
    // Delete jobs with test payment IDs
    const testPaymentIds = [
      'a87e99e2-ee5a-4dda-a9db-6eed78636da7',
      '0c62222d-6308-4e1b-b05f-abe2d8cf20a0', 
      '858d7f42-c65f-4e76-9b95-e79ef2f8c41f',
      '49f14975-4e63-416f-b306-cc244d2985fa',
      '0bd7d727-91d8-43d6-9812-86ef9f188678',
      '6cdd0b0f-8b07-44f7-82ea-387214d05f40',
      'e1fd3db9-6225-4381-9f03-8fa48b4b7d5b',
      '15cb6f34-0972-41e4-aa09-ea5766c8fb69',
      'e1d3818d-0b28-482d-a448-52ddc4df7c45',
      'b02d4e80-b71f-4c0d-acdf-c4e01710a18b',
      '0b64c669-1ad6-4bda-96db-94190a2496c4',
      '9f8ece44-e746-46fd-bd6f-09d260d77e27',
      '91d08545-ce63-4175-baa1-6910c57413d4',
      '7b8848a1-a996-417d-9e27-bb45684a8562'
    ]
    
    const { data: deletedJobs, error: jobDeleteError } = await supabase
      .from('active_jobs')
      .delete()
      .in('payment_transaction_id', testPaymentIds)
      .select('id, title')
    
    if (jobDeleteError) {
      console.error('❌ Error deleting jobs:', jobDeleteError)
    } else {
      console.log(`✅ Deleted ${deletedJobs?.length || 0} test jobs`)
      deletedJobs?.forEach(job => {
        console.log(`   - ${job.title} (${job.id})`)
      })
    }
    
    // Delete manually created test jobs (without payment transaction IDs)
    const { data: manualJobs, error: manualJobError } = await supabase
      .from('active_jobs')
      .delete()
      .is('payment_transaction_id', null)
      .or('title.ilike.%Sound Healing%,title.ilike.%Wealth Planner%,title.ilike.%Corporate Adviser%')
      .select('id, title')
    
    if (manualJobError) {
      console.error('❌ Error deleting manual jobs:', manualJobError)
    } else {
      console.log(`✅ Deleted ${manualJobs?.length || 0} manual test jobs`)
      manualJobs?.forEach(job => {
        console.log(`   - ${job.title} (${job.id})`)
      })
    }
    
    // Step 2: Delete test payment transactions
    console.log('\n💳 Step 2: Cleaning up test payment transactions...')
    
    const testCurlecIds = [
      'pay_real_test',
      'pay_test123', 
      'pay_test',
      'pay_test_123'
    ]
    
    const { data: deletedTransactions, error: transactionDeleteError } = await supabase
      .from('payment_transactions')
      .delete()
      .or(`curlec_payment_id.in.(${testCurlecIds.map(id => `"${id}"`).join(',')}),curlec_payment_id.like.%test%`)
      .select('id, curlec_payment_id, amount')
    
    if (transactionDeleteError) {
      console.error('❌ Error deleting transactions:', transactionDeleteError)
    } else {
      console.log(`✅ Deleted ${deletedTransactions?.length || 0} test transactions`)
      deletedTransactions?.forEach(tx => {
        console.log(`   - ${tx.curlec_payment_id} (RM${tx.amount/100}) - ${tx.id}`)
      })
    }
    
    // Step 3: Summary
    console.log('\n' + '='.repeat(50))
    console.log('🎉 CLEANUP COMPLETE!')
    console.log(`✅ Removed ${(deletedJobs?.length || 0) + (manualJobs?.length || 0)} test jobs`)
    console.log(`✅ Removed ${deletedTransactions?.length || 0} test transactions`)
    console.log('✅ Database is now clean of test data')
    console.log('='.repeat(50))
    
  } catch (error) {
    console.error('❌ Cleanup failed with error:', error)
  }
}

cleanupTestData()