#!/usr/bin/env node

/**
 * Test webhook with anon key (like payment gateway might use)
 */

const SUPABASE_URL = 'https://rkcfgebgpixgfvggbwmc.supabase.co'
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/curlec-webhook`
const ANON_KEY = '<REDACTED_JWT>'

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

async function testWebhookWithAnonKey() {
  try {
    console.log('🔍 Testing webhook with anon key...')
    console.log('Payload:', JSON.stringify(testWebhookPayload, null, 2))
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY
      },
      body: JSON.stringify(testWebhookPayload)
    })
    
    const responseText = await response.text()
    
    console.log('Response status:', response.status)
    console.log('Response body:', responseText)
    
    if (response.ok) {
      console.log('✅ Webhook test successful with anon key!')
    } else {
      console.log('❌ Webhook test failed with status:', response.status)
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error)
  }
}

testWebhookWithAnonKey()