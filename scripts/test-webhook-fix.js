#!/usr/bin/env node

/**
 * Comprehensive test for the webhook fix
 * Tests the complete flow: payment transaction -> webhook -> job creation
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co'
const supabaseServiceKey = '<REDACTED_JWT>'
const WEBHOOK_URL = `${supabaseUrl}/functions/v1/curlec-webhook`

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testWebhookFix() {
  console.log('🧪 Starting comprehensive webhook fix test...\n')
  
  try {
    // Step 1: Create a test payment transaction
    console.log('📝 Step 1: Creating test payment transaction...')
    
    const testTransaction = {
      user_id: 'f1785c17-abc7-40a8-80d8-dd9224f1238f', // Using existing user
      payment_type: 'service_payment',
      amount: 5000, // RM50.00 in cents
      currency: 'MYR',
      status: 'completed',
      curlec_payment_id: `test_payment_${Date.now()}`,
      curlec_checkout_id: `test_checkout_${Date.now()}`,
      payment_gateway: 'curlec',
      metadata: {
        service_name: 'Test Service - Webhook Fix Verification',
        service_provider_id: '5cbf350e-9b63-4547-bb5d-e9e70975aa8f',
        payment_method: 'curlec',
        order_data: JSON.stringify({
          serviceId: 'test-service-id',
          title: 'Test Service - Webhook Fix Verification',
          description: 'This is a test service to verify webhook functionality',
          price: 50,
          currency: 'RM',
          customDeliveryTime: 7
        })
      }
    }
    
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert(testTransaction)
      .select()
      .single()
    
    if (transactionError) {
      console.error('❌ Failed to create test transaction:', transactionError)
      return
    }
    
    console.log('✅ Test transaction created:', transaction.id)
    
    // Step 2: Test webhook call
    console.log('\n📡 Step 2: Testing webhook call...')
    
    const webhookPayload = {
      event: 'payment_link.paid',
      payload: {
        payment_link: {
          entity: {
            id: transaction.curlec_payment_id,
            reference_id: transaction.id,
            status: 'paid',
            amount: transaction.amount,
            amount_paid: transaction.amount,
            currency: transaction.currency,
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000)
          }
        }
      }
    }
    
    console.log('Calling webhook with payload:', JSON.stringify(webhookPayload, null, 2))
    
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify(webhookPayload)
    })
    
    const webhookResponseText = await webhookResponse.text()
    console.log('Webhook response status:', webhookResponse.status)
    console.log('Webhook response body:', webhookResponseText)
    
    if (!webhookResponse.ok) {
      console.error('❌ Webhook call failed')
      return
    }
    
    console.log('✅ Webhook call successful')
    
    // Step 3: Verify job creation
    console.log('\n🔍 Step 3: Verifying job creation...')
    
    // Wait a moment for the webhook to process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const { data: createdJob, error: jobError } = await supabase
      .from('active_jobs')
      .select('*')
      .eq('payment_transaction_id', transaction.id)
      .single()
    
    if (jobError) {
      console.error('❌ No job found for transaction:', jobError)
      return
    }
    
    console.log('✅ Job created successfully!')
    console.log('Job details:', JSON.stringify(createdJob, null, 2))
    
    // Step 4: Verify job data integrity
    console.log('\n✅ Step 4: Verifying job data integrity...')
    
    const expectedData = {
      buyer_id: transaction.user_id,
      service_provider_id: transaction.metadata.service_provider_id,
      title: transaction.metadata.service_name,
      price: transaction.amount / 100,
      status: 'pending_confirmation',
      payment_status: 'paid',
      payment_transaction_id: transaction.id
    }
    
    let allChecksPass = true
    
    for (const [key, expectedValue] of Object.entries(expectedData)) {
      const actualValue = createdJob[key]
      if (key === 'price') {
        // Handle numeric comparison with precision
        if (Math.abs(parseFloat(actualValue) - expectedValue) > 0.01) {
          console.error(`❌ ${key}: expected ${expectedValue}, got ${actualValue}`)
          allChecksPass = false
        } else {
          console.log(`✅ ${key}: ${actualValue}`)
        }
      } else if (actualValue !== expectedValue) {
        console.error(`❌ ${key}: expected ${expectedValue}, got ${actualValue}`)
        allChecksPass = false
      } else {
        console.log(`✅ ${key}: ${actualValue}`)
      }
    }
    
    // Step 5: Test duplicate prevention
    console.log('\n🔄 Step 5: Testing duplicate job prevention...')
    
    const duplicateWebhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify(webhookPayload)
    })
    
    const duplicateResponseText = await duplicateWebhookResponse.text()
    console.log('Duplicate webhook response:', duplicateResponseText)
    
    // Check that no duplicate job was created
    const { data: allJobs, error: allJobsError } = await supabase
      .from('active_jobs')
      .select('id')
      .eq('payment_transaction_id', transaction.id)
    
    if (allJobsError) {
      console.error('❌ Error checking for duplicate jobs:', allJobsError)
    } else if (allJobs.length === 1) {
      console.log('✅ Duplicate prevention working - only 1 job exists')
    } else {
      console.error(`❌ Duplicate prevention failed - ${allJobs.length} jobs found`)
      allChecksPass = false
    }
    
    // Step 6: Cleanup
    console.log('\n🧹 Step 6: Cleaning up test data...')
    
    await supabase.from('active_jobs').delete().eq('id', createdJob.id)
    await supabase.from('payment_transactions').delete().eq('id', transaction.id)
    
    console.log('✅ Test data cleaned up')
    
    // Final result
    console.log('\n' + '='.repeat(50))
    if (allChecksPass) {
      console.log('🎉 ALL TESTS PASSED! Webhook fix is working correctly.')
      console.log('✅ Payment transactions now properly create active jobs')
      console.log('✅ Job data integrity is maintained')
      console.log('✅ Duplicate job prevention is working')
    } else {
      console.log('❌ SOME TESTS FAILED! Please review the errors above.')
    }
    console.log('='.repeat(50))
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

testWebhookFix()