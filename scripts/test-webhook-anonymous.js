#!/usr/bin/env node

/**
 * Test webhook without authorization header (like real payment gateway calls)
 */

const SUPABASE_URL = 'https://rkcfgebgpixgfvggbwmc.supabase.co'
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/curlec-webhook`

// Test data for a real failed transaction
const testWebhookPayload = {
  event: 'payment_link.paid',
  payload: {
    payment_link: {
      entity: {
        id: 'plink_R9pVj1Xz4LjYy',
        reference_id: 'b02d4e80-b71f-4c0d-acdf-c4e01710a18b', // Real transaction ID
        status: 'paid',
        amount: 12264,
        amount_paid: 12264,
        currency: 'MYR',
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      }
    }
  }
}

async function testWebhookAnonymous() {
  try {
    console.log('🔍 Testing webhook without authorization (like real payment gateway)...')
    console.log('Payload:', JSON.stringify(testWebhookPayload, null, 2))
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No authorization header - like real payment gateway calls
      },
      body: JSON.stringify(testWebhookPayload)
    })
    
    const responseText = await response.text()
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    console.log('Response body:', responseText)
    
    if (response.status === 401) {
      console.log('\n❌ 401 Error - This confirms the webhook requires authentication')
      console.log('💡 Real payment gateways cannot provide authorization headers')
      console.log('🔧 Need to configure the function for anonymous access')
    } else if (response.ok) {
      console.log('✅ Webhook test successful')
    } else {
      console.log('❌ Webhook test failed with status:', response.status)
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error)
  }
}

testWebhookAnonymous()