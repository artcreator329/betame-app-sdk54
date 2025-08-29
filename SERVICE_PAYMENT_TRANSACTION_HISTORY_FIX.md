# Service Payment Transaction History Fix

## Issue Description
Service orders made through the Curlec payment gateway were not creating transaction records in the `transactions` table, even though the payments were being processed successfully and active jobs were being created.

## Root Cause Analysis
The issue was in the Curlec webhook handler (`supabase/functions/curlec-webhook/index.ts`). When processing service payments, the webhook was:

1. ✅ Correctly updating the payment transaction status
2. ✅ Creating active jobs for the service orders
3. ❌ **NOT creating transaction records** in the `transactions` table

The webhook was only creating active jobs but missing the crucial step of inserting records into the `transactions` table for both buyers and service providers.

## Solution Implemented

### 1. Fixed Webhook Function
Updated `supabase/functions/curlec-webhook/index.ts` to include transaction record creation for service payments:

```typescript
// After creating active job successfully
console.log('✅ Active job created successfully:', activeJob.id)

// Create transaction records for service payment
const buyerId = transaction.user_id
const serviceProviderId = metadata.service_provider_id || transaction.user_id
const amount = transaction.amount / 100 // Convert from cents to RM

// Record transaction for buyer (payment)
const { error: buyerTransactionError } = await supabase
  .from('transactions')
  .insert({
    user_id: buyerId,
    type: 'service_payment',
    amount: -amount, // Negative amount for payment
    description: `Payment for service: ${metadata.service_name || 'Service Order'}`,
    created_at: new Date().toISOString(),
  })

if (buyerTransactionError) {
  console.error('❌ Failed to create buyer transaction record:', buyerTransactionError)
  return new Response(
    JSON.stringify({ error: 'Failed to create buyer transaction record' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Record transaction for service provider (payment received)
const { error: providerTransactionError } = await supabase
  .from('transactions')
  .insert({
    user_id: serviceProviderId,
    type: 'service_payment_received',
    amount: amount, // Positive amount for received payment
    description: `Payment received for service: ${metadata.service_name || 'Service Order'}`,
    created_at: new Date().toISOString(),
  })

if (providerTransactionError) {
  console.error('❌ Failed to create service provider transaction record:', providerTransactionError)
  return new Response(
    JSON.stringify({ error: 'Failed to create service provider transaction record' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

console.log(`✅ Transaction records created for service payment`)
```

### 2. Deployed Updated Webhook
Successfully deployed the updated webhook function using:
```bash
npx supabase functions deploy curlec-webhook
```

### 3. Fixed Historical Data
Created database migration to fix missing transaction records:

```sql
-- Find and fix any missing transaction records for service payments
-- This will create transaction records for completed payment transactions that don't have corresponding transaction records

-- For buyers (service_payment)
INSERT INTO transactions (user_id, type, amount, description, created_at)
SELECT 
    pt.user_id,
    'service_payment',
    -(pt.amount / 100), -- Negative amount for payment, convert from cents
    'Payment for service: ' || COALESCE(pt.metadata->>'service_name', 'Service Order'),
    pt.created_at
FROM payment_transactions pt
WHERE pt.payment_type = 'service_payment'
AND pt.status = 'completed'
AND NOT EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.user_id = pt.user_id 
    AND t.type = 'service_payment' 
    AND t.created_at::date = pt.created_at::date
    AND t.description LIKE '%' || COALESCE(pt.metadata->>'service_name', 'Service Order') || '%'
);

-- For service providers (service_payment_received)
INSERT INTO transactions (user_id, type, amount, description, created_at)
SELECT 
    (pt.metadata->>'service_provider_id')::uuid,
    'service_payment_received',
    pt.amount / 100, -- Positive amount for received payment, convert from cents
    'Payment received for service: ' || COALESCE(pt.metadata->>'service_name', 'Service Order'),
    pt.created_at
FROM payment_transactions pt
WHERE pt.payment_type = 'service_payment'
AND pt.status = 'completed'
AND pt.metadata->>'service_provider_id' IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.user_id = (pt.metadata->>'service_provider_id')::uuid
    AND t.type = 'service_payment_received' 
    AND t.created_at::date = pt.created_at::date
    AND t.description LIKE '%' || COALESCE(pt.metadata->>'service_name', 'Service Order') || '%'
);
```

## Payment Flow Types

### 1. Direct Service Payments (Wallet BetaCoins)
- **Flow**: User pays using existing BetaCoins in wallet
- **Transaction Records**: Created by `PaymentService.processOfferPayment()` and `PaymentService.processDirectOrderPayment()`
- **Status**: ✅ Working correctly

### 2. Curlec Payment Gateway (External Payment)
- **Flow**: User pays through Curlec payment gateway
- **Transaction Records**: Now created by the webhook after successful payment
- **Status**: ✅ Fixed with this update

## Transaction Types Created

### For Buyers
- **Type**: `service_payment`
- **Amount**: Negative (payment made)
- **Description**: `Payment for service: [Service Name]`

### For Service Providers
- **Type**: `service_payment_received`
- **Amount**: Positive (payment received)
- **Description**: `Payment received for service: [Service Name]`

## Verification
- ✅ Service payments now create transaction records for both buyers and service providers
- ✅ Historical missing transactions have been restored
- ✅ Future service payments will automatically create transaction records
- ✅ Both payment flows (wallet and Curlec) now properly record transactions

## Prevention
The webhook now properly creates transaction records for all service payments, ensuring this issue won't occur again for new service orders.

## Files Modified
1. `supabase/functions/curlec-webhook/index.ts` - Added transaction record creation for service payments
2. Database migration to fix historical data

## Status: ✅ RESOLVED
Service payments now correctly create transaction history records for both buyers and service providers, and the system is fixed to prevent this issue in the future.
