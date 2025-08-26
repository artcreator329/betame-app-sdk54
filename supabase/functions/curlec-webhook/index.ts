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
    console.log('🔍 Webhook called - method:', req.method)
    console.log('🔍 URL:', req.url)
    console.log('🔍 Headers:', Object.fromEntries(req.headers.entries()))
    
    // Check for API key in query parameters (for payment gateway webhooks)
    const url = new URL(req.url)
    const apikey = url.searchParams.get('apikey')
    
    if (apikey) {
      console.log('🔍 Using API key from query parameters')
      // This is for logging purposes - the actual auth is handled by Supabase
    }
    
    const body = await req.text()
    console.log('🔍 Webhook body:', body)
    
    const payload = JSON.parse(body)
    console.log('🔍 Parsed payload:', JSON.stringify(payload, null, 2))
    
    // Create Supabase client with service role key (for internal operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://rkcfgebgpixgfvggbwmc.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '<REDACTED_JWT>'
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { event, payload: eventPayload } = payload
    
    console.log('🔍 Processing event:', event)
    
    if (event === 'payment_link.paid') {
      console.log('🔍 Processing payment_link.paid event')
      
      const payment = eventPayload.payment_link.entity
      const transactionId = payment.reference_id
      
      console.log('🔍 Payment details:', JSON.stringify(payment, null, 2))
      console.log('🔍 Transaction ID:', transactionId)
      
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
        console.error('❌ Failed to update transaction:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('✅ Transaction updated successfully')

      // Get transaction details
      const { data: transaction, error: fetchError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transactionId)
        .single()

      if (fetchError || !transaction) {
        console.error('❌ Failed to fetch transaction:', fetchError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('🔍 Transaction found:', transaction.id, 'type:', transaction.payment_type)

      // Handle BetaCoin purchases
      if (transaction.payment_type === 'betacoin_purchase') {
        console.log('🔍 Processing BetaCoin purchase')
        const betacoinAmount = transaction.metadata?.betacoin_amount || 0
        
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', transaction.user_id)
          .single()

        if (walletError) {
          console.error('❌ Failed to fetch wallet:', walletError)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch wallet' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: updateWalletError } = await supabase
          .from('wallets')
          .update({
            betame_betacoins: (wallet.betame_betacoins || 0) + betacoinAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', transaction.user_id)

        if (updateWalletError) {
          console.error('❌ Failed to update wallet:', updateWalletError)
          return new Response(
            JSON.stringify({ error: 'Failed to update wallet' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`✅ Added ${betacoinAmount} BetaCoins to user ${transaction.user_id}`)
      }

      // Handle service payments - CREATE JOB
      if (transaction.payment_type === 'service_payment') {
        console.log('🔍 Processing service payment - CREATING JOB')
        
        const metadata = transaction.metadata || {}
        console.log('🔍 Service metadata:', JSON.stringify(metadata, null, 2))
        
        // Check if job already exists for this transaction
        const { data: existingJob, error: checkError } = await supabase
          .from('active_jobs')
          .select('id')
          .eq('payment_transaction_id', transaction.id)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ Error checking for existing job:', checkError)
          return new Response(
            JSON.stringify({ error: 'Failed to check for existing job' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (existingJob) {
          console.log('✅ Job already exists for transaction:', transaction.id)
          console.log('✅ Webhook processed successfully')
          return new Response(
            JSON.stringify({ success: true, processed: true, job_exists: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Create active job
        const { data: activeJob, error: jobError } = await supabase
          .from('active_jobs')
          .insert({
            buyer_id: transaction.user_id,
            service_provider_id: metadata.service_provider_id || transaction.user_id, // Use buyer_id as fallback
            title: metadata.service_name || 'Service Order',
            description: 'Service order created from payment',
            price: transaction.amount / 100, // Convert from cents
            status: 'pending_confirmation',
            payment_status: 'paid',
            payment_transaction_id: transaction.id,
            delivery_time: '7 days'
          })
          .select()
          .single()

        if (jobError) {
          console.error('❌ Failed to create active job:', jobError)
          console.error('❌ Job data that failed:', {
            buyer_id: transaction.user_id,
            service_provider_id: metadata.service_provider_id,
            title: metadata.service_name,
            price: transaction.amount / 100
          })
          return new Response(
            JSON.stringify({ error: 'Failed to create active job' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('✅ Active job created successfully:', activeJob.id)
      }

      console.log('✅ Webhook processed successfully')
      return new Response(
        JSON.stringify({ success: true, processed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔍 Unhandled event:', event)
    return new Response(
      JSON.stringify({ success: true, processed: false, event: event }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('❌ Webhook error:', errorMessage)
    console.error('❌ Full error:', error)
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
