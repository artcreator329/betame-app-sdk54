#!/usr/bin/env node

/**
 * Manual webhook test script to debug webhook failures
 */

const SUPABASE_URL = 'https://rkcfgebgpixgfvggbwmc.supabase.co'
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/curlec-webhook`

// Test data for the failed transaction
const testWebhookPayload = {
  event: 'payment_link.paid',
  payload: {
    payment_link: {
      entity: {
        id: 'plink_R9niwlrLenkjQp',
        reference_id: '0b64c669-1ad6-4bda-96db-94190a2496c4',
        status: 'paid',
        amount: 102,
        amount_paid: 102,
        currency: 'MYR',
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      }
    }
  }
}

async function testWebhook() {
  try {
    console.log('🔍 Testing webhook with failed transaction data...')
    console.log('Payload:', JSON.stringify(testWebhookPayload, null, 2))
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testWebhookPayload)
    })
    
    const responseText = await response.text()
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    console.log('Response body:', responseText)
    
    if (response.ok) {
      console.log('✅ Webhook test successful')
    } else {
      console.log('❌ Webhook test failed')
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error)
  }
}

testWebhook()