import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('x-razorpay-signature')
    const webhookSecret = Deno.env.get('CURLEC_WEBHOOK_SECRET') || 'your_curlec_webhook_secret_here'
    
    if (!signature) {
      throw new Error('Missing signature')
    }

    const body = await req.text()
    
    // Verify webhook signature
    const expectedSignature = await generateSignature(body, webhookSecret)
    if (signature !== expectedSignature) {
      throw new Error('Invalid signature')
    }

    const payload = JSON.parse(body)
    console.log('Webhook payload:', payload)

    // Process the webhook
    const result = await processWebhook(payload)

    return new Response(
      JSON.stringify({ success: true, processed: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Webhook error:', errorMessage)
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function generateSignature(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = encoder.encode(secret)
  const message = encoder.encode(body)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function processWebhook(payload: any): Promise<boolean> {
  const { event, payload: eventPayload } = payload
  
  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://rkcfgebgpixgfvggbwmc.supabase.co'
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '<REDACTED_JWT>'
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  if (event === 'payment_link.paid') {
    const payment = eventPayload.payment_link.entity
    const transactionId = payment.reference_id
    
    console.log('Processing payment for transaction:', transactionId)
    console.log('Payment details:', payment)
    
    // Check if payment failed (has error fields)
    const hasError = payment.error_code || payment.error_description || payment.error_source || payment.error_step || payment.error_reason
    
    if (hasError) {
      console.log('Payment failed with errors:', {
        error_code: payment.error_code,
        error_description: payment.error_description,
        error_source: payment.error_source,
        error_step: payment.error_step,
        error_reason: payment.error_reason
      })
      
      // Update payment transaction status to failed
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          curlec_payment_id: payment.id,
          gateway_response: payment,
          error_message: payment.error_description || payment.error_reason || 'Payment failed',
          error_code: payment.error_code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)

      if (updateError) {
        console.error('Failed to update transaction:', updateError)
        return false
      }

      return true
    }
    
    // Payment was successful
    console.log('Processing payment success for transaction:', transactionId)
    
    // Update payment transaction status
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: 'completed',
        curlec_payment_id: payment.id,
        gateway_response: payment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    if (updateError) {
      console.error('Failed to update transaction:', updateError)
      return false
    }

    // Get transaction details to process the payment
    const { data: transaction, error: fetchError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (fetchError || !transaction) {
      console.error('Failed to fetch transaction:', fetchError)
      return false
    }

    // Process the payment based on type
    if (transaction.payment_type === 'betacoin_purchase') {
      const betacoinAmount = transaction.metadata?.betacoin_amount || 0
      
      // Add BetaCoins to user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', transaction.user_id)
        .single()

      if (walletError) {
        console.error('Failed to fetch wallet:', walletError)
        return false
      }

      const { error: updateWalletError } = await supabase
        .from('wallets')
        .update({
          betame_betacoins: (wallet.betame_betacoins || 0) + betacoinAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', transaction.user_id)

      if (updateWalletError) {
        console.error('Failed to update wallet:', updateWalletError)
        return false
      }

      console.log(`Added ${betacoinAmount} BetaCoins to user ${transaction.user_id}`)
    }

    return true
  }

  if (event === 'payment_link.cancelled') {
    const payment = eventPayload.payment_link.entity
    const transactionId = payment.reference_id
    
    console.log('Processing payment cancellation for transaction:', transactionId)
    
    // Update payment transaction status
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: 'cancelled',
        gateway_response: payment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    if (updateError) {
      console.error('Failed to update transaction:', updateError)
      return false
    }

    return true
  }

  console.log('Unhandled webhook event:', event)
  return false
}
