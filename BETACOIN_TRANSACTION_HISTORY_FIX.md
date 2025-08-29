# BetaCoin Transaction History Fix

## Issue Description
A user (test@betame.com.my) successfully purchased 20 BetaCoins for RM5, and the BetaCoins were correctly added to their wallet. However, the transaction was not appearing in their transaction history.

## Root Cause Analysis
The issue was in the Curlec webhook handler (`supabase/functions/curlec-webhook/index.ts`). When processing BetaCoin purchases, the webhook was:

1. ✅ Correctly updating the wallet balance (adding BetaCoins)
2. ❌ **NOT creating a transaction record** in the `transactions` table

The webhook was only updating the `wallets.betame_betacoins` column but missing the crucial step of inserting a record into the `transactions` table.

## Solution Implemented

### 1. Fixed Webhook Function
Updated `supabase/functions/curlec-webhook/index.ts` to include transaction record creation:

```typescript
// After updating wallet balance
console.log(`✅ Added ${betacoinAmount} BetaCoins to user ${transaction.user_id}`)

// Create transaction record for the BetaCoin purchase
const { error: transactionError } = await supabase
  .from('transactions')
  .insert({
    user_id: transaction.user_id,
    type: 'betacoin_purchase',
    amount: betacoinAmount,
    description: `Purchased ${betacoinAmount} BetaCoins (Total: RM${(transaction.amount / 100).toFixed(2)})`,
    created_at: new Date().toISOString(),
  })

if (transactionError) {
  console.error('❌ Failed to create transaction record:', transactionError)
  return new Response(
    JSON.stringify({ error: 'Failed to create transaction record' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

console.log(`✅ Transaction record created for BetaCoin purchase`)
```

### 2. Deployed Updated Webhook
Successfully deployed the updated webhook function using:
```bash
npx supabase functions deploy curlec-webhook
```

### 3. Fixed Historical Data
Created database migrations to fix missing transaction records:

#### Migration 1: Add Missing Transaction for Specific User
```sql
-- Add missing transaction record for the user who bought 20 betacoins
INSERT INTO transactions (user_id, type, amount, description, created_at)
SELECT 
    u.id,
    'betacoin_purchase',
    20,
    'Purchased 20 BetaCoins (Total: RM5.00)',
    NOW()
FROM auth.users u
WHERE u.email = 'test@betame.com.my'
AND NOT EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.user_id = u.id 
    AND t.type = 'betacoin_purchase' 
    AND t.amount = 20
    AND t.description LIKE '%20 BetaCoins%'
);
```

#### Migration 2: Fix Any Other Missing Transactions
```sql
-- Find and fix any other missing transaction records for BetaCoin purchases
INSERT INTO transactions (user_id, type, amount, description, created_at)
SELECT 
    pt.user_id,
    'betacoin_purchase',
    (pt.metadata->>'betacoin_amount')::integer,
    'Purchased ' || (pt.metadata->>'betacoin_amount') || ' BetaCoins (Total: RM' || (pt.amount / 100.0)::text || ')',
    pt.created_at
FROM payment_transactions pt
WHERE pt.payment_type = 'betacoin_purchase'
AND pt.status = 'completed'
AND NOT EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.user_id = pt.user_id 
    AND t.type = 'betacoin_purchase' 
    AND t.amount = (pt.metadata->>'betacoin_amount')::integer
    AND t.created_at::date = pt.created_at::date
);
```

## Verification
- ✅ User's wallet balance correctly shows 20 BetaCoins
- ✅ Transaction history now displays the BetaCoin purchase
- ✅ Future BetaCoin purchases will automatically create transaction records
- ✅ Historical missing transactions have been restored

## Prevention
The webhook now properly creates transaction records for all BetaCoin purchases, ensuring this issue won't occur again for new purchases.

## Files Modified
1. `supabase/functions/curlec-webhook/index.ts` - Added transaction record creation
2. Database migrations to fix historical data

## Status: ✅ RESOLVED
The user's transaction history now correctly shows their 20 BetaCoin purchase, and the system is fixed to prevent this issue in the future.
