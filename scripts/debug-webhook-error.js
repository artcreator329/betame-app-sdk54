#!/usr/bin/env node

/**
 * Debug webhook error by checking the transaction data and job creation
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co'
const supabaseServiceKey = '<REDACTED_JWT>'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugWebhookError() {
  try {
    console.log('🔍 Debugging webhook error for transaction: 0b64c669-1ad6-4bda-96db-94190a2496c4')
    
    // Get transaction details
    const { data: transaction, error: fetchError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', '0b64c669-1ad6-4bda-96db-94190a2496c4')
      .single()

    if (fetchError) {
      console.error('❌ Failed to fetch transaction:', fetchError)
      return
    }

    console.log('✅ Transaction found:', transaction.id)
    console.log('Transaction data:', JSON.stringify(transaction, null, 2))
    
    const metadata = transaction.metadata || {}
    console.log('Metadata:', JSON.stringify(metadata, null, 2))
    
    // Try to create the job manually
    console.log('🔍 Attempting to create active job...')
    
    const jobData = {
      buyer_id: transaction.user_id,
      service_provider_id: metadata.service_provider_id || transaction.user_id,
      title: metadata.service_name || 'Service Order',
      description: 'Service order created from payment',
      price: transaction.amount / 100, // Convert from cents
      status: 'pending_confirmation',
      payment_status: 'paid',
      payment_transaction_id: transaction.id,
      delivery_time: '7 days'
    }
    
    console.log('Job data to insert:', JSON.stringify(jobData, null, 2))
    
    const { data: activeJob, error: jobError } = await supabase
      .from('active_jobs')
      .insert(jobData)
      .select()
      .single()

    if (jobError) {
      console.error('❌ Failed to create active job:', jobError)
      console.error('❌ Error details:', JSON.stringify(jobError, null, 2))
    } else {
      console.log('✅ Active job created successfully:', activeJob.id)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugWebhookError()