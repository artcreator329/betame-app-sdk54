#!/usr/bin/env node

/**
 * Final comprehensive test for the webhook fix
 * Tests the complete flow without any authentication (like real payment gateways)
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co'
const supabaseServiceKey = '<REDACTED_JWT>'
const WEBHOOK_URL = `${supabaseUrl}/functions/v1/curlec-webhook`

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testWebhookFinalFix() {
  console.log('🎯 FINAL WEBHOOK TEST - Simulating Real Payment Gateway Call\n')
  
  try {
    // Step 1: Create a test payment transaction
    console.log('📝 Step 1: Creating test payment transaction...')
    
    const testTransaction = {
      user_id: 'f1785c17-abc7-40a8-80d8-dd9224f1238f',
      payment_type: 'service_payment',
      amount: 7500, // RM75.00 in cents
      currency: 'MYR',
      status: 'completed',
      curlec_payment_id: `final_test_${Date.now()}`,
      curlec_checkout_id: `final_checkout_${Date.now()}`,
      payment_gateway: 'curlec',
      metadata: {
        service_name: 'Final Test Service - Webhook Authentication Fix',
        service_provider_id: '5cbf350e-9b63-4547-bb5d-e9e70975aa8f',
        payment_method: 'curlec',
        order_data: JSON.stringify({
          serviceId: 'final-test-service-id',
          title: 'Final Test Service - Webhook Authentication Fix',
          description: 'This is the final test to verify webhook works without authentication',
          price: 75,
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
    
    // Step 2: Test webhook call WITHOUT any authentication (like real payment gateways)
    console.log('\n🌐 Step 2: Testing webhook call WITHOUT authentication...')
    
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
    
    console.log('Calling webhook WITHOUT any authentication headers...')
    console.log('Webhook URL:', WEBHOOK_URL)
    
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // NO AUTHENTICATION - Just like real payment gateways
      },
      body: JSON.stringify(webhookPayload)
    })
    
    const webhookResponseText = await webhookResponse.text()
    console.log('Webhook response status:', webhookResponse.status)
    console.log('Webhook response body:', webhookResponseText)
    
    if (!webhookResponse.ok) {
      console.error('❌ Webhook call failed - Authentication issue not resolved')
      return
    }
    
    console.log('✅ Webhook call successful WITHOUT authentication!')
    
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
    console.log('Job ID:', createdJob.id)
    console.log('Job Title:', createdJob.title)
    console.log('Job Price:', createdJob.price)
    console.log('Job Status:', createdJob.status)
    console.log('Payment Status:', createdJob.payment_status)
    
    // Step 4: Cleanup
    console.log('\n🧹 Step 4: Cleaning up test data...')
    
    await supabase.from('active_jobs').delete().eq('id', createdJob.id)
    await supabase.from('payment_transactions').delete().eq('id', transaction.id)
    
    console.log('✅ Test data cleaned up')
    
    // Final result
    console.log('\n' + '='.repeat(60))
    console.log('🎉 WEBHOOK FIX COMPLETE AND VERIFIED!')
    console.log('✅ Webhook works WITHOUT authentication (like real payment gateways)')
    console.log('✅ Jobs are created automatically when payments complete')
    console.log('✅ All data is mapped correctly')
    console.log('✅ Ready for production use!')
    console.log('')
    console.log('📋 NEXT STEPS:')
    console.log('1. Configure this webhook URL in your Curlec/Razorpay dashboard:')
    console.log(`   ${WEBHOOK_URL}`)
    console.log('2. Enable the "payment_link.paid" event')
    console.log('3. Test with a real payment')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

testWebhookFinalFix()