import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Base64 encoding function for Deno
function base64Encode(str: string): string {
  return btoa(str)
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CurlecConfig {
  apiKey: string;
  secretKey: string;
  environment: 'sandbox' | 'production';
}

interface CreateCheckoutSessionRequest {
  user_id: string;
  payment_type: 'betacoin_purchase' | 'service_payment' | 'wallet_topup';
  amount: number;
  currency: string;
  order_id?: string;
  success_url: string;
  cancel_url: string;
  metadata?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, data } = await req.json()

    if (action === 'create_checkout_session') {
      return await handleCreateCheckoutSession(data)
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleCreateCheckoutSession(request: CreateCheckoutSessionRequest) {
  const config: CurlecConfig = {
    apiKey: Deno.env.get('CURLEC_API_KEY') || '',
    secretKey: Deno.env.get('CURLEC_SECRET_KEY') || '',
    environment: (Deno.env.get('CURLEC_ENVIRONMENT') as 'sandbox' | 'production') || 'sandbox',
  }

  if (!config.apiKey || !config.secretKey) {
    throw new Error('Curlec configuration missing')
  }

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://rkcfgebgpixgfvggbwmc.supabase.co'
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '<REDACTED_JWT>'
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Create transaction record
  const { data: transaction, error: transactionError } = await supabase
    .from('payment_transactions')
    .insert({
      user_id: request.user_id,
      payment_type: request.payment_type,
      amount: request.amount,
      currency: request.currency,
      status: 'pending',
      payment_gateway: 'curlec',
      metadata: request.metadata,
    })
    .select()
    .single()

  if (transactionError) {
    throw new Error(`Failed to create transaction: ${transactionError.message}`)
  }

  // Create payment link with Curlec/Razorpay
  const credentials = `${config.apiKey}:${config.secretKey}`
  const authHeader = `Basic ${base64Encode(credentials)}`

  const paymentLinkResponse = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: request.amount,
      currency: request.currency,
      accept_partial: false,
      reference_id: transaction.id,
      description: getPaymentDescription(request.payment_type, request.amount),
      callback_url: `betame://payment/success?transaction_id=${transaction.id}`,
      callback_method: 'get',
      notify: {
        sms: false,
        email: false,
        whatsapp: false
      },
      options: {
        checkout: {
          name: 'BetaMe SDN BHD',
          description: getPaymentDescription(request.payment_type, request.amount),
          prefill: {
            contact: '+60123456789',
            email: 'test@betame.com',
          },
        },
      },
    }),
  })

  const paymentLinkData = await paymentLinkResponse.json()

  if (!paymentLinkResponse.ok) {
    // Update transaction as failed
    await supabase
      .from('payment_transactions')
      .update({
        status: 'failed',
        error_message: paymentLinkData.error?.description || 'Failed to create payment link',
        gateway_response: paymentLinkData,
      })
      .eq('id', transaction.id)

    throw new Error(paymentLinkData.error?.description || 'Failed to create payment link')
  }

  // Update transaction with payment link ID
  await supabase
    .from('payment_transactions')
    .update({
      curlec_checkout_id: paymentLinkData.id,
      gateway_response: paymentLinkData,
    })
    .eq('id', transaction.id)

  return new Response(
    JSON.stringify({
      success: true,
      checkout_url: paymentLinkData.short_url,
      checkout_id: paymentLinkData.id,
      transaction_id: transaction.id,
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

function getPaymentDescription(paymentType: string, amount: number): string {
  const amountInRM = (amount / 100).toFixed(2)
  
  switch (paymentType) {
    case 'betacoin_purchase':
      return `BetaCoin Purchase - RM${amountInRM}`
    case 'service_payment':
      return `Service Payment - RM${amountInRM}`
    case 'wallet_topup':
      return `Wallet Top-up - RM${amountInRM}`
    default:
      return `Payment - RM${amountInRM}`
  }
}
